import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminApi';

const DEFAULT_PROMOS = [
  { id: '1', title: 'Giảm 30% Tuyến TP.HCM - Đà Lạt', code: 'DALAT30', discount: 30, startDate: '01/09/2025', endDate: '30/09/2025', status: 'Đang áp dụng' },
  { id: '2', title: 'Nhập mã DAUTIEN Giảm 20%', code: 'DAUTIEN', discount: 20, startDate: '01/09/2025', endDate: '30/09/2025', status: 'Đang áp dụng' },
  { id: '3', title: 'Hà Nội - Sapa Giảm 15%', code: 'SAPA15', discount: 15, startDate: '01/09/2025', endDate: '30/09/2025', status: 'Đang áp dụng' },
  { id: '4', title: 'Tích lũy điểm thưởng nhận quà', code: 'REWARD', discount: 10, startDate: '01/01/2025', endDate: '31/12/2025', status: 'Đang áp dụng' },
];

const AdminPromotions = () => {
  const [promotions, setPromotions] = useState(DEFAULT_PROMOS);
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
          startDate: p.startDate ? new Date(p.startDate).toLocaleDateString('vi-VN') : '01/09/2025',
          endDate: p.endDate ? new Date(p.endDate).toLocaleDateString('vi-VN') : '30/09/2025',
          status: p.isActive ? 'Đang áp dụng' : 'Hết hạn',
        })));
      }
    } catch {
      // Keep default
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const handleOpenModal = (promo = null) => {
    setCurrentPromo(promo || { title: '', code: '', discount: 10, startDate: '', endDate: '', status: 'Đang áp dụng' });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (currentPromo.id && typeof currentPromo.id === 'string' && currentPromo.id.length > 5) {
        await adminService.updatePromotion(currentPromo.id, currentPromo);
      } else {
        await adminService.createPromotion(currentPromo);
      }
      setIsModalOpen(false);
      fetchPromotions();
    } catch {
      if (currentPromo.id) {
        setPromotions(promotions.map(p => p.id === currentPromo.id ? currentPromo : p));
      } else {
        setPromotions([...promotions, { ...currentPromo, id: String(Date.now()) }]);
      }
      setIsModalOpen(false);
    }
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
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Tiêu đề</label>
                  <input
                    type="text"
                    className="form-control"
                    value={currentPromo?.title || ''}
                    onChange={e => setCurrentPromo({ ...currentPromo, title: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Mã giảm giá</label>
                    <input
                      type="text"
                      className="form-control"
                      value={currentPromo?.code || ''}
                      onChange={e => setCurrentPromo({ ...currentPromo, code: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Mức giảm (%)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={currentPromo?.discount || 0}
                      onChange={e => setCurrentPromo({ ...currentPromo, discount: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPromotions;
