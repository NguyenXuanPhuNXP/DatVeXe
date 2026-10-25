import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import '../../styles/header.css';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotification();

  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  const navItems = [
    { name: 'Trang chủ', path: '/' },
    { name: 'Tìm vé', path: '/search' },
    { name: 'Vé đã đặt', path: '/lookup' },
    { name: 'Chuyến đi', path: '/search' },
  ];

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (logout) await logout();
    navigate('/');
  };

  const handleNotificationClick = (item) => {
    markAsRead(item.id);
    setShowNotifications(false);
    if (item.link) {
      navigate(item.link);
    } else if (item.bookingCode) {
      navigate(`/lookup?code=${item.bookingCode}`);
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = (new Date() - new Date(dateStr)) / 1000;
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const displayName = user?.fullName || user?.email || 'Tài khoản';

  return (
    <header className="header">
      <div className="container header-content">
        <Link to="/" className="logo">Rightway</Link>

        <nav className="nav-links">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          {/* Notification Bell */}
          <div className="notification-wrapper" ref={notifRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="notification-bell-btn"
              onClick={() => setShowNotifications(!showNotifications)}
              title="Thông báo của bạn"
              style={{
                position: 'relative',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '18px',
                transition: 'all 0.2s',
              }}
            >
              <i className="bi bi-bell"></i>
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    background: '#EF4444',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '10px',
                    minWidth: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    border: '2px solid #1E3A5F',
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div
                className="notification-dropdown"
                style={{
                  position: 'absolute',
                  top: '48px',
                  right: '0',
                  width: '360px',
                  maxHeight: '480px',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  animation: 'fadeIn 0.2s ease',
                  border: '1px solid #E5E7EB',
                }}
              >
                <div
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid #E5E7EB',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#F9FAFB',
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#111827', fontSize: '15px' }}>
                    Thông báo ({unreadCount} chưa đọc)
                  </div>
                  {notifications.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllAsRead}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#DC2626',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Đã đọc tất cả
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={clearAll}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#6B7280',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        Xóa hết
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ overflowY: 'auto', maxHeight: '380px' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '36px 16px', textAlign: 'center', color: '#9CA3AF' }}>
                      <i className="bi bi-bell-slash" style={{ fontSize: '32px', marginBottom: '8px', display: 'block' }} />
                      <div style={{ fontSize: '14px' }}>Chưa có thông báo nào</div>
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #F3F4F6',
                          backgroundColor: item.isRead ? '#ffffff' : '#FEF2F2',
                          cursor: 'pointer',
                          display: 'flex',
                          gap: '12px',
                          transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = item.isRead ? '#F9FAFB' : '#FEE2E2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = item.isRead ? '#ffffff' : '#FEF2F2';
                        }}
                      >
                        <div style={{ fontSize: '20px', marginTop: '2px', lineHeight: 1 }}>
                          {item.type === 'success' && <i className="bi bi-check-circle-fill" style={{ color: '#10B981' }} />}
                          {item.type === 'danger' && <i className="bi bi-x-circle-fill" style={{ color: '#EF4444' }} />}
                          {item.type === 'warning' && <i className="bi bi-hourglass-split" style={{ color: '#F59E0B' }} />}
                          {item.type === 'info' && <i className="bi bi-info-circle-fill" style={{ color: '#3B82F6' }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                            <span style={{ fontWeight: item.isRead ? 600 : 700, fontSize: '14px', color: '#111827' }}>
                              {item.title}
                            </span>
                            <span style={{ fontSize: '11px', color: '#9CA3AF', whiteSpace: 'nowrap', marginLeft: '6px' }}>
                              {formatTimeAgo(item.timestamp)}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#4B5563', lineHeight: '1.4' }}>
                            {item.message}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {user ? (
            <div className="header-user">
              <i className="bi bi-person-circle"></i>
              <span className="header-user-name">{displayName}</span>
              {isAdmin ? <Link to="/admin" className="header-admin-link">Admin</Link> : null}
              <button type="button" className="header-logout" onClick={handleLogout}>
                Đăng xuất
              </button>
            </div>
          ) : (
            <Link to="/login" className="auth-link">
              <i className="bi bi-person-circle"></i>
              <span>Đăng nhập / Đăng ký</span>
            </Link>
          )}

          <button type="button" className="lang-btn" aria-label="Ngôn ngữ">
            <i className="bi bi-globe"></i>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
