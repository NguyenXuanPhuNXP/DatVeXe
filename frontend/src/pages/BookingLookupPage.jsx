import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { bookingService } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import '../styles/auth.css';
import '../styles/booking.css';

const BookingLookupPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCode = searchParams.get('code') || searchParams.get('bookingCode') || '';
  const urlPhone = searchParams.get('phone') || '';
  const isSuccessRedirect = searchParams.get('success') === '1';

  const { savedBookings, addNotification, addSavedBooking } = useNotification();

  const [bookingCode, setBookingCode] = useState(urlCode);
  const [phone, setPhone] = useState(urlPhone);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchBooking = useCallback(async (codeToLookup, phoneToLookup, isSilentRefresh = false) => {
    if (!codeToLookup || !codeToLookup.trim()) return;

    try {
      if (isSilentRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const res = await bookingService.lookup(codeToLookup.trim(), phoneToLookup ? phoneToLookup.trim() : undefined);
      setBooking(res.data);
      if (res.data) {
        addSavedBooking(res.data);
      }
    } catch (err) {
      console.error('Lookup error:', err);
      setBooking(null);
      setError(
        err.response?.data?.message ||
          'Không tìm thấy thông tin vé với mã đặt vé và số điện thoại trên. Vui lòng kiểm tra lại.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (urlCode) {
      setBookingCode(urlCode);
      if (urlPhone) setPhone(urlPhone);
      fetchBooking(urlCode, urlPhone);
    }
  }, [urlCode, urlPhone, fetchBooking]);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    if (!bookingCode.trim()) {
      setError('Vui lòng nhập mã đặt vé');
      return;
    }
    setSearchParams({ code: bookingCode.trim(), ...(phone.trim() ? { phone: phone.trim() } : {}) });
    fetchBooking(bookingCode.trim(), phone.trim());
  };

  const handleCopyCode = () => {
    if (!booking?.bookingCode) return;
    navigator.clipboard.writeText(booking.bookingCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    try {
      setCancelling(true);
      const res = await bookingService.cancel(booking.id, booking.passengerPhone);
      setBooking(res.data);
      setCancelModalOpen(false);
      addNotification({
        title: 'Hủy vé thành công',
        message: `Đơn vé ${booking.bookingCode} đã được hủy theo yêu cầu của bạn.`,
        type: 'danger',
        bookingCode: booking.bookingCode,
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể hủy vé vào lúc này');
    } finally {
      setCancelling(false);
    }
  };

  const renderStatusBanner = () => {
    if (!booking) return null;
    const status = booking.status;

    if (status === 'pending') {
      return (
        <div
          style={{
            backgroundColor: '#FFFBEB',
            border: '1px solid #FCD34D',
            borderLeft: '5px solid #F59E0B',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
          }}
        >
          <div style={{ fontSize: '28px', color: '#D97706', lineHeight: 1 }}>
            <i className="bi bi-hourglass-split" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span
                style={{
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  fontWeight: 700,
                  fontSize: '13px',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  border: '1px solid #FCD34D',
                }}
              >
                ĐANG CHỜ DUYỆT (CHỜ XỬ LÝ)
              </span>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>
                Hệ thống đang chờ quản trị viên xác nhận
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: '#78350F', lineHeight: '1.5' }}>
              Yêu cầu đặt vé của bạn đã được ghi nhận thành công. Ban quản trị đang kiểm duyệt chỗ ngồi.
              Bạn có thể nhấn nút <strong>"Làm mới trạng thái"</strong> bên dưới để cập nhật ngay khi vé được duyệt!
            </p>
          </div>
        </div>
      );
    }

    if (status === 'confirmed') {
      return (
        <div
          style={{
            backgroundColor: '#ECFDF5',
            border: '1px solid #6EE7B7',
            borderLeft: '5px solid #10B981',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
          }}
        >
          <div style={{ fontSize: '28px', color: '#059669', lineHeight: 1 }}>
            <i className="bi bi-check-circle-fill" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span
                style={{
                  backgroundColor: '#D1FAE5',
                  color: '#065F46',
                  fontWeight: 700,
                  fontSize: '13px',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  border: '1px solid #6EE7B7',
                }}
              >
                VÉ ĐÃ ĐƯỢC DUYỆT (ĐÃ XÁC NHẬN)
              </span>
              <span style={{ fontSize: '13px', color: '#059669', fontWeight: 600 }}>
                Hợp lệ để lên xe
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: '#064E3B', lineHeight: '1.5' }}>
              Vé của bạn đã được quản trị viên duyệt thành công! Vui lòng lưu lại mã đặt vé này và có mặt tại điểm đón trước giờ khởi hành ít nhất 15-30 phút.
            </p>
          </div>
        </div>
      );
    }

    if (status === 'completed') {
      return (
        <div
          style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #93C5FD',
            borderLeft: '5px solid #3B82F6',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
          }}
        >
          <div style={{ fontSize: '28px', color: '#2563EB', lineHeight: 1 }}>
            <i className="bi bi-patch-check-fill" />
          </div>
          <div style={{ flex: 1 }}>
            <span
              style={{
                backgroundColor: '#DBEAFE',
                color: '#1E40AF',
                fontWeight: 700,
                fontSize: '13px',
                padding: '3px 10px',
                borderRadius: '20px',
                border: '1px solid #93C5FD',
              }}
            >
              CHUYẾN ĐI ĐÃ HOÀN THÀNH
            </span>
            <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#1E3A8A' }}>
              Cảm ơn quý khách đã đồng hành cùng Rightway. Hẹn gặp lại quý khách ở những hành trình tiếp theo!
            </p>
          </div>
        </div>
      );
    }

    if (status === 'cancelled') {
      return (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderLeft: '5px solid #EF4444',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
          }}
        >
          <div style={{ fontSize: '28px', color: '#DC2626', lineHeight: 1 }}>
            <i className="bi bi-x-circle-fill" />
          </div>
          <div style={{ flex: 1 }}>
            <span
              style={{
                backgroundColor: '#FEE2E2',
                color: '#991B1B',
                fontWeight: 700,
                fontSize: '13px',
                padding: '3px 10px',
                borderRadius: '20px',
                border: '1px solid #FCA5A5',
              }}
            >
              VÉ NÀY ĐÃ BỊ HỦY
            </span>
            <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#7F1D1D' }}>
              Vé này đã bị hủy bỏ và không còn hiệu lực lên xe. Chỗ ngồi đã được giải phóng trên hệ thống.
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ minHeight: '80vh', backgroundColor: '#F9FAFB', padding: '40px 16px' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        {/* Success Banner if redirected from booking */}
        {isSuccessRedirect && (
          <div
            style={{
              backgroundColor: '#ECFDF5',
              border: '1px solid #6EE7B7',
              borderRadius: '12px',
              padding: '18px 24px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <i className="bi bi-check-circle-fill" style={{ fontSize: '28px', color: '#10B981' }} />
            <div>
              <h3 style={{ margin: 0, color: '#065F46', fontSize: '18px' }}>
                Đặt vé thành công!
              </h3>
              <p style={{ margin: '4px 0 0 0', color: '#047857', fontSize: '14px' }}>
                Mã đặt vé của bạn là <strong>{bookingCode}</strong>. Vé đang ở trạng thái <strong>Chờ duyệt</strong> và sẽ được Admin xác nhận sớm.
              </p>
            </div>
          </div>
        )}

        {/* Lookup Box */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '30px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            border: '1px solid #E5E7EB',
            marginBottom: '30px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: '0 0 8px 0' }}>
              Tra cứu thông tin đặt vé
            </h1>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
              Nhập mã vé để kiểm tra trạng thái phê duyệt của Ban quản trị và thông tin chuyến đi
            </p>
          </div>

          <form onSubmit={handleSearch}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Mã đặt vé <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: RW123456789"
                  value={bookingCode}
                  onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '15px',
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Số điện thoại <span style={{ color: '#9CA3AF' }}>(tùy chọn)</span>
                </label>
                <input
                  type="tel"
                  placeholder="Số điện thoại đặt vé"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '15px',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{
                  height: '46px',
                  padding: '0 28px',
                  fontSize: '15px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {loading ? (
                  <>
                    <div className="spinner-border spinner-border-sm" role="status" />
                    <span>Đang tìm...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-search" />
                    <span>Tra cứu</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick select from user recent bookings */}
          {savedBookings && savedBookings.length > 0 && (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #F3F4F6' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '8px' }}>
                Vé gần đây của bạn (nhấn để tra cứu nhanh):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {savedBookings.slice(0, 5).map((b) => (
                  <button
                    key={b.bookingCode}
                    type="button"
                    onClick={() => {
                      setBookingCode(b.bookingCode);
                      if (b.passengerPhone) setPhone(b.passengerPhone);
                      setSearchParams({ code: b.bookingCode });
                      fetchBooking(b.bookingCode, b.passengerPhone);
                    }}
                    style={{
                      background: booking?.bookingCode === b.bookingCode ? '#FEE2E2' : '#F3F4F6',
                      color: booking?.bookingCode === b.bookingCode ? '#DC2626' : '#374151',
                      border: `1px solid ${booking?.bookingCode === b.bookingCode ? '#FCA5A5' : '#E5E7EB'}`,
                      borderRadius: '20px',
                      padding: '4px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{b.bookingCode}</span>
                    {b.origin && <span style={{ color: '#6B7280', fontWeight: 400 }}>({b.origin} → {b.destination})</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: '20px',
                backgroundColor: '#FEE2E2',
                borderLeft: '4px solid #EF4444',
                padding: '12px 16px',
                borderRadius: '8px',
                color: '#B91C1C',
                fontSize: '14px',
              }}
            >
              <i className="bi bi-exclamation-circle-fill" style={{ marginRight: '8px' }} />
              {error}
            </div>
          )}
        </div>

        {/* Ticket Details Result */}
        {booking && (
          <div
            id="printable-ticket"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '30px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
              border: '1px solid #E5E7EB',
            }}
          >
            {/* Status explanation Banner */}
            {renderStatusBanner()}

            {/* Header: Code + Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '20px',
                borderBottom: '2px dashed #E5E7EB',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>MÃ ĐẶT VÉ</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '22px', fontWeight: 800, color: '#DC2626', letterSpacing: '1px' }}>
                    {booking.bookingCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    style={{
                      background: 'none',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      color: '#4B5563',
                      cursor: 'pointer',
                    }}
                  >
                    {copySuccess ? '✓ Đã sao chép' : 'Sao chép'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => fetchBooking(booking.bookingCode, booking.passengerPhone, true)}
                  disabled={refreshing}
                  style={{
                    backgroundColor: '#F3F4F6',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#374151',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title="Kiểm tra trạng thái duyệt mới nhất từ Admin"
                >
                  <i className={`bi bi-arrow-clockwise ${refreshing ? 'spin' : ''}`} />
                  <span>{refreshing ? 'Đang cập nhật...' : 'Làm mới trạng thái'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    backgroundColor: '#F3F4F6',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#374151',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <i className="bi bi-printer" />
                  <span>In vé</span>
                </button>

                {booking.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => setCancelModalOpen(true)}
                    style={{
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FCA5A5',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#DC2626',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <i className="bi bi-x-circle" />
                    <span>Hủy vé</span>
                  </button>
                )}
              </div>
            </div>

            {/* Grid Information */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              {/* Trip Section */}
              <div
                style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid #E5E7EB',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="bi bi-bus-front" style={{ color: '#DC2626' }} />
                  <span>Thông tin chuyến xe</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6B7280' }}>Tuyến đường:</span>
                    <span style={{ fontWeight: 700, color: '#111827' }}>
                      {booking.trip?.route?.origin} → {booking.trip?.route?.destination}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6B7280' }}>Nhà xe:</span>
                    <span style={{ fontWeight: 600 }}>{booking.trip?.company?.name || 'Nhà xe'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6B7280' }}>Loại xe:</span>
                    <span>{booking.trip?.bus?.type || 'Giường nằm chất lượng cao'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6B7280' }}>Ngày đi:</span>
                    <span style={{ fontWeight: 600 }}>
                      {new Date(booking.tripDate).toLocaleDateString('vi-VN', {
                        weekday: 'long',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6B7280' }}>Giờ xuất bến:</span>
                    <span style={{ color: '#DC2626', fontWeight: 700, fontSize: '16px' }}>
                      {booking.trip?.departureTime}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6B7280' }}>Chỗ ngồi:</span>
                    <span
                      style={{
                        backgroundColor: '#FEE2E2',
                        color: '#DC2626',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {booking.seatCode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Passenger & Payment Section */}
              <div
                style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid #E5E7EB',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="bi bi-person-badge" style={{ color: '#DC2626' }} />
                  <span>Hành khách & Thanh toán</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6B7280' }}>Họ tên hành khách:</span>
                    <span style={{ fontWeight: 600 }}>{booking.passengerName}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6B7280' }}>Số điện thoại:</span>
                    <span>{booking.passengerPhone}</span>
                  </div>

                  {booking.passengerEmail && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6B7280' }}>Email:</span>
                      <span>{booking.passengerEmail}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6B7280' }}>Hình thức thanh toán:</span>
                    <span>{booking.paymentMethod || 'Tiền mặt khi lên xe'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#6B7280' }}>Trạng thái thanh toán:</span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: booking.paymentStatus === 'paid' ? '#D1FAE5' : '#FEF3C7',
                        color: booking.paymentStatus === 'paid' ? '#065F46' : '#92400E',
                      }}
                    >
                      {booking.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      paddingTop: '8px',
                      borderTop: '1px solid #E5E7EB',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#374151' }}>Tổng tiền vé:</span>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#DC2626' }}>
                      {booking.totalPrice?.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div
              style={{
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid #E5E7EB',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                fontSize: '13px',
                color: '#6B7280',
              }}
            >
              <div>
                Thời gian tạo: {new Date(booking.createdAt).toLocaleString('vi-VN')}
              </div>
              <div>
                Cập nhật lần cuối: {new Date(booking.updatedAt).toLocaleString('vi-VN')}
              </div>
            </div>
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        {cancelModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '420px',
                width: '90%',
              }}
            >
              <h3 style={{ margin: '0 0 12px 0', color: '#111827', fontSize: '18px' }}>
                Xác nhận hủy đặt vé?
              </h3>
              <p style={{ margin: '0 0 20px 0', color: '#4B5563', fontSize: '14px', lineHeight: '1.5' }}>
                Bạn có chắc chắn muốn hủy đơn vé <strong>{booking?.bookingCode}</strong>? Chỗ ngồi sẽ được trả về trạng thái trống cho các hành khách khác.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={cancelling}
                  onClick={() => setCancelModalOpen(false)}
                >
                  Không, giữ lại vé
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={cancelling}
                  onClick={handleCancelBooking}
                >
                  {cancelling ? 'Đang hủy...' : 'Đồng ý hủy vé'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingLookupPage;
