import React from 'react';
import { useNavigate } from 'react-router-dom';
import SearchForm from './SearchForm';

const HeroSection = () => {
  return (
    <div className="hero-section-wrapper">
      <section className="hero">
        <div className="container hero-content">
          <div className="hero-text">
            <h1>Hành trình đẹp hơn cùng Rightway</h1>
            <p>không chỉ là chuyến đi, đó là những trải nghiệm đáng nhớ.</p>
          </div>
          <div className="hero-badges">
            <div className="hero-badge-item">
              <div className="hero-badge-icon">
                <i className="bi bi-check-lg"></i>
              </div>
              <div className="hero-badge-info">
                <h4>An toàn hàng đầu</h4>
                <p>Đội ngũ tài xế chuyên nghiệp</p>
              </div>
            </div>
            <div className="hero-badge-item">
              <div className="hero-badge-icon">
                <i className="bi bi-check-lg"></i>
              </div>
              <div className="hero-badge-info">
                <h4>Đúng giờ tuyệt đối</h4>
                <p>Cam kết không trễ giờ khởi hành</p>
              </div>
            </div>
            <div className="hero-badge-item">
              <div className="hero-badge-icon">
                <i className="bi bi-check-lg"></i>
              </div>
              <div className="hero-badge-info">
                <h4>Thoải mái tiện nghi</h4>
                <p>Xe đời mới giường nằm êm ái</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <div className="container">
        <div className="search-form-wrapper">
          <SearchForm />
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
