import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import SearchHeader from '../components/search/SearchHeader';
import FilterSidebar from '../components/search/FilterSidebar';
import TripCard from '../components/search/TripCard';
import { tripService } from '../services/api';
import '../styles/search.css';

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterOptions, setFilterOptions] = useState({
    companies: [],
    busTypes: [],
    minPrice: 100000,
    maxPrice: 1000000,
  });

  const [filters, setFilters] = useState({
    departurePeriods: [],
    maxPrice: undefined,
    companies: [],
    busTypes: [],
    rating: undefined,
  });

  const [sortBy, setSortBy] = useState('departure_asc');

  // Load filter options once
  useEffect(() => {
    let isMounted = true;
    tripService.getFilterOptions()
      .then((res) => {
        if (!isMounted || !res?.data) return;
        setFilterOptions(res.data);
        if (res.data.maxPrice) {
          setFilters((prev) => ({
            ...prev,
            maxPrice: prev.maxPrice ?? res.data.maxPrice,
          }));
        }
      })
      .catch((err) => {
        console.error('Error fetching filter options:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch trips based on searchParams, filters, and sort
  const fetchTrips = useCallback(() => {
    setLoading(true);
    setError('');

    const query = {};
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const date = searchParams.get('date');

    if (origin) query.origin = origin;
    if (destination) query.destination = destination;
    if (date) query.date = date;

    if (filters.maxPrice) query.maxPrice = filters.maxPrice;
    if (filters.departurePeriods?.length) query.departurePeriods = filters.departurePeriods.join(',');
    if (filters.companies?.length) query.companies = filters.companies.join(',');
    if (filters.busTypes?.length) query.busTypes = filters.busTypes.join(',');
    if (filters.rating) query.rating = filters.rating;
    if (sortBy) query.sort = sortBy;

    tripService.search(query)
      .then(({ data }) => {
        setTrips(
          data.map((trip) => ({
            id: trip.id,
            company: trip.company?.name || 'Nhà xe',
            busType: trip.bus?.type || 'Giường nằm',
            rating: trip.company?.rating ?? 4.5,
            reviews: trip.company?.totalReviews ?? 0,
            departureTime: trip.departureTime,
            origin: trip.route?.origin || '',
            arrivalTime: trip.arrivalTime,
            destination: trip.route?.destination || '',
            duration: trip.duration || '6h 00m',
            seatsAvailable: trip.seatsAvailable ?? 10,
            price: trip.price,
            image: trip.bus?.image || trip.company?.logo,
          }))
        );
      })
      .catch((err) => {
        console.error('Error searching trips:', err);
        setTrips([]);
        setError(err.response?.data?.message || 'Không thể tải danh sách chuyến xe. Vui lòng thử lại.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [searchParams, filters, sortBy]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilter = () => {
    setFilters({
      departurePeriods: [],
      maxPrice: filterOptions.maxPrice || 1000000,
      companies: [],
      busTypes: [],
      rating: undefined,
    });
    setSortBy('departure_asc');
  };

  const handleSearchSubmit = (newCriteria) => {
    const params = new URLSearchParams();
    if (newCriteria.origin) params.set('origin', newCriteria.origin);
    if (newCriteria.destination) params.set('destination', newCriteria.destination);
    if (newCriteria.date) params.set('date', newCriteria.date);
    if (newCriteria.passengers) params.set('passengers', newCriteria.passengers);
    setSearchParams(params);
  };

  const tripDate = searchParams.get('date');

  return (
    <div className="search-page">
      <SearchHeader
        searchParams={searchParams}
        onSearchSubmit={handleSearchSubmit}
      />

      <div className="container search-layout">
        <FilterSidebar
          filters={filters}
          filterOptions={filterOptions}
          onFilterChange={handleFilterChange}
          onClearFilter={handleClearFilter}
        />

        <section className="search-results">
          <div className="trip-list-header">
            <h2>
              {loading ? 'Đang tìm kiếm chuyến xe...' : `Có ${trips.length} chuyến xe phù hợp`}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="sort-trips" style={{ fontSize: '13px', color: 'var(--text-light)', whiteSpace: 'nowrap' }}>
                <i className="bi bi-arrow-down-up"></i> Sắp xếp:
              </label>
              <select
                id="sort-trips"
                className="sort-dropdown"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="departure_asc">Giờ khởi hành: Sớm nhất</option>
                <option value="departure_desc">Giờ khởi hành: Muộn nhất</option>
                <option value="price_asc">Giá vé: Thấp đến cao</option>
                <option value="price_desc">Giá vé: Cao đến thấp</option>
                <option value="rating_desc">Đánh giá: Cao nhất</option>
              </select>
            </div>
          </div>

          <div className="trip-list">
            {error && (
              <p className="empty-trips" role="alert" style={{ color: '#DC2626' }}>
                {error}
              </p>
            )}

            {loading && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                <i className="bi bi-arrow-repeat" style={{ display: 'inline-block', fontSize: '24px', animation: 'spin 1s linear infinite' }}></i>
                <p style={{ marginTop: '12px' }}>Đang nạp danh sách chuyến xe...</p>
              </div>
            )}

            {!loading && !error && trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} tripDate={tripDate} />
            ))}

            {!loading && !error && trips.length === 0 && (
              <div className="empty-trips" style={{ padding: '40px 20px' }}>
                <i className="bi bi-bus-front" style={{ fontSize: '48px', color: '#D1D5DB', display: 'block', marginBottom: '12px' }}></i>
                <h3>Không tìm thấy chuyến xe nào phù hợp</h3>
                <p style={{ marginTop: '8px', fontSize: '14px' }}>
                  Vui lòng điều chỉnh lại bộ lọc giá, giờ chạy, nhà xe hoặc chọn ngày đi khác.
                </p>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={handleClearFilter}
                  style={{ marginTop: '16px', cursor: 'pointer' }}
                >
                  Xoá toàn bộ bộ lọc
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SearchPage;
