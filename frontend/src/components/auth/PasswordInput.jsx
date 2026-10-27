import { useState } from 'react';
import './password-input.css';

export default function PasswordInput(props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-input-wrapper">
      <input {...props} type={visible ? 'text' : 'password'} />
      <button type="button" className="password-visibility-toggle"
        aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        aria-pressed={visible} aria-controls={props.id} disabled={props.disabled}
        onClick={() => setVisible(value => !value)}>
        <i className={visible ? 'bi bi-eye-slash' : 'bi bi-eye'} aria-hidden="true" />
      </button>
    </div>
  );
}
