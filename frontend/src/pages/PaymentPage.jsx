import { useState, useEffect, useMemo } from 'react';
import BookingSteps from '../components/booking/BookingSteps';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { useNotification } from '../context/notification-context';
import { bookingService } from '../services/api';
import '../styles/booking.css';

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addNotification, addSavedBooking } = useNotification();

  const [paymentMethod, setPaymentMethod] = useState('vnpay');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const bookingData = useMemo(() => {
    if (location.state) return location.state;
    try {
      return JSON.parse(sessionStorage.getItem('currentBooking') || sessionStorage.getItem('rightwayBooking') || 'null');
    } catch { return null; }
  }, [location.state]);
  useEffect(() => {
    if (!bookingData?.trip || !bookingData.selectedSeats?.length || !bookingData.passengerInfo) navigate('/search');
  }, [bookingData,navigate]);

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
        paymentMethod,
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
      addNotification({
        title: 'Đặt vé thành công! 🎉',
        message: `Đơn vé ${newBooking.bookingCode} (${routeName}) đang được giữ ghế trong 5 phút. Vui lòng thanh toán trước khi hết hạn.`,
        type: 'info',
        link: `/lookup?code=${newBooking.bookingCode}`,
        bookingCode: newBooking.bookingCode,
      });

      // Clear session
      sessionStorage.removeItem('currentBooking');
      sessionStorage.removeItem('rightwayBooking');

      // Navigate to lookup page with success indicator
      navigate(`/lookup?code=${newBooking.bookingCode}&success=1`);
    } catch (err) {
      console.error('Booking creation error:', err);
      setErrorMsg(
        err.response?.data?.message || 'Có lỗi xảy ra trong quá trình đặt vé. Vui lòng kiểm tra lại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!bookingData?.trip || !Array.isArray(bookingData.selectedSeats) || !bookingData.selectedSeats.length || !bookingData.passengerInfo) {
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
            {[['vnpay','VNPAY (QR / ngân hàng / thẻ)','Mở cổng VNPAY để thanh toán trong thời gian giữ ghế 5 phút.'],['bank_transfer','Chuyển khoản cho nhà xe','Liên hệ nhà xe để nhận thông tin ngân hàng. Nhân viên cần xác nhận đã nhận tiền trong 5 phút.']].map(([value,label,description]) => <label key={value} className={`payment-method ${paymentMethod===value?'active':''}`}><input type="radio" name="payment" checked={paymentMethod===value} onChange={()=>setPaymentMethod(value)}/><div><strong>{label}</strong><p>{description}</p></div></label>)}
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
            Ghế được giữ trong 5 phút từ khi tạo đơn. Sau khi thanh toán được xác nhận, hệ thống cấp QR vé và gửi vé qua email.
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
