import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// This page handles the redirect from Google OAuth callback
// URL: /auth/google/success?data=<encoded JSON>
export default function GoogleAuthSuccess() {
  const [params] = useSearchParams();
  const navigate  = useNavigate();
  const { login: setAuthUser } = useAuth();

  useEffect(() => {
    try {
      const raw = params.get('data');
      if (!raw) return navigate('/login?error=no_data');

      const { token, user } = JSON.parse(decodeURIComponent(raw));
      if (!token || !user) return navigate('/login?error=invalid_data');

      // Store exactly like normal login
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Sync AuthContext
      window.location.href = '/feed'; // hard redirect to ensure context reloads
    } catch {
      navigate('/login?error=parse_error');
    }
  }, []);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#07070f', color: '#fff',
      fontFamily: 'DM Sans, sans-serif', fontSize: '1rem',
    }}>
      Signing you in with Google…
    </div>
  );
}
