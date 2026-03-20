const API_BASE = 'http://localhost:5015/api/v1'

function getToken() {
  return localStorage.getItem('accessToken')
}

function setTokens(accessToken, refreshToken) {
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', refreshToken)
}

function clearTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
}

async function request(endpoint, options = {}) {
  const token = getToken()
  const headers = { ...options.headers }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Don't set Content-Type for FormData (browser sets multipart/form-data boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers })

  // Token expired → try refresh
  if (res.status === 401 && token) {
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken) {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(refreshToken)
      })
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json()
        setTokens(refreshData.data.accessToken, refreshData.data.refreshToken)
        // Retry original request
        headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`
        const retryRes = await fetch(`${API_BASE}${endpoint}`, { ...options, headers })
        return handleResponse(retryRes)
      }
    }
    // Refresh failed → logout
    clearTokens()
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  return handleResponse(res)
}

async function handleResponse(res) {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: 'Lỗi không xác định' } }))
    throw { status: res.status, ...error }
  }
  // Handle empty responses (204 No Content)
  if (res.status === 204) return { success: true }
  return res.json()
}

// ============ Auth ============
export const auth = {
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  getMe: () => request('/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    }),
}

// ============ Dashboard ============
export const dashboard = {
  getStats: () => request('/dashboard/stats'),
  getTopPOIs: (count = 5) => request(`/dashboard/top-pois?count=${count}`),
  getVisitsChart: (from, to) => request(`/dashboard/visits-chart?from=${from}&to=${to}`),
  getLanguageStats: () => request('/dashboard/language-stats'),
  getRecentActivity: (count = 10) => request(`/dashboard/recent-activity?count=${count}`),
}

// ============ POIs ============
export const pois = {
  getList: (params = {}) => {
    const q = new URLSearchParams()
    if (params.page) q.set('page', params.page)
    if (params.size) q.set('size', params.size)
    if (params.search) q.set('search', params.search)
    if (params.categoryId) q.set('categoryId', params.categoryId)
    if (params.isActive !== undefined) q.set('isActive', params.isActive)
    if (params.sortBy) q.set('sortBy', params.sortBy)
    if (params.order) q.set('order', params.order)
    return request(`/pois?${q.toString()}`)
  },
  getDetail: (id) => request(`/pois/${id}`),
  create: (data) => request('/pois', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/pois/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/pois/${id}`, { method: 'DELETE' }),
  toggle: (id) => request(`/pois/${id}/toggle`, { method: 'PATCH' }),
  toggleFeatured: (id) => request(`/pois/${id}/featured`, { method: 'PATCH' }),
}

// ============ Categories ============
export const categories = {
  getAll: () => request('/categories'),
  getById: (id) => request(`/categories/${id}`),
  create: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
  toggle: (id) => request(`/categories/${id}/toggle`, { method: 'PATCH' }),
}

// ============ Users ============
export const users = {
  getList: (params = {}) => {
    const q = new URLSearchParams()
    if (params.page) q.set('page', params.page)
    if (params.size) q.set('size', params.size)
    if (params.search) q.set('search', params.search)
    if (params.role) q.set('role', params.role)
    return request(`/users?${q.toString()}`)
  },
  getById: (id) => request(`/users/${id}`),
  create: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  toggle: (id) => request(`/users/${id}/toggle`, { method: 'PATCH' }),
  resetPassword: (id) => request(`/users/${id}/reset-password`, { method: 'POST' }),
}

// ============ Audio ============
export const audio = {
  getByPOI: (poiId, lang) => request(`/audio/poi/${poiId}${lang ? `?lang=${lang}` : ''}`),
  upload: (poiId, file, languageId) => {
    const form = new FormData()
    form.append('file', file)
    form.append('languageId', languageId)
    return request(`/audio/poi/${poiId}/upload`, { method: 'POST', body: form })
  },
  generateTTS: (poiId, data) =>
    request(`/audio/poi/${poiId}/generate-tts`, { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => request(`/audio/${id}`, { method: 'DELETE' }),
  setDefault: (id) => request(`/audio/${id}/set-default`, { method: 'PATCH' }),
  getStreamUrl: (id) => `${API_BASE}/audio/${id}/stream`,
}

// ============ Media ============
export const media = {
  getByPOI: (poiId) => request(`/media/poi/${poiId}`),
  upload: (poiId, file, caption, isPrimary) => {
    const form = new FormData()
    form.append('file', file)
    if (caption) form.append('caption', caption)
    form.append('isPrimary', isPrimary || false)
    return request(`/media/poi/${poiId}/upload`, { method: 'POST', body: form })
  },
  delete: (id) => request(`/media/${id}`, { method: 'DELETE' }),
  setPrimary: (id) => request(`/media/${id}/set-primary`, { method: 'PATCH' }),
  reorder: (poiId, orderedIds) =>
    request(`/media/poi/${poiId}/reorder`, { method: 'PUT', body: JSON.stringify(orderedIds) }),
}

// ============ Menu ============
export const menu = {
  getByPOI: (poiId) => request(`/menu/poi/${poiId}`),
  create: (poiId, data) =>
    request(`/menu/poi/${poiId}`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/menu/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/menu/${id}`, { method: 'DELETE' }),
  toggleAvailable: (id) => request(`/menu/${id}/toggle-available`, { method: 'PATCH' }),
  toggleSignature: (id) => request(`/menu/${id}/toggle-signature`, { method: 'PATCH' }),
}

// ============ Analytics ============
export const analytics = {
  getTrends: (period = '30d') => request(`/analytics/trends?period=${period}`),
  getVisitsByDay: (from, to) => request(`/analytics/visits-by-day?from=${from}&to=${to}`),
  getVisitsByHour: (date) => request(`/analytics/visits-by-hour?date=${date}`),
  getLanguageDistribution: (from, to) =>
    request(`/analytics/language-distribution?from=${from}&to=${to}`),
}

// ============ Offline Packages ============
export const offlinePackages = {
  getAll: () => request('/offlinepackages'),
  create: (data) => request('/offlinepackages', { method: 'POST', body: JSON.stringify(data) }),
  build: (id) => request(`/offlinepackages/${id}/build`, { method: 'POST' }),
  getStatus: (id) => request(`/offlinepackages/${id}/status`),
  delete: (id) => request(`/offlinepackages/${id}`, { method: 'DELETE' }),
  getDownloadUrl: (id) => `${API_BASE}/offlinepackages/${id}/download`,
}

// ============ Settings ============
export const settings = {
  getAll: () => request('/settings'),
  update: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  setMaintenance: (enabled) =>
    request('/settings/maintenance', { method: 'PUT', body: JSON.stringify(enabled) }),
  generateApiKey: () => request('/settings/generate-api-key', { method: 'POST' }),
}

export { clearTokens, setTokens, getToken }
