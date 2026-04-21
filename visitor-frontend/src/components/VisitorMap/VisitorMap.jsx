import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { Button } from 'antd'
import { Crosshair, Map } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext.jsx'
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
 *   userPosition?: [number, number]
 *   radiusMeters?: number
 *   onMarkerClick: (id: number) => void
 *   onPickLocation?: (lat: number, lng: number) => void
 * }} props
 */
export default function VisitorMap({
  center,
  pois,
  userPosition,
  radiusMeters = 500,
  onMarkerClick,
  onPickLocation,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const userLayerRef = useRef(null)
  const radiusLayerRef = useRef(null)
  const { t } = useLanguage()

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [10.754, 106.693],
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
  }, [center])

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

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (userLayerRef.current) {
      map.removeLayer(userLayerRef.current)
      userLayerRef.current = null
    }
    if (radiusLayerRef.current) {
      map.removeLayer(radiusLayerRef.current)
      radiusLayerRef.current = null
    }

    if (!userPosition) return
    userLayerRef.current = L.circleMarker(userPosition, {
      radius: 8,
      fillColor: '#1677ff',
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.85,
    }).addTo(map)

    radiusLayerRef.current = L.circle(userPosition, {
      radius: radiusMeters,
      color: '#1677ff',
      weight: 1,
      opacity: 0.45,
      fillColor: '#1677ff',
      fillOpacity: 0.08,
    }).addTo(map)
  }, [userPosition, radiusMeters])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !onPickLocation) return undefined

    const onMapClick = (e) => {
      onPickLocation(e.latlng.lat, e.latlng.lng)
    }

    map.on('click', onMapClick)
    return () => {
      map.off('click', onMapClick)
    }
  }, [onPickLocation])

  const openExternalMap = () => {
    const [lat, lng] = center
    window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`, '_blank')
  }

  const recenter = () => {
    const map = mapRef.current
    if (!map) return
    map.flyTo(center, Math.max(map.getZoom(), 15), { duration: 0.7 })
  }

  return (
    <div className="vk-map-wrap">
      <div className="vk-map" ref={containerRef} role="presentation" aria-hidden />
      <div className="vk-map-controls">
        <Button size="small" icon={<Crosshair size={14} />} onClick={recenter}>
          {t('mapRecenter')}
        </Button>
        <Button size="small" icon={<Map size={14} />} onClick={openExternalMap}>
          {t('mapOpenStreetMap')}
        </Button>
      </div>
      <div className="vk-map-legend">
        <span className="vk-map-dot is-user" />
        {t('mapLegendYou')}
        <span className="vk-map-dot is-poi" />
        {t('mapLegendPoi')}
      </div>
    </div>
  )
}
