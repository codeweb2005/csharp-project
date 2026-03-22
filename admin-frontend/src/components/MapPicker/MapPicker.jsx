/**
 * MapPicker Component
 *
 * Renders a Google Maps widget that lets the admin click to set a POI's
 * GPS coordinates. Falls back to manual lat/lng inputs if:
 *   - The Google Maps API key is not configured (VITE_GOOGLE_MAPS_API_KEY is empty)
 *   - The Maps SDK fails to load
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
 *   1. loads the Google Maps JS API via a <script> tag (deduped by checking window.google)
 *   2. Renders a map centered on the existing POI location, or Ho Chi Minh City by default
 *   3. User clicks → marker moves and onLocationChange is called with the new coords
 *   4. A dashed circle shows the current geofence radius in real-time
 */

import { useEffect, useRef, useState } from 'react'
import './MapPicker.css'

// Default center = Vinh Khanh street, Ho Chi Minh City
const DEFAULT_CENTER = { lat: 10.754, lng: 106.693 }
const DEFAULT_ZOOM = 17

/**
 * Loads the Google Maps JavaScript API once.
 * Returns a Promise that resolves when window.google is ready.
 * Safe to call multiple times — resolves immediately if already loaded.
 */
function loadGoogleMapsScript(apiKey) {
    if (window.google?.maps) return Promise.resolve()

    return new Promise((resolve, reject) => {
        // Prevent double-loading
        if (document.getElementById('gmap-script')) {
            document.getElementById('gmap-script').addEventListener('load', resolve)
            return
        }

        const script = document.createElement('script')
        script.id = 'gmap-script'
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
        script.async = true
        script.defer = true
        script.onload = resolve
        script.onerror = () => reject(new Error('Failed to load Google Maps API'))
        document.head.appendChild(script)
    })
}

export default function MapPicker({ lat, lng, radius = 25, onLocationChange }) {
    const mapRef = useRef(null)           // DOM node for the map
    const mapInstance = useRef(null)      // google.maps.Map instance
    const markerRef = useRef(null)        // google.maps.Marker instance
    const circleRef = useRef(null)        // google.maps.Circle instance (geofence)

    const [mapsReady, setMapsReady] = useState(false)
    const [mapsError, setMapsError] = useState(false)

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

    // ── Load the SDK once on mount ─────────────────────────────────────
    useEffect(() => {
        if (!apiKey) {
            // No API key configured → stay in manual input mode
            return
        }

        loadGoogleMapsScript(apiKey)
            .then(() => setMapsReady(true))
            .catch(() => setMapsError(true))
    }, [apiKey])

    // ── Initialise the map once SDK is ready ──────────────────────────
    useEffect(() => {
        if (!mapsReady || !mapRef.current) return

        const center = lat && lng ? { lat: Number(lat), lng: Number(lng) } : DEFAULT_CENTER

        // Create the map instance
        const map = new window.google.maps.Map(mapRef.current, {
            center,
            zoom: DEFAULT_ZOOM,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
        })

        // Draggable marker at current POI position
        const marker = new window.google.maps.Marker({
            position: center,
            map,
            draggable: true,
            title: 'POI location — drag to move',
        })

        // Geofence circle (dashed border, transparent fill)
        const circle = new window.google.maps.Circle({
            map,
            center,
            radius: Number(radius) || 25,
            strokeColor: '#6366f1',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#6366f1',
            fillOpacity: 0.08,
        })

        mapInstance.current = map
        markerRef.current = marker
        circleRef.current = circle

        // Click on map → move marker & circle, call onLocationChange
        map.addListener('click', (e) => {
            const newLat = e.latLng.lat()
            const newLng = e.latLng.lng()
            marker.setPosition(e.latLng)
            circle.setCenter(e.latLng)
            onLocationChange?.({ lat: newLat, lng: newLng })
        })

        // Drag marker → update circle & call onLocationChange
        marker.addListener('dragend', (e) => {
            const newLat = e.latLng.lat()
            const newLng = e.latLng.lng()
            circle.setCenter(e.latLng)
            onLocationChange?.({ lat: newLat, lng: newLng })
        })
    }, [mapsReady]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Sync external lat/lng changes into the map ────────────────────
    useEffect(() => {
        if (!markerRef.current || !lat || !lng) return
        const pos = { lat: Number(lat), lng: Number(lng) }
        markerRef.current.setPosition(pos)
        circleRef.current?.setCenter(pos)
        mapInstance.current?.panTo(pos)
    }, [lat, lng])

    // ── Sync radius changes into the circle ───────────────────────────
    useEffect(() => {
        if (!circleRef.current) return
        circleRef.current.setRadius(Number(radius) || 25)
    }, [radius])

    // ── Render ────────────────────────────────────────────────────────

    // No API key → render manual inputs only
    if (!apiKey) {
        return (
            <div className="map-picker-fallback">
                <p className="map-picker-note">
                    💡 Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>.env</code> to enable the map picker.
                </p>
                <ManualInputs lat={lat} lng={lng} onLocationChange={onLocationChange} />
            </div>
        )
    }

    // SDK load error → fall back to manual
    if (mapsError) {
        return (
            <div className="map-picker-fallback">
                <p className="map-picker-note map-picker-error">
                    ⚠️ Google Maps failed to load. Enter coordinates manually.
                </p>
                <ManualInputs lat={lat} lng={lng} onLocationChange={onLocationChange} />
            </div>
        )
    }

    return (
        <div className="map-picker-wrap">
            {/* Map container */}
            <div
                ref={mapRef}
                className="map-picker-canvas"
                aria-label="Click on the map to set POI location"
            />

            {!mapsReady && (
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
 * ManualInputs — plain lat/lng text fields used as a fallback when Maps is unavailable,
 * or as an override that is always accessible via the <details> toggle.
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
