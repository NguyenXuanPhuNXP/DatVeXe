import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/admin.css';

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    if (logout) {
      await logout();
    }
    navigate('/login', { replace: true });
  };

  const displayName = user?.fullName || user?.email || 'Quản trị viên';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/admin') return 'Bảng điều khiển';
    if (path.includes('trips')) return 'Quản lý Chuyến xe';
    if (path.includes('routes')) return 'Quản lý Tuyến đường';
    if (path.includes('companies')) return 'Quản lý Nhà xe';
    if (path.includes('bookings')) return 'Quản lý Đặt vé';
    if (path.includes('promotions')) return 'Quản lý Khuyến mãi';
    if (path.includes('news')) return 'Quản lý Tin tức';
    if (path.includes('users')) return 'Quản lý Người dùng';
    if (path.includes('reports')) return 'Thống kê & Báo cáo';
    return 'Admin Panel';
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>Rightway</h2>
          <p>Admin Panel</p>
        </div>
        
        <nav className="admin-menu">
          <NavLink to="/admin" end className={({ isActive }) => `admin-menu-item ${isActive ? 'active' : ''}`}>
            <i className="bi bi-speedometer2"></i> Dashboard
          </NavLink>
          <NavLink to="/admin/reports" className={({ isActive }) => `admin-menu-item ${isActive ? 'active' : ''}`}>
            <i className="bi bi-file-earmark-bar-graph"></i> Thống kê & Báo cáo
          </NavLink>
          <NavLink to="/admin/trips" className={({ isActive }) => `admin-menu-item ${isActive ? 'active' : ''}`}>
            <i className="bi bi-bus-front"></i> Chuyến xe
          </NavLink>
          <NavLink to="/admin/routes" className={({ isActive }) => `admin-menu-item ${isActive ? 'active' : ''}`}>
            <i className="bi bi-signpost-2"></i> Tuyến đường
          </NavLink>
          <NavLink to="/admin/companies" className={({ isActive }) => `admin-menu-item ${isActive ? 'active' : ''}`}>
            <i className="bi bi-building"></i> Nhà xe
          </NavLink>
          <NavLink to="/admin/bookings" className={({ isActive }) => `admin-menu-item ${isActive ? 'active' : ''}`}>
            <i className="bi bi-ticket-detailed"></i> Đặt vé
          </NavLink>
          <NavLink to="/admin/promotions" className={({ isActive }) => `admin-menu-item ${isActive ? 'active' : ''}`}>
            <i className="bi bi-gift"></i> Khuyến mãi
          </NavLink>
          <NavLink to="/admin/news" className={({ isActive }) => `admin-menu-item ${isActive ? 'active' : ''}`}>
            <i className="bi bi-newspaper"></i> Tin tức
          </NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => `admin-menu-item ${isActive ? 'active' : ''}`}>
            <i className="bi bi-people"></i> Người dùng
          </NavLink>
        </nav>

        <div className="admin-sidebar-footer">
          <button type="button" onClick={handleLogout}>
            <i className="bi bi-box-arrow-left"></i> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-content">
        <header className="admin-topbar">
          <h1>{getPageTitle()}</h1>
          <div className="admin-user-info">
            <span>{displayName}</span>
            <div className="admin-avatar">{avatarLetter}</div>
          </div>
        </header>

        <main className="admin-main">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
