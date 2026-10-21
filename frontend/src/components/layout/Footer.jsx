import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Link to="/" className="logo">Rightway</Link>
            <p className="footer-desc">
              Rightway - Nền tảng đặt vé xe khách trực tuyến hàng đầu Việt Nam. Mang đến trải nghiệm an toàn, tiện ích và tin cậy cho mọi hành trình của bạn.
            </p>
            <div className="social-icons">
              <a href="#"><i className="bi bi-facebook"></i></a>
              <a href="#"><i className="bi bi-youtube"></i></a>
              <a href="#"><i className="bi bi-instagram"></i></a>
            </div>
          </div>
          
          <div className="footer-col">
            <h3>Về Rightway</h3>
            <ul>
              <li><Link to="#">Về chúng tôi</Link></li>
              <li><Link to="#">Lịch trình</Link></li>
              <li><Link to="#">Tuyển dụng</Link></li>
              <li><Link to="#">Tin tức & Sự kiện</Link></li>
            </ul>
          </div>
          
          <div className="footer-col">
            <h3>Hỗ trợ khách hàng</h3>
            <ul>
              <li><Link to="#">Hướng dẫn đặt vé</Link></li>
              <li><Link to="#">Câu hỏi thường gặp</Link></li>
              <li><Link to="#">Chính sách bảo mật</Link></li>
              <li><Link to="#">Điều khoản sử dụng</Link></li>
            </ul>
          </div>
          
          <div className="footer-col">
            <h3>Tải ứng dụng Rightway</h3>
            <div className="app-links">
              <button className="app-btn">
                <i className="bi bi-apple"></i>
                <div className="app-btn-text">
                  <span>Tải trên</span>
                  <span>App Store</span>
                </div>
              </button>
              <button className="app-btn">
                <i className="bi bi-google-play"></i>
                <div className="app-btn-text">
                  <span>Tải trên</span>
                  <span>Google Play</span>
                </div>
              </button>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Bản quyền thuộc về Rightway.</p>
          <p>An toàn &bull; Tiện ích &bull; Tin cậy</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
