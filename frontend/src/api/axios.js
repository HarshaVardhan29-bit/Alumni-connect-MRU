import axios from 'axios';

// On native (Capacitor), localhost won't work — must use the deployed backend URL
const getNativeApiUrl = () => {
  const isNative = window.location.protocol === 'capacitor:' ||
                   window.location.protocol === 'file:' ||
                   window.Capacitor?.isNativePlatform?.();
  if (isNative) {
    // Use deployed backend — update this to your Render URL when deployed
    return import.meta.env.VITE_API_URL_NATIVE || import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
};

const api = axios.create({ baseURL: getNativeApiUrl() });

// Simple in-memory cache for GET requests
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  
  // Check cache for GET requests
  if (config.method === 'get' && !config.skipCache) {
    const cacheKey = config.url + JSON.stringify(config.params || {});
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      // Return cached response
      config.adapter = () => Promise.resolve({
        data: cached.data,
        status: 200,
        statusText: 'OK (cached)',
        headers: {},
        config,
      });
    }
  }
  
  return config;
});

// If token is expired/invalid → redirect to login
// If account is suspended → show message and redirect to login
api.interceptors.response.use(
  res => {
    // Cache successful GET responses
    if (res.config.method === 'get' && !res.config.skipCache && res.status === 200) {
      const cacheKey = res.config.url + JSON.stringify(res.config.params || {});
      cache.set(cacheKey, {
        data: res.data,
        timestamp: Date.now(),
      });
      
      // Limit cache size to 100 entries
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
    }
    return res;
  },
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    if (err.response?.status === 403 && err.response?.data?.suspended) {
      // Dispatch a custom event — AuthContext listens and shows SuspendedScreen
      window.dispatchEvent(new CustomEvent('account:suspended'));
    }
    return Promise.reject(err);
  }
);

// Clear cache function (export for manual cache clearing)
export const clearCache = () => cache.clear();

export default api;
