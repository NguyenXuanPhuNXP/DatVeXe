import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { tripService } from '../services/api';
import '../styles/trip-detail.css';

const TripDetailPage = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState({ key: '', loading: true, trip: null, notFound: false, error: '' });
  const savedSearch = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('rightwaySearch') || '{}');
    } catch {
      return {};
    }
  })();
  const passengers = searchParams.get('passengers') || savedSearch.passengers || '1';

  useEffect(() => {
    let isCurrentRequest = true;

    tripService.getById(tripId)
      .then(({ data }) => {
        if (!isCurrentRequest) return;
        setResult({
          key: tripId,
          loading: false,
          trip: {
            id: data.id,
            company: data.company?.name || 'Nhà xe',
            busType: data.bus?.type || 'Thông tin xe chưa cập nhật',
            rating: Number(data.company?.rating ?? 0),
            reviews: Number(data.company?.totalReviews ?? 0),
            departureTime: data.departureTime,
            origin: data.route?.origin || '',
            arrivalTime: data.arrivalTime,
            destination: data.route?.destination || '',
            duration: data.duration,
            seatsAvailable: null,
            price: `${Number(data.price).toLocaleString('vi-VN')}đ`,
            amenities: Array.isArray(data.amenities) ? data.amenities : [],
          },
          notFound: false,
          error: '',
        });
      })
      .catch((requestError) => {
        if (!isCurrentRequest) return;
        const isNotFound = requestError.response?.status === 404;
        setResult({
          key: tripId,
          loading: false,
          trip: null,
          notFound: isNotFound,
          error: isNotFound ? '' : requestError.response?.data?.message || 'Không thể tải thông tin chuyến xe. Vui lòng thử lại.',
        });
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [tripId]);

  const currentResult = result.key === tripId ? result : null;
  const isLoading = !currentResult || currentResult.loading;
  const trip = currentResult?.trip;

  if (isLoading) {
    return (
      <section className="container trip-not-found" role="status">
        <p>Đang tải thông tin chuyến xe...</p>
      </section>
    );
  }

  if (currentResult.notFound) {
    return (
      <section className="container trip-not-found">
        <i className="bi bi-signpost-split" aria-hidden="true"></i>
        <h1>Không tìm thấy chuyến xe</h1>
        <p>Chuyến xe có thể đã bị gỡ hoặc đường dẫn không hợp lệ.</p>
        <Link className="btn-primary" to="/search">Quay lại tìm chuyến</Link>
      </section>
    );
  }

  if (currentResult.error || !trip) {
    return (
      <section className="container trip-not-found">
        <p role="alert">{currentResult.error || 'Không thể tải thông tin chuyến xe.'}</p>
        <Link className="btn-primary" to="/search">Quay lại tìm chuyến</Link>
      </section>
    );
  }

  return (
    <div className="trip-detail-page">
      <div className="trip-detail-topbar">
        <div className="container">
          <Link to="/search" className="trip-back-link"><i className="bi bi-arrow-left" aria-hidden="true"></i> Kết quả tìm kiếm</Link>
          <span>Chi tiết chuyến xe</span>
        </div>
      </div>

      <main className="container trip-detail-container">
        <header className="trip-detail-heading">
          <div>
            <p className="trip-detail-eyebrow">CHUYẾN XE {trip.origin} - {trip.destination}</p>
            <h1>{trip.company}</h1>
            <p className="trip-detail-subtitle">{trip.busType}</p>
          </div>
          <div className="trip-detail-rating">
            <i className="bi bi-star-fill" aria-hidden="true"></i>
            <strong>{trip.rating}</strong>
            <span>{trip.reviews.toLocaleString('vi-VN')} đánh giá</span>
          </div>
        </header>

        <div className="trip-detail-grid">
          <div className="trip-detail-main">
            <section className="trip-detail-section trip-itinerary">
              <div className="trip-section-heading">
                <h2>Hành trình</h2>
                <span><i className="bi bi-clock" aria-hidden="true"></i> {trip.duration}</span>
              </div>
              <div className="itinerary-stop">
                <div className="itinerary-time">{trip.departureTime}</div>
                <div className="itinerary-marker"><span></span></div>
                <div className="itinerary-place">
                  <strong>{trip.origin}</strong>
                  <span>Điểm đón</span>
                </div>
              </div>
              <div className="itinerary-connector"><span>Di chuyển {trip.duration}</span></div>
              <div className="itinerary-stop">
                <div className="itinerary-time">{trip.arrivalTime}</div>
                <div className="itinerary-marker destination"><span></span></div>
                <div className="itinerary-place">
                  <strong>{trip.destination}</strong>
                  <span>Điểm trả</span>
                </div>
              </div>
            </section>

            <section className="trip-detail-section">
              <div className="trip-section-heading"><h2>Thông tin chuyến</h2></div>
              <dl className="trip-info-list">
                <div><dt>Nhà xe</dt><dd>{trip.company}</dd></div>
                <div><dt>Dòng xe</dt><dd>{trip.busType}</dd></div>
                <div><dt>Số chỗ còn trống</dt><dd>{trip.seatsAvailable == null ? 'Kiểm tra khi chọn chỗ' : `${trip.seatsAvailable} chỗ`}</dd></div>
                <div><dt>Đánh giá</dt><dd><i className="bi bi-star-fill" aria-hidden="true"></i> {trip.rating} / 5 ({trip.reviews.toLocaleString('vi-VN')} đánh giá)</dd></div>
              </dl>
            </section>

            <section className="trip-detail-section">
              <div className="trip-section-heading"><h2>Tiện ích trên xe</h2></div>
              <ul className="trip-amenities">
                {trip.amenities.length
                  ? trip.amenities.map((amenity) => <li key={amenity}><i className="bi bi-check2" aria-hidden="true"></i>{amenity}</li>)
                  : <li>Thông tin tiện ích chưa được cập nhật.</li>}
              </ul>
            </section>

            <section className="trip-detail-section trip-policy">
              <div className="trip-section-heading"><h2>Lưu ý chuyến đi</h2></div>
              <p>Thông tin điểm đón, điểm trả và chỗ ngồi sẽ được xác nhận trong các bước đặt vé tiếp theo.</p>
            </section>
          </div>

          <aside className="trip-booking-panel">
            <p className="trip-booking-label">Giá vé từ</p>
            <p className="trip-booking-price">{trip.price}</p>
            <div className="trip-booking-summary">
              <div><span>Khởi hành</span><strong>{trip.departureTime}</strong></div>
              <div><span>Thời gian</span><strong>{trip.duration}</strong></div>
              <div><span>Còn trống</span><strong>{trip.seatsAvailable == null ? 'Kiểm tra khi chọn chỗ' : `${trip.seatsAvailable} chỗ`}</strong></div>
            </div>
            <button
              className="btn-primary trip-book-button"
              type="button"
              onClick={() => {
                const savedSearch = (() => {
                  try {
                    return JSON.parse(sessionStorage.getItem('rightwaySearch') || '{}');
                  } catch {
                    return {};
                  }
                })();
                const today = new Date().toISOString().split('T')[0];
                const passengers = savedSearch.passengers || '1';
                sessionStorage.setItem('rightwaySearch', JSON.stringify({ ...savedSearch, passengers }));
                navigate(`/booking/seats?tripId=${trip.id}&date=${today}&passengers=${passengers}`, {
                  state: { trip, tripDate: today, passengers },
                });
              }}
            >
              Chọn chuyến này <i className="bi bi-arrow-right" aria-hidden="true"></i>
            </button>
            <p className="trip-booking-note"><i className="bi bi-shield-check" aria-hidden="true"></i> Giá vé hiển thị cho một hành khách</p>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default TripDetailPage;