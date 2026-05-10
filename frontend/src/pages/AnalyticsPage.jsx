import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import DashLayout from '../components/DashLayout';
import api from '../api/axios';

function Bar({ label, value, max, color = 'var(--violet)' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="bar-row">
      <div className="bar-label">{label}</div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="bar-val">{value}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashLayout><div className="loading-screen">Loading analytics...</div></DashLayout>;

  const p = data?.platform || {};
  const personal = data?.personal || {};
  const industries = data?.industryBreakdown || [];
  const maxIndustry = industries[0]?.count || 1;

  return (
    <DashLayout>
      <div className="dash-content">
        <h1 className="dash-welcome">Engagement <em>Analytics</em></h1>
        <p className="dash-sub">Real-time insights on mentorship effectiveness and network growth.</p>

        {/* Platform stats */}
        <div className="section-label">📊 Platform Overview</div>
        <div className="analytics-grid">
          {[
            { label: 'Total Alumni',       val: p.totalAlumni,       icon: '🎓' },
            { label: 'Total Students',     val: p.totalStudents,     icon: '📚' },
            { label: 'Active Mentorships', val: p.activeMentorships, icon: '🤝' },
            { label: 'Messages Sent',      val: p.totalMessages,     icon: '💬' },
          ].map(s => (
            <div className="analytics-card" key={s.label}>
              <div className="analytics-icon">{s.icon}</div>
              <div className="analytics-val">{s.val ?? 0}</div>
              <div className="analytics-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Personal stats */}
        <div className="section-label" style={{ marginTop: '2.5rem' }}>👤 Your Activity</div>
        <div className="analytics-grid">
          {[
            { label: 'Total Connections', val: personal.total,    icon: '🔗' },
            { label: 'Active Mentorships',val: personal.active,   icon: '✅' },
            { label: 'Pending Requests',  val: personal.pending,  icon: '⏳' },
            { label: 'Sessions Logged',   val: personal.sessions, icon: '📅' },
          ].map(s => (
            <div className="analytics-card" key={s.label} style={{ borderColor: 'var(--violet)' }}>
              <div className="analytics-icon">{s.icon}</div>
              <div className="analytics-val" style={{ color: 'var(--violet)' }}>{s.val ?? 0}</div>
              <div className="analytics-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Industry breakdown */}
        {industries.length > 0 && (
          <>
            <div className="section-label" style={{ marginTop: '2.5rem' }}>🏭 Alumni by Industry</div>
            <div className="bar-chart">
              {industries.map(ind => (
                <Bar key={ind._id} label={ind._id} value={ind.count} max={maxIndustry} />
              ))}
            </div>
          </>
        )}

        {/* Mentorship funnel */}
        <div className="section-label" style={{ marginTop: '2.5rem' }}>📈 Mentorship Effectiveness</div>
        <div className="funnel">
          {[
            { label: 'Total Requests',    val: p.totalMentorships,  color: 'var(--gold)' },
            { label: 'Accepted',          val: p.activeMentorships, color: 'var(--violet)' },
            { label: 'Sessions Logged',   val: personal.sessions,   color: '#4ade80' },
          ].map((f, i) => (
            <div className="funnel-step" key={f.label}>
              <div className="funnel-bar" style={{ background: f.color, width: `${100 - i * 18}%` }}>
                <span>{f.label}</span>
                <strong>{f.val ?? 0}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashLayout>
  );
}
