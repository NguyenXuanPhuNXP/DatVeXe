import React from 'react';
import { useNavigate } from 'react-router-dom';

const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    { icon: 'bi-search', title: 'Tra cứu vé', subtitle: 'Kiểm tra thông tin vé', path: '/lookup' },
    { icon: 'bi-arrow-left-right', title: 'Đổi/Huỷ vé', subtitle: 'Nhanh chóng, tiện lợi', path: '/lookup' },
    { icon: 'bi-ticket-detailed', title: 'Vé của tôi', subtitle: 'Quản lý vé đã đặt', path: '/login' },
    { icon: 'bi-headset', title: 'Hỗ trợ khách hàng', subtitle: '24/7 giải đáp thắc mắc', path: '#' },
  ];

  return (
    <section className="quick-actions">
      {actions.map((action, idx) => (
        <div className="action-card" key={idx} onClick={() => navigate(action.path)}>
          <div className="action-icon">
            <i className={`bi ${action.icon}`}></i>
          </div>
          <h3>{action.title}</h3>
          <p>{action.subtitle}</p>
        </div>
      ))}
    </section>
  );
};

export default QuickActions;
