import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminApi';
// Mock data for initial rendering and fallback
const DEFAULT_STATS = {
  totalBookings: 0,
  revenue: 0,
  users: 0,
  trips: 0,
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [recentBookings, setRecentBookings] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);
  const [statusCounts, setStatusCounts] = useState({ confirmed: 0, pending: 0, completed: 0, cancelled: 0 });
  const [topRoutes, setTopRoutes] = useState([]);
  const [chartView, setChartView] = useState('monthly'); // 'monthly' or 'daily'
  const [hoveredBar, setHoveredBar] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      try {
        const response = await adminService.getDashboard();
        if (!isMounted || !response?.data) return;

        const data = response.data;
        setStats({
          totalBookings: data.totalBookings ?? 0,
          revenue: data.revenue ?? 0,
          users: data.totalUsers ?? data.users ?? 0,
          trips: data.totalTrips ?? data.trips ?? 0,
        });

        if (Array.isArray(data.monthlyStats)) setMonthlyStats(data.monthlyStats);
        if (Array.isArray(data.dailyStats)) setDailyStats(data.dailyStats);
        if (data.statusCounts) setStatusCounts(data.statusCounts);
        if (Array.isArray(data.topRoutes)) setTopRoutes(data.topRoutes);

        if (Array.isArray(data.recentBookings)) {
          setRecentBookings(
            data.recentBookings.map((b) => {
              const origin = b.trip?.route?.origin || '';
              const destination = b.trip?.route?.destination || '';
              const routeName = origin && destination ? `${origin} - ${destination}` : (b.route || 'N/A');
              const tripDateStr = b.tripDate ? new Date(b.tripDate).toLocaleDateString('vi-VN') : (b.date || '');

              let statusLabel = 'Chờ xử lý';
              const rawStatus = String(b.status || '').toLowerCase();
              if (rawStatus === 'confirmed' || rawStatus.includes('xác nhận')) statusLabel = 'Đã xác nhận';
              else if (rawStatus === 'completed' || rawStatus.includes('hoàn thành')) statusLabel = 'Hoàn thành';
              else if (rawStatus === 'cancelled' || rawStatus.includes('hủy')) statusLabel = 'Đã hủy';

              return {
                id: b.bookingCode || b.id || 'RW0000',
                passenger: b.passengerName || b.passenger || 'Khách hàng',
                phone: b.passengerPhone || '',
                route: routeName,
                company: b.trip?.company?.name || 'N/A',
                date: tripDateStr,
                price: Number(b.totalPrice ?? b.price ?? 0),
                status: statusLabel,
              };
            })
          );
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount) || 0);
  };

  const formatShortCurrency = (amount) => {
    const num = Number(amount) || 0;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)} tr`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)} k`;
    return `${num} đ`;
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('xác nhận') || s === 'confirmed') return <span className="badge badge-success">Đã xác nhận</span>;
    if (s.includes('hoàn thành') || s === 'completed') return <span className="badge badge-success">Hoàn thành</span>;
    if (s.includes('chờ') || s === 'pending') return <span className="badge badge-warning">Chờ xử lý</span>;
    if (s.includes('hủy') || s === 'cancelled') return <span className="badge badge-danger">Đã hủy</span>;
    return <span className="badge badge-info">{status || 'Chờ xử lý'}</span>;
  };

  // Chart data calculations
  const chartData = chartView === 'monthly' ? monthlyStats : dailyStats;
  const maxRevenue = Math.max(...chartData.map((d) => d.revenue || 0), 1000000);
  const totalChartRevenue = chartData.reduce((acc, cur) => acc + (cur.revenue || 0), 0);
  const totalChartBookings = chartData.reduce((acc, cur) => acc + (cur.bookings || 0), 0);

  // Status breakdown calculations
  const totalStatusBookings = Object.values(statusCounts).reduce((a, b) => a + b, 0) || 1;
  const statusItems = [
    { label: 'Đã xác nhận', count: statusCounts.confirmed || 0, color: '#10B981', bg: '#DEF7EC' },
    { label: 'Hoàn thành', count: statusCounts.completed || 0, color: '#3B82F6', bg: '#E1EFFE' },
    { label: 'Chờ xử lý', count: statusCounts.pending || 0, color: '#F59E0B', bg: '#FEF3C7' },
    { label: 'Đã hủy', count: statusCounts.cancelled || 0, color: '#EF4444', bg: '#FEE2E2' },
  ];

  return (
    <div>
      {/* Stat Cards */}
      <div className="admin-stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><i className="bi bi-ticket-detailed"></i></div>
          <div className="stat-info">
            <h3>Tổng đặt vé</h3>
            <p>{(stats?.totalBookings ?? 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green"><i className="bi bi-currency-dollar"></i></div>
          <div className="stat-info">
            <h3>Tổng doanh thu</h3>
            <p>{formatCurrency(stats?.revenue ?? 0)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple"><i className="bi bi-people"></i></div>
          <div className="stat-info">
            <h3>Người dùng</h3>
            <p>{(stats?.users ?? 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange"><i className="bi bi-bus-front"></i></div>
          <div className="stat-info">
            <h3>Chuyến xe</h3>
            <p>{(stats?.trips ?? 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="dashboard-charts-grid">
        {/* Interactive SVG Bar Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h2><i className="bi bi-bar-chart-line-fill" style={{ color: '#DC2626' }}></i> Biểu đồ doanh thu</h2>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>
                Tổng kỳ này: <strong style={{ color: '#111827' }}>{formatCurrency(totalChartRevenue)}</strong> ({totalChartBookings} vé)
              </span>
            </div>
            <div className="chart-tabs">
              <button
                type="button"
                className={`chart-tab-btn ${chartView === 'monthly' ? 'active' : ''}`}
                onClick={() => setChartView('monthly')}
              >
                6 Tháng gần nhất
              </button>
              <button
                type="button"
                className={`chart-tab-btn ${chartView === 'daily' ? 'active' : ''}`}
                onClick={() => setChartView('daily')}
              >
                7 Ngày gần nhất
              </button>
            </div>
          </div>

          {/* SVG Bar Chart with Hover Tooltip */}
          <div className="svg-chart-container">
            <svg className="svg-chart" viewBox="0 0 600 240" preserveAspectRatio="none">
              {/* Background horizontal grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                const y = 200 - ratio * 160;
                return (
                  <g key={index}>
                    <line x1="40" y1={y} x2="580" y2={y} stroke="#F3F4F6" strokeWidth="1" strokeDasharray="3,3" />
                    <text x="35" y={y + 4} textAnchor="end" fontSize="10" fill="#9CA3AF">
                      {formatShortCurrency(maxRevenue * ratio)}
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {chartData.map((item, index) => {
                const totalBars = chartData.length;
                const barSlotWidth = 520 / totalBars;
                const barWidth = Math.min(36, barSlotWidth * 0.6);
                const x = 50 + index * barSlotWidth + (barSlotWidth - barWidth) / 2;
                const barHeight = maxRevenue > 0 ? ((item.revenue || 0) / maxRevenue) * 160 : 0;
                const y = 200 - barHeight;
                const isHovered = hoveredBar === index;
                const label = item.month || item.date || `Kỳ ${index + 1}`;

                return (
                  <g
                    key={index}
                    className="chart-bar-hover"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredBar(index)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {/* Background bar highlight on hover */}
                    {isHovered && (
                      <rect x={x - 6} y="30" width={barWidth + 12} height="170" fill="#FEE2E2" rx="4" opacity="0.4" />
                    )}

                    {/* Gradient Bar */}
                    <defs>
                      <linearGradient id={`barGrad-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#DC2626" />
                        <stop offset="100%" stopColor="#F87171" />
                      </linearGradient>
                    </defs>

                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(4, barHeight)}
                      rx="4"
                      fill={isHovered ? '#B91C1C' : `url(#barGrad-${index})`}
                      transition="height 0.3s ease"
                    />

                    {/* X-axis Label */}
                    <text
                      x={x + barWidth / 2}
                      y="222"
                      textAnchor="middle"
                      fontSize="11"
                      fill={isHovered ? '#DC2626' : '#6B7280'}
                      fontWeight={isHovered ? 'bold' : 'normal'}
                    >
                      {label}
                    </text>

                    {/* Value Badge on Top of Bar */}
                    {(item.revenue > 0 || isHovered) && (
                      <text
                        x={x + barWidth / 2}
                        y={Math.max(25, y - 6)}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="600"
                        fill="#1F2937"
                      >
                        {formatShortCurrency(item.revenue)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Floating Tooltip if Hovered */}
            {hoveredBar !== null && chartData[hoveredBar] && (
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '16px',
                  background: 'rgba(17, 24, 39, 0.9)',
                  color: 'white',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ fontWeight: 600 }}>{chartData[hoveredBar].month || chartData[hoveredBar].date}</div>
                <div>Doanh thu: <strong style={{ color: '#F87171' }}>{formatCurrency(chartData[hoveredBar].revenue)}</strong></div>
                <div>Số lượng: <strong>{chartData[hoveredBar].bookings} vé</strong></div>
              </div>
            )}
          </div>
        </div>

        {/* Status Breakdown & Top Routes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Status Breakdown Card */}
          <div className="chart-card" style={{ marginBottom: 0 }}>
            <div className="chart-card-header" style={{ marginBottom: '12px' }}>
              <h2><i className="bi bi-pie-chart-fill" style={{ color: '#3B82F6' }}></i> Trạng thái đặt vé</h2>
              <span className="badge badge-info">{totalStatusBookings} vé</span>
            </div>

            <div className="status-breakdown-list">
              {statusItems.map((item, idx) => {
                const percent = Math.round((item.count / totalStatusBookings) * 100);
                return (
                  <div key={idx} className="status-breakdown-item">
                    <div className="status-item-meta">
                      <span><strong>{item.label}</strong></span>
                      <span>{item.count} vé ({percent}%)</span>
                    </div>
                    <div className="status-progress-track">
                      <div
                        className="status-progress-fill"
                        style={{ width: `${percent}%`, backgroundColor: item.color }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Routes Card */}
          <div className="chart-card" style={{ marginBottom: 0 }}>
            <div className="chart-card-header" style={{ marginBottom: '8px' }}>
              <h2><i className="bi bi-signpost-2-fill" style={{ color: '#10B981' }}></i> Tuyến đường nổi bật</h2>
            </div>
            <div>
              {topRoutes.length > 0 ? (
                topRoutes.slice(0, 4).map((route, i) => (
                  <div key={i} className="top-route-item">
                    <div className="top-route-name">
                      <span style={{ color: '#9CA3AF', fontSize: '12px', width: '16px' }}>#{i + 1}</span>
                      <span>{route.routeName}</span>
                    </div>
                    <div className="top-route-meta">
                      <div className="top-route-revenue">{formatCurrency(route.revenue)}</div>
                      <div className="top-route-count">{route.bookings} lượt vé</div>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: '#9CA3AF', fontSize: '13px', textAlign: 'center', margin: '16px 0' }}>Chưa có dữ liệu tuyến</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bookings Table */}
      <div className="admin-table-container">
        <div className="admin-table-header">
          <h2>Đơn đặt vé gần đây</h2>
          <span className="badge badge-info">{recentBookings.length} đơn</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã vé</th>
                <th>Hành khách</th>
                <th>Nhà xe</th>
                <th>Tuyến đường</th>
                <th>Ngày đi</th>
                <th>Giá vé</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.length > 0 ? (
                recentBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td><strong>{booking.id}</strong></td>
                    <td>
                      <div><strong>{booking.passenger}</strong></div>
                      {booking.phone && <div style={{ fontSize: '12px', color: '#6B7280' }}>{booking.phone}</div>}
                    </td>
                    <td>{booking.company}</td>
                    <td>{booking.route}</td>
                    <td>{booking.date}</td>
                    <td><strong style={{ color: '#DC2626' }}>{formatCurrency(booking.price)}</strong></td>
                    <td>{getStatusBadge(booking.status)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF' }}>
                    Chưa có đơn đặt vé nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
