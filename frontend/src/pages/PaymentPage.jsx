import React, { useState, useEffect } from 'react';
import { useState } from 'react';
import BookingSteps from '../components/booking/BookingSteps';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { bookingService } from '../services/api';
import '../styles/booking.css';

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addNotification, addSavedBooking } = useNotification();

  const [bookingData, setBookingData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('vnpay');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

    if (!data || !data.trip || !data.selectedSeats || !data.passengerInfo) {
      navigate('/search');
      return;
    }

    setBookingData(data);
  }, [location.state, navigate]);

  const handleConfirmBooking = async () => {
    if (!bookingData || submitting) return;

    try {
      setSubmitting(true);
      setErrorMsg('');

      const { trip, tripDate, selectedSeats, totalPrice, passengerInfo } = bookingData;

      const payload = {
        tripId: trip.id,
        tripDate,
        seatCodes: selectedSeats,
        seatCode: selectedSeats.join(', '),
        passengerName: passengerInfo.fullName,
        passengerPhone: passengerInfo.phone,
        passengerEmail: passengerInfo.email,
        paymentMethod:
          paymentMethod === 'vnpay'
            ? 'VNPAY'
            : paymentMethod === 'momo'
            ? 'Ví MoMo'
            : paymentMethod === 'card'
            ? 'Thẻ Quốc tế (Visa/Mastercard)'
            : paymentMethod === 'atm'
            ? 'Thẻ ATM nội địa'
            : 'Tiền mặt khi lên xe',
        totalPrice,
        userId: user?.id || null,
      };

      const res = await bookingService.create(payload);
      const newBooking = res.data;

      // Save to notification context & local storage
      addSavedBooking(newBooking);

      const routeName = trip.route
        ? `${trip.route.origin} → ${trip.route.destination}`
        : `${trip.origin || ''} → ${trip.destination || ''}`;
    // 2. Thử gọi backend API
    try {
      if (trip?.id) {
        const tripDate = /^\d{4}-\d{2}-\d{2}$/.test(departureDate)
          ? departureDate
          : (() => {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          })();
        await bookingService.create({
          tripId: trip.id,
          tripDate,
          seatCodes: selectedSeats,
          passengerName: passenger.name,
          passengerPhone: passenger.phone,
          passengerEmail: passenger.email,
          paymentMethod,
        });
      }
    } catch {
      // Cho phép offline / mock tiếp tục
    }

      addNotification({
        title: 'Đặt vé thành công! 🎉',
        message: `Đơn vé ${newBooking.bookingCode} (${routeName}) đã được gửi tới hệ thống và đang chờ Admin duyệt.`,
        type: 'info',
        link: `/lookup?code=${newBooking.bookingCode}`,
        bookingCode: newBooking.bookingCode,
      });

      // Clear session
      sessionStorage.removeItem('currentBooking');
      sessionStorage.removeItem('rightwayBooking');

      // Navigate to lookup page with success indicator
      navigate(`/lookup?code=${newBooking.bookingCode}&phone=${encodeURIComponent(passengerInfo.phone)}&success=1`);
    } catch (err) {
      console.error('Booking creation error:', err);
      setErrorMsg(
        err.response?.data?.message || 'Có lỗi xảy ra trong quá trình đặt vé. Vui lòng kiểm tra lại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!bookingData) {
    return null;
  }

  const { trip, tripDate, selectedSeats, totalPrice, passengerInfo } = bookingData;
  const routeName = trip.route
    ? `${trip.route.origin} → ${trip.route.destination}`
    : `${trip.origin || ''} → ${trip.destination || ''}`;
  const companyName = trip.company?.name || trip.company || 'Nhà xe';

  return (
    <div className="booking-page">
      <BookingSteps currentStep={4} />

      <div className="container booking-layout" style={{ marginTop: '30px' }}>
        <div className="booking-main">
          <h2 className="summary-title">Chọn hình thức thanh toán</h2>

          {errorMsg && (
            <div
              style={{
                backgroundColor: '#FEE2E2',
                borderLeft: '4px solid #EF4444',
                padding: '12px 16px',
                borderRadius: '8px',
                color: '#B91C1C',
                marginBottom: '20px',
                fontSize: '14px',
              }}
            >
              <i className="bi bi-exclamation-circle-fill" style={{ marginRight: '8px' }}></i>
              {errorMsg}
            </div>
          )}

          <div className="payment-methods">
            <label className={`payment-method ${paymentMethod === 'vnpay' ? 'active' : ''}`}>
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'vnpay'}
                onChange={() => setPaymentMethod('vnpay')}
              />
              <img
                src="https://vnpay.vn/s1/statics.vnpay.vn/2023/9/06ncktiwd6dc1694418189687.png"
                alt="VNPAY"
                style={{ height: '28px' }}
              />
              <div>
                <span style={{ fontWeight: 600, display: 'block' }}>Thanh toán qua VNPAY (QR / Ngân hàng)</span>
                <small style={{ color: '#6B7280' }}>Hỗ trợ tất cả ứng dụng ngân hàng và ví điện tử</small>
              </div>
            </label>

            <label className={`payment-method ${paymentMethod === 'momo' ? 'active' : ''}`}>
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'momo'}
                onChange={() => setPaymentMethod('momo')}
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png"
                alt="MoMo"
                style={{ height: '28px' }}
              />
              <div>
                <span style={{ fontWeight: 600, display: 'block' }}>Ví điện tử MoMo</span>
                <small style={{ color: '#6B7280' }}>Thanh toán tức thì qua ứng dụng MoMo</small>
              </div>
            </label>

            <label className={`payment-method ${paymentMethod === 'cash' ? 'active' : ''}`}>
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'cash'}
                onChange={() => setPaymentMethod('cash')}
              />
              <i className="bi bi-cash-stack" style={{ fontSize: '28px', color: '#10B981' }}></i>
              <div>
                <span style={{ fontWeight: 600, display: 'block' }}>Thanh toán bằng tiền mặt khi lên xe</span>
                <small style={{ color: '#6B7280' }}>Thanh toán trực tiếp cho phụ xe khi bắt đầu khởi hành</small>
              </div>
            </label>

            <label className={`payment-method ${paymentMethod === 'atm' ? 'active' : ''}`}>
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'atm'}
                onChange={() => setPaymentMethod('atm')}
              />
              <i className="bi bi-bank" style={{ fontSize: '28px', color: 'var(--primary)' }}></i>
              <div>
                <span style={{ fontWeight: 600, display: 'block' }}>Thẻ ATM nội địa (Internet Banking)</span>
                <small style={{ color: '#6B7280' }}>Miễn phí giao dịch</small>
              </div>
            </label>

            <label className={`payment-method ${paymentMethod === 'card' ? 'active' : ''}`}>
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'card'}
                onChange={() => setPaymentMethod('card')}
              />
              <i className="bi bi-credit-card" style={{ fontSize: '28px', color: 'var(--primary)' }}></i>
              <div>
                <span style={{ fontWeight: 600, display: 'block' }}>Thẻ quốc tế Visa / Mastercard / JCB</span>
                <small style={{ color: '#6B7280' }}>Bảo mật thanh toán 3D Secure</small>
              </div>
            </label>
          </div>

          <div
            style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#EFF6FF',
              borderRadius: '8px',
              border: '1px solid #BFDBFE',
              fontSize: '13px',
              color: '#1E40AF',
            }}
          >
            <i className="bi bi-shield-check" style={{ fontSize: '18px', marginRight: '8px', verticalAlign: 'middle' }}></i>
            Thông tin đặt vé của bạn được truyền đi an toàn và chuyển trực tiếp tới hệ thống quản lý để nhân viên xác nhận chỗ ngồi.
          </div>
        </div>

        <div className="booking-sidebar">
          <h2 className="summary-title">Chi tiết đơn đặt vé</h2>

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
              <span className="summary-label">Giờ chạy</span>
              <span className="summary-value" style={{ color: '#DC2626', fontWeight: 700 }}>
                {trip.departureTime}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Hành khách</span>
              <span className="summary-value">{passengerInfo.fullName}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Số điện thoại</span>
              <span className="summary-value">{passengerInfo.phone}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Vị trí ghế</span>
              <span className="summary-value highlight">{selectedSeats.join(', ')}</span>
            </div>
          </div>

          <div className="summary-total">
            <span className="total-label">Tổng thanh toán</span>
            <span className="total-amount">{(totalPrice || 0).toLocaleString('vi-VN')}đ</span>
          </div>

          <button
            type="button"
            className="btn-primary btn-full"
            disabled={submitting}
            onClick={handleConfirmBooking}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {submitting ? (
              <>
                <div className="spinner-border spinner-border-sm" role="status"></div>
                <span>Đang xử lý đặt vé...</span>
              </>
            ) : (
              <>
                <i className="bi bi-check2-circle"></i>
                <span>Xác nhận đặt vé</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
