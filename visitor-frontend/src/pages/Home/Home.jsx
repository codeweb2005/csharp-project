import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  InputNumber,
  List,
  Row,
  Slider,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd'
import { ChevronRight, LocateFixed } from 'lucide-react'
import { api } from '../../api.js'
import { useLanguage } from '../../context/LanguageContext.jsx'
import VisitorMap from '../../components/VisitorMap/VisitorMap.jsx'
import './Home.css'

/** Vinh Khanh street — default when geolocation is unavailable */
const FALLBACK_CENTER = [10.754, 106.693]

export default function Home() {
  const navigate = useNavigate()
  const { langId, loading: langLoading, t } = useLanguage()

  const [position, setPosition] = useState({ lat: FALLBACK_CENTER[0], lng: FALLBACK_CENTER[1] })
  const [geoDenied, setGeoDenied] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [followingDevice, setFollowingDevice] = useState(false)
  const [radiusMeters, setRadiusMeters] = useState(500)
  const [categories, setCategories] = useState([])
  const [categoryId, setCategoryId] = useState(null)
  const [rawNearby, setRawNearby] = useState([])
  const [loadingNearby, setLoadingNearby] = useState(false)
  const [nearbyError, setNearbyError] = useState(null)
  const [draftLat, setDraftLat] = useState(FALLBACK_CENTER[0])
  const [draftLng, setDraftLng] = useState(FALLBACK_CENTER[1])
  const watchIdRef = useRef(null)

  const stopDeviceTracking = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setFollowingDevice(false)
    setGeoLoading(false)
  }, [])

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
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
          setNearbyError(e.message || t('couldNotLoadNearby'))
          setRawNearby([])
        }
      } finally {
        if (!cancelled) setLoadingNearby(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [position.lat, position.lng, radiusMeters, langId, langLoading, t])

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
  const selectedCategoryLabel = useMemo(() => {
    if (categoryId == null) return t('all')
    const category = categories.find((c) => c.id === categoryId)
    if (!category) return String(categoryId)
    const tr = category.translations?.find((it) => it.languageId === langId)
    return tr?.name ?? category.translations?.[0]?.name ?? String(categoryId)
  }, [categoryId, categories, langId, t])

  const center = useMemo(() => [position.lat, position.lng], [position.lat, position.lng])

  const onMarkerClick = useCallback(
    (id) => {
      navigate(`/poi/${id}`)
    },
    [navigate],
  )

  const applyDraftPosition = useCallback(() => {
    if (
      typeof draftLat !== 'number' ||
      typeof draftLng !== 'number' ||
      Number.isNaN(draftLat) ||
      Number.isNaN(draftLng) ||
      draftLat < -90 ||
      draftLat > 90 ||
      draftLng < -180 ||
      draftLng > 180
    ) {
      return
    }
    stopDeviceTracking()
    setPosition({ lat: draftLat, lng: draftLng })
    setGeoDenied(false)
  }, [draftLat, draftLng, stopDeviceTracking])

  const useCurrentLocation = useCallback(() => {
    if (followingDevice) {
      stopDeviceTracking()
      return
    }
    if (!navigator.geolocation) {
      setGeoDenied(true)
      return
    }

    setGeoLoading(true)
    setGeoDenied(false)
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setPosition({ lat, lng })
        setDraftLat(lat)
        setDraftLng(lng)
        setGeoDenied(false)
        setGeoLoading(false)
      },
      () => {
        setGeoDenied(true)
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 },
    )
    setFollowingDevice(true)
  }, [followingDevice, stopDeviceTracking])

  const onPickLocationFromMap = useCallback((lat, lng) => {
    stopDeviceTracking()
    setDraftLat(Number(lat.toFixed(6)))
    setDraftLng(Number(lng.toFixed(6)))
    setPosition({ lat, lng })
    setGeoDenied(false)
  }, [stopDeviceTracking])

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
        <h1 className="vk-page-title">{t('homeTitle')}</h1>
        <p className="vk-muted">{t('homeSubtitle')}</p>
        {geoDenied && (
          <Alert
            type="info"
            showIcon
            className="vk-home-alert"
            message={t('geoFallbackTitle')}
            description={t('geoFallbackBody')}
          />
        )}
      </header>

      <Row gutter={[12, 12]} className="vk-home-stats-row">
        <Col xs={12} sm={8} lg={6}>
          <Card size="small" className="vk-home-stat-card">
            <Statistic title={t('nearbyStops')} value={nearby.length} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card size="small" className="vk-home-stat-card">
            <Statistic title={t('radiusLabel')} value={radiusMeters} suffix={t('distanceUnit')} />
          </Card>
        </Col>
        <Col xs={24} sm={8} lg={6}>
          <Card size="small" className="vk-home-stat-card">
            <Statistic title={t('category')} value={selectedCategoryLabel} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card className="vk-home-map-card" styles={{ body: { padding: 0, height: 360 } }}>
            {geoLoading ? (
              <div className="vk-home-map-loading">
                <Spin tip={t('findPosition')} />
              </div>
            ) : (
              <VisitorMap
                center={center}
                userPosition={center}
                radiusMeters={radiusMeters}
                pois={mapPois}
                onMarkerClick={onMarkerClick}
                onPickLocation={onPickLocationFromMap}
              />
            )}
          </Card>
          <Card className="vk-home-coordinate-card" size="small">
            <Space wrap align="end" size={10}>
              <div>
                <Typography.Text type="secondary">{t('coordinateLat')}</Typography.Text>
                <InputNumber
                  className="vk-home-coordinate-input"
                  value={draftLat}
                  min={-90}
                  max={90}
                  step={0.0001}
                  onChange={(v) => setDraftLat(typeof v === 'number' ? v : draftLat)}
                />
              </div>
              <div>
                <Typography.Text type="secondary">{t('coordinateLng')}</Typography.Text>
                <InputNumber
                  className="vk-home-coordinate-input"
                  value={draftLng}
                  min={-180}
                  max={180}
                  step={0.0001}
                  onChange={(v) => setDraftLng(typeof v === 'number' ? v : draftLng)}
                />
              </div>
              <Button type="primary" onClick={applyDraftPosition}>
                {t('coordinateApply')}
              </Button>
              <Button onClick={useCurrentLocation}>
                {followingDevice ? t('coordinateStopDevice') : t('coordinateUseDevice')}
              </Button>
            </Space>
            <Typography.Paragraph className="vk-home-coordinate-help" type="secondary">
              {followingDevice ? t('coordinateTrackingHint') : t('coordinateHint')}
            </Typography.Paragraph>
          </Card>
          <div className="vk-home-radius">
            <div className="vk-home-radius-label">
              <LocateFixed size={16} aria-hidden />
              <span>
                {t('radiusLabel')}: {radiusMeters} {t('distanceUnit')}
              </span>
            </div>
            <Slider
              min={100}
              max={2000}
              step={50}
              value={radiusMeters}
              onChange={setRadiusMeters}
              tooltip={{ formatter: (v) => `${v} ${t('distanceUnit')}` }}
            />
          </div>
        </Col>
        <Col xs={24} lg={10}>
          <Card title={t('nearbyStops')} className="vk-home-list-card">
            <div className="vk-home-filters">
              <Typography.Text type="secondary">{t('category')}</Typography.Text>
              <div className="vk-home-tags">
                <Tag.CheckableTag
                  checked={categoryId === null}
                  onChange={() => setCategoryId(null)}
                >
                  {t('all')}
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
              <Empty description={t('noStops')} />
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
                            <Tag>
                              {Math.round(item.distanceMeters)} {t('distanceUnit')}
                            </Tag>
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
