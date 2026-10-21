import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminApi';

const DEFAULT_COMPANIES = [
  { id: '1', name: 'Phương Trang', rating: 4.8, totalBuses: 45, phone: '1900 6067', desc: 'Dịch vụ vận tải chất lượng cao toàn quốc' },
  { id: '2', name: 'Thành Bưởi', rating: 4.7, totalBuses: 30, phone: '1900 6079', desc: 'Chuyên tuyến TP.HCM - Đà Lạt - Cần Thơ' },
  { id: '3', name: 'Hạnh Cafe', rating: 4.5, totalBuses: 20, phone: '028 3920 5645', desc: 'Chuyên tuyến du lịch miền Trung' },
  { id: '4', name: 'Thaco Bus', rating: 4.4, totalBuses: 18, phone: '1900 1234', desc: 'Xe giường nằm đời mới tiện nghi' },
];

const AdminCompanies = () => {
  const [companies, setCompanies] = useState(DEFAULT_COMPANIES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCompany, setCurrentCompany] = useState(null);

  const fetchCompanies = async () => {
    try {
      const res = await adminService.getCompanies();
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        setCompanies(res.data.map(c => ({
          id: c.id,
          name: c.name,
          rating: c.rating || 4.5,
          totalBuses: c.buses?.length || 10,
          phone: c.phone || '1900 xxxx',
          desc: c.description || 'Nhà xe chất lượng cao',
        })));
      }
    } catch {
      // Keep default
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleOpenModal = (company = null) => {
    setCurrentCompany(company || { name: '', rating: 5, totalBuses: 10, phone: '', desc: '' });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (currentCompany.id && typeof currentCompany.id === 'string' && currentCompany.id.length > 5) {
        await adminService.updateCompany(currentCompany.id, currentCompany);
      } else {
        await adminService.createCompany(currentCompany);
      }
      setIsModalOpen(false);
      fetchCompanies();
    } catch {
      if (currentCompany.id) {
        setCompanies(companies.map(c => c.id === currentCompany.id ? currentCompany : c));
      } else {
        setCompanies([...companies, { ...currentCompany, id: String(Date.now()) }]);
      }
      setIsModalOpen(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa nhà xe này?')) {
      try {
        await adminService.deleteCompany(id);
        fetchCompanies();
      } catch {
        setCompanies(companies.filter(c => c.id !== id));
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#111827' }}>Quản lý Nhà xe</h2>
        <button type="button" className="btn btn-primary" onClick={() => handleOpenModal()}>
          <i className="bi bi-plus-lg"></i> Thêm nhà xe
        </button>
      </div>

      <div className="admin-table-container">
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tên nhà xe</th>
                <th>Mô tả</th>
                <th>Đánh giá</th>
                <th>Số lượng xe</th>
                <th>Hotline</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.desc}</td>
                  <td>
                    <span style={{ color: '#F59E0B', fontWeight: 600 }}>
                      <i className="bi bi-star-fill"></i> {c.rating}
                    </span>
                  </td>
                  <td><span className="badge badge-info">{c.totalBuses} xe</span></td>
                  <td>{c.phone}</td>
                  <td>
                    <div className="action-buttons">
                      <button type="button" className="btn-icon edit" onClick={() => handleOpenModal(c)} title="Sửa"><i className="bi bi-pencil"></i></button>
                      <button type="button" className="btn-icon delete" onClick={() => handleDelete(c.id)} title="Xóa"><i className="bi bi-trash"></i></button>
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
              <h3>{currentCompany?.id ? 'Sửa nhà xe' : 'Thêm nhà xe mới'}</h3>
              <button type="button" className="modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Tên nhà xe</label>
                  <input
                    type="text"
                    className="form-control"
                    value={currentCompany?.name || ''}
                    onChange={e => setCurrentCompany({ ...currentCompany, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Mô tả</label>
                  <input
                    type="text"
                    className="form-control"
                    value={currentCompany?.desc || ''}
                    onChange={e => setCurrentCompany({ ...currentCompany, desc: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Hotline</label>
                  <input
                    type="text"
                    className="form-control"
                    value={currentCompany?.phone || ''}
                    onChange={e => setCurrentCompany({ ...currentCompany, phone: e.target.value })}
                  />
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

export default AdminCompanies;
