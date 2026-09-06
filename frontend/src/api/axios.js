import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 10000, // 10 seconds mein response na aaye to timeout error
});

// Har request ke saath token bhejo agar available hai
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response errors ko globally handle karo
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network error (backend down, internet issue)
    if (!error.response) {
      error.customMessage = 'Network error. Please check your internet connection.';
      return Promise.reject(error);
    }

    // Token expired ya invalid (401 Unauthorized)
    if (error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      error.customMessage = 'Session expired. Please login again.';
      return Promise.reject(error);
    }

    // Server error (500)
    if (error.response.status === 500) {
      error.customMessage = 'Something went wrong on our end. Please try again.';
      return Promise.reject(error);
    }

    // Baaki errors (400, 404, 409 etc.) - backend ka error message use karo
    error.customMessage = error.response.data?.error || 'Something went wrong';
    return Promise.reject(error);
  }
);

export default api;