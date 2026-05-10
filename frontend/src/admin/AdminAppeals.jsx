import { useEffect, useState } from 'react';
import AdminLayout from './AdminLayout';
import adminApi from './adminApi';

export default function AdminAppeals() {
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminApi.get('/appeals')
      .then(r => setAppeals(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleReinstate = async (id) => {
    if (!window.confirm('Reinstate this user and approve their appeal?')) return;
    try {
      await adminApi.put(`/appeals/${id}/reinstate`);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this appeal? User will remain suspended.')) return;
    try {
      await adminApi.put(`/appeals/${id}/reject`);
      load();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const pending = appeals.filter(a => a.status === 'pending');
  const reviewed = appeals.filter(a => a.status === 'reviewed');

  return (
    <AdminLayout>
      <div className="adm-page">
        <div className="adm-page-header">
          <h1 className="adm-page-title">User Appeals</h1>
          <span className="adm-page-sub">{pending.length} pending</span>
        </div>

        {loading ? <div className="adm-loading">Loading…</div> : (
          <>
            {/* Pending */}
            <div className="adm-card">
              <div className="adm-card-title">Pending Appeals</div>
              {pending.length === 0 ? (
                <div className="adm-empty">No pending appeals.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {pending.map(a => (
                    <div key={a._id} className="adm-appeal-card">
                      <div className="adm-appeal-header">
                        <div>
                          <strong style={{ color: 'var(--adm-text)' }}>{a.user?.firstName} {a.user?.lastName}</strong>
                          <span style={{ color: 'var(--adm-text-3)', fontSize: '.85rem', marginLeft: '.5rem' }}>
                            {a.user?.email}
                          </span>
                        </div>
                        <span className={`adm-role-badge ${a.user?.role}`}>{a.user?.role}</span>
                      </div>
                      <p className="adm-appeal-message">{a.message}</p>
                      <div className="adm-appeal-footer">
                        <span style={{ fontSize: '.8rem', color: 'var(--adm-text-3)' }}>
                          {new Date(a.createdAt).toLocaleString()}
                        </span>
                        <div style={{ display: 'flex', gap: '.5rem' }}>
                          <button className="adm-btn adm-btn-success" onClick={() => handleReinstate(a._id)}>
                            ✓ Reinstate User
                          </button>
                          <button className="adm-btn adm-btn-danger" onClick={() => handleReject(a._id)}>
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reviewed */}
            {reviewed.length > 0 && (
              <div className="adm-card" style={{ marginTop: '1.5rem' }}>
                <div className="adm-card-title">Reviewed Appeals</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.8rem' }}>
                  {reviewed.map(a => (
                    <div key={a._id} style={{ padding: '.8rem', background: 'rgba(255,255,255,.02)', border: '1px solid var(--adm-border)', borderRadius: 8, fontSize: '.85rem', color: 'var(--adm-text-2)' }}>
                      <strong style={{ color: 'var(--adm-text)' }}>{a.user?.firstName} {a.user?.lastName}</strong> — {a.message.slice(0, 80)}…
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
