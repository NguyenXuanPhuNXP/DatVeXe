import { useState, useEffect } from 'react';
import { useAuth } from '../../context/auth-context';
import api from '../../services/api';
import { adminService } from '../../services/adminApi';

const ROLE_LABELS = {user:"Khách hàng", admin:"Quản trị viên", owner:"Chủ nhà xe", manager:"Quản lý nhà xe", staff:"Nhân viên nhà xe"};

const AdminUsers = () => {
  const { user: signedInUser } = useAuth();
  const [busyUser,setBusyUser]=useState(null);
  const [actionError,setActionError]=useState('');
  const [users, setUsers] = useState([]);
  const [companies,setCompanies]=useState([]);
  const [formError,setFormError]=useState('');
  const [isSaving,setIsSaving]=useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const fetchUsers = async () => {
    try {
      const [res, access, companyRes] = await Promise.all([adminService.getUsers(), api.get('/admin/company-access'), adminService.getCompanies()]);
      setCompanies(companyRes.data);
      const memberships = access.data;
      const responseUsers = Array.isArray(res?.data) ? res.data : res?.data?.users;
      if (Array.isArray(responseUsers)) {
        setUsers(responseUsers.map(u => ({
          id: u.id,
          email: u.email,
          isLocked: u.isLocked,
          fullName: u.fullName || 'Khách hàng',
          role: u.roles?.some(r => String(typeof r === 'string' ? r : r.role?.name).toLowerCase() === 'admin') ? 'admin' : memberships.find(m => m.userId === u.id && m.isActive)?.role || 'user',
          membership: memberships.find(m => m.userId === u.id),
          companyId: memberships.find(m => m.userId === u.id)?.companyId || '',
          createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '01/01/2025',
        })));
      }
    } catch {
      setFormError('Không tải được danh sách tài khoản hoặc nhà xe. Vui lòng tải lại trang.');
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) fetchUsers(); });
    return () => { active = false; };
  }, []);

  const handleToggleLock = async account => {
    if(busyUser) return;
    if(!window.confirm((account.isLocked ? 'Mở khóa' : 'Khóa') + ' tài khoản ' + account.email + '?')) return;
    setBusyUser(account.id);setActionError('');
    try {
      const {data} = await (account.isLocked ? adminService.unlockUser(account.id) : adminService.lockUser(account.id));
      setUsers(prev => prev.map(u => u.id === account.id ? {...u,isLocked:data.status.isLocked} : u));
    } catch(error) {setActionError(error.response?.data?.message || 'Không cập nhật được trạng thái tài khoản.');}
    finally {setBusyUser(null);}
  };

  const handleOpenModal = (user) => {
    setFormError('');
    setCurrentUser({...user});
    setIsModalOpen(true);
  };

  const handleSaveRole = async e => {
    e.preventDefault(); if(isSaving) return; setIsSaving(true);setFormError('');
    const operational = ['owner','manager','staff'].includes(currentUser.role);
    try {
      if(operational) {
        if(!currentUser.companyId) throw new Error('Vui lòng chọn nhà xe.');
        if(currentUser.membership && currentUser.membership.companyId !== currentUser.companyId) throw new Error('Hãy thu hồi quyền nhà xe cũ tại mục Phân quyền nhà xe trước khi chuyển đơn vị.');
        await api.post('/admin/company-access',{userId:currentUser.id,companyId:currentUser.companyId,role:currentUser.role});
        await adminService.updateUser(currentUser.id,{roles:['user']});
      } else {
        await adminService.updateUser(currentUser.id,{roles:[currentUser.role]});
        if(currentUser.membership) await api.delete('/admin/company-access/'+currentUser.membership.id);
      }
      setIsModalOpen(false); await fetchUsers();
    } catch(error) {setFormError(error.response?.data?.message || error.message || 'Không cập nhật được quyền.');}
    finally {setIsSaving(false);}
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#111827' }}>Quản lý Người dùng</h2>
      </div>

      {(actionError || (!isModalOpen && formError)) && <p role="alert">{actionError || formError}</p>}
      <div className="admin-table-container">
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Trạng thái</th><th>Ngày đăng ký</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.fullName}</strong></td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-danger' : 'badge-info'}`}>
                      {ROLE_LABELS[u.role] || u.role}{u.companyId && ' · ' + (companies.find(c => c.id === u.companyId)?.name || '')}
                    </span>
                  </td>
                  <td><span className={`badge ${u.isLocked ? 'badge-danger' : 'badge-success'}`}>{u.isLocked ? 'Đã khóa' : 'Đang hoạt động'}</span></td><td>{u.createdAt}</td>
                  <td>
                    <div className="action-buttons">
                      <button type="button" className="btn-icon edit" onClick={() => handleOpenModal(u)} title="Phân quyền">
                        <i className="bi bi-shield-lock"></i>
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm"
                        disabled={Boolean(busyUser) || u.id === signedInUser?.id}
                        onClick={() => handleToggleLock(u)}
                        title={u.id === signedInUser?.id ? 'Không thể tự khóa tài khoản đang sử dụng' : u.isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}>
                        <i className={u.isLocked ? 'bi bi-unlock' : 'bi bi-lock'}></i>
                        {busyUser === u.id ? 'Đang xử lý...' : u.isLocked ? 'Mở khóa' : 'Khóa'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Phân quyền người dùng</h3>
              <button type="button" className="modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSaveRole}>
              <div className="modal-body">{formError && <p role="alert">{formError}</p>}
                <div className="form-group">
                  <label htmlFor="adminusers-field-1">Email</label>
                  <input id="adminusers-field-1" type="text" className="form-control" value={currentUser?.email || ''} disabled />
                </div>
                <div className="form-group">
                  <label htmlFor="adminusers-field-2">Vai trò</label>
                  <select id="adminusers-field-2"
                    className="form-control"
                    value={currentUser?.role || 'user'}
                    onChange={e => setCurrentUser({ ...currentUser, role: e.target.value })}
                  >
                    <option value="user">Khách hàng</option><option value="owner">Chủ nhà xe</option><option value="manager">Quản lý nhà xe</option><option value="staff">Nhân viên nhà xe</option>
                    <option value="admin">Quản trị viên (admin)</option>
                  </select>
                </div>
              </div>
{['owner','manager','staff'].includes(currentUser.role) && <div className="modal-body"><div className="form-group"><label htmlFor="user-company">Nhà xe phụ trách</label><select id="user-company" className="form-control" required value={currentUser.companyId} onChange={e => setCurrentUser({...currentUser,companyId:e.target.value})}><option value="">Chọn nhà xe</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><small className="form-hint">Quyền làm việc chỉ áp dụng trong nhà xe được chọn.</small></div></div>}
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Đang lưu...' : 'Cập nhật'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
