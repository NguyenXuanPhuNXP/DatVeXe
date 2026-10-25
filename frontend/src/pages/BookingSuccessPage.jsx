import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/booking.css';

const getStoredCompletedBooking = () => {
  try {
    const raw = sessionStorage.getItem('lastCompletedBooking');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const formatPrice = (value) => {
  const num = Number(value || 0);
  return `${num.toLocaleString('vi-VN')}đ`;
};

const BookingSuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const booking = location.state?.booking || getStoredCompletedBooking() || {
    bookingCode: 'RW-250925-0147',
    trip: {
      origin: 'TP.HCM',
      destination: 'Đà Lạt',
      departureTime: '14:00',
      company: 'Phương Trang',
    },
    departureDate: '25/09/2025',
    passenger: {
      name: 'Nguyễn Văn A',
      phone: '0901234567',
      email: 'nguyenvana@gmail.com',
    },
    selectedSeats: ['A7'],
    totalAmount: 285000,
  };

  const trip = booking.trip || {};
  const passenger = booking.passenger || {};
  const seats = Array.isArray(booking.selectedSeats) && booking.selectedSeats.length > 0
    ? booking.selectedSeats.join(', ')
    : (booking.seatCode || 'A7');

  const routeText = trip.origin && trip.destination
    ? `${trip.origin} → ${trip.destination}`
    : 'TP.HCM → Đà Lạt';

  const dateText = booking.departureDate
    || (booking.tripDate ? new Date(booking.tripDate).toLocaleDateString('vi-VN') : '')
    || booking.bookingDate
    || new Date().toLocaleDateString('vi-VN');

  const handleViewTicket = () => {
    const query = new URLSearchParams({
      code: booking.bookingCode || '',
      phone: passenger.phone || '',
    }).toString();
    navigate(`/lookup?${query}`);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="booking-page booking-success-wrapper">
      <div className="container">
        <div className="booking-success-content">
          <div className="success-icon-badge">
            <i className="bi bi-check-lg"></i>
          </div>

          <h1 className="success-heading">Đặt vé thành công!</h1>
          <p className="success-subheading">Cảm ơn bạn đã sử dụng Rightway.</p>

          <div className="success-card">
            <h2 className="success-card-title">Chi tiết vé xe</h2>

            <div className="success-info-grid">
              <div className="success-info-item">
                <span className="success-info-label">Mã đặt vé</span>
                <span className="success-info-value">{booking.bookingCode || 'RW-250925-0147'}</span>
              </div>

              <div className="success-info-item">
                <span className="success-info-label">Tuyến đường</span>
                <span className="success-info-value">{routeText}</span>
              </div>

              <div className="success-info-item">
                <span className="success-info-label">Ngày đi</span>
                <span className="success-info-value">{dateText}</span>
              </div>

              <div className="success-info-item">
                <span className="success-info-label">Giờ khởi hành</span>
                <span className="success-info-value">{trip.departureTime || '14:00'}</span>
              </div>

              <div className="success-info-item">
                <span className="success-info-label">Chỗ ngồi</span>
                <span className="success-info-value">{seats}</span>
              </div>

              <div className="success-info-item">
                <span className="success-info-label">Hành khách</span>
                <span className="success-info-value">{passenger.name || 'Nguyễn Văn A'}</span>
              </div>

              <div className="success-info-item">
                <span className="success-info-label">Hãng xe</span>
                <span className="success-info-value">{trip.company || 'Phương Trang'}</span>
              </div>

              <div className="success-info-item">
                <span className="success-info-label">Tổng thanh toán</span>
                <span className="success-info-value success-price">
                  {formatPrice(booking.totalAmount || 285000)}
                </span>
              </div>
            </div>
          </div>

          <div className="success-actions">
            <button
              type="button"
              className="btn-success-primary"
              onClick={handleViewTicket}
            >
              Xem vé của tôi
            </button>
            <button
              type="button"
              className="btn-success-outline"
              onClick={handleGoHome}
            >
              Về trang chủ
            </button>
          </div>

          <p className="success-email-notice">
            Thông tin vé đã được gửi đến email của bạn.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccessPage;
