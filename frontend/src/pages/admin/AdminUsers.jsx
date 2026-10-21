import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminApi';

const DEFAULT_USERS = [
  { id: '1', email: 'admin@rightway.com', fullName: 'Super Admin', role: 'admin', createdAt: '01/01/2025' },
  { id: '2', email: 'khachhang1@gmail.com', fullName: 'Nguyễn Văn A', role: 'USER', createdAt: '15/02/2025' },
  { id: '3', email: 'khachhang2@gmail.com', fullName: 'Trần Thị B', role: 'USER', createdAt: '20/03/2025' },
];

const AdminUsers = () => {
  const [users, setUsers] = useState(DEFAULT_USERS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const fetchUsers = async () => {
    try {
      const res = await adminService.getUsers();
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        setUsers(res.data.map(u => ({
          id: u.id,
          email: u.email,
          fullName: u.fullName || 'Khách hàng',
          role: u.roles?.[0]?.role?.name || 'USER',
          createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '01/01/2025',
        })));
      }
    } catch {
      // Keep default
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenModal = (user) => {
    setCurrentUser(user);
    setIsModalOpen(true);
  };

  const handleSaveRole = (e) => {
    e.preventDefault();
    setUsers(users.map(u => u.id === currentUser.id ? currentUser : u));
    setIsModalOpen(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#111827' }}>Quản lý Người dùng</h2>
      </div>

      <div className="admin-table-container">
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Ngày đăng ký</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.fullName}</strong></td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-danger' : 'badge-info'}`}>
                      {u.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}
                    </span>
                  </td>
                  <td>{u.createdAt}</td>
                  <td>
                    <div className="action-buttons">
                      <button type="button" className="btn-icon edit" onClick={() => handleOpenModal(u)} title="Phân quyền">
                        <i className="bi bi-shield-lock"></i>
                      </button>
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
              <h3>Phân quyền người dùng</h3>
              <button type="button" className="modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSaveRole}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Email</label>
                  <input type="text" className="form-control" value={currentUser?.email || ''} disabled />
                </div>
                <div className="form-group">
                  <label>Vai trò</label>
                  <select
                    className="form-control"
                    value={currentUser?.role || 'USER'}
                    onChange={e => setCurrentUser({ ...currentUser, role: e.target.value })}
                  >
                    <option value="USER">Khách hàng (USER)</option>
                    <option value="admin">Quản trị viên (admin)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Cập nhật</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
