import { createContext, useContext, useState, useEffect } from 'react';
import { signInWithRedirect, getRedirectResult, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import api from '../api/axios';
import SuspendedScreen from '../components/SuspendedScreen';

const AuthContext = createContext();

const isLocalhost = () =>
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

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

  // On mount: check redirect result first, then restore session
  useEffect(() => {
    const init = async () => {
      // 1. Check if returning from Google redirect
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const idToken = await result.user.getIdToken();
          const res = await api.post('/auth/firebase/google', { idToken });
          if (res.data.isNewUser) {
            setPendingGoogle({ token: res.data.token, user: res.data.user });
          } else {
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            setUser(res.data.user);
          }
          setLoading(false);
          return;
        }
      } catch (err) {
        // No redirect result or error — continue to session restore
      }

      // 2. Restore existing session
      const token = localStorage.getItem('token');
      const stored = localStorage.getItem('user');
      if (token && stored) {
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed.savedPosts)) parsed.savedPosts = [];
        setUser(parsed);

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
          .catch(() => {})
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    };

    init();
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
   * Google Sign-In:
   * - localhost → popup (instant feedback)
   * - production → redirect (avoids COOP popup issues)
   */
  const googleLogin = async () => {
    if (isLocalhost()) {
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
    } else {
      // Production: redirect flow — page will reload, result handled in useEffect above
      await signInWithRedirect(auth, googleProvider);
    }
  };

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
