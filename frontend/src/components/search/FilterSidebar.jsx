import React from 'react';

const DEPARTURE_PERIODS = [
  { id: 'early', label: 'Sáng sớm 00:00 - 06:00' },
  { id: 'morning', label: 'Sáng 06:00 - 12:00' },
  { id: 'afternoon', label: 'Chiều 12:00 - 18:00' },
  { id: 'evening', label: 'Tối 18:00 - 24:00' },
];

const FilterSidebar = ({
  filters,
  filterOptions,
  onFilterChange,
  onClearFilter,
}) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount) || 0);
  };

  const handlePeriodToggle = (periodId) => {
    const current = filters.departurePeriods || [];
    const updated = current.includes(periodId)
      ? current.filter((p) => p !== periodId)
      : [...current, periodId];
    onFilterChange('departurePeriods', updated);
  };

  const handleCompanyToggle = (companyName) => {
    const current = filters.companies || [];
    const updated = current.includes(companyName)
      ? current.filter((c) => c !== companyName)
      : [...current, companyName];
    onFilterChange('companies', updated);
  };

  const handleBusTypeToggle = (type) => {
    const current = filters.busTypes || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    onFilterChange('busTypes', updated);
  };

  const minPrice = filterOptions?.minPrice || 100000;
  const maxPrice = filterOptions?.maxPrice || 1000000;
  const currentMaxPrice = filters.maxPrice || maxPrice;

  return (
    <div className="filter-sidebar">
      <div className="filter-header">
        <h2>Bộ lọc tìm kiếm</h2>
        <button
          type="button"
          className="clear-filter"
          onClick={onClearFilter}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
        >
          Xoá lọc
        </button>
      </div>

      {/* Giờ khởi hành */}
      <div className="filter-group">
        <h3>Giờ khởi hành</h3>
        <div className="checkbox-group">
          {DEPARTURE_PERIODS.map((period) => (
            <label key={period.id} className="checkbox-label">
              <input
                type="checkbox"
                checked={(filters.departurePeriods || []).includes(period.id)}
                onChange={() => handlePeriodToggle(period.id)}
              />
              <span>{period.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Khoảng giá */}
      <div className="filter-group">
        <h3>
          Khoảng giá tối đa:{' '}
          <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
            {formatCurrency(currentMaxPrice)}
          </span>
        </h3>
        <div className="range-slider">
          <input
            type="range"
            min={minPrice}
            max={maxPrice}
            step="20000"
            value={currentMaxPrice}
            onChange={(e) => onFilterChange('maxPrice', Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
          />
          <div className="range-values">
            <span>{formatCurrency(minPrice)}</span>
            <span>{formatCurrency(maxPrice)}</span>
          </div>
        </div>
      </div>

      {/* Nhà xe */}
      {filterOptions?.companies?.length > 0 && (
        <div className="filter-group">
          <h3>Nhà xe</h3>
          <div className="checkbox-group">
            {filterOptions.companies.map((company) => (
              <label key={company.id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={(filters.companies || []).includes(company.name)}
                  onChange={() => handleCompanyToggle(company.name)}
                />
                <span>{company.name} {company.rating ? `(${company.rating}★)` : ''}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Loại xe */}
      {filterOptions?.busTypes?.length > 0 && (
        <div className="filter-group">
          <h3>Loại xe</h3>
          <div className="checkbox-group">
            {filterOptions.busTypes.map((type) => (
              <label key={type} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={(filters.busTypes || []).includes(type)}
                  onChange={() => handleBusTypeToggle(type)}
                />
                <span>{type}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Đánh giá */}
      <div className="filter-group">
        <h3>Đánh giá tối thiểu</h3>
        <div className="checkbox-group">
          {[4.5, 4.0, 3.5].map((ratingVal) => (
            <label key={ratingVal} className="checkbox-label">
              <input
                type="radio"
                name="ratingFilter"
                checked={filters.rating === ratingVal}
                onChange={() => onFilterChange('rating', filters.rating === ratingVal ? undefined : ratingVal)}
                onClick={() => {
                  if (filters.rating === ratingVal) {
                    onFilterChange('rating', undefined);
                  }
                }}
              />
              <span style={{ color: '#F59E0B' }}>
                <i className="bi bi-star-fill"></i> {ratingVal} sao trở lên
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterSidebar;
