/**
 * MapPicker Component — OpenStreetMap + Leaflet.js
 *
 * Renders an interactive map that lets the admin click to set a POI's
 * GPS coordinates. Uses free, open-source OpenStreetMap tiles — no API key needed.
 *
 * Usage:
 *   <MapPicker
 *     lat={formData.latitude}
 *     lng={formData.longitude}
 *     radius={formData.geofenceRadius}
 *     onLocationChange={({ lat, lng }) => setFormData(...)}
 *   />
 *
 * How it works:
 *   1. Imports Leaflet.js and its CSS
 *   2. Renders a map centered on the existing POI location, or Vinh Khanh street by default
 *   3. User clicks → marker moves and onLocationChange is called with the new coords
 *   4. A dashed circle shows the current geofence radius in real-time
 */

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './MapPicker.css'

// Fix Leaflet's default icon paths (broken by bundlers like Vite)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
})

// Default center = Vinh Khanh street, Ho Chi Minh City
const DEFAULT_CENTER = [10.754, 106.693]
const DEFAULT_ZOOM = 17

export default function MapPicker({ lat, lng, radius = 25, onLocationChange }) {
    const mapContainerRef = useRef(null)  // DOM node for the map
    const mapInstance = useRef(null)       // L.Map instance
    const markerRef = useRef(null)         // L.Marker instance
    const circleRef = useRef(null)         // L.Circle instance (geofence)

    const [ready, setReady] = useState(false)

    // ── Initialise the map once on mount ──────────────────────────────
    useEffect(() => {
        if (!mapContainerRef.current || mapInstance.current) return

        const center = lat && lng
            ? [Number(lat), Number(lng)]
            : DEFAULT_CENTER

        // Create the Leaflet map
        const map = L.map(mapContainerRef.current, {
            center,
            zoom: DEFAULT_ZOOM,
            zoomControl: true,
            attributionControl: true,
        })

        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(map)

        // Draggable marker at current POI position
        const marker = L.marker(center, {
            draggable: true,
            title: 'POI location — drag to move',
        }).addTo(map)

        // Geofence circle
        const circle = L.circle(center, {
            radius: Number(radius) || 25,
            color: '#6366f1',
            weight: 2,
            opacity: 0.8,
            fillColor: '#6366f1',
            fillOpacity: 0.08,
            dashArray: '6 4',
        }).addTo(map)

        mapInstance.current = map
        markerRef.current = marker
        circleRef.current = circle

        // Click on map → move marker & circle, fire callback
        map.on('click', (e) => {
            const { lat: newLat, lng: newLng } = e.latlng
            marker.setLatLng(e.latlng)
            circle.setLatLng(e.latlng)
            onLocationChange?.({ lat: newLat, lng: newLng })
        })

        // Drag marker → update circle & fire callback
        marker.on('dragend', () => {
            const pos = marker.getLatLng()
            circle.setLatLng(pos)
            onLocationChange?.({ lat: pos.lat, lng: pos.lng })
        })

        setReady(true)

        // Cleanup on unmount
        return () => {
            map.remove()
            mapInstance.current = null
            markerRef.current = null
            circleRef.current = null
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Sync external lat/lng changes into the map ────────────────────
    useEffect(() => {
        if (!markerRef.current || !lat || !lng) return
        const pos = L.latLng(Number(lat), Number(lng))
        markerRef.current.setLatLng(pos)
        circleRef.current?.setLatLng(pos)
        mapInstance.current?.panTo(pos)
    }, [lat, lng])

    // ── Sync radius changes into the circle ───────────────────────────
    useEffect(() => {
        if (!circleRef.current) return
        circleRef.current.setRadius(Number(radius) || 25)
    }, [radius])

    // ── Render ────────────────────────────────────────────────────────
    return (
        <div className="map-picker-wrap">
            {/* Map container */}
            <div
                ref={mapContainerRef}
                className="map-picker-canvas"
                aria-label="Click on the map to set POI location"
            />

            {!ready && (
                <div className="map-picker-loading">⟳ Loading map…</div>
            )}

            {/* Coordinate readout below the map */}
            <div className="map-picker-coords">
                <span>📍 <strong>Lat:</strong> {lat ? Number(lat).toFixed(6) : '—'}</span>
                <span><strong>Lng:</strong> {lng ? Number(lng).toFixed(6) : '—'}</span>
                <span>⬤ <strong>Radius:</strong> {radius}m</span>
            </div>

            {/* Manual override — always visible as a fallback */}
            <details className="map-picker-manual-toggle">
                <summary>Enter coordinates manually</summary>
                <ManualInputs lat={lat} lng={lng} onLocationChange={onLocationChange} />
            </details>
        </div>
    )
}

/**
 * ManualInputs — plain lat/lng text fields as an override
 */
function ManualInputs({ lat, lng, onLocationChange }) {
    const [localLat, setLocalLat] = useState(lat ?? '')
    const [localLng, setLocalLng] = useState(lng ?? '')

    function handleBlur() {
        const parsedLat = parseFloat(localLat)
        const parsedLng = parseFloat(localLng)
        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
            onLocationChange?.({ lat: parsedLat, lng: parsedLng })
        }
    }

    return (
        <div className="map-picker-inputs">
            <label>
                Latitude
                <input
                    type="number"
                    step="0.000001"
                    min="-90"
                    max="90"
                    value={localLat}
                    onChange={e => setLocalLat(e.target.value)}
                    onBlur={handleBlur}
                    placeholder="e.g. 10.754000"
                />
            </label>
            <label>
                Longitude
                <input
                    type="number"
                    step="0.000001"
                    min="-180"
                    max="180"
                    value={localLng}
                    onChange={e => setLocalLng(e.target.value)}
                    onBlur={handleBlur}
                    placeholder="e.g. 106.693000"
                />
            </label>
        </div>
    )
}
