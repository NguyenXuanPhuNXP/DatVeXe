import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { isAdminUser, useAuth } from '../context/AuthContext';
import '../styles/auth.css';

function getErrorMessage(error) {
  return error?.response?.data?.error?.message
    || error?.response?.data?.message
    || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
}

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      // Diem noi giao dien Login voi API authentication.
      const user = await login({ email: email.trim(), password });
      const from = location.state?.from?.pathname;
      const admin = isAdminUser(user);
      if (from && !(from.startsWith('/admin') && !admin)) {
        navigate(from, { replace: true });
        return;
      }
      navigate(admin ? '/admin' : '/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Đăng nhập</h1>
          <p>Chào mừng bạn quay lại với Rightway</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error ? <div className="auth-error">{error}</div> : null}

          <div className="auth-input-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              placeholder="Nhập email (VD: admin@rightway.com)"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="login-password">Mật khẩu</label>
            <input
              id="login-password"
              type="password"
              placeholder="Nhập mật khẩu (VD: Admin@123)"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input type="checkbox" style={{ accentColor: 'var(--primary)' }} />
              <span>Ghi nhớ</span>
            </label>
            <Link to="#" style={{ color: 'var(--primary)', fontWeight: 600 }}>Quên mật khẩu?</Link>
          </div>

          <button type="submit" className="btn-primary auth-btn" disabled={submitting}>
            {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="auth-links">
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
