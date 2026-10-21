import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { adminService } from '../../services/adminApi';

const AdminReports = () => {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState({
    summary: {
      totalBookings: 0,
      totalRevenue: 0,
      paidCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
      completedCount: 0,
      averageOrderValue: 0,
    },
    bookings: [],
    filterOptions: {
      companies: [],
      routes: [],
    },
  });

  // Filter state
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    status: 'all',
    paymentStatus: 'all',
    companyId: 'all',
    routeId: 'all',
    search: '',
  });

  const [activeQuickDate, setActiveQuickDate] = useState('all');

  const fetchReports = useCallback(async (currentFilters = filters) => {
    setLoading(true);
    try {
      const cleanParams = {};
      Object.entries(currentFilters).forEach(([key, val]) => {
        if (val && val !== 'all') {
          cleanParams[key] = val;
        }
      });

      const response = await adminService.getReports(cleanParams);
      if (response?.data) {
        setReportData(response.data);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Handle Quick Date ranges
  const handleQuickDateSelect = (type) => {
    setActiveQuickDate(type);
    const now = new Date();
    let from = '';
    let to = '';

    const formatDateStr = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (type === 'today') {
      from = formatDateStr(now);
      to = formatDateStr(now);
    } else if (type === '7days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      from = formatDateStr(past);
      to = formatDateStr(now);
    } else if (type === '30days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 30);
      from = formatDateStr(past);
      to = formatDateStr(now);
    } else if (type === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      from = formatDateStr(startOfMonth);
      to = formatDateStr(now);
    } else if (type === 'all') {
      from = '';
      to = '';
    }

    const updated = { ...filters, fromDate: from, toDate: to };
    setFilters(updated);
    fetchReports(updated);
  };

  const handleFilterChange = (field, value) => {
    if (field === 'fromDate' || field === 'toDate') {
      setActiveQuickDate('custom');
    }
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    fetchReports(filters);
  };

  const handleResetFilters = () => {
    const defaultFilters = {
      fromDate: '',
      toDate: '',
      status: 'all',
      paymentStatus: 'all',
      companyId: 'all',
      routeId: 'all',
      search: '',
    };
    setActiveQuickDate('all');
    setFilters(defaultFilters);
    fetchReports(defaultFilters);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount) || 0);
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('xác nhận') || s === 'confirmed') return <span className="badge badge-success">Đã xác nhận</span>;
    if (s.includes('hoàn thành') || s === 'completed') return <span className="badge badge-success">Hoàn thành</span>;
    if (s.includes('chờ') || s === 'pending') return <span className="badge badge-warning">Chờ xử lý</span>;
    if (s.includes('hủy') || s === 'cancelled') return <span className="badge badge-danger">Đã hủy</span>;
    return <span className="badge badge-info">{status || 'Chờ xử lý'}</span>;
  };

  const getPaymentBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'paid' || s.includes('đã')) return <span className="badge badge-success">Đã thanh toán</span>;
    if (s === 'unpaid' || s.includes('chưa')) return <span className="badge badge-warning">Chưa thanh toán</span>;
    if (s === 'refunded' || s.includes('hoàn')) return <span className="badge badge-info">Đã hoàn tiền</span>;
    return <span className="badge">{status || 'Chưa thanh toán'}</span>;
  };

  // Export to Excel function
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const cleanParams = {};
      Object.entries(filters).forEach(([key, val]) => {
        if (val && val !== 'all') {
          cleanParams[key] = val;
        }
      });

      // Try downloading from backend first
      try {
        const response = await adminService.exportReportsExcel(cleanParams);
        const blob = new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const nowStr = new Date().toISOString().slice(0, 10);
        link.setAttribute('download', `Bao_cao_dat_ve_${nowStr}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
        return;
      } catch (backendErr) {
        console.warn('Backend export failed, falling back to client-side XLSX export:', backendErr);
      }

      // Fallback: Client-side XLSX export using loaded bookings
      const bookings = reportData.bookings || [];
      let totalRevenue = 0;
      const rows = bookings.map((b, index) => {
        const origin = b.trip?.route?.origin || '';
        const dest = b.trip?.route?.destination || '';
        const routeName = origin && dest ? `${origin} - ${dest}` : 'N/A';

        let statusText = 'Chờ xử lý';
        if (b.status === 'confirmed') statusText = 'Đã xác nhận';
        else if (b.status === 'completed') statusText = 'Hoàn thành';
        else if (b.status === 'cancelled') statusText = 'Đã hủy';

        let payStatusText = 'Chưa thanh toán';
        if (b.paymentStatus === 'paid') {
          payStatusText = 'Đã thanh toán';
          totalRevenue += Number(b.totalPrice) || 0;
        } else if (b.paymentStatus === 'refunded') {
          payStatusText = 'Đã hoàn tiền';
        }

        return {
          'STT': index + 1,
          'Mã vé': b.bookingCode || b.id,
          'Họ tên hành khách': b.passengerName,
          'Số điện thoại': b.passengerPhone,
          'Email': b.passengerEmail,
          'Tuyến đường': routeName,
          'Nhà xe': b.trip?.company?.name || 'N/A',
          'Loại xe': b.trip?.bus?.type || 'N/A',
          'Mã ghế': b.seatCode,
          'Ngày đi': b.tripDate ? new Date(b.tripDate).toLocaleDateString('vi-VN') : '',
          'Giờ chạy': b.trip?.departureTime || '',
          'Tổng tiền (VNĐ)': Number(b.totalPrice) || 0,
          'Trạng thái vé': statusText,
          'Thanh toán': payStatusText,
          'Hình thức': b.paymentMethod || 'Tiền mặt / Thẻ',
          'Thời gian đặt': b.createdAt ? new Date(b.createdAt).toLocaleString('vi-VN') : '',
        };
      });

      // Total row
      rows.push({
        'STT': '',
        'Mã vé': 'TỔNG CỘNG',
        'Họ tên hành khách': `${bookings.length} đơn`,
        'Số điện thoại': '',
        'Email': '',
        'Tuyến đường': '',
        'Nhà xe': '',
        'Loại xe': '',
        'Mã ghế': '',
        'Ngày đi': '',
        'Giờ chạy': '',
        'Tổng tiền (VNĐ)': totalRevenue,
        'Trạng thái vé': '',
        'Thanh toán': '',
        'Hình thức': '',
        'Thời gian đặt': '',
      });

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(rows);

      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 20 },
        { wch: 22 },
        { wch: 15 },
        { wch: 24 },
        { wch: 24 },
        { wch: 18 },
        { wch: 22 },
        { wch: 10 },
        { wch: 14 },
        { wch: 12 },
        { wch: 18 },
        { wch: 16 },
        { wch: 18 },
        { wch: 18 },
        { wch: 22 },
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, 'BaoCaoDatVe');
      const nowStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `Bao_cao_dat_ve_${nowStr}.xlsx`);
    } catch (err) {
      console.error('Error exporting excel:', err);
      alert('Có lỗi xảy ra khi xuất file Excel. Vui lòng thử lại!');
    } finally {
      setExporting(false);
    }
  };

  const { summary, bookings, filterOptions } = reportData;
  const cancellationRate = summary.totalBookings > 0
    ? Math.round((summary.cancelledCount / summary.totalBookings) * 100)
    : 0;

  return (
    <div>
      {/* Page Header */}
      <div className="reports-page-header">
        <div className="reports-page-title">
          <h1>Báo cáo & Thống kê Đặt vé</h1>
          <p>Phân tích hiệu quả kinh doanh, doanh thu và xuất dữ liệu báo cáo ra file Excel</p>
        </div>
        <button
          type="button"
          className="btn-excel"
          onClick={handleExportExcel}
          disabled={exporting || bookings.length === 0}
        >
          <i className="bi bi-file-earmark-excel"></i>
          {exporting ? 'Đang xuất Excel...' : 'Xuất Báo cáo Excel'}
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="reports-kpi-grid">
        <div className="kpi-card blue">
          <div className="kpi-label">Tổng lượt đặt vé</div>
          <div className="kpi-value">{summary.totalBookings.toLocaleString()}</div>
          <div className="kpi-subtext">Trong khoảng thời gian lọc</div>
        </div>

        <div className="kpi-card green">
          <div className="kpi-label">Doanh thu thực thu</div>
          <div className="kpi-value" style={{ color: '#10B981' }}>{formatCurrency(summary.totalRevenue)}</div>
          <div className="kpi-subtext">{summary.paidCount} vé đã thanh toán</div>
        </div>

        <div className="kpi-card purple">
          <div className="kpi-label">Giá trị đơn TB (AOV)</div>
          <div className="kpi-value">{formatCurrency(summary.averageOrderValue)}</div>
          <div className="kpi-subtext">Doanh thu / vé đã trả tiền</div>
        </div>

        <div className="kpi-card orange">
          <div className="kpi-label">Đơn chờ xử lý</div>
          <div className="kpi-value" style={{ color: '#F59E0B' }}>{summary.pendingCount}</div>
          <div className="kpi-subtext">Cần xác nhận thanh toán</div>
        </div>

        <div className="kpi-card red">
          <div className="kpi-label">Tỷ lệ hủy vé</div>
          <div className="kpi-value" style={{ color: '#EF4444' }}>{cancellationRate}%</div>
          <div className="kpi-subtext">{summary.cancelledCount} vé đã bị hủy</div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="reports-filter-panel">
        {/* Quick Date Pills */}
        <div className="quick-date-row">
          <span>Thời gian nhanh:</span>
          <button
            type="button"
            className={`quick-date-btn ${activeQuickDate === 'all' ? 'active' : ''}`}
            onClick={() => handleQuickDateSelect('all')}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`quick-date-btn ${activeQuickDate === 'today' ? 'active' : ''}`}
            onClick={() => handleQuickDateSelect('today')}
          >
            Hôm nay
          </button>
          <button
            type="button"
            className={`quick-date-btn ${activeQuickDate === '7days' ? 'active' : ''}`}
            onClick={() => handleQuickDateSelect('7days')}
          >
            7 Ngày qua
          </button>
          <button
            type="button"
            className={`quick-date-btn ${activeQuickDate === '30days' ? 'active' : ''}`}
            onClick={() => handleQuickDateSelect('30days')}
          >
            30 Ngày qua
          </button>
          <button
            type="button"
            className={`quick-date-btn ${activeQuickDate === 'month' ? 'active' : ''}`}
            onClick={() => handleQuickDateSelect('month')}
          >
            Tháng này
          </button>
        </div>

        {/* Detailed Filters Grid */}
        <form onSubmit={handleApplyFilters}>
          <div className="reports-filters-grid">
            <div className="filter-item">
              <label>Từ ngày</label>
              <input
                type="date"
                className="form-control"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
              />
            </div>

            <div className="filter-item">
              <label>Đến ngày</label>
              <input
                type="date"
                className="form-control"
                value={filters.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
              />
            </div>

            <div className="filter-item">
              <label>Trạng thái vé</label>
              <select
                className="form-control"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ xử lý</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="completed">Hoàn thành</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>

            <div className="filter-item">
              <label>Thanh toán</label>
              <select
                className="form-control"
                value={filters.paymentStatus}
                onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="paid">Đã thanh toán</option>
                <option value="unpaid">Chưa thanh toán</option>
                <option value="refunded">Đã hoàn tiền</option>
              </select>
            </div>

            <div className="filter-item">
              <label>Nhà xe</label>
              <select
                className="form-control"
                value={filters.companyId}
                onChange={(e) => handleFilterChange('companyId', e.target.value)}
              >
                <option value="all">Tất cả nhà xe</option>
                {filterOptions?.companies?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label>Tuyến đường</label>
              <select
                className="form-control"
                value={filters.routeId}
                onChange={(e) => handleFilterChange('routeId', e.target.value)}
              >
                <option value="all">Tất cả tuyến</option>
                {filterOptions?.routes?.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label>Tìm kiếm</label>
              <input
                type="text"
                placeholder="Mã vé, tên khách, SĐT..."
                className="form-control"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                <i className="bi bi-funnel"></i> Lọc
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleResetFilters}>
                <i className="bi bi-arrow-counterclockwise"></i>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Bookings Detailed Table */}
      <div className="admin-table-container">
        <div className="admin-table-header">
          <h2>Chi tiết danh sách đặt vé</h2>
          <span className="badge badge-info">{bookings.length} kết quả</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã vé</th>
                <th>Hành khách</th>
                <th>Tuyến đường</th>
                <th>Nhà xe</th>
                <th>Ghế</th>
                <th>Ngày đi</th>
                <th>Giờ chạy</th>
                <th>Giá vé</th>
                <th>Trạng thái</th>
                <th>Thanh toán</th>
                <th>Thời gian đặt</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="12" style={{ textAlign: 'center', padding: '36px', color: '#6B7280' }}>
                    <i className="bi bi-arrow-repeat" style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}></i> Đang tải dữ liệu báo cáo...
                  </td>
                </tr>
              ) : bookings.length > 0 ? (
                bookings.map((b, idx) => {
                  const origin = b.trip?.route?.origin || '';
                  const dest = b.trip?.route?.destination || '';
                  const routeName = origin && dest ? `${origin} - ${dest}` : 'N/A';
                  const tripDateStr = b.tripDate ? new Date(b.tripDate).toLocaleDateString('vi-VN') : '';
                  const createdAtStr = b.createdAt ? new Date(b.createdAt).toLocaleDateString('vi-VN') : '';

                  return (
                    <tr key={b.id || idx}>
                      <td>{idx + 1}</td>
                      <td><strong>{b.bookingCode || b.id}</strong></td>
                      <td>
                        <div><strong>{b.passengerName}</strong></div>
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>{b.passengerPhone}</div>
                      </td>
                      <td>{routeName}</td>
                      <td>{b.trip?.company?.name || 'N/A'}</td>
                      <td><span className="badge badge-info">{b.seatCode}</span></td>
                      <td>{tripDateStr}</td>
                      <td>{b.trip?.departureTime || ''}</td>
                      <td><strong style={{ color: '#DC2626' }}>{formatCurrency(b.totalPrice)}</strong></td>
                      <td>{getStatusBadge(b.status)}</td>
                      <td>{getPaymentBadge(b.paymentStatus)}</td>
                      <td style={{ fontSize: '13px', color: '#6B7280' }}>{createdAtStr}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="12" style={{ textAlign: 'center', padding: '36px', color: '#9CA3AF' }}>
                    Không có đơn đặt vé nào phù hợp với điều kiện lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
            {bookings.length > 0 && (
              <tfoot>
                <tr style={{ background: '#F9FAFB', fontWeight: 'bold' }}>
                  <td colSpan="8" style={{ textAlign: 'right', padding: '16px 24px' }}>
                    TỔNG DOANH THU ({summary.paidCount} vé đã thanh toán):
                  </td>
                  <td colSpan="4" style={{ padding: '16px 24px', color: '#DC2626', fontSize: '16px' }}>
                    {formatCurrency(summary.totalRevenue)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
