import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Card, Col, Empty, List, Row, Slider, Spin, Tag, Typography } from 'antd'
import { ChevronRight, LocateFixed } from 'lucide-react'
import { api } from '../../api.js'
import { useLanguage } from '../../context/LanguageContext.jsx'
import VisitorMap from '../../components/VisitorMap/VisitorMap.jsx'
import './Home.css'

/** Vinh Khanh street — default when geolocation is unavailable */
const FALLBACK_CENTER = [10.754, 106.693]

export default function Home() {
  const navigate = useNavigate()
  const { langId, loading: langLoading } = useLanguage()

  const [position, setPosition] = useState({ lat: FALLBACK_CENTER[0], lng: FALLBACK_CENTER[1] })
  const [geoDenied, setGeoDenied] = useState(false)
  const [geoLoading, setGeoLoading] = useState(true)
  const [radiusMeters, setRadiusMeters] = useState(500)
  const [categories, setCategories] = useState([])
  const [categoryId, setCategoryId] = useState(null)
  const [rawNearby, setRawNearby] = useState([])
  const [loadingNearby, setLoadingNearby] = useState(false)
  const [nearbyError, setNearbyError] = useState(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoLoading(false)
      },
      () => {
        setGeoDenied(true)
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.getCategories()
        if (!cancelled) setCategories(list.filter((c) => c.isActive))
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (langLoading || langId == null) return

    let cancelled = false
    setLoadingNearby(true)
    setNearbyError(null)
    ;(async () => {
      try {
        const data = await api.getNearby(position.lat, position.lng, radiusMeters, langId)
        if (!cancelled) setRawNearby(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) {
          setNearbyError(e.message || 'Could not load nearby places.')
          setRawNearby([])
        }
      } finally {
        if (!cancelled) setLoadingNearby(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [position.lat, position.lng, radiusMeters, langId, langLoading])

  const nearby = useMemo(() => {
    if (categoryId == null) return rawNearby
    return rawNearby.filter((p) => p.categoryId === categoryId)
  }, [rawNearby, categoryId])

  const mapPois = useMemo(
    () =>
      nearby.map((p) => ({
        id: p.id,
        name: p.name,
        latitude: p.latitude,
        longitude: p.longitude,
      })),
    [nearby],
  )

  const center = useMemo(() => [position.lat, position.lng], [position.lat, position.lng])

  const onMarkerClick = useCallback(
    (id) => {
      navigate(`/poi/${id}`)
    },
    [navigate],
  )

  if (langLoading || langId == null) {
    return (
      <div className="vk-home-loading">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="vk-home">
      <header className="vk-home-header">
        <h1 className="vk-page-title">Explore Vinh Khanh</h1>
        <p className="vk-muted">
          Discover food stops and listen to narrations near you. No account required.
        </p>
        {geoDenied && (
          <Alert
            type="info"
            showIcon
            className="vk-home-alert"
            message="Using default map position"
            description="Location access was denied or unavailable. Showing the Vinh Khanh area. You can still browse the list."
          />
        )}
      </header>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card className="vk-home-map-card" styles={{ body: { padding: 0, height: 360 } }}>
            {geoLoading ? (
              <div className="vk-home-map-loading">
                <Spin tip="Finding your position…" />
              </div>
            ) : (
              <VisitorMap center={center} pois={mapPois} onMarkerClick={onMarkerClick} />
            )}
          </Card>
          <div className="vk-home-radius">
            <div className="vk-home-radius-label">
              <LocateFixed size={16} aria-hidden />
              <span>Search radius: {radiusMeters} m</span>
            </div>
            <Slider
              min={100}
              max={2000}
              step={50}
              value={radiusMeters}
              onChange={setRadiusMeters}
              tooltip={{ formatter: (v) => `${v} m` }}
            />
          </div>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Nearby stops" className="vk-home-list-card">
            <div className="vk-home-filters">
              <Typography.Text type="secondary">Category</Typography.Text>
              <div className="vk-home-tags">
                <Tag.CheckableTag
                  checked={categoryId === null}
                  onChange={() => setCategoryId(null)}
                >
                  All
                </Tag.CheckableTag>
                {categories.map((c) => {
                  const tr = c.translations?.find((t) => t.languageId === langId)
                  const label = tr?.name ?? c.translations?.[0]?.name ?? `Category ${c.id}`
                  return (
                    <Tag.CheckableTag
                      key={c.id}
                      checked={categoryId === c.id}
                      onChange={(checked) => setCategoryId(checked ? c.id : null)}
                    >
                      {c.icon ? `${c.icon} ` : ''}
                      {label}
                    </Tag.CheckableTag>
                  )
                })}
              </div>
            </div>

            {nearbyError && <Alert type="error" message={nearbyError} showIcon className="vk-home-alert" />}

            {loadingNearby ? (
              <div className="vk-home-list-loading">
                <Spin />
              </div>
            ) : nearby.length === 0 ? (
              <Empty description="No stops in this radius" />
            ) : (
              <List
                className="vk-home-list"
                dataSource={nearby}
                renderItem={(item) => (
                  <List.Item
                    className="vk-home-list-item"
                    onClick={() => navigate(`/poi/${item.id}`)}
                    actions={[
                      <ChevronRight key="go" className="vk-home-chevron" aria-hidden />,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <span className="vk-home-item-title">
                          {item.categoryIcon ? `${item.categoryIcon} ` : ''}
                          {item.name}
                        </span>
                      }
                      description={
                        <span className="vk-home-item-meta">
                          {item.distanceMeters != null && (
                            <Tag>{Math.round(item.distanceMeters)} m</Tag>
                          )}
                          {item.address}
                        </span>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
