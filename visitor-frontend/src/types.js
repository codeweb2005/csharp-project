/**
 * JSDoc shapes aligned with backend DTOs (camelCase JSON).
 * @typedef {Object} LanguageDto
 * @property {number} id
 * @property {string} code
 * @property {string} name
 * @property {string} nativeName
 * @property {string} [flagEmoji]
 *
 * @typedef {Object} CategoryDto
 * @property {number} id
 * @property {string} icon
 * @property {string} color
 * @property {number} sortOrder
 * @property {boolean} isActive
 * @property {number} poiCount
 * @property {Array<{ languageId: number, languageCode: string, name: string, flagEmoji?: string }>} translations
 *
 * @typedef {Object} AudioDto
 * @property {number} id
 * @property {number} poiId
 * @property {number} languageId
 * @property {string} languageName
 * @property {string} flagEmoji
 * @property {boolean} isDefault
 * @property {number} duration
 *
 * @typedef {Object} NearbyPOIDto
 * @property {number} id
 * @property {string} name
 * @property {number} categoryId
 * @property {string} categoryName
 * @property {string} categoryIcon
 * @property {string} categoryColor
 * @property {string} address
 * @property {number} latitude
 * @property {number} longitude
 * @property {number} geofenceRadius
 * @property {number} priority
 * @property {number} distanceMeters
 * @property {string} [primaryImageUrl]
 * @property {AudioDto[]} audio
 * @property {Array<{ languageId: number, name: string, shortDescription?: string, narrationText?: string }>} translations
 *
 * @typedef {Object} POIDetailDto
 * @property {number} id
 * @property {string} name
 * @property {string} address
 * @property {number} latitude
 * @property {number} longitude
 * @property {string} [phone]
 * @property {string} [website]
 * @property {string} [openingHours]
 * @property {string} [primaryImageUrl]
 * @property {Array<{ languageId: number, name: string, shortDescription?: string, fullDescription?: string, narrationText?: string, highlights?: string[] }>} translations
 * @property {Array<{ id: number, url: string, caption?: string, isPrimary: boolean }>} media
 * @property {AudioDto[]} audio
 * @property {Array<{ id: number, name: string, price: number, description?: string, imageUrl?: string, isSignature: boolean }>} menuItems
 *
 * @typedef {Object} AudioQueueResponse
 * @property {Array<{ order: number, poiId: number, poiName: string, distanceMeters: number, audio?: AudioDto, shortDescription?: string, narrationText?: string, primaryImageUrl?: string, categoryName: string, categoryIcon: string }>} queue
 * @property {number} totalDurationSeconds
 * @property {number} poiCount
 *
 * @typedef {Object} OfflinePackageCatalogItemDto
 * @property {number} id
 * @property {string} name
 * @property {string} version
 * @property {string} languageName
 * @property {string} flagEmoji
 * @property {number} [fileSize]
 * @property {number} poiCount
 * @property {number} audioCount
 */

export {}
