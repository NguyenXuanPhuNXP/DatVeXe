import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh') || url.includes('/auth/logout');

    if (status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        const { data } = await api.post('/auth/refresh');
        localStorage.setItem('accessToken', data.accessToken);
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
      }
    }

    return Promise.reject(error);
  },
);

export const tripService = {
  search: (params) => api.get('/trips/search', { params }),
  getById: (id) => api.get(`/trips/${id}`),
  getSeats: (id, date) => api.get(`/trips/${id}/seats`, { params: { date } }),
  getFilterOptions: () => api.get('/trips/filter-options'),
};

export const bookingService = {
  create: (data) => api.post('/bookings', data),
  lookup: (bookingCode, phone) => api.get('/bookings/lookup', { params: { bookingCode, phone } }),
  getById: (id, phone) => api.get(`/bookings/${id}`, { params: phone ? { phone } : {} }),
  cancel: (id, phone) => api.patch(`/bookings/${id}/cancel`, phone ? { phone } : {}),
  statusCheck: (codes) => api.get('/bookings/status-check', { params: { codes: Array.isArray(codes) ? codes.join(',') : codes } }),
  getMyBookings: (params) => api.get('/bookings/my-bookings', { params }),
};

export const routeService = {
  getPopular: () => api.get('/routes/popular'),
  getCities: () => api.get('/routes/cities'),
};

export const promotionService = {
  getActive: () => api.get('/promotions'),
};

export const newsService = {
  getAll: () => api.get('/news'),
  getById: (id) => api.get(`/news/${id}`),
};

export const authService = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
};

export default api;
