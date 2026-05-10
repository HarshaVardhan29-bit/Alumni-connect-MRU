import { useEffect, useState } from 'react';
import AdminLayout from './AdminLayout';
import adminApi from './adminApi';

export default function AdminAnnouncements() {
  const [list, setList]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState({ title: '', body: '', target: 'all' });
  const [posting, setPosting] = useState(false);
  const [msg, setMsg]         = useState('');

  const load = () => {
    adminApi.get('/announcements').then(r => setList(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setPosting(true); setMsg('');
    try {
      await adminApi.post('/announcements', form);
      setForm({ title: '', body: '', target: 'all' });
      setMsg('Announcement posted successfully.');
      load();
    } catch (err) { setMsg(err.response?.data?.message || 'Failed'); }
    finally { setPosting(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    await adminApi.delete(`/announcements/${id}`).catch(() => {});
    load();
  };

  const TARGET_COLOR = { all: '#7c45b8', student: '#3b82f6', alumni: '#c9a84c' };

  return (
    <AdminLayout>
      <div className="adm-page">
        <div className="adm-page-header">
          <h1 className="adm-page-title">Announcements</h1>
          <span className="adm-page-sub">Broadcast messages to users</span>
        </div>

        {/* Post form */}
        <div className="adm-card" style={{ marginBottom: '1.5rem' }}>
          <div className="adm-card-title">Post New Announcement</div>
          {msg && <div className={`adm-msg ${msg.includes('success') ? 'ok' : 'err'}`}>{msg}</div>}
          <form onSubmit={submit} className="adm-ann-form">
            <div className="adm-fg">
              <label>Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Announcement title" required />
            </div>
            <div className="adm-fg">
              <label>Message</label>
              <textarea rows={4} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Write your announcement…" required />
            </div>
            <div className="adm-fg">
              <label>Target Audience</label>
              <select value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}>
                <option value="all">All Users</option>
                <option value="student">Students Only</option>
                <option value="alumni">Alumni Only</option>
              </select>
            </div>
            <button type="submit" className="adm-btn adm-btn-primary" disabled={posting}>
              {posting ? 'Posting…' : 'Post Announcement'}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="adm-card">
          <div className="adm-card-title">Posted Announcements</div>
          {loading ? <div className="adm-loading">Loading…</div> : list.length === 0 ? (
            <div className="adm-empty">No announcements yet.</div>
          ) : (
            <div className="adm-ann-list">
              {list.map(a => (
                <div key={a._id} className="adm-ann-item">
                  <div className="adm-ann-header">
                    <span className="adm-ann-title">{a.title}</span>
                    <span className="adm-role-badge" style={{ background: TARGET_COLOR[a.target] + '22', color: TARGET_COLOR[a.target] }}>
                      {a.target}
                    </span>
                    <span className="adm-ann-date">{new Date(a.createdAt).toLocaleDateString()}</span>
                    <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => del(a._id)}>Delete</button>
                  </div>
                  <p className="adm-ann-body">{a.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
