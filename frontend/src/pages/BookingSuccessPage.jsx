import { Navigate, useLocation } from 'react-router-dom';

// Resolve legacy links through lookup, which reads payment status from the API.
export default function BookingSuccessPage() {
  const location = useLocation();
  let storedBooking = null;
  try { storedBooking = JSON.parse(sessionStorage.getItem('lastCompletedBooking') || 'null'); } catch { /* No saved booking. */ }
  const booking = location.state?.booking || storedBooking;
  const code = booking?.bookingCode;
  return <Navigate replace to={code ? '/lookup?code=' + encodeURIComponent(code) + '&success=1' : '/lookup'} />;
}
