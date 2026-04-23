/**
 * Central HTTP helper for the public visitor site.
 * No JWT — only anonymous endpoints documented for mobile tourists.
 */

function getApiBase() {
  const u = import.meta.env.VITE_API_BASE_URL
  if (!u || typeof u !== 'string') {
    throw new Error('VITE_API_BASE_URL is not set')
  }
  return u.replace(/\/$/, '')
}

/**
 * @template T
 * @param {string} path - Path relative to API base (e.g. `/languages`)
 * @param {RequestInit} [options]
 * @returns {Promise<T>}
 */
export async function request(path, options = {}) {
  const url = `${getApiBase()}${path.startsWith('/') ? path : `/${path}`}`
  const headers = {
    Accept: 'application/json',
    ...options.headers,
  }
  if (options.body != null && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(url, { ...options, headers })
  const json = await res.json()
  if (!json.success) {
    const err = new Error(json.error?.message || 'Request failed')
    err.code = json.error?.code
    throw err
  }
  return json.data
}

/** @param {number} audioId @param {boolean} [proxy] */
export function getAudioStreamUrl(audioId, proxy = true) {
  const base = getApiBase()
  const q = proxy ? '?proxy=1' : ''
  return `${base}/audio/${audioId}/stream${q}`
}

/** @param {number} packageId */
export function getOfflinePackageDownloadUrl(packageId) {
  return `${getApiBase()}/offlinepackages/${packageId}/download`
}

function qs(params) {
  const u = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') u.set(k, String(v))
  })
  const s = u.toString()
  return s ? `?${s}` : ''
}

export const api = {
  /** @returns {Promise<import('./types').LanguageDto[]>} */
  getLanguages: () => request('/languages'),

  /** @returns {Promise<import('./types').CategoryDto[]>} */
  getCategories: () => request('/categories'),

  /**
   * @param {number} lat
   * @param {number} lng
   * @param {number} radiusMeters
   * @param {number} [langId]
   */
  getNearby: (lat, lng, radiusMeters, langId) =>
    request(`/pois/nearby${qs({ lat, lng, radiusMeters, langId })}`),

  /**
   * @param {number} id
   * @param {number} [langId]
   */
  getPoiPublic: (id, langId) => request(`/pois/${id}/public${qs({ langId })}`),

  /**
   * @param {number} lat
   * @param {number} lng
   * @param {number} radiusMeters
   * @param {number} [langId]
   */
  getAudioQueue: (lat, lng, radiusMeters, langId) =>
    request(`/pois/audio-queue${qs({ lat, lng, radiusMeters, langId })}`),

  /** @returns {Promise<import('./types').OfflinePackageCatalogItemDto[]>} */
  getOfflineCatalog: () => request('/offlinepackages/catalog'),

  /**
   * Keep anonymous website visitor online in live monitor.
   * @param {string} visitorId
   */
  presenceHeartbeat: (visitorId) =>
    request('/presence/web-visitor', {
      method: 'POST',
      body: JSON.stringify({ visitorId }),
    }),

  /**
   * Explicitly mark website visitor as offline (best-effort).
   * @param {string} visitorId
   */
  presenceExit: (visitorId) =>
    request('/presence/web-visitor/exit', {
      method: 'POST',
      body: JSON.stringify({ visitorId }),
    }),
}
