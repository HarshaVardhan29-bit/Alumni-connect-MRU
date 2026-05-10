import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import AdminLayout from './AdminLayout';
import adminApi from './adminApi';

function StatCard({ label, value, sub, color }) {
  return (
    <div className="adm-stat-card" style={{ borderTopColor: color }}>
      <div className="adm-stat-val" style={{ color }}>{value}</div>
      <div className="adm-stat-label">{label}</div>
      {sub && <div className="adm-stat-sub">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    adminApi.get('/stats').then(r => setStats(r.data)).catch(() => {}).finally(() => setLoading(false));
    
    // Detect theme changes
    const checkTheme = () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      setTheme(currentTheme);
    };
    checkTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    
    return () => observer.disconnect();
  }, []);

  const chartColors = {
    grid: theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
    text: theme === 'light' ? '#666' : '#888',
    tooltip: theme === 'light' ? '#ffffff' : '#1e1e32',
    tooltipBorder: theme === 'light' ? '#e0e0e0' : 'none',
  };

  return (
    <AdminLayout>
      <div className="adm-page">
        <div className="adm-page-header">
          <h1 className="adm-page-title">Dashboard</h1>
          <span className="adm-page-sub">Overview of MRU MentorConnect AI</span>
        </div>

        {loading ? (
          <div className="adm-loading">Loading stats…</div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="adm-stat-grid">
              <StatCard label="Total Users"       value={stats.totalUsers}          color="#7c45b8" />
              <StatCard label="Students"          value={stats.students}            color="#3b82f6" />
              <StatCard label="Alumni"            value={stats.alumni}              color="#c9a84c" />
              <StatCard label="Active Mentorships" value={stats.activeMentorships}  color="#22c55e" />
              <StatCard label="Pending Requests"  value={stats.pendingMentorships}  color="#f97316" />
              <StatCard label="Total Posts"       value={stats.totalPosts}          color="#a78bfa" />
            </div>

            {/* Charts */}
            <div className="adm-charts-grid">
              <div className="adm-chart-card">
                <div className="adm-chart-title">New Registrations (Last 7 Days)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.dailyReg}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="_id" tick={{ fontSize: 11, fill: chartColors.text }} />
                    <YAxis tick={{ fontSize: 11, fill: chartColors.text }} />
                    <Tooltip 
                      contentStyle={{ 
                        background: chartColors.tooltip, 
                        border: chartColors.tooltipBorder,
                        borderRadius: 8,
                        boxShadow: theme === 'light' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                      }} 
                    />
                    <Bar dataKey="count" fill="#7c45b8" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="adm-chart-card">
                <div className="adm-chart-title">Mentorship Trend (Last 6 Months)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={stats.mentorshipTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="_id" tick={{ fontSize: 11, fill: chartColors.text }} />
                    <YAxis tick={{ fontSize: 11, fill: chartColors.text }} />
                    <Tooltip 
                      contentStyle={{ 
                        background: chartColors.tooltip, 
                        border: chartColors.tooltipBorder,
                        borderRadius: 8,
                        boxShadow: theme === 'light' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                      }} 
                    />
                    <Line type="monotone" dataKey="count" stroke="#c9a84c" strokeWidth={2} dot={{ fill: '#c9a84c' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent users */}
            <div className="adm-card">
              <div className="adm-card-title">Recent Registrations</div>
              <table className="adm-table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr>
                </thead>
                <tbody>
                  {stats.recentUsers.map(u => (
                    <tr key={u._id}>
                      <td>{u.firstName} {u.lastName}</td>
                      <td>{u.email}</td>
                      <td><span className={`adm-role-badge ${u.role}`}>{u.role}</span></td>
                      <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
