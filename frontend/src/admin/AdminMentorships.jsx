import { useEffect, useState } from 'react';
import AdminLayout from './AdminLayout';
import adminApi from './adminApi';

export default function AdminMentorships() {
  const [data, setData]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus]   = useState('');
  const [page, setPage]       = useState(1);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 15 });
    if (status) params.set('status', status);
    adminApi.get(`/mentorships?${params}`)
      .then(r => { setData(r.data.mentorships); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, status]);

  const action = async (id, type) => {
    try {
      if (type === 'approve') await adminApi.put(`/mentorships/${id}/approve`);
      if (type === 'reject')  await adminApi.put(`/mentorships/${id}/reject`);
      if (type === 'delete')  await adminApi.delete(`/mentorships/${id}`);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const STATUS_COLOR = { pending: '#f97316', accepted: '#22c55e', declined: '#ef4444', completed: '#7c45b8' };

  return (
    <AdminLayout>
      <div className="adm-page">
        <div className="adm-page-header">
          <h1 className="adm-page-title">Mentorship Management</h1>
          <span className="adm-page-sub">{total} total connections</span>
        </div>

        <div className="adm-filters">
          {['', 'pending', 'accepted', 'declined', 'completed'].map(s => (
            <button key={s} className={`adm-filter-tab${status === s ? ' active' : ''}`}
              onClick={() => { setStatus(s); setPage(1); }}>
              {s || 'All'}
            </button>
          ))}
        </div>

        <div className="adm-card">
          {loading ? <div className="adm-loading">Loading…</div> : (
            <table className="adm-table">
              <thead>
                <tr><th>Student</th><th>Alumni</th><th>Status</th><th>Date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {data.map(m => (
                  <tr key={m._id}>
                    <td>{m.student?.firstName} {m.student?.lastName}<br /><small>{m.student?.email}</small></td>
                    <td>{m.alumni?.firstName} {m.alumni?.lastName}<br /><small>{m.alumni?.email}</small></td>
                    <td>
                      <span className="adm-status-badge" style={{ background: STATUS_COLOR[m.status] + '22', color: STATUS_COLOR[m.status] }}>
                        {m.status}
                      </span>
                    </td>
                    <td>{new Date(m.createdAt).toLocaleDateString()}</td>
                    <td className="adm-actions-cell">
                      {m.status === 'pending' && <>
                        <button className="adm-btn adm-btn-success" onClick={() => action(m._id, 'approve')}>Approve</button>
                        <button className="adm-btn adm-btn-warn"    onClick={() => action(m._id, 'reject')}>Reject</button>
                      </>}
                      <button className="adm-btn adm-btn-danger" onClick={() => action(m._id, 'delete')}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="adm-pagination">
          <button className="adm-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span>Page {page}</span>
          <button className="adm-btn" disabled={data.length < 15} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      </div>
    </AdminLayout>
  );
}
