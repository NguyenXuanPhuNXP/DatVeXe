import { useState, useEffect } from 'react';
import { adminService } from '../../services/adminApi';

const AdminTrips = () => {
  const [trips, setTrips] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [formError, setFormError] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importSheetName, setImportSheetName] = useState('');
  const [importPreview, setImportPreview] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');
  const [isPreviewingImport, setIsPreviewingImport] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExportingTrips, setIsExportingTrips] = useState(false);
  const [exportError, setExportError] = useState('');

  const fetchTrips = async () => {
    try {
      const res = await adminService.getTrips();
      if (res?.data && Array.isArray(res.data)) {
        setTrips(res.data.map(t => ({
          id: t.id,
          availableDate: t.availableDate?.slice(0, 10) || '', duration: t.duration,
          routeId: t.routeId, companyId: t.companyId, busId: t.busId,
          origin: t.route?.origin || '', destination: t.route?.destination || '', isActive: t.isActive,
          route: t.route ? `${t.route.origin} - ${t.route.destination}` : (t.route || 'Chưa chọn tuyến'),
          company: t.company?.name || t.company || 'Phương Trang',
          departureTime: t.departureTime || '08:00',
          arrivalTime: t.arrivalTime || '14:00',
          price: t.price ?? 0,
          status: t.isActive ? 'Đang mở bán' : 'Tạm dừng',
        })));
      }
    } catch {
      // Keep fallback trips
    }
  };

  useEffect(() => {
    let isCurrent = true;
    adminService.getTrips()
      .then((res) => {
        if (isCurrent && res?.data && Array.isArray(res.data)) {
          setTrips(res.data.map(t => ({
            id: t.id,
          routeId: t.routeId, companyId: t.companyId, busId: t.busId,
          origin: t.route?.origin || '', destination: t.route?.destination || '', isActive: t.isActive,
            route: t.route ? `${t.route.origin} - ${t.route.destination}` : (t.route || 'Chưa chọn tuyến'),
            company: t.company?.name || t.company || 'Phương Trang',
            departureTime: t.departureTime || '08:00',
            arrivalTime: t.arrivalTime || '14:00',
            price: t.price ?? 0,
            status: t.isActive ? 'Đang mở bán' : 'Tạm dừng',
          })));
        }
      })
      .catch(() => {
        // Keep fallback trips
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const handleImportFileChange = (event) => {
    setImportFile(event.target.files?.[0] || null);
    setImportPreview(null);
    setImportResult(null);
    setImportError('');
  };

  const handlePreviewImport = async () => {
    if (!importFile) {
      setImportError('Vui lòng chọn file .xlsx trước khi xem trước.');
      return;
    }
    setIsPreviewingImport(true);
    setImportError('');
    setImportResult(null);
    try {
      const response = await adminService.previewTripImport(importFile, importSheetName.trim() || undefined);
      setImportPreview(response.data);
    } catch (error) {
      setImportPreview(null);
      setImportError(error.response?.data?.message || 'Không thể kiểm tra file Excel.');
    } finally {
      setIsPreviewingImport(false);
    }
  };

  const handleImportTrips = async () => {
    if (!importFile || !importPreview) return;
    if (!window.confirm(`Xác nhận import lại file? Hệ thống sẽ kiểm tra lại và chỉ lưu dòng hợp lệ.`)) return;

    setIsImporting(true);
    setImportError('');
    setImportResult(null);
    try {
      const response = await adminService.importTrips(importFile, importSheetName.trim() || undefined);
      setImportResult(response.data);
      setImportPreview(null);
      await fetchTrips();
    } catch (error) {
      setImportError(error.response?.data?.message || 'Không thể import file Excel.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportTrips = async () => {
    setIsExportingTrips(true);
    setExportError('');
    try {
      const response = await adminService.exportTripsExcel();
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `chuyen-xe-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      const responseData = error.response?.data;
      if (responseData instanceof Blob) {
        try {
          const payload = JSON.parse(await responseData.text());
          setExportError(payload.error?.message || payload.message || 'Không thể xuất danh sách chuyến xe.');
        } catch {
          setExportError('Không thể xuất danh sách chuyến xe.');
        }
      } else {
        setExportError(responseData?.error?.message || responseData?.message || 'Không thể xuất danh sách chuyến xe.');
      }
    } finally {
      setIsExportingTrips(false);
    }
  };

  const handleOpenModal = async (trip = null) => {
    const parts = trip?.duration?.match(/(\d+)h(?:\s*(\d+))?/);
    const departureMinutes = trip ? Number(trip.departureTime.split(':')[0])*60 + Number(trip.departureTime.split(':')[1]) : 0;
    const days = parts ? Math.floor((departureMinutes + Number(parts[1])*60 + Number(parts[2]||0))/1440) : 0;
    setCurrentTrip(trip ? {...trip, arrivalDayOffset: days} : {arrivalDayOffset:0, origin:'', destination:'', companyId:'', busId:'', departureTime:'', arrivalTime:'', price:'', isActive:true});
    setFormError(''); setIsModalOpen(true); setLoadingOptions(true);
    try {
      const [r, c] = await Promise.all([adminService.getRoutes(), adminService.getCompanies()]);
      setRoutes(r.data); setCompanies(c.data);
    } catch { setRoutes([]); setCompanies([]); setFormError('Không tải được lựa chọn. Vui lòng đóng và mở lại.'); }
    finally { setLoadingOptions(false); }
  };
  const handleSave = async (e) => {
    e.preventDefault(); setFormError('');
    const route = routes.find(r => r.origin === currentTrip.origin && r.destination === currentTrip.destination);
    const company = companies.find(c => c.id === currentTrip.companyId);
    if (!route || !company?.buses?.some(b => b.id === currentTrip.busId)) {
      setFormError('Vui lòng chọn tuyến đường, nhà xe và xe hợp lệ.'); return;
    }
    const toMinutes = time => Number(time.split(':')[0])*60 + Number(time.split(':')[1]);
    const minutes = Number(currentTrip.arrivalDayOffset)*1440 + toMinutes(currentTrip.arrivalTime) - toMinutes(currentTrip.departureTime);
    if (!Number.isFinite(minutes) || minutes > 59999) {setFormError('Thời lượng chuyến không hợp lệ.'); return;}
    if (minutes < 60) { setFormError('Thời lượng chuyến phải từ 1 giờ. Ngày giờ đến phải sau ngày giờ khởi hành.'); return; }
    const payload = { availableDate: null, routeId: route.id, companyId: company.id, busId: currentTrip.busId,
      departureTime: currentTrip.departureTime, arrivalTime: currentTrip.arrivalTime,
      duration: Math.floor(minutes / 60) + 'h ' + (minutes % 60) + 'p', price: Number(currentTrip.price), isActive: currentTrip.isActive };
    setIsSaving(true);
    try {
      if (currentTrip.id) await adminService.updateTrip(currentTrip.id, payload);
      else await adminService.createTrip(payload);
      setIsModalOpen(false); await fetchTrips();
    } catch (error) { setFormError(error.response?.data?.message || 'Không lưu được chuyến xe. Vui lòng thử lại.'); }
    finally { setIsSaving(false); }
  };
  const timePicker = (field, label) => {
    const [hour = '', minute = ''] = (currentTrip[field] || '').split(':');
    return <div className="form-group"><label>{label}</label><div style={{ display: 'flex', gap: 8 }}>
      <select className="form-control" aria-label={label + ' - giờ'} required value={hour} onChange={e => setCurrentTrip({ ...currentTrip, [field]: e.target.value + ':' + (minute || '00') })}>
        <option value="">Giờ</option>{Array.from({length:24}, (_, i) => String(i).padStart(2, '0')).map(v => <option key={v}>{v}</option>)}
      </select>
      <select className="form-control" aria-label={label + ' - phút'} required value={minute} onChange={e => setCurrentTrip({ ...currentTrip, [field]: (hour || '00') + ':' + e.target.value })}>
        <option value="">Phút</option>{Array.from({length:60}, (_, i) => String(i).padStart(2, '0')).map(v => <option key={v}>{v}</option>)}
      </select>
    </div></div>;
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa chuyến xe này?')) {
      try {
        await adminService.deleteTrip(id);
        fetchTrips();
      } catch {
        setTrips(trips.filter(t => t.id !== id));
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#111827' }}>Quản lý Chuyến xe</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn btn-secondary" onClick={handleExportTrips} disabled={isExportingTrips}>
            <i className="bi bi-file-earmark-spreadsheet"></i> {isExportingTrips ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => handleOpenModal()}>
            <i className="bi bi-plus-lg"></i> Thêm chuyến
          </button>
        </div>
      </div>
      {exportError && <div role="alert" className="alert alert-danger" style={{ marginBottom: '16px' }}>{exportError}</div>}

      <section className="admin-table-container" aria-labelledby="trip-import-heading" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 id="trip-import-heading" style={{ marginTop: 0 }}>Import chuyến xe từ Excel</h3>
        <p>Chọn file .xlsx để kiểm tra trước. Preview không lưu dữ liệu; khi xác nhận, hệ thống kiểm tra lại và chỉ import các dòng hợp lệ.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: '12px' }}>
          <label className="form-group" style={{ margin: 0 }}>
            <span>File Excel (.xlsx)</span>
            <input type="file" className="form-control" accept=".xlsx" onChange={handleImportFileChange} />
          </label>
          <label className="form-group" style={{ margin: 0 }}>
            <span>Tên sheet (không bắt buộc)</span>
            <input
              type="text"
              className="form-control"
              value={importSheetName}
              maxLength={31}
              placeholder="Mặc định: sheet đầu tiên"
              onChange={(event) => {
                setImportSheetName(event.target.value);
                setImportPreview(null);
                setImportResult(null);
              }}
            />
          </label>
          <button type="button" className="btn btn-secondary" onClick={handlePreviewImport} disabled={!importFile || isPreviewingImport || isImporting}>
            {isPreviewingImport ? 'Đang kiểm tra...' : 'Xem trước'}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleImportTrips} disabled={!importPreview || importPreview.validRows === 0 || isPreviewingImport || isImporting}>
            {isImporting ? 'Đang import...' : 'Xác nhận Import'}
          </button>
        </div>
        {importFile && <p style={{ marginBottom: 0, marginTop: '8px' }}>Đã chọn: {importFile.name}</p>}
        {importError && <div role="alert" className="alert alert-danger" style={{ marginTop: '16px' }}>{importError}</div>}

        {importPreview && (
          <div style={{ marginTop: '16px' }}>
            <strong>Sheet: {importPreview.sheetName}</strong>
            <p role="status">
              Tổng {importPreview.totalRows} dòng — hợp lệ: {importPreview.validRows}, không hợp lệ: {importPreview.invalidRows}
              {importPreview.previewLimit ? ` (hiển thị ${importPreview.preview.length}/${importPreview.totalRows} dòng)` : ''}
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead><tr><th>Dòng Excel</th><th>Trạng thái</th><th>Lỗi theo cột</th></tr></thead>
                <tbody>
                  {importPreview.preview.map((row) => (
                    <tr key={row.rowNumber}>
                      <td>{row.rowNumber}</td>
                      <td>{row.status === 'valid' ? 'Hợp lệ' : 'Không hợp lệ'}</td>
                      <td>{row.errors.length
                        ? row.errors.map((error, index) => (
                          <div key={`${error.field}-${index}`}><strong>{error.field}:</strong> {error.message}</div>
                        ))
                        : 'Không có lỗi'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {importResult && (
          <div role="status" style={{ marginTop: '16px' }}>
            <strong>Kết quả import — sheet {importResult.sheetName}</strong>
            <p>Tổng {importResult.totalRows} dòng: thành công {importResult.importedRows}, thất bại {importResult.failedRows}.</p>
            {[...importResult.validationFailures, ...importResult.importFailures].length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead><tr><th>Dòng Excel</th><th>Loại lỗi</th><th>Chi tiết</th></tr></thead>
                  <tbody>
                    {[...importResult.validationFailures, ...importResult.importFailures].map((failure, index) => (
                      <tr key={`${failure.rowNumber}-${failure.code}-${index}`}>
                        <td>{failure.rowNumber}</td>
                        <td>{failure.code}</td>
                        <td>{failure.message || failure.errors?.map((error) => `${error.field}: ${error.message}`).join('; ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="admin-table-container">
        <div className="admin-filters">
          <input type="text" className="form-control" placeholder="Tìm theo tuyến đường, nhà xe..." style={{ maxWidth: '300px' }} />
          <select className="form-control" style={{ maxWidth: '200px' }}>
            <option value="">Tất cả nhà xe</option>
            <option value="Phương Trang">Phương Trang</option>
            <option value="Thành Bưởi">Thành Bưởi</option>
            <option value="Hạnh Cafe">Hạnh Cafe</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tuyến đường</th>
                <th>Nhà xe</th>
                <th>Giờ đi - Giờ đến</th>
                <th>Giá vé</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr key={trip.id}>
                  <td><strong>#{trip.id}</strong></td>
                  <td>{trip.route}</td>
                  <td>{trip.company}</td>
                  <td>{trip.departureTime} - {trip.arrivalTime}</td>
                  <td><strong style={{ color: '#DC2626' }}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(trip.price)}</strong></td>
                  <td>
                    <span className={`badge ${trip.status === 'Đang mở bán' ? 'badge-success' : 'badge-warning'}`}>
                      {trip.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button type="button" className="btn-icon edit" onClick={() => handleOpenModal(trip)} title="Sửa"><i className="bi bi-pencil"></i></button>
                      <button type="button" className="btn-icon delete" onClick={() => handleDelete(trip.id)} title="Xóa"><i className="bi bi-trash"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content trip-editor" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{currentTrip?.id ? 'Sửa chuyến xe' : 'Thêm chuyến xe mới'}</h3>
              <button type="button" className="modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {formError && <div role="alert" className="alert alert-danger">{formError}</div>}
                {loadingOptions && <p role="status">Đang tải lựa chọn...</p>}
<div className="form-group"><label htmlFor="trip-origin">Điểm đi</label><select id="trip-origin" className="form-control" required value={currentTrip.origin} disabled={loadingOptions} onChange={e => setCurrentTrip({ ...currentTrip, origin: e.target.value, destination: '' })}><option value="">Chọn điểm đi</option>{[...new Set(routes.map(r => r.origin))].sort().map(v => <option key={v}>{v}</option>)}</select></div><div className="form-group"><label htmlFor="trip-destination">Điểm đến</label><select id="trip-destination" className="form-control" required value={currentTrip.destination} disabled={loadingOptions || !currentTrip.origin} onChange={e => setCurrentTrip({ ...currentTrip, destination: e.target.value })}><option value="">Chọn điểm đến</option>{[...new Set(routes.filter(r => r.origin === currentTrip.origin).map(r => r.destination))].sort().map(v => <option key={v}>{v}</option>)}</select></div><div className="form-group"><label htmlFor="trip-company">Nhà xe</label><select id="trip-company" className="form-control" required value={currentTrip.companyId} disabled={loadingOptions} onChange={e => setCurrentTrip({ ...currentTrip, companyId: e.target.value, busId: '' })}><option value="">Chọn nhà xe</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="form-group"><label htmlFor="trip-bus">Xe</label><select id="trip-bus" className="form-control" required value={currentTrip.busId} disabled={loadingOptions || !currentTrip.companyId} onChange={e => setCurrentTrip({ ...currentTrip, busId: e.target.value })}><option value="">Chọn xe</option>{(companies.find(c => c.id === currentTrip.companyId)?.buses || []).map(b => <option key={b.id} value={b.id}>{b.name} — {b.type}</option>)}</select></div>{currentTrip.companyId && !loadingOptions && !companies.find(c => c.id === currentTrip.companyId)?.buses?.length && <p>Nhà xe chưa có xe. Vui lòng thêm xe trước.</p>}
<p className="form-hint">Chuyến chạy định kỳ hằng ngày. Khách chọn ngày khởi hành khi tìm và đặt vé.</p>
<div className="form-group"><label htmlFor="trip-arrival-offset">Ngày đến so với ngày khởi hành</label><select id="trip-arrival-offset" className="form-control" value={currentTrip.arrivalDayOffset} onChange={e => setCurrentTrip({...currentTrip,arrivalDayOffset:Number(e.target.value)})}>{Array.from({length:42},(_,i)=><option key={i} value={i}>{i===0?'Cùng ngày': 'Sau '+i+' ngày'}</option>)}</select></div>
<div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>{timePicker('departureTime','Giờ khởi hành')}{timePicker('arrivalTime','Giờ đến')}</div>
<small>Giờ đến sớm hơn giờ đi được tính sang ngày hôm sau.</small>
                <div className="form-group">
                  <label htmlFor="admintrips-field-1">Giá vé (VNĐ)</label>
                  <input id="admintrips-field-1"
                    type="number" min="1" max="2147483647" step="1"
                    className="form-control"
                    value={currentTrip?.price || 0}
                    placeholder="VD: 250000" onChange={e => setCurrentTrip({ ...currentTrip, price: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={loadingOptions || isSaving}>{isSaving ? 'Đang lưu...' : 'Lưu'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTrips;
