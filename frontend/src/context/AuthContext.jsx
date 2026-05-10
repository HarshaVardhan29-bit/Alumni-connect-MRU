import { createContext, useContext, useState, useEffect } from 'react';
import { signInWithPopup, getRedirectResult } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import api from '../api/axios';
import SuspendedScreen from '../components/SuspendedScreen';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser]                   = useState(null);
  const [loading, setLoading]             = useState(true);
  const [suspended, setSuspended]         = useState(false); // show suspended screen
  const [pendingGoogle, setPendingGoogle] = useState(null);

  useEffect(() => {
    // Listen for suspension events fired by axios interceptor
    const handler = () => setSuspended(true);
    window.addEventListener('account:suspended', handler);
    return () => window.removeEventListener('account:suspended', handler);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const stored = localStorage.getItem('user');
    if (token && stored) {
      const parsed = JSON.parse(stored);
      // Ensure savedPosts is always an array
      if (!Array.isArray(parsed.savedPosts)) parsed.savedPosts = [];
      setUser(parsed);
      // Fetch fresh user data to get latest avatar/profile + savedPosts
      const apiBase = import.meta.env.VITE_API_URL === '/api'
        ? '/api'
        : (import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5001') + '/api';
      fetch(`${apiBase}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => {
          // Account suspended — show suspended screen instead of alert
          if (r.status === 403) {
            return r.json().then(data => {
              if (data?.suspended) {
                setSuspended(true);
              }
              return null;
            });
          }
          return r.ok ? r.json() : null;
        })
        .then(fresh => {
          if (fresh) {
            const updated = {
              ...parsed,
              ...fresh,
              id: fresh._id,
              savedPosts: Array.isArray(fresh.savedPosts) ? fresh.savedPosts.map(String) : [],
            };
            localStorage.setItem('user', JSON.stringify(updated));
            setUser(updated);
            // Sync localStorage savedPosts for PostCard fallback
            localStorage.setItem('savedPosts', JSON.stringify(updated.savedPosts));
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const login = async (data) => {
    const res = await api.post('/auth/login', data);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  /**
   * Google Sign-In via Firebase popup.
   */
  const googleLogin = async () => {
    const result  = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    const res     = await api.post('/auth/firebase/google', { idToken });

    if (res.data.isNewUser) {
      setPendingGoogle({ token: res.data.token, user: res.data.user });
      return { isNewUser: true };
    } else {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      return res.data;
    }
  };

  // Handle redirect result (kept for compatibility)
  useEffect(() => {
    getRedirectResult(auth).then(async (result) => {
      if (!result) return;
      try {
        const idToken = await result.user.getIdToken();
        const res     = await api.post('/auth/firebase/google', { idToken });
        if (res.data.isNewUser) {
          setPendingGoogle({ token: res.data.token, user: res.data.user });
        } else {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('user', JSON.stringify(res.data.user));
          setUser(res.data.user);
          window.location.href = '/feed';
        }
      } catch (err) {
        console.error('Google redirect login failed:', err);
      }
    }).catch(() => {});
  }, []);

  /**
   * Called by GoogleRoleModal after user picks a role.
   * Saves the updated user and completes login.
   */
  const completeGoogleLogin = (updatedUser) => {
    if (!pendingGoogle) return;
    localStorage.setItem('token', pendingGoogle.token);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    setPendingGoogle(null);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setSuspended(false);
    setUser(null);
  };

  // Call this after updating avatar/profile to sync sidebar
  const refreshUser = () => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  };

  // Update a specific field in user context (e.g. savedPosts)
  const updateUser = (patch) => {
    setUser(prev => {
      const updated = { ...prev, ...patch };
      // Keep savedPosts as strings
      if (Array.isArray(updated.savedPosts)) {
        updated.savedPosts = updated.savedPosts.map(String);
      }
      localStorage.setItem('user', JSON.stringify(updated));
      localStorage.setItem('savedPosts', JSON.stringify(updated.savedPosts || []));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, pendingGoogle, register, login, googleLogin, completeGoogleLogin, logout, refreshUser, updateUser }}>
      {suspended && <SuspendedScreen user={user} onLogout={logout} />}
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
