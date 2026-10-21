import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminApi';
///////////////
const DEFAULT_ROUTES = [
  { id: '1', origin: 'Hà Nội', destination: 'Đà Nẵng', distance: 760, tripsCount: 15 },
  { id: '2', origin: 'TP.HCM', destination: 'Đà Lạt', distance: 305, tripsCount: 28 },
  { id: '3', origin: 'Hà Nội', destination: 'Sapa', distance: 315, tripsCount: 12 },
  { id: '4', origin: 'Đà Nẵng', destination: 'Huế', distance: 100, tripsCount: 20 },
  { id: '5', origin: 'TP.HCM', destination: 'Nha Trang', distance: 435, tripsCount: 22 },
];

const AdminRoutes = () => {
  const [routes, setRoutes] = useState(DEFAULT_ROUTES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRoute, setCurrentRoute] = useState(null);

  const fetchRoutes = async () => {
    try {
      const res = await adminService.getRoutes();
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        setRoutes(res.data.map(r => ({
          id: r.id,
          origin: r.origin,
          destination: r.destination,
          distance: r.distance || 0,
          tripsCount: r.trips?.length || 0,
        })));
      }
    } catch {
      // Keep default
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleOpenModal = (route = null) => {
    setCurrentRoute(route || { origin: '', destination: '', distance: 0 });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (currentRoute.id && typeof currentRoute.id === 'string' && currentRoute.id.length > 5) {
        await adminService.updateRoute(currentRoute.id, currentRoute);
      } else {
        await adminService.createRoute(currentRoute);
      }
      setIsModalOpen(false);
      fetchRoutes();
    } catch {
      if (currentRoute.id) {
        setRoutes(routes.map(r => r.id === currentRoute.id ? currentRoute : r));
      } else {
        setRoutes([...routes, { ...currentRoute, id: String(Date.now()), tripsCount: 0 }]);
      }
      setIsModalOpen(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tuyến đường này?')) {
      try {
        await adminService.deleteRoute(id);
        fetchRoutes();
      } catch {
        setRoutes(routes.filter(r => r.id !== id));
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#111827' }}>Quản lý Tuyến đường</h2>
        <button type="button" className="btn btn-primary" onClick={() => handleOpenModal()}>
          <i className="bi bi-plus-lg"></i> Thêm tuyến
        </button>
      </div>

      <div className="admin-table-container">
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Điểm đi</th>
                <th>Điểm đến</th>
                <th>Khoảng cách</th>
                <th>Số chuyến</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((route) => (
                <tr key={route.id}>
                  <td><strong>#{route.id}</strong></td>
                  <td>{route.origin}</td>
                  <td>{route.destination}</td>
                  <td>{route.distance} km</td>
                  <td><span className="badge badge-info">{route.tripsCount || 0} chuyến</span></td>
                  <td>
                    <div className="action-buttons">
                      <button type="button" className="btn-icon edit" onClick={() => handleOpenModal(route)} title="Sửa"><i className="bi bi-pencil"></i></button>
                      <button type="button" className="btn-icon delete" onClick={() => handleDelete(route.id)} title="Xóa"><i className="bi bi-trash"></i></button>
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
              <h3>{currentRoute?.id ? 'Sửa tuyến đường' : 'Thêm tuyến mới'}</h3>
              <button type="button" className="modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Điểm đi</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: Hà Nội"
                    value={currentRoute?.origin || ''}
                    onChange={e => setCurrentRoute({ ...currentRoute, origin: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Điểm đến</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: Đà Nẵng"
                    value={currentRoute?.destination || ''}
                    onChange={e => setCurrentRoute({ ...currentRoute, destination: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Khoảng cách (km)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="VD: 760"
                    value={currentRoute?.distance || 0}
                    onChange={e => setCurrentRoute({ ...currentRoute, distance: Number(e.target.value) })}
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

export default AdminRoutes;
