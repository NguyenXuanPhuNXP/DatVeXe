import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../services/adminApi';
const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (filterDate) params.date = filterDate;

      const res = await adminService.getBookings(params);
      setBookings(res.data || []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
      setError('Không thể tải danh sách đơn đặt vé. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchTerm, filterDate]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleUpdateStatus = async (id, newStatus, newPaymentStatus) => {
    try {
      setUpdatingId(id);
      const payload = { status: newStatus };
      if (newPaymentStatus) payload.paymentStatus = newPaymentStatus;

      const res = await adminService.updateBookingStatus(id, newStatus);
      const updated = res.data;

      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...updated } : b))
      );

      if (selectedBooking && selectedBooking.id === id) {
        setSelectedBooking((prev) => ({ ...prev, ...updated }));
      }

      const statusLabels = {
        confirmed: 'Đã duyệt vé thành công',
        completed: 'Đã chuyển trạng thái hoàn thành',
        cancelled: 'Đã hủy đơn vé và giải phóng ghế',
        pending: 'Đã đưa về trạng thái chờ xử lý',
      };

      setActionSuccessMsg(statusLabels[newStatus] || 'Đã cập nhật trạng thái');
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert(err.response?.data?.error?.message || err.response?.data?.message || 'Có lỗi khi cập nhật trạng thái đơn vé');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span
            style={{
              backgroundColor: '#FEF3C7',
              color: '#92400E',
              fontWeight: 700,
              fontSize: '12px',
              padding: '3px 10px',
              borderRadius: '20px',
              border: '1px solid #FCD34D',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <i className="bi bi-hourglass-split"></i> Chờ xử lý
          </span>
        );
      case 'confirmed':
        return (
          <span
            style={{
              backgroundColor: '#D1FAE5',
              color: '#065F46',
              fontWeight: 700,
              fontSize: '12px',
              padding: '3px 10px',
              borderRadius: '20px',
              border: '1px solid #6EE7B7',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <i className="bi bi-check-circle-fill"></i> Đã duyệt
          </span>
        );
      case 'completed':
        return (
          <span
            style={{
              backgroundColor: '#DBEAFE',
              color: '#1E40AF',
              fontWeight: 700,
              fontSize: '12px',
              padding: '3px 10px',
              borderRadius: '20px',
              border: '1px solid #93C5FD',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <i className="bi bi-patch-check-fill"></i> Hoàn thành
          </span>
        );
      case 'cancelled':
        return (
          <span
            style={{
              backgroundColor: '#FEE2E2',
              color: '#991B1B',
              fontWeight: 700,
              fontSize: '12px',
              padding: '3px 10px',
              borderRadius: '20px',
              border: '1px solid #FCA5A5',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <i className="bi bi-x-circle-fill"></i> Đã hủy
          </span>
        );
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  // KPI counts
  const totalCount = bookings.length;
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  const cancelledCount = bookings.filter((b) => b.status === 'cancelled').length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#111827', fontSize: '24px', fontWeight: 700 }}>
            Quản lý Đặt vé & Duyệt vé
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '14px' }}>
            Duyệt vé trực tiếp từ khách hàng và quản lý trạng thái chuyến đi theo thời gian thực
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={fetchBookings}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <i className="bi bi-arrow-clockwise"></i>
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {actionSuccessMsg && (
        <div
          style={{
            backgroundColor: '#ECFDF5',
            borderLeft: '4px solid #10B981',
            color: '#065F46',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <i className="bi bi-check-circle-fill" style={{ fontSize: '18px' }} />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          onClick={() => setFilterStatus('')}
          style={{
            backgroundColor: '#ffffff',
            padding: '16px',
            borderRadius: '12px',
            border: `2px solid ${filterStatus === '' ? '#DC2626' : '#E5E7EB'}`,
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '13px', color: '#6B7280' }}>Tất cả vé</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>
            {totalCount}
          </div>
        </div>

        <div
          onClick={() => setFilterStatus('pending')}
          style={{
            backgroundColor: '#ffffff',
            padding: '16px',
            borderRadius: '12px',
            border: `2px solid ${filterStatus === 'pending' ? '#F59E0B' : '#E5E7EB'}`,
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '13px', color: '#D97706', display: 'flex', justifyContent: 'space-between' }}>
            <span>Chờ xử lý</span>
            {pendingCount > 0 && (
              <span style={{ backgroundColor: '#FEF3C7', padding: '1px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>
                Cần duyệt
              </span>
            )}
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#D97706', marginTop: '4px' }}>
            {pendingCount}
          </div>
        </div>

        <div
          onClick={() => setFilterStatus('confirmed')}
          style={{
            backgroundColor: '#ffffff',
            padding: '16px',
            borderRadius: '12px',
            border: `2px solid ${filterStatus === 'confirmed' ? '#10B981' : '#E5E7EB'}`,
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '13px', color: '#059669' }}>Đã xác nhận</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
            {confirmedCount}
          </div>
        </div>

        <div
          onClick={() => setFilterStatus('completed')}
          style={{
            backgroundColor: '#ffffff',
            padding: '16px',
            borderRadius: '12px',
            border: `2px solid ${filterStatus === 'completed' ? '#3B82F6' : '#E5E7EB'}`,
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '13px', color: '#2563EB' }}>Đã hoàn thành</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#2563EB', marginTop: '4px' }}>
            {completedCount}
          </div>
        </div>

        <div
          onClick={() => setFilterStatus('cancelled')}
          style={{
            backgroundColor: '#ffffff',
            padding: '16px',
            borderRadius: '12px',
            border: `2px solid ${filterStatus === 'cancelled' ? '#EF4444' : '#E5E7EB'}`,
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '13px', color: '#DC2626' }}>Đã hủy</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#DC2626', marginTop: '4px' }}>
            {cancelledCount}
          </div>
        </div>
      </div>

      <div className="admin-table-container">
        <div className="admin-filters">
          <input
            type="text"
            className="form-control"
            placeholder="Tìm theo mã vé, tên, SĐT..."
            style={{ maxWidth: '300px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="form-control"
            style={{ maxWidth: '200px' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ xử lý (Chờ duyệt)</option>
            <option value="confirmed">Đã duyệt (Đã xác nhận)</option>
            <option value="completed">Đã hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          <input
            type="date"
            className="form-control"
            style={{ maxWidth: '200px' }}
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
          {(searchTerm || filterStatus || filterDate) && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('');
                setFilterDate('');
              }}
            >
              Đặt lại
            </button>
          )}
        </div>

        {error && (
          <div style={{ padding: '20px', color: '#EF4444', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã vé</th>
                <th>Khách hàng</th>
                <th>Tuyến & Giờ</th>
                <th>Ngày đi</th>
                <th>Ghế</th>
                <th>Tổng tiền</th>
                <th>Thanh toán</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="spinner-border text-danger" role="status" />
                    <div style={{ marginTop: '8px', color: '#6B7280' }}>Đang tải danh sách vé...</div>
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                    Không có đơn đặt vé nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong style={{ color: '#DC2626', letterSpacing: '0.5px' }}>{b.bookingCode}</strong>
                      <br />
                      <small style={{ color: '#9CA3AF' }}>
                        {new Date(b.createdAt).toLocaleDateString('vi-VN')}
                      </small>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.passengerName}</div>
                      <small style={{ color: '#6B7280' }}>{b.passengerPhone}</small>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {b.trip?.route ? `${b.trip.route.origin} → ${b.trip.route.destination}` : '-'}
                      </div>
                      <small style={{ color: '#6B7280' }}>
                        {b.trip?.company?.name} • <strong>{b.trip?.departureTime}</strong>
                      </small>
                    </td>
                    <td>
                      {new Date(b.tripDate).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                    <td>
                      <span style={{ backgroundColor: '#F3F4F6', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        {b.seatCode}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#111827' }}>
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(b.totalPrice)}
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: '12px',
                          color: b.paymentStatus === 'paid' ? '#059669' : '#D97706',
                          backgroundColor: b.paymentStatus === 'paid' ? '#D1FAE5' : '#FEF3C7',
                          padding: '2px 8px',
                          borderRadius: '10px',
                        }}
                      >
                        {b.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa trả'}
                      </span>
                      <br />
                      <small style={{ color: '#9CA3AF', fontSize: '11px' }}>{b.paymentMethod}</small>
                    </td>
                    <td>{getStatusBadge(b.status)}</td>
                    <td>
                      <div className="action-buttons">
                        {b.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={updatingId === b.id}
                              onClick={() => handleUpdateStatus(b.id, 'confirmed')}
                              title="Duyệt vé cho khách"
                              style={{ backgroundColor: '#10B981', borderColor: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <i className="bi bi-check2"></i> Duyệt
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={updatingId === b.id}
                              onClick={() => handleUpdateStatus(b.id, 'cancelled')}
                              title="Hủy vé"
                              style={{ color: '#EF4444' }}
                            >
                              <i className="bi bi-x"></i> Hủy
                            </button>
                          </>
                        )}

                        {b.status === 'confirmed' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={updatingId === b.id}
                              onClick={() => handleUpdateStatus(b.id, 'completed')}
                              title="Đánh dấu hoàn thành chuyến đi"
                              style={{ color: '#2563EB' }}
                            >
                              Hoàn thành
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={updatingId === b.id}
                              onClick={() => handleUpdateStatus(b.id, 'cancelled')}
                              title="Hủy vé"
                              style={{ color: '#EF4444' }}
                            >
                              Hủy
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          className="btn-icon edit"
                          title="Xem chi tiết vé"
                          onClick={() => setSelectedBooking(b)}
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Details Modal */}
      {selectedBooking && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>
                  Chi tiết đơn vé: <strong>{selectedBooking.bookingCode}</strong>
                </h3>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>
                  Đặt lúc: {new Date(selectedBooking.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#9CA3AF' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#6B7280' }}>Trạng thái vé:</span>
                <div>{getStatusBadge(selectedBooking.status)}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280' }}>Hành khách:</span>
                <span style={{ fontWeight: 600 }}>{selectedBooking.passengerName}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280' }}>Số điện thoại:</span>
                <span>{selectedBooking.passengerPhone}</span>
              </div>

              {selectedBooking.passengerEmail && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6B7280' }}>Email:</span>
                  <span>{selectedBooking.passengerEmail}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280' }}>Tuyến đường:</span>
                <span style={{ fontWeight: 600 }}>
                  {selectedBooking.trip?.route?.origin} → {selectedBooking.trip?.route?.destination}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280' }}>Nhà xe:</span>
                <span>{selectedBooking.trip?.company?.name}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280' }}>Ngày khởi hành:</span>
                <span>
                  {new Date(selectedBooking.tripDate).toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280' }}>Giờ xuất bến:</span>
                <span style={{ fontWeight: 700, color: '#DC2626' }}>{selectedBooking.trip?.departureTime}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280' }}>Ghế đã đặt:</span>
                <span style={{ fontWeight: 700, color: '#DC2626' }}>{selectedBooking.seatCode}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280' }}>Phương thức thanh toán:</span>
                <span>{selectedBooking.paymentMethod}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280' }}>Trạng thái thanh toán:</span>
                <span style={{ fontWeight: 600, color: selectedBooking.paymentStatus === 'paid' ? '#059669' : '#D97706' }}>
                  {selectedBooking.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #E5E7EB' }}>
                <span style={{ fontWeight: 600 }}>Tổng tiền:</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#DC2626' }}>
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedBooking.totalPrice)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
              {selectedBooking.status === 'pending' && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'cancelled')}
                    style={{ color: '#EF4444' }}
                  >
                    Từ chối / Hủy vé
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'confirmed')}
                    style={{ backgroundColor: '#10B981', borderColor: '#10B981' }}
                  >
                    Duyệt vé này
                  </button>
                </>
              )}

              {selectedBooking.status === 'confirmed' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleUpdateStatus(selectedBooking.id, 'completed')}
                >
                  Đánh dấu hoàn thành
                </button>
              )}

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedBooking(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookings;
