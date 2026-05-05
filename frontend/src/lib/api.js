import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Extract a readable error message
    let msg = '';
    if (err.response) {
      const data = err.response.data;
      const status = err.response.status;
      msg = data?.message || data?.error?.message || `${status}: ${err.response.statusText}`;

      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    } else if (err.request) {
      msg = 'Network error - server unreachable';
    } else {
      msg = err.message;
    }

    // Attach readable message for easy access
    err.msg = msg;
    return Promise.reject(err);
  }
);

export default api;
