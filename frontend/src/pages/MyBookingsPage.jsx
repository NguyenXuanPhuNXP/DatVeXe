import { formatTripDate } from '../utils/trip-date';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingService } from '../services/api';
import { useAuth } from '../context/auth-context';

const statuses = { pending: 'Chờ thanh toán', confirmed: 'Đã xác nhận', completed: 'Hoàn thành', cancelled: 'Đã hủy' };
const payments = { unpaid: 'Chưa thanh toán', paid: 'Đã thanh toán', refunded: 'Đã ghi nhận hoàn tiền' };

export default function MyBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data } = await bookingService.getMyBookings();
      setBookings(data.filter(b => b.userId === user.id));
    } catch { setError('Không tải được vé của bạn. Vui lòng thử lại.'); }
    finally { setLoading(false); }
  }, [user.id]);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) load(); });
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { active = false; clearInterval(timer); };
  }, [load]);
  return <div className="container" style={{ padding: '32px 16px', minHeight: '60vh' }}>
    <h1>Vé của tôi</h1>
    <p>Toàn bộ vé đã đặt bằng tài khoản {user.email}.</p>
    <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>Làm mới</button>
    {loading && <p role="status">Đang tải vé...</p>}
    {error && <p role="alert">{error}</p>}
    {!loading && !error && bookings.length === 0 && <p>Bạn chưa có vé nào. <Link to="/search">Tìm chuyến xe</Link></p>}
    {!error && <div style={{ display: 'grid', gap: 16, marginTop: 20 }}>
      {bookings.map(b => {
        const deadline = new Date(b.expiresAt || new Date(b.createdAt).getTime() + 300000).getTime();
        const canPay = b.status === 'pending' && b.paymentStatus === 'unpaid' && deadline > now;
        const expired = b.status === 'pending' && b.paymentStatus === 'unpaid' && deadline <= now;
        return <article key={b.id} style={{ padding: 20, border: '1px solid #d1d5db', borderRadius: 12, background: '#fff' }}>
          <h2 style={{ fontSize: 19 }}>{b.trip?.route?.origin} → {b.trip?.route?.destination}</h2>
          <p><strong>{b.bookingCode}</strong> · {b.trip?.company?.name}</p>
          <p>Ngày đi: {formatTripDate(b.tripDate, { timeZone: 'Asia/Ho_Chi_Minh' })} · Giờ: {b.trip?.departureTime} · Ghế: {b.seatCode}</p>
          <p>{Number(b.totalPrice).toLocaleString('vi-VN')}đ · {expired ? 'Hết hạn giữ ghế' : statuses[b.status] || b.status} · {payments[b.paymentStatus] || b.paymentStatus}</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className="btn btn-secondary" to={`/lookup?code=${encodeURIComponent(b.bookingCode)}`}>Xem chi tiết vé</Link>
            {canPay && <Link className="btn btn-primary" to={`/booking/payment?bookingId=${encodeURIComponent(b.id)}`}>Tiếp tục thanh toán</Link>}
          </div>
        </article>;
      })}
    </div>}
  </div>;
}
