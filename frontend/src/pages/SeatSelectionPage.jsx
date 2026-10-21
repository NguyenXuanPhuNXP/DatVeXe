import React, { useState, useEffect } from 'react';
import BookingSteps from '../components/booking/BookingSteps';
import SearchHeader from '../components/search/SearchHeader';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { tripService } from '../services/api';
import '../styles/booking.css';

const SeatSelectionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Look for tripId in searchParams first, then location.state, then sessionStorage
  const resolvedTripId =
    searchParams.get('tripId') ||
    location.state?.trip?.id ||
    location.state?.tripId ||
    (() => {
      try {
        const stored = sessionStorage.getItem('currentBooking') || sessionStorage.getItem('rightwayBooking');
        return stored ? JSON.parse(stored)?.trip?.id : null;
      } catch {
        return null;
      }
    })();

  const resolvedTripDate =
    searchParams.get('date') ||
    location.state?.tripDate ||
    (() => {
      try {
        const stored = sessionStorage.getItem('currentBooking') || sessionStorage.getItem('rightwayBooking');
        const parsed = stored ? JSON.parse(stored) : null;
        return parsed?.tripDate || parsed?.departureDate;
      } catch {
        return null;
      }
    })() ||
    new Date().toISOString().split('T')[0];

  const [trip, setTrip] = useState(location.state?.trip || null);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [loading, setLoading] = useState(!location.state?.trip);
  const [error, setError] = useState('');
  const [activeFloor, setActiveFloor] = useState('lower');
  const [selectedSeats, setSelectedSeats] = useState([]);

  useEffect(() => {
    if (!resolvedTripId) {
      setLoading(false);
      setError('Chưa chọn chuyến xe. Vui lòng quay lại trang tìm kiếm để chọn chuyến.');
      return;
    }

    const fetchData = async () => {
      try {
        if (!trip) setLoading(true);
        setError('');

        const promises = [
          tripService.getSeats(resolvedTripId, resolvedTripDate).catch(() => ({ data: [] })),
        ];

        if (!trip) {
          promises.unshift(tripService.getById(resolvedTripId));
        }

        const results = await Promise.all(promises);

        if (!trip) {
          setTrip(results[0].data);
          const seatsRes = results[1];
          const booked = (seatsRes?.data || [])
            .filter((s) => s.status === 'booked' || s.status === 'held')
            .map((s) => s.seatCode);
          setBookedSeats(booked);
        } else {
          const seatsRes = results[0];
          const booked = (seatsRes?.data || [])
            .filter((s) => s.status === 'booked' || s.status === 'held')
            .map((s) => s.seatCode);
          setBookedSeats(booked);
        }
      } catch (err) {
        console.error('Error loading trip details:', err);
        setError('Không thể tải thông tin chuyến xe. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [resolvedTripId, resolvedTripDate]);

  const isSeatBooked = (seatCode) => {
    return bookedSeats.some((s) => {
      const normS = String(s).replace(/^([A-Za-z]+)0*(\d+)$/, (_, p, d) => `${p.toUpperCase()}${parseInt(d, 10)}`);
      const normTarget = String(seatCode).replace(/^([A-Za-z]+)0*(\d+)$/, (_, p, d) => `${p.toUpperCase()}${parseInt(d, 10)}`);
      return normS === normTarget;
    });
  };

  const handleSeatClick = (seatCode) => {
    if (isSeatBooked(seatCode)) return;

    if (selectedSeats.includes(seatCode)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seatCode));
    } else {
      setSelectedSeats([...selectedSeats, seatCode]);
    }
  };

  const handleContinue = () => {
    if (selectedSeats.length === 0 || !trip) return;

    const bookingData = {
      trip,
      tripDate: resolvedTripDate,
      selectedSeats,
      totalPrice: selectedSeats.length * (trip.price || 0),
    };

    sessionStorage.setItem('currentBooking', JSON.stringify(bookingData));
    sessionStorage.setItem('rightwayBooking', JSON.stringify(bookingData));
    navigate('/booking/passenger', { state: bookingData });
  };

  // Generate seats for 2 floors (Lower: A01..A18, Upper: B01..B18)
  const renderFloorSeats = (floorPrefix) => {
    const seats = [];
    const rows = 6;
    const cols = ['1', '2', '3'];

    for (let r = 1; r <= rows; r++) {
      for (const c of cols) {
        const num = (r - 1) * 3 + parseInt(c);
        const pad = num < 10 ? `0${num}` : `${num}`;
        const seatCode = `${floorPrefix}${pad}`;

        const isBooked = isSeatBooked(seatCode);
        const isSelected = selectedSeats.includes(seatCode);

        let className = 'seat';
        if (isBooked) className += ' booked';
        else if (isSelected) className += ' selected';

        seats.push(
          <div
            key={seatCode}
            className={className}
            onClick={() => handleSeatClick(seatCode)}
            title={isBooked ? `Ghế ${seatCode} (Đã đặt)` : `Ghế ${seatCode} (Trống)`}
          >
            {seatCode}
          </div>
        );
      }
    }
    return seats;
  };

  if (loading) {
    return (
      <div className="booking-page">
        <BookingSteps currentStep={2} />
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div className="spinner-border text-danger" role="status"></div>
          <p style={{ marginTop: '16px', color: '#6B7280' }}>Đang tải sơ đồ ghế ngồi...</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="booking-page">
        <BookingSteps currentStep={2} />
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '48px' }}></i>
          <p style={{ marginTop: '16px', color: '#EF4444' }}>{error || 'Không tìm thấy chuyến đi'}</p>
          <button className="btn-primary" onClick={() => navigate('/search')}>
            Quay lại tìm chuyến xe
          </button>
        </div>
      </div>
    );
  }

  const routeName = trip.route ? `${trip.route.origin} → ${trip.route.destination}` : 'Chuyến xe';
  const companyName = trip.company?.name || 'Nhà xe';
  const busType = trip.bus?.type || 'Giường nằm chất lượng cao';
  const price = trip.price || 0;
  const totalPrice = selectedSeats.length * price;

  return (
    <div className="booking-page">
      <BookingSteps currentStep={2} />
      <SearchHeader passengers={searchParams.get('passengers') || '1'} searchParams={searchParams} />

      <div className="container booking-layout" style={{ marginTop: '30px' }}>
        <div className="booking-main">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="summary-title" style={{ margin: 0 }}>Chọn chỗ ngồi</h2>
            <span style={{ fontSize: '14px', color: '#6B7280' }}>
              Xe: <strong>{busType}</strong> ({trip.bus?.name || ''})
            </span>
          </div>

          <div className="floor-tabs">
            <button
              className={`floor-tab ${activeFloor === 'lower' ? 'active' : ''}`}
              onClick={() => setActiveFloor('lower')}
            >
              Tầng dưới (A)
            </button>
            <button
              className={`floor-tab ${activeFloor === 'upper' ? 'active' : ''}`}
              onClick={() => setActiveFloor('upper')}
            >
              Tầng trên (B)
            </button>
          </div>

          <div className="seat-map-container">
            <div className="bus-front">
              <i className="bi bi-vinyl"></i>
              ĐẦU XE & TÀI XẾ
            </div>

            <div className="seat-grid">
              {activeFloor === 'lower' ? renderFloorSeats('A') : renderFloorSeats('B')}
            </div>

            <div className="seat-legend">
              <div className="legend-item">
                <div className="legend-box available"></div> Trống ({36 - bookedSeats.length} chỗ)
              </div>
              <div className="legend-item">
                <div className="legend-box selected"></div> Đang chọn ({selectedSeats.length})
              </div>
              <div className="legend-item">
                <div className="legend-box booked"></div> Đã đặt ({bookedSeats.length})
              </div>
            </div>
          </div>
        </div>

        <div className="booking-sidebar">
          <h2 className="summary-title">Thông tin chuyến đi</h2>

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
                {new Date(resolvedTripDate).toLocaleDateString('vi-VN', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Giờ khởi hành</span>
              <span className="summary-value" style={{ color: '#DC2626', fontWeight: 700 }}>
                {trip.departureTime}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Giá vé</span>
              <span className="summary-value">{price.toLocaleString('vi-VN')}đ / ghế</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Chỗ đã chọn</span>
              <span className="summary-value highlight">
                {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'Chưa chọn ghế'}
              </span>
            </div>
          </div>

          <div className="summary-total">
            <span className="total-label">Tổng tiền</span>
            <span className="total-amount">{totalPrice.toLocaleString('vi-VN')}đ</span>
          </div>

          <button
            className="btn-primary btn-full"
            disabled={selectedSeats.length === 0}
            onClick={handleContinue}
          >
            Tiếp tục nhập thông tin ({selectedSeats.length} vé)
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeatSelectionPage;
