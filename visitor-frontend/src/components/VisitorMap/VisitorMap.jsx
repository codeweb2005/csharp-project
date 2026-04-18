import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import './VisitorMap.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

/**
 * @typedef {Object} MapPoi
 * @property {number} id
 * @property {string} name
 * @property {number} latitude
 * @property {number} longitude
 */

/**
 * @param {{
 *   center: [number, number]
 *   pois: MapPoi[]
 *   onMarkerClick: (id: number) => void
 * }} props
 */
export default function VisitorMap({ center, pois, onMarkerClick }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center,
      zoom: 16,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.setView(center, Math.max(map.getZoom(), 15))
  }, [center[0], center[1]])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((m) => {
      map.removeLayer(m)
    })
    markersRef.current = []

    pois.forEach((p) => {
      const marker = L.marker([p.latitude, p.longitude]).addTo(map)
      marker.on('click', () => {
        onMarkerClick(p.id)
      })
      marker.bindTooltip(p.name, { direction: 'top', offset: [0, -32] })
      markersRef.current.push(marker)
    })
  }, [pois, onMarkerClick])

  return <div className="vk-map" ref={containerRef} role="presentation" aria-hidden />
}
