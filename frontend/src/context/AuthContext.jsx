import { createContext, useContext, useState, useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import api from '../api/axios';
import SuspendedScreen from '../components/SuspendedScreen';
import { subscribeToPush } from '../utils/pushSubscribe';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser]                   = useState(null);
  const [loading, setLoading]             = useState(true);
  const [suspended, setSuspended]         = useState(false);
  const [pendingGoogle, setPendingGoogle] = useState(null);

  // Listen for suspension events
  useEffect(() => {
    const handler = () => setSuspended(true);
    window.addEventListener('account:suspended', handler);
    return () => window.removeEventListener('account:suspended', handler);
  }, []);

  // On mount: restore session instantly from localStorage, then refresh in background
  useEffect(() => {
    const token = localStorage.getItem('token');
    const stored = localStorage.getItem('user');

    if (token && stored) {
      try {
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed.savedPosts)) parsed.savedPosts = [];
        setUser(parsed);
        setLoading(false);

        const apiBase = import.meta.env.VITE_API_URL === '/api'
          ? '/api'
          : (import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001') + '/api';

        fetch(`${apiBase}/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(r => {
            if (r.status === 403) {
              return r.json().then(data => {
                if (data?.suspended) setSuspended(true);
                return null;
              });
            }
            if (r.status === 401) {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              setUser(null);
              return null;
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
              localStorage.setItem('savedPosts', JSON.stringify(updated.savedPosts));
            }
          })
          .catch(() => {});

        // Re-subscribe to push when already logged in (e.g. app restart, new device)
        setTimeout(() => subscribeToPush(), 3000);
      } catch {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // Re-subscribe to push when user returns to the app from background
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && localStorage.getItem('token')) {
        subscribeToPush();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
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
    // Subscribe to push notifications after login — with retry
    setTimeout(() => subscribeToPush(), 1500);
    setTimeout(() => subscribeToPush(), 8000); // retry in case SW wasn't ready
    return res.data;
  };

  /**
   * Google Sign-In via Firebase popup.
   * Works on both localhost and production once COOP header is removed.
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

  const completeGoogleLogin = (updatedUser) => {
    if (!pendingGoogle) return;
    localStorage.setItem('token', pendingGoogle.token);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    setPendingGoogle(null);
    setTimeout(() => subscribeToPush(), 2000);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setSuspended(false);
    setUser(null);
  };

  const refreshUser = () => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  };

  const updateUser = (patch) => {
    setUser(prev => {
      const updated = { ...prev, ...patch };
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
