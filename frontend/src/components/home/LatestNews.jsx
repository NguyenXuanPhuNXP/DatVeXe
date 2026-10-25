import React from 'react';
import { Link } from 'react-router-dom';

const LatestNews = () => {
  const news = [
    {
      img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80',
      date: '15/10/2023',
      title: 'Mở bán vé xe Tết Nguyên Đán 2024',
      summary: 'Rightway chính thức mở bán vé xe Tết Nguyên Đán 2024 với hàng ngàn chuyến xe phục vụ bà con về quê ăn Tết.',
      link: '#'
    },
    {
      img: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&q=80',
      date: '10/10/2023',
      title: 'Khai trương tuyến mới: TP.HCM - Măng Đen',
      summary: 'Trải nghiệm vùng đất Tây Nguyên huyền bí với tuyến xe giường nằm cao cấp từ TP.HCM đi Măng Đen.',
      link: '#'
    },
    {
      img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80',
      date: '05/10/2023',
      title: 'Cập nhật tính năng: Thanh toán qua Apple Pay',
      summary: 'Nhằm mang lại sự tiện lợi tối đa, Rightway đã tích hợp phương thức thanh toán Apple Pay trên ứng dụng.',
      link: '#'
    },
    {
      img: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&q=80',
      date: '01/10/2023',
      title: 'Top 5 hãng xe được yêu thích nhất tháng 9',
      summary: 'Cùng Rightway điểm danh 5 nhà xe được khách hàng đánh giá cao nhất trong tháng vừa qua.',
      link: '#'
    }
  ];

  return (
    <section className="latest-news">
      <div className="section-header">
        <h2>Tin tức mới nhất</h2>
        <Link to="#" className="view-all">Xem tất cả tin tức <i className="bi bi-arrow-right"></i></Link>
      </div>
      
      <div className="news-grid">
        {news.map((item, idx) => (
          <div className="news-card" key={idx}>
            <div className="news-img">
              <img src={item.img} alt={item.title} />
            </div>
            <div className="news-content">
              <span className="news-date">{item.date}</span>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <Link to={item.link} className="news-link">Xem chi tiết <i className="bi bi-arrow-right"></i></Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default LatestNews;
