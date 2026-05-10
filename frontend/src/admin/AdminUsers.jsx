import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import adminApi from './adminApi';

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [role, setRole]       = useState('');
  const [status, setStatus]   = useState('');
  const [page, setPage]       = useState(1);
  const [confirm, setConfirm] = useState(null); // { id, name, action }

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 15 });
    if (search) params.set('search', search);
    if (role)   params.set('role', role);
    if (status) params.set('status', status);
    adminApi.get(`/users?${params}`)
      .then(r => { setUsers(r.data.users); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, role, status]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); load(); };

  const doAction = async () => {
    if (!confirm) return;
    try {
      if (confirm.action === 'delete')    await adminApi.delete(`/users/${confirm.id}`);
      if (confirm.action === 'suspend')   await adminApi.put(`/users/${confirm.id}/suspend`);
      if (confirm.action === 'activate')  await adminApi.put(`/users/${confirm.id}/activate`);
      setConfirm(null);
      // Update the user status in local state immediately (no full reload needed)
      setUsers(prev => prev.map(u => {
        if (u._id !== confirm.id) return u;
        if (confirm.action === 'delete')   return null;
        if (confirm.action === 'suspend')  return { ...u, status: 'suspended', isActive: false };
        if (confirm.action === 'activate') return { ...u, status: 'active',    isActive: true  };
        return u;
      }).filter(Boolean));
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  return (
    <AdminLayout>
      <div className="adm-page">
        <div className="adm-page-header">
          <h1 className="adm-page-title">User Management</h1>
          <span className="adm-page-sub">{total} total users</span>
        </div>

        {/* Filters */}
        <div className="adm-filters">
          <form onSubmit={handleSearch} className="adm-search-form">
            <input className="adm-search-input" placeholder="Search name or email…"
              value={search} onChange={e => setSearch(e.target.value)} />
            <button type="submit" className="adm-btn adm-btn-primary">Search</button>
          </form>
          <select className="adm-select" value={role} onChange={e => { setRole(e.target.value); setPage(1); }}>
            <option value="">All Roles</option>
            <option value="student">Student</option>
            <option value="alumni">Alumni</option>
            <option value="faculty">Faculty</option>
          </select>
          <select className="adm-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Table */}
        <div className="adm-card">
          {loading ? <div className="adm-loading">Loading…</div> : (
            <table className="adm-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td>
                      <button className="adm-link" onClick={() => navigate(`/admin/users/${u._id}`)}>
                        {u.firstName} {u.lastName}
                      </button>
                    </td>
                    <td>{u.email}</td>
                    <td><span className={`adm-role-badge ${u.role}`}>{u.role}</span></td>
                    <td>
                      <span className={`adm-status-badge ${u.isActive === false || u.status === 'suspended' ? 'suspended' : 'active'}`}>
                        {u.isActive === false || u.status === 'suspended' ? 'suspended' : 'active'}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="adm-actions-cell">
                      {(u.isActive === false || u.status === 'suspended')
                        ? <button className="adm-btn adm-btn-success" onClick={() => setConfirm({ id: u._id, name: `${u.firstName} ${u.lastName}`, action: 'activate' })}>Activate</button>
                        : <button className="adm-btn adm-btn-warn"    onClick={() => setConfirm({ id: u._id, name: `${u.firstName} ${u.lastName}`, action: 'suspend'  })}>Suspend</button>
                      }
                      <button className="adm-btn adm-btn-danger" onClick={() => setConfirm({ id: u._id, name: `${u.firstName} ${u.lastName}`, action: 'delete' })}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="adm-pagination">
          <button className="adm-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span>Page {page}</span>
          <button className="adm-btn" disabled={users.length < 15} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      </div>

      {/* Confirm modal */}
      {confirm && (
        <div className="adm-modal-overlay">
          <div className="adm-modal">
            <h3>Confirm {confirm.action}</h3>
            <p>Are you sure you want to <strong>{confirm.action}</strong> user <strong>{confirm.name}</strong>?</p>
            {confirm.action === 'delete' && <p className="adm-modal-warn">⚠️ This action cannot be undone.</p>}
            <div className="adm-modal-actions">
              <button className="adm-btn" onClick={() => setConfirm(null)}>Cancel</button>
              <button className={`adm-btn ${confirm.action === 'delete' ? 'adm-btn-danger' : 'adm-btn-warn'}`} onClick={doAction}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
