import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import adminApi from './adminApi';

export default function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.get(`/users/${id}`)
      .then(r => setUser(r.data.user)) // Backend returns { user, mentorships, posts }
      .catch(err => setError(err.response?.data?.message || 'Failed to load user'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAction = async (action) => {
    try {
      if (action === 'suspend') await adminApi.put(`/users/${id}/suspend`);
      if (action === 'activate') await adminApi.put(`/users/${id}/activate`);
      if (action === 'delete') {
        if (!window.confirm('Delete this user permanently?')) return;
        await adminApi.delete(`/users/${id}`);
        navigate('/admin/users');
        return;
      }
      // Reload user data
      const res = await adminApi.get(`/users/${id}`);
      setUser(res.data.user);
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  return (
    <AdminLayout>
      <div className="adm-page">
        <div className="adm-page-header">
          <h1 className="adm-page-title">User Details</h1>
          <button className="adm-btn" onClick={() => navigate('/admin/users')}>
            ← Back to Users
          </button>
        </div>

        {loading ? (
          <div className="adm-loading">Loading user details…</div>
        ) : error ? (
          <div className="adm-card">
            <div className="adm-msg err">{error}</div>
          </div>
        ) : user ? (
          <>
            <div className="adm-card">
              <div className="adm-card-title">Profile Information</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-3)', marginBottom: '0.25rem' }}>Name</div>
                  <div style={{ fontSize: '1rem', color: 'var(--adm-text)' }}>{user.firstName} {user.lastName}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-3)', marginBottom: '0.25rem' }}>Email</div>
                  <div style={{ fontSize: '1rem', color: 'var(--adm-text)' }}>{user.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-3)', marginBottom: '0.25rem' }}>Role</div>
                  <span className={`adm-role-badge ${user.role}`}>{user.role}</span>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-3)', marginBottom: '0.25rem' }}>Status</div>
                  <span className={`adm-status-badge ${user.isActive === false || user.status === 'suspended' ? 'suspended' : 'active'}`}>
                    {user.isActive === false || user.status === 'suspended' ? 'suspended' : 'active'}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-3)', marginBottom: '0.25rem' }}>Joined</div>
                  <div style={{ fontSize: '1rem', color: 'var(--adm-text)' }}>{new Date(user.createdAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-3)', marginBottom: '0.25rem' }}>User ID</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--adm-text-3)', fontFamily: 'monospace' }}>{user._id}</div>
                </div>
              </div>
            </div>

            <div className="adm-card">
              <div className="adm-card-title">Additional Information</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                {user.bio && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-3)', marginBottom: '0.25rem' }}>Bio</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--adm-text-2)' }}>{user.bio}</div>
                  </div>
                )}
                {user.graduationYear && (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-3)', marginBottom: '0.25rem' }}>Graduation Year</div>
                    <div style={{ fontSize: '1rem', color: 'var(--adm-text)' }}>{user.graduationYear}</div>
                  </div>
                )}
                {user.department && (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-3)', marginBottom: '0.25rem' }}>Department</div>
                    <div style={{ fontSize: '1rem', color: 'var(--adm-text)' }}>{user.department}</div>
                  </div>
                )}
                {user.company && (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-3)', marginBottom: '0.25rem' }}>Company</div>
                    <div style={{ fontSize: '1rem', color: 'var(--adm-text)' }}>{user.company}</div>
                  </div>
                )}
                {user.position && (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-3)', marginBottom: '0.25rem' }}>Position</div>
                    <div style={{ fontSize: '1rem', color: 'var(--adm-text)' }}>{user.position}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="adm-card">
              <div className="adm-card-title">Actions</div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {(user.isActive === false || user.status === 'suspended') ? (
                  <button className="adm-btn adm-btn-success" onClick={() => handleAction('activate')}>
                    Activate User
                  </button>
                ) : (
                  <button className="adm-btn adm-btn-warn" onClick={() => handleAction('suspend')}>
                    Suspend User
                  </button>
                )}
                <button className="adm-btn adm-btn-danger" onClick={() => handleAction('delete')}>
                  Delete User
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="adm-card">
            <div className="adm-empty">User not found</div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
