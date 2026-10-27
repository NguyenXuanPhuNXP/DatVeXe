import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminApi';

const DEFAULT_PROMOS = [
  { id: '1', title: 'Giảm 30% Tuyến TP.HCM - Đà Lạt', code: 'DALAT30', discount: 30, startDate: '01/09/2025', endDate: '30/09/2025', status: 'Đang áp dụng' },
  { id: '2', title: 'Nhập mã DAUTIEN Giảm 20%', code: 'DAUTIEN', discount: 20, startDate: '01/09/2025', endDate: '30/09/2025', status: 'Đang áp dụng' },
  { id: '3', title: 'Hà Nội - Sapa Giảm 15%', code: 'SAPA15', discount: 15, startDate: '01/09/2025', endDate: '30/09/2025', status: 'Đang áp dụng' },
  { id: '4', title: 'Tích lũy điểm thưởng nhận quà', code: 'REWARD', discount: 10, startDate: '01/01/2025', endDate: '31/12/2025', status: 'Đang áp dụng' },
];

const AdminPromotions = () => {
  const [promotions, setPromotions] = useState(DEFAULT_PROMOS);
  const [formError,setFormError] = useState('');
  const [isSaving,setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPromo, setCurrentPromo] = useState(null);

  const fetchPromotions = async () => {
    try {
      const res = await adminService.getPromotions();
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        setPromotions(res.data.map(p => ({
          id: p.id,
          title: p.title,
          code: p.code || 'PROMO',
          discount: p.discount || 10,
          startDate: p.startDate ? new Date(p.startDate).toISOString().slice(0, 10) : '',
          endDate: p.endDate ? new Date(p.endDate).toISOString().slice(0, 10) : '',
          status: p.isActive ? 'Đang áp dụng' : 'Hết hạn',
        })));
      }
    } catch {
      // Keep default
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) fetchPromotions(); });
    return () => { active = false; };
  }, []);

  const handleOpenModal = (promo = null) => {
    setCurrentPromo(promo || { title: '', code: '', discount: 10, startDate: '', endDate: '', status: 'Đang áp dụng' });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async e => {
    e.preventDefault(); if(isSaving) return; setFormError(''); setIsSaving(true);
    try { const payload={title:currentPromo.title.trim(),code:currentPromo.code.trim(),discount:Number(currentPromo.discount),startDate:currentPromo.startDate ? new Date(currentPromo.startDate+'T00:00:00Z').toISOString():null,endDate:currentPromo.endDate ? new Date(currentPromo.endDate+'T23:59:59Z').toISOString():null,isActive:currentPromo.status==='Đang áp dụng'};
      if(currentPromo.id) await adminService.updatePromotion(currentPromo.id,payload); else await adminService.createPromotion(payload);
      setIsModalOpen(false); await fetchPromotions();
    } catch(error) {setFormError(error.response?.data?.message || 'Không lưu được dữ liệu. Vui lòng kiểm tra và thử lại.');}
    finally {setIsSaving(false);}
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa khuyến mãi này?')) {
      try {
        await adminService.deletePromotion(id);
        fetchPromotions();
      } catch {
        setPromotions(promotions.filter(p => p.id !== id));
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#111827' }}>Quản lý Khuyến mãi</h2>
        <button type="button" className="btn btn-primary" onClick={() => handleOpenModal()}>
          <i className="bi bi-plus-lg"></i> Thêm khuyến mãi
        </button>
      </div>

      <div className="admin-table-container">
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tiêu đề chương trình</th>
                <th>Mã giảm giá</th>
                <th>Mức giảm</th>
                <th>Thời gian áp dụng</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.title}</strong></td>
                  <td><code style={{ background: '#FEE2E2', color: '#DC2626', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>{p.code}</code></td>
                  <td><strong style={{ color: '#DC2626' }}>{p.discount}%</strong></td>
                  <td>{p.startDate} - {p.endDate}</td>
                  <td>
                    <span className={`badge ${p.status === 'Đang áp dụng' ? 'badge-success' : 'badge-danger'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button type="button" className="btn-icon edit" onClick={() => handleOpenModal(p)} title="Sửa"><i className="bi bi-pencil"></i></button>
                      <button type="button" className="btn-icon delete" onClick={() => handleDelete(p.id)} title="Xóa"><i className="bi bi-trash"></i></button>
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
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{currentPromo?.id ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi mới'}</h3>
              <button type="button" className="modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSave}><datalist id="admin-discounts">{[5,10,15,20,25,30,50].map(n => <option key={n} value={n} />)}</datalist>
              <div className="modal-body">{formError && <p role="alert">{formError}</p>}
                <div className="form-group">
                  <label htmlFor="adminpromotions-field-1">Tiêu đề</label>
                  <input id="adminpromotions-field-1"
                    type="text"
                    className="form-control"
                    value={currentPromo?.title || ''}
                    placeholder="Nhập tiêu đề chương trình hoặc bài viết" onChange={e => setCurrentPromo({ ...currentPromo, title: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="adminpromotions-field-2">Mã giảm giá</label>
                    <input id="adminpromotions-field-2"
                      type="text"
                      className="form-control"
                      value={currentPromo?.code || ''}
                      placeholder="VD: HE2026" onChange={e => setCurrentPromo({ ...currentPromo, code: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="adminpromotions-field-3">Mức giảm (%)</label>
                    <input id="adminpromotions-field-3"
                      type="number" min="1" max="100" step="1" list="admin-discounts"
                      className="form-control"
                      value={currentPromo?.discount || 0}
                      placeholder="VD: 10" onChange={e => setCurrentPromo({ ...currentPromo, discount: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>
              </div>

                <div className="form-group"><label htmlFor="promo-start">Ngày bắt đầu</label><input id="promo-start" className="form-control" type="date" value={currentPromo.startDate || ''} max={currentPromo.endDate || undefined} onChange={e => setCurrentPromo({...currentPromo,startDate:e.target.value})} /><small className="form-hint">Để trống nếu không giới hạn ngày bắt đầu.</small></div>
                <div className="form-group"><label htmlFor="promo-end">Ngày kết thúc</label><input id="promo-end" className="form-control" type="date" value={currentPromo.endDate || ''} min={currentPromo.startDate || undefined} onChange={e => setCurrentPromo({...currentPromo,endDate:e.target.value})} /></div>
                <div className="form-group"><label htmlFor="promo-status">Trạng thái</label><select id="promo-status" className="form-control" value={currentPromo.status} onChange={e => setCurrentPromo({...currentPromo,status:e.target.value})}><option>Đang áp dụng</option><option>Tạm dừng</option></select></div>
              <div className="modal-footer">
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

export default AdminPromotions;
