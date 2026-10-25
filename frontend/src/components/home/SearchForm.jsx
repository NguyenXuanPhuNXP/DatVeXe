import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const SearchForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storedSearch = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('rightwaySearch') || '{}');
    } catch {
      return {};
    }
  })();

  const [origin, setOrigin] = useState(searchParams.get('origin') || 'Hà Nội');
  const [destination, setDestination] = useState(searchParams.get('destination') || '');
  const [date, setDate] = useState(searchParams.get('date') || '');
  const [passengers, setPassengers] = useState(searchParams.get('passengers') || storedSearch.passengers || '1');

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (origin.trim()) params.set('origin', origin.trim());
    if (destination.trim()) params.set('destination', destination.trim());
    if (date) params.set('date', date);
    params.set('passengers', passengers);
    sessionStorage.setItem('rightwaySearch', JSON.stringify({ passengers, origin, destination, date }));
    navigate(`/search?${params.toString()}`);
  };

  return (
    <form className="search-form" onSubmit={handleSearch}>
      <div className="form-group">
        <i className="bi bi-geo-alt"></i>
        <div style={{width: '100%', position: 'relative'}}>
          <label>Từ</label>
          <input type="text" placeholder="Nhập điểm đi" style={{paddingTop: '16px'}} value={origin} onChange={(event) => setOrigin(event.target.value)} />
        </div>
      </div>
      
      <div className="form-group">
        <i className="bi bi-geo-alt-fill"></i>
        <div style={{width: '100%', position: 'relative'}}>
          <label>Đến</label>
          <input type="text" placeholder="Nhập điểm đến ví dụ Đà Nẵng" style={{paddingTop: '16px'}} value={destination} onChange={(event) => setDestination(event.target.value)} />
        </div>
      </div>
      
      <div className="form-group">
        <i className="bi bi-calendar-event"></i>
        <div style={{width: '100%', position: 'relative'}}>
          <label>Ngày đi</label>
          <input type="date" style={{paddingTop: '16px'}} value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
      </div>
      
      <div className="form-group">
        <i className="bi bi-person"></i>
        <div style={{width: '100%', position: 'relative'}}>
          <label>Số hành khách</label>
          <select style={{paddingTop: '16px'}} value={passengers} onChange={(event) => setPassengers(event.target.value)}>
            <option value="1">1 người</option>
            <option value="2">2 người</option>
            <option value="3">3 người</option>
            <option value="4">4 người</option>
          </select>
        </div>
      </div>
      
      <button type="submit" className="btn-primary search-btn" style={{display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap'}}>
        <i className="bi bi-search"></i> Tìm chuyến xe
      </button>
    </form>
  );
};

export default SearchForm;
