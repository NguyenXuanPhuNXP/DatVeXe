import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import api from '../services/api';

const errorText = error => error.response?.data?.error?.message || 'Không kết nối được hỗ trợ. Vui lòng thử lại.';
export default function HumanSupport({ staff = false, initialQuestion = '' }) {
  const { user } = useAuth();
  return user ? <SupportInbox key={`${user.id}-${staff}`} staff={staff} initialQuestion={initialQuestion} />
    : <p>Vui lòng <Link to="/login">đăng nhập</Link> để gửi và theo dõi yêu cầu hỗ trợ từ nhân viên.</p>;
}
function SupportInbox({ staff, fixedId, onDismiss, initialQuestion = '' }) {
  const base = staff ? '/support/staff/conversations' : '/support/conversations';
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(fixedId || '');
  const [opened, setOpened] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [content, setContent] = useState(initialQuestion);
  const [notice, setNotice] = useState(initialQuestion ? 'Câu hỏi đã được điền sẵn. Vui lòng chọn nhà xe và bấm gửi để chuyển tới nhân viên.' : '');
  const [error, setError] = useState('');
  const [pollError, setPollError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const sending = useRef(false);

  useEffect(() => {
    if (staff) return;
    let active = true;
    api.get('/support/companies').then(({ data }) => { if (active) setCompanies(data); })
      .catch(err => { if (active) setError(errorText(err)); });
    return () => { active = false; };
  }, [staff]);
  useEffect(() => {
    if (fixedId) return;
    let active = true;
    let timer;
    async function load() {
      try {
        const { data } = await api.get(base, { timeout: 10000 });
        if (active) { setItems(data); setPollError(''); }
      } catch (err) { if (active) setPollError(errorText(err)); }
      finally { if (active) timer = setTimeout(load, 5000); }
    }
    load();
    return () => { active = false; clearTimeout(timer); };
  }, [base, revision, fixedId]);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    let timer;
    async function load() {
      try {
        const { data } = await api.get(`${base}/${selected}`, { timeout: 10000 });
        if (active) { setConversation(data); setError(''); }
      } catch (err) { if (active) setError(errorText(err)); }
      finally { if (active) timer = setTimeout(load, 5000); }
    }
    load();
    return () => { active = false; clearTimeout(timer); };
  }, [base, selected, revision]);

  async function submit(event) {
    event.preventDefault();
    if (!content.trim() || sending.current) return;
    sending.current = true; setBusy(true); setError('');
    try {
      if (selected) await api.post(`${base}/${selected}/messages`, { content });
      else {
        const { data } = await api.post('/support/conversations', { companyId, content });
        setSelected(data.id); setConversation(null);
        setNotice('Đã chuyển câu hỏi tới nhân viên nhà xe. Bạn có thể theo dõi phản hồi tại hội thoại này; nhân viên sẽ trả lời khi tiếp nhận.');
      }
      setContent(''); setRevision(value => value + 1);
    } catch (err) { setError(errorText(err)); }
    finally { sending.current = false; setBusy(false); }
  }
  async function close() {
    if (sending.current) return;
    sending.current = true; setBusy(true);
    try { await api.patch(`${base}/${selected}/close`); setRevision(value => value + 1); }
    catch (err) { setError(errorText(err)); }
    finally { sending.current = false; setBusy(false); }
  }
  function select(id) {
    if (staff && !fixedId) { setOpened(ids => ids.includes(id) ? ids : [...ids.slice(-5), id]); return; }
    setSelected(id); setConversation(null); setContent(''); setError('');
  }
  return <div className={`human-support ${fixedId ? 'human-support-window' : ''} ${staff && !fixedId ? 'human-support-desk' : ''}`}>
    {fixedId ? <button type="button" disabled={busy} onClick={onDismiss}>Đóng khung chat</button> : <p className="support-chat-note">{staff ? 'Chọn khách để mở khung chat riêng. Có thể mở tối đa 6 hội thoại cùng lúc, mỗi khung có ô soạn tin riêng.' : 'Chọn nhà xe và gửi yêu cầu. Nhân viên sẽ phản hồi khi tiếp nhận; không đảm bảo có người trực ngay.'} Tự cập nhật mỗi 5 giây. Không gửi mật khẩu, OTP hoặc thông tin thẻ.</p>}
    {(error || pollError) && <p role="alert" className="support-chat-error">{error || pollError}</p>}
    {notice && <p role="status" className="support-chat-notice">{notice}</p>}
    {!staff && initialQuestion && <button type="button" disabled={busy} onClick={() => { select(''); setContent(initialQuestion); setNotice('Chọn nhà xe để gửi câu hỏi.'); }}>Soạn lại yêu cầu</button>}
    {!fixedId && <ul className="human-support-list" aria-label="Danh sách hội thoại">
      {items.map(item => <li key={item.id}><button type="button" aria-pressed={staff ? opened.includes(item.id) : selected === item.id} disabled={busy} onClick={() => select(item.id)}>
        <strong>{staff ? (item.customer.fullName || 'Khách hàng') : item.company.name}</strong> · {item.status === 'open' ? 'Đang mở' : 'Đã kết thúc'}
        <small>{item.messages[0]?.senderRole === 'staff' ? 'Nhân viên: ' : 'Khách: '}{item.messages[0]?.content.slice(0, 100)}</small>
      </button></li>)}
    </ul>}
    {staff && !fixedId && items.length === 0 && !pollError && <p>Chưa có yêu cầu hỗ trợ.</p>}
    {staff && !fixedId && <div className="human-support-windows">{opened.map(id => <section key={id}><h2>{items.find(item => item.id === id)?.customer.fullName || 'Khách hàng'} · {id.slice(-6)}</h2><SupportInbox staff fixedId={id} onDismiss={() => setOpened(ids => ids.filter(value => value !== id))} /></section>)}</div>}
    {selected && !conversation && <p role="status">Đang tải hội thoại…</p>}
    {conversation && <>
      <p><strong>{conversation.status === 'open' ? 'Đang chờ / trao đổi với nhân viên' : 'Hội thoại đã kết thúc'}</strong></p>
      <p className="support-chat-note">Hiển thị tối đa 200 tin nhắn gần nhất. Nội dung trao đổi với nhân viên được lưu trên hệ thống; không gửi sang AI.</p>
      <div className="human-support-messages" role="log" aria-live="polite" aria-relevant="additions text">
        {conversation.messages.map(message => <article key={message.id} className={`support-chat-message ${message.senderRole === 'customer' ? 'user' : 'assistant'}`}>
          <strong>{message.senderRole === 'staff' ? 'Nhân viên nhà xe' : 'Khách hàng'}</strong>
          <p>{message.content}</p><small>{new Date(message.createdAt).toLocaleString('vi-VN')}</small>
        </article>)}
      </div>
      {conversation.status === 'open' && <button type="button" disabled={busy} onClick={close}>Kết thúc hội thoại</button>}
    </>}
    {(!staff && !selected && !initialQuestion) && <p>Chọn hội thoại để xem phản hồi. Nếu cần trợ giúp mới, hãy hỏi AI; khi thiếu dữ liệu về nhà xe, AI sẽ cho phép chuyển câu hỏi tới nhân viên.</p>}
    {((!selected && !staff && initialQuestion) || conversation?.status === 'open') && <form onSubmit={submit} className="human-support-form">
      {!selected && <label>Nhà xe<select required value={companyId} onChange={event => setCompanyId(event.target.value)} disabled={busy}>
        <option value="">Chọn nhà xe cần hỗ trợ</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
      </select></label>}
      {!selected && companies.length === 0 && <p>Chưa có nhà xe được cấp tài khoản hỗ trợ. Vui lòng dùng thông tin liên hệ trên vé nếu có.</p>}
      <label>{selected ? 'Tin nhắn' : 'Nội dung cần hỗ trợ'}<textarea required maxLength={2000} rows={3} value={content} onChange={event => setContent(event.target.value)} disabled={busy} /></label>
      <button type="submit" disabled={busy || !content.trim() || (!selected && !companyId)}>{busy ? 'Đang gửi…' : selected ? 'Gửi tin nhắn' : 'Gửi yêu cầu cho nhân viên'}</button>
    </form>}
  </div>;
}
