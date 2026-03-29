/**
 * POIMiniMap — Small interactive map panel shown alongside the POI table.
 *
 * Features:
 *  - Displays all visible POIs as Leaflet markers on an OpenStreetMap base layer.
 *  - Clicking a pin calls onSelectPoi(poi) so the parent can highlight the table row.
 *  - The highlighted POI's marker uses a different blue color.
 *  - Geofence radius circle drawn for the selected POI.
 *  - No Google Maps. Uses Leaflet.js (loaded via CDN script tag on first use).
 *
 * Props:
 *  pois          — array of POIListDto objects
 *  selectedPoiId — id of the currently highlighted POI (from table selection)
 *  onSelectPoi   — callback(poi) when a map pin is clicked
 */

import { useEffect, useRef, useState } from 'react'
import './POIMiniMap.css'

// Leaflet CDN loader — only loads once
let leafletLoaded = false
function loadLeaflet() {
    if (leafletLoaded || typeof window === 'undefined') return Promise.resolve()
    if (window.L) { leafletLoaded = true; return Promise.resolve() }

    return new Promise((resolve, reject) => {
        // CSS
        if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link')
            link.id   = 'leaflet-css'
            link.rel  = 'stylesheet'
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
            document.head.appendChild(link)
        }
        // JS
        const script = document.createElement('script')
        script.src   = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.onload  = () => { leafletLoaded = true; resolve() }
        script.onerror = reject
        document.head.appendChild(script)
    })
}

// Colour-coded marker icons
function makeIcon(color = '#00246a', active = false) {
    const size = active ? 32 : 24
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="${size}" height="${size * 4 / 3}">
        <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z"
              fill="${color}" stroke="white" stroke-width="1.5" opacity="${active ? '1' : '0.85'}"/>
        <circle cx="12" cy="12" r="5" fill="white" opacity="0.95"/>
    </svg>`
    return window.L.divIcon({
        html: svg,
        className: '',
        iconSize:   [size, size * 4 / 3],
        iconAnchor: [size / 2, size * 4 / 3],
        popupAnchor:[0, -(size * 4 / 3)]
    })
}

export default function POIMiniMap({ pois = [], selectedPoiId, onSelectPoi }) {
    const containerRef = useRef(null)
    const mapRef       = useRef(null)
    const markersRef   = useRef({})  // id → L.marker
    const circleRef    = useRef(null)
    const [ready, setReady] = useState(false)

    // ── Init Leaflet map once ────────────────────────────────────────────────
    useEffect(() => {
        loadLeaflet().then(() => {
            if (mapRef.current || !containerRef.current) return

            const map = window.L.map(containerRef.current, {
                zoom: 15,
                center: [10.7769, 106.7009], // Vĩnh Khánh default center (Ho Chi Minh City)
                zoomControl: true,
                attributionControl: false
            })

            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
            }).addTo(map)

            mapRef.current = map
            setReady(true)
        })

        return () => {
            if (mapRef.current) {
                mapRef.current.remove()
                mapRef.current = null
                markersRef.current = {}
                leafletLoaded = false
            }
        }
    }, [])

    // ── Sync markers whenever pois or selectedPoiId changes ─────────────────
    useEffect(() => {
        if (!ready || !mapRef.current) return
        const map = mapRef.current
        const L   = window.L

        // Remove old markers
        Object.values(markersRef.current).forEach(m => map.removeLayer(m))
        markersRef.current = {}
        if (circleRef.current) { map.removeLayer(circleRef.current); circleRef.current = null }

        if (!pois.length) return

        const bounds = []

        pois.filter(p => p.latitude && p.longitude).forEach(poi => {
            const isSelected = poi.id === selectedPoiId
            const color = isSelected ? '#00246a' : (poi.categoryColor || '#6b7280')

            const marker = L.marker([poi.latitude, poi.longitude], {
                icon: makeIcon(color, isSelected),
                title: poi.name
            })

            marker.bindPopup(`
                <div style="font-family:'Inter',sans-serif;min-width:140px">
                    <div style="font-weight:700;font-size:0.9rem;margin-bottom:4px">${poi.categoryIcon || '📍'} ${poi.name}</div>
                    <div style="font-size:0.78rem;color:#64748b">${poi.address || ''}</div>
                    ${poi.isActive
                        ? '<span style="font-size:0.72rem;color:#10b981;font-weight:600">● Active</span>'
                        : '<span style="font-size:0.72rem;color:#ef4444;font-weight:600">● Inactive</span>'}
                </div>
            `, { maxWidth: 220 })

            marker.on('click', () => {
                onSelectPoi?.(poi)
            })

            marker.addTo(map)
            markersRef.current[poi.id] = marker
            bounds.push([poi.latitude, poi.longitude])

            // Draw geofence circle for selected POI
            if (isSelected && poi.geofenceRadiusMeters) {
                circleRef.current = L.circle([poi.latitude, poi.longitude], {
                    radius: poi.geofenceRadiusMeters,
                    color: '#00246a',
                    fillColor: '#00246a',
                    fillOpacity: 0.08,
                    weight: 1.5,
                    dashArray: '4 4'
                }).addTo(map)

                // Open popup for selected
                marker.openPopup()
            }
        })

        if (bounds.length === 1) {
            map.setView(bounds[0], 17)
        } else if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [24, 24], maxZoom: 17 })
        }
    }, [ready, pois, selectedPoiId, onSelectPoi])

    return (
        <div className="poi-minimap-wrap">
            <div className="poi-minimap-header">
                <span>🗺️ POI Map</span>
                <span className="poi-minimap-count">{pois.filter(p => p.latitude).length} locations</span>
            </div>
            <div ref={containerRef} className="poi-minimap-container" />
        </div>
    )
}
