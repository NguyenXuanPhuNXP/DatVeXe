import React from 'react';
import { Link } from 'react-router-dom';

const Promotions = () => {
  const promos = [
    {
      img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80',
      tag: 'Giảm giá',
      title: 'Giảm 20% cho khách hàng mới',
      desc: 'Áp dụng cho tất cả các tuyến đường trên toàn quốc.',
      link: '#'
    },
    {
      img: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&q=80',
      tag: 'Combo hành khách',
      title: 'Mua 3 tặng 1',
      desc: 'Ưu đãi đặc biệt khi đặt vé nhóm từ 4 người trở lên.',
      link: '#'
    },
    {
      img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80',
      tag: 'Hot deal',
      title: 'Flash Sale cuối tuần',
      desc: 'Giảm ngay 50K khi đặt vé vào thứ 7 và Chủ nhật.',
      link: '#'
    },
    {
      img: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&q=80',
      tag: 'FREETRIP',
      title: 'Nhập mã FREETRIP',
      desc: 'Cơ hội nhận chuyến đi miễn phí khi tham gia vòng quay may mắn.',
      link: '#'
    }
  ];

  return (
    <section className="promotions">
      <div className="section-header">
        <h2>Ưu đãi nổi bật</h2>
        <Link to="#" className="view-all">Xem tất cả ưu đãi <i className="bi bi-arrow-right"></i></Link>
      </div>
      
      <div className="promotions-grid">
        {promos.map((promo, idx) => (
          <div className="promo-card" key={idx}>
            <div className="promo-img">
              <img src={promo.img} alt={promo.title} />
              <span className="promo-tag">{promo.tag}</span>
            </div>
            <div className="promo-content">
              <h3>{promo.title}</h3>
              <p>{promo.desc}</p>
              <Link to={promo.link} className="promo-link">Xem chi tiết</Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Promotions;
