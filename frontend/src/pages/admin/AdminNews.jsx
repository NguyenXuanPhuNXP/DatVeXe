import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminApi';

const DEFAULT_NEWS = [
  { id: '1', title: 'Cập nhật lịch chạy Tết Nguyên Đán 2026', category: 'Thông báo', publishedAt: '22/09/2025', status: 'Đã xuất bản' },
  { id: '2', title: 'Hướng dẫn đổi hủy vé xe trực tuyến cực kỳ đơn giản', category: 'Cẩm nang', publishedAt: '20/09/2025', status: 'Đã xuất bản' },
  { id: '3', title: 'Top 5 điểm du lịch nên đi dịp cuối năm từ TP.HCM', category: 'Du lịch', publishedAt: '18/09/2025', status: 'Đã xuất bản' },
  { id: '4', title: 'Phương Trang mở thêm chuyến mới tuyến Sài Gòn - Phan Thiết', category: 'Tin tức', publishedAt: '15/09/2025', status: 'Đã xuất bản' },
];

const AdminNews = () => {
  const [news, setNews] = useState(DEFAULT_NEWS);
  const [formError,setFormError] = useState('');
  const [isSaving,setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentNews, setCurrentNews] = useState(null);

  const fetchNews = async () => {
    try {
      const res = await adminService.getNews();
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        setNews(res.data.map(n => ({
          id: n.id,
          title: n.title,
          content: n.content || '', summary: n.summary || '',
          category: n.category || 'Tin tức',
          publishedAt: n.publishedAt ? new Date(n.publishedAt).toLocaleDateString('vi-VN') : '25/09/2025',
          status: n.isPublished ? 'Đã xuất bản' : 'Bản nháp',
        })));
      }
    } catch {
      // Keep default
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) fetchNews(); });
    return () => { active = false; };
  }, []);

  const handleOpenModal = (item = null) => {
    setCurrentNews(item || { title: '', category: 'Tin tức', status: 'Đã xuất bản' });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async e => {
    e.preventDefault(); if(isSaving) return; setFormError(''); setIsSaving(true);
    try { const payload={title:currentNews.title.trim(),category:currentNews.category,summary:currentNews.summary||'',content:currentNews.content||'',isPublished:currentNews.status==='Đã xuất bản'};
      if(currentNews.id) await adminService.updateNews(currentNews.id,payload); else await adminService.createNews(payload);
      setIsModalOpen(false); await fetchNews();
    } catch(error) {setFormError(error.response?.data?.message || 'Không lưu được dữ liệu. Vui lòng kiểm tra và thử lại.');}
    finally {setIsSaving(false);}
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bài viết này?')) {
      try {
        await adminService.deleteNews(id);
        fetchNews();
      } catch {
        setNews(news.filter(n => n.id !== id));
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#111827' }}>Quản lý Tin tức</h2>
        <button type="button" className="btn btn-primary" onClick={() => handleOpenModal()}>
          <i className="bi bi-plus-lg"></i> Viết bài mới
        </button>
      </div>

      <div className="admin-table-container">
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tiêu đề bài viết</th>
                <th>Chuyên mục</th>
                <th>Ngày đăng</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {news.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.title}</strong></td>
                  <td><span className="badge badge-info">{item.category}</span></td>
                  <td>{item.publishedAt}</td>
                  <td>
                    <span className={`badge ${item.status === 'Đã xuất bản' ? 'badge-success' : 'badge-warning'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button type="button" className="btn-icon edit" onClick={() => handleOpenModal(item)} title="Sửa"><i className="bi bi-pencil"></i></button>
                      <button type="button" className="btn-icon delete" onClick={() => handleDelete(item.id)} title="Xóa"><i className="bi bi-trash"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '650px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{currentNews?.id ? 'Sửa bài viết' : 'Viết bài mới'}</h3>
              <button type="button" className="modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">{formError && <p role="alert">{formError}</p>}
                <div className="form-group">
                  <label htmlFor="adminnews-field-1">Tiêu đề</label>
                  <input id="adminnews-field-1"
                    type="text"
                    className="form-control"
                    value={currentNews?.title || ''}
                    placeholder="Nhập tiêu đề chương trình hoặc bài viết" onChange={e => setCurrentNews({ ...currentNews, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="adminnews-field-2">Chuyên mục</label>
                  <select id="adminnews-field-2"
                    className="form-control"
                    value={currentNews?.category || 'Tin tức'}
                    onChange={e => setCurrentNews({ ...currentNews, category: e.target.value })}
                  >
                    <option value="Thông báo">Thông báo</option>
                    <option value="Cẩm nang">Cẩm nang</option>
                    <option value="Du lịch">Du lịch</option>
                    <option value="Tin tức">Tin tức</option>
                  </select>
                </div>
              </div>
<div className="modal-body">
<div className="form-group"><label htmlFor="news-summary">Tóm tắt</label><textarea id="news-summary" className="form-control" maxLength={500} placeholder="Giới thiệu ngắn nội dung bài viết (tối đa 500 ký tự)" value={currentNews.summary || ''} onChange={e => setCurrentNews({...currentNews,summary:e.target.value})} /></div>
<div className="form-group"><label htmlFor="news-content">Nội dung bài viết</label><textarea id="news-content" className="form-control" rows={5} placeholder="Nhập nội dung chi tiết bài viết" value={currentNews.content || ''} onChange={e => setCurrentNews({...currentNews,content:e.target.value})} /></div>
<div className="form-group"><label htmlFor="news-status">Trạng thái xuất bản</label><select id="news-status" className="form-control" value={currentNews.status} onChange={e => setCurrentNews({...currentNews,status:e.target.value})}><option>Bản nháp</option><option>Đã xuất bản</option></select></div>
</div><div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Đang lưu...' : 'Lưu'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNews;
