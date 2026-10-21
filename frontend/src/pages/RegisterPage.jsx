import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/auth.css';

function getErrorMessage(error) {
  return error?.response?.data?.error?.message
    || error?.response?.data?.message
    || 'Đăng ký thất bại. Vui lòng thử lại.';
}

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Xác nhận mật khẩu không khớp.');
      return;
    }

    setSubmitting(true);
    try {
      await register({ email: email.trim(), password, fullName: fullName.trim() });
      navigate('/', { replace: true });
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
          <h1>Đăng ký</h1>
          <p>Tạo tài khoản để trải nghiệm tốt hơn cùng Rightway</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error ? <div className="auth-error">{error}</div> : null}

          <div className="auth-input-group">
            <label htmlFor="register-name">Họ và tên *</label>
            <input
              id="register-name"
              type="text"
              placeholder="Nhập họ và tên"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="register-email">Email *</label>
            <input
              id="register-email"
              type="email"
              placeholder="Nhập email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="register-password">Mật khẩu *</label>
            <input
              id="register-password"
              type="password"
              placeholder="Nhập mật khẩu (từ 8 ký tự)"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="register-confirm">Xác nhận mật khẩu *</label>
            <input
              id="register-confirm"
              type="password"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div style={{ fontSize: '14px', color: 'var(--text-light)', marginTop: '10px' }}>
            Bằng việc đăng ký, bạn đồng ý với <Link to="#" style={{ color: 'var(--primary)', fontWeight: 500 }}>Điều khoản sử dụng</Link> và <Link to="#" style={{ color: 'var(--primary)', fontWeight: 500 }}>Chính sách bảo mật</Link> của Rightway.
          </div>

          <button type="submit" className="btn-primary auth-btn" disabled={submitting}>
            {submitting ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>

        <div className="auth-links">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
