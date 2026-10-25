import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminApi';
//
const DEFAULT_TRIPS = [
  { id: '1', route: 'Hà Nội - Sapa', company: 'Sapa Express', departureTime: '07:00', arrivalTime: '13:00', price: 320000, status: 'Đang mở bán' },
  { id: '2', route: 'TP.HCM - Đà Lạt', company: 'Phương Trang', departureTime: '14:00', arrivalTime: '19:30', price: 280000, status: 'Đang mở bán' },
  { id: '3', route: 'Đà Nẵng - Huế', company: 'Hạnh Cafe', departureTime: '08:00', arrivalTime: '10:30', price: 150000, status: 'Đã đầy' },
  { id: '4', route: 'TP.HCM - Nha Trang', company: 'Phương Trang', departureTime: '06:30', arrivalTime: '15:00', price: 220000, status: 'Đang mở bán' },
];

const AdminTrips = () => {
  const [trips, setTrips] = useState(DEFAULT_TRIPS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);

  const fetchTrips = async () => {
    try {
      const res = await adminService.getTrips();
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        setTrips(res.data.map(t => ({
          id: t.id,
          route: t.route ? `${t.route.origin} - ${t.route.destination}` : (t.route || 'Chưa chọn tuyến'),
          company: t.company?.name || t.company || 'Phương Trang',
          departureTime: t.departureTime || '08:00',
          arrivalTime: t.arrivalTime || '14:00',
          price: t.price || 250000,
          status: t.isActive ? 'Đang mở bán' : 'Tạm dừng',
        })));
      }
    } catch {
      // Keep fallback trips
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleOpenModal = (trip = null) => {
    setCurrentTrip(trip || { route: '', company: '', departureTime: '', arrivalTime: '', price: 0, status: 'Đang mở bán' });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (currentTrip.id && typeof currentTrip.id === 'string' && currentTrip.id.length > 5) {
        await adminService.updateTrip(currentTrip.id, currentTrip);
      } else {
        await adminService.createTrip(currentTrip);
      }
      setIsModalOpen(false);
      fetchTrips();
    } catch {
      // Mock update
      if (currentTrip.id) {
        setTrips(trips.map(t => t.id === currentTrip.id ? currentTrip : t));
      } else {
        setTrips([...trips, { ...currentTrip, id: String(Date.now()) }]);
      }
      setIsModalOpen(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa chuyến xe này?')) {
      try {
        await adminService.deleteTrip(id);
        fetchTrips();
      } catch {
        setTrips(trips.filter(t => t.id !== id));
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#111827' }}>Quản lý Chuyến xe</h2>
        <button type="button" className="btn btn-primary" onClick={() => handleOpenModal()}>
          <i className="bi bi-plus-lg"></i> Thêm chuyến
        </button>
      </div>

      <div className="admin-table-container">
        <div className="admin-filters">
          <input type="text" className="form-control" placeholder="Tìm theo tuyến đường, nhà xe..." style={{ maxWidth: '300px' }} />
          <select className="form-control" style={{ maxWidth: '200px' }}>
            <option value="">Tất cả nhà xe</option>
            <option value="Phương Trang">Phương Trang</option>
            <option value="Thành Bưởi">Thành Bưởi</option>
            <option value="Hạnh Cafe">Hạnh Cafe</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tuyến đường</th>
                <th>Nhà xe</th>
                <th>Giờ đi - Giờ đến</th>
                <th>Giá vé</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr key={trip.id}>
                  <td><strong>#{trip.id}</strong></td>
                  <td>{trip.route}</td>
                  <td>{trip.company}</td>
                  <td>{trip.departureTime} - {trip.arrivalTime}</td>
                  <td><strong style={{ color: '#DC2626' }}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(trip.price)}</strong></td>
                  <td>
                    <span className={`badge ${trip.status === 'Đang mở bán' ? 'badge-success' : 'badge-warning'}`}>
                      {trip.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button type="button" className="btn-icon edit" onClick={() => handleOpenModal(trip)} title="Sửa"><i className="bi bi-pencil"></i></button>
                      <button type="button" className="btn-icon delete" onClick={() => handleDelete(trip.id)} title="Xóa"><i className="bi bi-trash"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{currentTrip?.id ? 'Sửa chuyến xe' : 'Thêm chuyến xe mới'}</h3>
              <button type="button" className="modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Tuyến đường</label>
                  <input
                    type="text"
                    className="form-control"
                    value={currentTrip?.route || ''}
                    onChange={e => setCurrentTrip({ ...currentTrip, route: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Nhà xe</label>
                  <input
                    type="text"
                    className="form-control"
                    value={currentTrip?.company || ''}
                    onChange={e => setCurrentTrip({ ...currentTrip, company: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Giờ khởi hành</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="VD: 08:00"
                      value={currentTrip?.departureTime || ''}
                      onChange={e => setCurrentTrip({ ...currentTrip, departureTime: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Giờ đến</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="VD: 14:00"
                      value={currentTrip?.arrivalTime || ''}
                      onChange={e => setCurrentTrip({ ...currentTrip, arrivalTime: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Giá vé (VNĐ)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={currentTrip?.price || 0}
                    onChange={e => setCurrentTrip({ ...currentTrip, price: Number(e.target.value) })}
                    required
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

export default AdminTrips;
