import api from './api';

export const adminService = {
  // Dashboard
  getDashboard: () => api.get('/admin/dashboard'),
  
  // Trips
  getTrips: (params) => api.get('/admin/trips', { params }),
  createTrip: (data) => api.post('/admin/trips', data),
  updateTrip: (id, data) => api.put(`/admin/trips/${id}`, data),
  deleteTrip: (id) => api.delete(`/admin/trips/${id}`),
  
  // Routes
  getRoutes: (params) => api.get('/admin/routes', { params }),
  createRoute: (data) => api.post('/admin/routes', data),
  updateRoute: (id, data) => api.put(`/admin/routes/${id}`, data),
  deleteRoute: (id) => api.delete(`/admin/routes/${id}`),
  
  // Companies
  getCompanies: (params) => api.get('/admin/companies', { params }),
  createCompany: (data) => api.post('/admin/companies', data),
  updateCompany: (id, data) => api.put(`/admin/companies/${id}`, data),
  deleteCompany: (id) => api.delete(`/admin/companies/${id}`),
  
  // Bookings
  getBookings: (params) => api.get('/admin/bookings', { params }),
  updateBookingStatus: (id, status) => api.patch(`/admin/bookings/${id}/status`, { status }),
  
  // Promotions
  getPromotions: (params) => api.get('/admin/promotions', { params }),
  createPromotion: (data) => api.post('/admin/promotions', data),
  updatePromotion: (id, data) => api.put(`/admin/promotions/${id}`, data),
  deletePromotion: (id) => api.delete(`/admin/promotions/${id}`),
  
  // News
  getNews: (params) => api.get('/admin/news', { params }),
  createNews: (data) => api.post('/admin/news', data),
  updateNews: (id, data) => api.put(`/admin/news/${id}`, data),
  deleteNews: (id) => api.delete(`/admin/news/${id}`),
  
  // Users
  getUsers: (params) => api.get('/admin/users', { params }),
  
  // Reports & Analytics
  getReports: (params) => api.get('/admin/reports', { params }),
  exportReportsExcel: (params) => api.get('/admin/reports/export-excel', { params, responseType: 'blob' }),
};
