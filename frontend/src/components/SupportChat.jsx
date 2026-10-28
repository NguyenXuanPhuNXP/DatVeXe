import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import HumanSupport from './HumanSupport';
import '../styles/support-chat.css';

const suggestions = ['Tôi đặt vé như thế nào?', 'Ghế được giữ trong bao lâu?', 'Quy định hủy và hoàn tiền?'];

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [human, setHuman] = useState(false);
  const [transfer, setTransfer] = useState(null);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [guides, setGuides] = useState([]);
  const [email, setEmail] = useState(null);
  const input = useRef(null);
  const end = useRef(null);
  const launcher = useRef(null);
  const sending = useRef(false);
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    api.get('/support/guides').then(({ data }) => {
      setGuides(data.guides); setEmail(data.supportEmail);
    }).catch(() => {});
  }, [open]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [messages, busy, error]);
  function close() { setOpen(false); launcher.current?.focus(); }
  async function send(text) {
    const message = text.trim();
    if (!message || sending.current) return;
    sending.current = true;
    setBusy(true); setError(''); setDraft('');
    setMessages(items => [...items.slice(-18), { role: 'user', answer: message }]);
    try {
      const { data } = await api.post('/support/chat', { message }, { timeout: 25000 });
      setMessages(items => [...items, { role: 'assistant', ...data, question: message }]);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Không kết nối được trợ lý. Vui lòng thử lại.');
      setDraft(message);
    } finally { sending.current = false; setBusy(false); input.current?.focus(); }
  }
  return <div className="support-chat">
    {open && <section className="support-chat-panel" role="region" aria-label="Trợ lý AI hỗ trợ" onKeyDown={e => { if (e.key === 'Escape') close(); }}>
      <header className="support-chat-header">
        <div><strong>Trợ lý Rightway</strong><small>AI hỗ trợ sử dụng website</small></div>
        <button type="button" onClick={close} aria-label="Đóng hỗ trợ">×</button>
      </header>
      <div className="support-chat-tabs"><button type="button" aria-pressed={!human} onClick={() => setHuman(false)}>Trợ lý AI</button><button type="button" aria-pressed={human} onClick={() => { setTransfer(null); setHuman(true); }}>Hội thoại hỗ trợ</button></div>
      {human ? <div className="support-chat-content"><HumanSupport key={transfer?.id || 'history'} initialQuestion={transfer?.question || ''} /></div> : <>
      <div className="support-chat-content">
        <p className="support-chat-note">Trả lời dựa trên tài liệu. Mỗi câu hỏi độc lập, hãy nêu rõ nội dung cần hỗ trợ. Không gửi mật khẩu, OTP hay thông tin vé cá nhân. Câu hỏi được gửi tới nhà cung cấp AI được website cấu hình (Google Gemini hoặc OpenAI) để xử lý.</p>
        <div className="support-chat-suggestions">{suggestions.map(text => <button type="button" key={text} disabled={busy} onClick={() => send(text)}>{text}</button>)}</div>
        <div role="log" aria-live="polite" aria-relevant="additions">
          {messages.map((message, index) => <article key={index} className={`support-chat-message ${message.role}`}>
            <strong>{message.role === 'user' ? 'Bạn' : 'Trợ lý AI'}</strong>
            <p>{message.answer}</p>
            {message.sources?.map(source => <details key={source.id}>
              <summary>Nguồn: {source.title}</summary>
              <p>{guides.find(guide => guide.id === source.id)?.content || 'Xem hướng dẫn bên dưới.'}</p>
              <Link to={source.url} onClick={close}>Mở trang liên quan →</Link>
            </details>)}
            {message.needsStaff && message.classification === 'missing_transport_data' && <p className="support-chat-note"><button type="button" onClick={() => { setTransfer({ id: index, question: message.question }); setHuman(true); }}>Chuyển câu hỏi cho nhân viên</button></p>}
          </article>)}
        </div>
        {busy && <p role="status">Trợ lý đang trả lời…</p>}
        {error && <p className="support-chat-error" role="alert">{error}</p>}
        <details className="support-chat-guides"><summary>Hướng dẫn & liên hệ nhân viên</summary>
          {guides.map(guide => <details key={guide.id}><summary>{guide.title}</summary><p>{guide.content}</p><Link to={guide.url} onClick={close}>Mở trang liên quan →</Link></details>)}
          {email ? <a href={`mailto:${email}`}>Gửi email cho bộ phận hỗ trợ</a> : <p>Liên hệ nhân viên qua thông tin trên vé hoặc xác nhận đặt vé nếu có. Website chưa cấu hình email hỗ trợ chung.</p>}
        </details>
        <div ref={end} />
      </div>
      <form className="support-chat-form" onSubmit={e => { e.preventDefault(); send(draft); }}>
        <label className="support-chat-label" htmlFor="support-question">Câu hỏi của bạn</label>
        <div><input ref={input} id="support-question" value={draft} onChange={e => setDraft(e.target.value)} maxLength={1200} placeholder="Nhập câu hỏi về đặt vé…" autoComplete="off" readOnly={busy} />
          <button type="submit" disabled={busy || !draft.trim()}>Gửi</button></div>
      </form>
      </>}
    </section>}
    <button className="support-chat-launcher" ref={launcher} type="button" onClick={() => open ? close() : setOpen(true)} aria-expanded={open} aria-label={open ? 'Đóng trợ lý AI' : 'Mở trợ lý AI hỗ trợ'}><i className="bi bi-chat-dots" aria-hidden="true" /> Hỗ trợ AI</button>
  </div>;
}
