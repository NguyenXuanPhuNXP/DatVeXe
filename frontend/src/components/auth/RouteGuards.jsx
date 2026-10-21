import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAdminUser, useAuth } from '../../context/AuthContext';
import '../../styles/auth.css';

export function AuthLoading() {
  return (
    <div className="auth-guard-loading">
      <div className="auth-spinner" />
      <span>Đang tải thông tin...</span>
    </div>
  );
}

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AuthLoading />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

export function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#1E3A5F' }}>
        <div style={{ textAlign: 'center', color: '#FFFFFF' }}>
          <div className="auth-spinner" style={{ borderTopColor: '#DC2626', margin: '0 auto 16px auto' }} />
          <span>Đang kiểm tra quyền quản trị...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isAdminUser(user)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export function GuestRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <AuthLoading />;
  if (user) {
    return <Navigate to={isAdminUser(user) ? '/admin' : '/'} replace />;
  }
  return children;
}
