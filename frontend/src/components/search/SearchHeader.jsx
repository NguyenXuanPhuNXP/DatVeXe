import React, { useState } from 'react';

const SearchHeader = ({ searchParams, onSearchSubmit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const currentOrigin = searchParams.get('origin') || '';
  const currentDestination = searchParams.get('destination') || '';
  const currentDate = searchParams.get('date') || '';
  const currentPassengers = searchParams.get('passengers') || '1';

  const [editOrigin, setEditOrigin] = useState(currentOrigin);
  const [editDestination, setEditDestination] = useState(currentDestination);
  const [editDate, setEditDate] = useState(currentDate);
  const [editPassengers, setEditPassengers] = useState(currentPassengers);

  const displayOrigin = currentOrigin || 'Tất cả điểm đi';
  const displayDestination = currentDestination || 'Tất cả điểm đến';
  const formattedDate = currentDate
    ? new Date(`${currentDate}T00:00:00`).toLocaleDateString('vi-VN')
    : 'Mọi ngày';

  const handleApply = (e) => {
    e.preventDefault();
    if (onSearchSubmit) {
      onSearchSubmit({
        origin: editOrigin.trim(),
        destination: editDestination.trim(),
        date: editDate,
        passengers: editPassengers,
      });
    }
    setIsEditing(false);
  };

  return (
    <div className="search-header-bar">
      <div className="container search-header-content">
        <div className="route-info">
          <h1>
            {displayOrigin} <i className="bi bi-arrow-right" style={{ fontSize: '16px' }}></i> {displayDestination}
          </h1>
          <div className="route-meta">
            <span><i className="bi bi-calendar-event"></i> {formattedDate}</span>
            <span><i className="bi bi-person"></i> {currentPassengers} hành khách</span>
          </div>
        </div>
        <button
          type="button"
          className="btn-outline"
          onClick={() => {
            setEditOrigin(currentOrigin);
            setEditDestination(currentDestination);
            setEditDate(currentDate);
            setEditPassengers(currentPassengers);
            setIsEditing(!isEditing);
          }}
          style={{ cursor: 'pointer' }}
        >
          {isEditing ? 'Đóng' : 'Thay đổi tìm kiếm'}
        </button>
      </div>

      {/* Quick Edit Search Drawer */}
      {isEditing && (
        <div className="container" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <form onSubmit={handleApply} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-light)', display: 'block', marginBottom: '4px' }}>
                Điểm đi
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Nhập nơi đi..."
                value={editOrigin}
                onChange={(e) => setEditOrigin(e.target.value)}
              />
            </div>

            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-light)', display: 'block', marginBottom: '4px' }}>
                Điểm đến
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Nhập nơi đến..."
                value={editDestination}
                onChange={(e) => setEditDestination(e.target.value)}
              />
            </div>

            <div style={{ flex: 1, minWidth: '130px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-light)', display: 'block', marginBottom: '4px' }}>
                Ngày đi
              </label>
              <input
                type="date"
                className="form-control"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>

            <div style={{ width: '110px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-light)', display: 'block', marginBottom: '4px' }}>
                Số khách
              </label>
              <select
                className="form-control"
                value={editPassengers}
                onChange={(e) => setEditPassengers(e.target.value)}
              >
                <option value="1">1 người</option>
                <option value="2">2 người</option>
                <option value="3">3 người</option>
                <option value="4">4 người</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" style={{ padding: '8px 18px', height: '38px' }}>
              <i className="bi bi-search"></i> Cập nhật
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default SearchHeader;
