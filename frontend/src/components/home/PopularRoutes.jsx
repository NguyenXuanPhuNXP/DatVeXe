import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const PopularRoutes = () => {
  const navigate = useNavigate();
  
  const routes = [
    { route: 'Hà Nội → Đà Nẵng', tag: 'Tuyến phổ biến', tagType: 'popular', time: '08:00 - 22:00', price: '260.000đ', company: 'Phương Trang, Hoàng Long', rating: '4.5', reviews: '12.1k' },
    { route: 'TP.HCM → Đà Lạt', tag: 'Tuyến phổ biến', tagType: 'popular', time: '05:00 - 23:00', price: '280.000đ', company: 'Thaco, Thành Bưởi', rating: '4.4', reviews: '9.8k' },
    { route: 'Hà Nội → Sapa', tag: 'Được yêu thích', tagType: 'favorite', time: '07:00 - 21:00', price: '320.000đ', company: 'Sapa Express, Inter Bus', rating: '4.6', reviews: '2.2k' },
    { route: 'Đà Nẵng → Huế', tag: 'Tuyến phổ biến', tagType: 'popular', time: '08:00 - 20:00', price: '150.000đ', company: 'Hạnh Cafe, Minh Long', rating: '4.3', reviews: '6.9k' },
    { route: 'TP.HCM → Nha Trang', tag: 'Tuyến mới', tagType: 'new', time: '06:30 - 22:30', price: '220.000đ', company: 'Phương Trang, Mai Linh', rating: '4.4', reviews: '8.1k' },
  ];

  return (
    <section className="popular-routes">
      <div className="section-header">
        <h2>Tuyến xe phổ biến</h2>
        <Link to="/search" className="view-all">Xem tất cả tuyến xe <i className="bi bi-arrow-right"></i></Link>
      </div>
      
      <div className="routes-table-container">
        <table className="routes-table">
          <thead>
            <tr>
              <th>Tuyến đường</th>
              <th>Thời gian khởi hành</th>
              <th>Giá vé từ</th>
              <th>Hãng xe</th>
              <th>Đánh giá</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((route, idx) => (
              <tr key={idx}>
                <td>
                  <div className="route-info-cell">
                    <span className="route-name">{route.route}</span>
                    <span className={`route-tag route-tag-${route.tagType}`}>{route.tag}</span>
                  </div>
                </td>
                <td>{route.time}</td>
                <td><span className="route-price">{route.price}</span></td>
                <td>{route.company}</td>
                <td>
                  <span className="rating">
                    <i className="bi bi-star-fill" style={{color: '#F59E0B', marginRight: '4px'}}></i>
                    <strong>{route.rating}</strong> <span style={{color: '#9CA3AF', fontSize: '13px'}}>({route.reviews})</span>
                  </span>
                </td>
                <td>
                  <button className="btn-primary" style={{padding: '6px 16px', fontSize: '14px', borderRadius: '4px'}} onClick={() => navigate('/search')}>Đặt vé</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default PopularRoutes;
