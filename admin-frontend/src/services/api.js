import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// 1. Auth Endpoint
export const authApi = {
  login: (data) => apiClient.post('/auth/login', data),
  refresh: (token) => apiClient.post('/auth/refresh', { refreshToken: token }),
  changePassword: (data) => apiClient.post('/auth/change-password', data),
  getMe: () => apiClient.get('/auth/me'),
  register: (data) => apiClient.post('/auth/register', data),
};

// 2. POIs Endpoint
export const poiApi = {
  getList: (params) => apiClient.get('/pois', { params }),
  getDetail: (id) => apiClient.get(`/pois/${id}`),
  create: (data) => apiClient.post('/pois', data),
  update: (id, data) => apiClient.put(`/pois/${id}`, data),
  delete: (id) => apiClient.delete(`/pois/${id}`),
  toggleActive: (id) => apiClient.patch(`/pois/${id}/toggle`),
  toggleFeatured: (id) => apiClient.patch(`/pois/${id}/featured`),
  getNearby: (params) => apiClient.get('/pois/nearby', { params }),
  getPublicDetail: (id, params) => apiClient.get(`/pois/${id}/public`, { params }),
};

// 3. Languages
export const languageApi = {
  getAll: () => apiClient.get('/languages'),
};

// 4. Categories
export const categoryApi = {
  getAll: () => apiClient.get('/categories'),
  getById: (id) => apiClient.get(`/categories/${id}`),
  create: (data) => apiClient.post('/categories', data),
  update: (id, data) => apiClient.put(`/categories/${id}`, data),
  delete: (id) => apiClient.delete(`/categories/${id}`),
  toggle: (id) => apiClient.patch(`/categories/${id}/toggle`),
};

// 5. Audio
export const audioApi = {
  getByPOI: (poiId, params) => apiClient.get(`/audio/poi/${poiId}`, { params }),
  upload: (poiId, formData) => apiClient.post(`/audio/poi/${poiId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  generateTTS: (poiId, data) => apiClient.post(`/audio/poi/${poiId}/generate-tts`, data),
  delete: (id) => apiClient.delete(`/audio/${id}`),
  setDefault: (id) => apiClient.patch(`/audio/${id}/set-default`),
};

// 6. Media
export const mediaApi = {
  getByPOI: (poiId) => apiClient.get(`/media/poi/${poiId}`),
  upload: (poiId, formData) => apiClient.post(`/media/poi/${poiId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => apiClient.delete(`/media/${id}`),
  setPrimary: (id) => apiClient.patch(`/media/${id}/set-primary`),
  reorder: (poiId, orderedIds) => apiClient.put(`/media/poi/${poiId}/reorder`, orderedIds),
};

// 7. Menu
export const menuApi = {
  getByPOI: (poiId) => apiClient.get(`/menu/poi/${poiId}`),
  create: (poiId, data) => apiClient.post(`/menu/poi/${poiId}`, data),
  update: (id, data) => apiClient.put(`/menu/${id}`, data),
  delete: (id) => apiClient.delete(`/menu/${id}`),
  toggleAvailable: (id) => apiClient.patch(`/menu/${id}/toggle-available`),
  toggleSignature: (id) => apiClient.patch(`/menu/${id}/toggle-signature`),
};

// 8. Users (Admin Only)
export const userApi = {
  getList: (params) => apiClient.get('/users', { params }),
  getById: (id) => apiClient.get(`/users/${id}`),
  create: (data) => apiClient.post('/users', data),
  update: (id, data) => apiClient.put(`/users/${id}`, data),
  delete: (id) => apiClient.delete(`/users/${id}`),
  toggle: (id) => apiClient.patch(`/users/${id}/toggle`),
  resetPassword: (id) => apiClient.post(`/users/${id}/reset-password`),
};

// 9. Dashboard
export const dashboardApi = {
  getStats: () => apiClient.get('/dashboard/stats'),
  getTopPOIs: (count = 5) => apiClient.get('/dashboard/top-pois', { params: { count } }),
  getVisitsChart: (from, to) => apiClient.get('/dashboard/visits-chart', { params: { from, to } }),
  getLanguageStats: () => apiClient.get('/dashboard/language-stats'),
  getRecentActivity: (count = 10) => apiClient.get('/dashboard/recent-activity', { params: { count } }),
};

// 10. Analytics
export const analyticsApi = {
  getTrends: (period = '30d') => apiClient.get('/analytics/trends', { params: { period } }),
  getVisitsByDay: (from, to) => apiClient.get('/analytics/visits-by-day', { params: { from, to } }),
  getVisitsByHour: (date) => apiClient.get('/analytics/visits-by-hour', { params: { date } }),
  getLanguagesDistribution: (from, to) => apiClient.get('/analytics/language-distribution', { params: { from, to } }),
};

// 11. Offline Packages
export const offlinePackageApi = {
  getAll: () => apiClient.get('/offlinepackages'),
  create: (data) => apiClient.post('/offlinepackages', data),
  build: (id) => apiClient.post(`/offlinepackages/${id}/build`),
  getStatus: (id) => apiClient.get(`/offlinepackages/${id}/status`),
  delete: (id) => apiClient.delete(`/offlinepackages/${id}`),
};

// 12. Settings
export const settingsApi = {
  getAll: () => apiClient.get('/settings'),
  update: (data) => apiClient.put('/settings', data),
  setMaintenance: (enabled) => apiClient.put('/settings/maintenance', enabled),
  generateApiKey: () => apiClient.post('/settings/generate-api-key'),
};

export default apiClient;
