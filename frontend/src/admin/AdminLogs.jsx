import { useEffect, useState } from 'react';
import AdminLayout from './AdminLayout';
import adminApi from './adminApi';

const ACTION_COLOR = {
  SUSPEND_USER: '#f97316', ACTIVATE_USER: '#22c55e', DELETE_USER: '#ef4444',
  APPROVE_MENTORSHIP: '#22c55e', REJECT_MENTORSHIP: '#f97316', DELETE_MENTORSHIP: '#ef4444',
  POST_ANNOUNCEMENT: '#7c45b8', DELETE_ANNOUNCEMENT: '#ef4444',
};

export default function AdminLogs() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.get('/logs').then(r => setLogs(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="adm-page">
        <div className="adm-page-header">
          <h1 className="adm-page-title">Audit Logs</h1>
          <span className="adm-page-sub">All admin actions are recorded here</span>
        </div>

        <div className="adm-card">
          {loading ? <div className="adm-loading">Loading…</div> : (
            <table className="adm-table">
              <thead>
                <tr><th>Action</th><th>Admin</th><th>Target</th><th>Details</th><th>IP</th><th>Time</th></tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l._id}>
                    <td>
                      <span className="adm-action-badge" style={{ color: ACTION_COLOR[l.action] || '#888' }}>
                        {l.action}
                      </span>
                    </td>
                    <td>{l.admin?.name || l.admin?.email || '—'}</td>
                    <td><code style={{ fontSize: '.72rem', color: '#888' }}>{l.target?.slice(0, 16)}…</code></td>
                    <td>{l.details || '—'}</td>
                    <td>{l.ip || '—'}</td>
                    <td>{new Date(l.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
