import React, { useState, useEffect } from 'react';
import BookingSteps from '../components/booking/BookingSteps';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/booking.css';


const getStoredBooking = () => {
  try {
    const stored = sessionStorage.getItem('rightwayBooking');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    return {};
  }
};

const parsePrice = (value) => {
  const normalized = Number(String(value || '0').replace(/[^\d]/g, ''));
  return Number.isNaN(normalized) ? 0 : normalized;
};

const PassengerInfoPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [bookingData, setBookingData] = useState(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let data = location.state;
    if (!data) {
      const stored = sessionStorage.getItem('currentBooking') || sessionStorage.getItem('rightwayBooking');
      if (stored) {
        try {
          data = JSON.parse(stored);
        } catch {
          // ignore
        }
      }
    }

    if (!data || !data.trip || !data.selectedSeats || data.selectedSeats.length === 0) {
      navigate('/search');
      return;
    }

    setBookingData(data);

    // Auto-fill from user context if available
    if (user) {
      if (user.fullName && !fullName) setFullName(user.fullName);
      if (user.email && !email) setEmail(user.email);
      if (user.phone && !phone) setPhone(user.phone);
    }
  }, [location.state, navigate, user]);

  const validate = () => {
    const newErrors = {};
    if (!fullName.trim()) newErrors.fullName = 'Vui lòng nhập họ và tên';
    if (!phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/(84|0[3|5|7|8|9])+([0-9]{8})\b/.test(phone.trim())) {
      newErrors.phone = 'Số điện thoại không đúng định dạng';
    }
    if (!email.trim()) {
      newErrors.email = 'Vui lòng nhập địa chỉ email';
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      newErrors.email = 'Email không hợp lệ';
    }
    if (!acceptedTerms) {
      newErrors.terms = 'Bạn cần đồng ý với điều khoản đặt vé';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const passengerInfo = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      notes: notes.trim(),
    };

    const updatedData = {
      ...bookingData,
      passengerInfo,
    };

    sessionStorage.setItem('currentBooking', JSON.stringify(updatedData));
    sessionStorage.setItem('rightwayBooking', JSON.stringify(updatedData));
    navigate('/booking/payment', { state: updatedData });
  };

  if (!bookingData) {
    return null;
  }

  const { trip, tripDate, selectedSeats, totalPrice } = bookingData;
  const routeName = trip.route ? `${trip.route.origin} → ${trip.route.destination}` : `${trip.origin || ''} → ${trip.destination || ''}`;
  const companyName = trip.company?.name || trip.company || 'Nhà xe';

  return (
    <div className="booking-page">
      <BookingSteps currentStep={3} />

      <div className="container booking-layout" style={{ marginTop: '30px' }}>
        <div className="booking-main">
          <h2 className="summary-title">Thông tin hành khách</h2>

          <form onSubmit={handleContinue}>
            <div className="form-section-title">Người đi xe / Người đặt vé</div>

            <div className="form-grid">
              <div className="input-group">
                <label>Họ và tên *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ borderColor: errors.fullName ? '#EF4444' : undefined }}
                />
                {errors.fullName && (
                  <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px' }}>
                    {errors.fullName}
                  </span>
                )}
              </div>

              <div className="input-group">
                <label>Số điện thoại *</label>
                <input
                  type="tel"
                  placeholder="Ví dụ: 0912345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ borderColor: errors.phone ? '#EF4444' : undefined }}
                />
                {errors.phone && (
                  <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px' }}>
                    {errors.phone}
                  </span>
                )}
              </div>

              <div className="input-group">
                <label>Email nhận vé *</label>
                <input
                  type="email"
                  placeholder="Ví dụ: email@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ borderColor: errors.email ? '#EF4444' : undefined }}
                />
                {errors.email && (
                  <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px' }}>
                    {errors.email}
                  </span>
                )}
              </div>
            </div>

            <div className="input-group" style={{ marginTop: '16px' }}>
              <label>Ghi chú đón / trả hoặc yêu cầu đặc biệt</label>
              <textarea
                rows="2"
                placeholder="Điểm đón cụ thể, hành lý cồng kềnh..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ marginTop: '20px', fontSize: '14px', color: 'var(--text-light)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                />
                <span>Tôi đồng ý với điều khoản đặt vé và chính sách bảo mật của Rightway</span>
              </label>
              {errors.terms && (
                <div style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px' }}>
                  {errors.terms}
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="booking-sidebar">
          <h2 className="summary-title">Thông tin đặt vé</h2>

          <div className="summary-details">
            <div className="summary-row">
              <span className="summary-label">Tuyến đường</span>
              <span className="summary-value" style={{ fontWeight: 600 }}>{routeName}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Nhà xe</span>
              <span className="summary-value">{companyName}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Ngày đi</span>
              <span className="summary-value">
                {tripDate ? new Date(tripDate).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                }) : 'Hôm nay'}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Giờ khởi hành</span>
              <span className="summary-value" style={{ color: '#DC2626', fontWeight: 700 }}>
                {trip.departureTime}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Chỗ đã chọn</span>
              <span className="summary-value highlight">{selectedSeats.join(', ')}</span>
            </div>
          </div>

          <div className="summary-total">
            <span className="total-label">Tổng tiền</span>
            <span className="total-amount">{(totalPrice || 0).toLocaleString('vi-VN')}đ</span>
          </div>

          <button
            type="button"
            className="btn-primary btn-full"
            onClick={handleContinue}
          >
            Tiếp tục thanh toán
          </button>
        </div>
      </div>
    </div>
  );
};

export default PassengerInfoPage;
