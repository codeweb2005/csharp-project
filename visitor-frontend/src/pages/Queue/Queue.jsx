import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, InputNumber, List, Space, Spin, Tag, Typography } from 'antd'
import { ArrowLeft, Headphones, LocateFixed } from 'lucide-react'
import { api, getAudioStreamUrl } from '../../api.js'
import { useLanguage } from '../../context/LanguageContext.jsx'
import VisitorMap from '../../components/VisitorMap/VisitorMap.jsx'
import './Queue.css'

const FALLBACK = { lat: 10.754, lng: 106.693 }

export default function Queue() {
  const { langId, loading: langLoading, t } = useLanguage()
  const [position, setPosition] = useState(FALLBACK)
  const [geoNote, setGeoNote] = useState(t('queueFixedMode'))
  const [geoLoading, setGeoLoading] = useState(false)
  const [followingDevice, setFollowingDevice] = useState(false)
  const [draftLat, setDraftLat] = useState(FALLBACK.lat)
  const [draftLng, setDraftLng] = useState(FALLBACK.lng)
  const watchIdRef = useRef(null)
  const [radiusMeters] = useState(500)
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const stopDeviceTracking = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setFollowingDevice(false)
    setGeoLoading(false)
    setGeoNote(t('queueFixedMode'))
  }, [t])

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (langLoading || langId == null || geoLoading) return

    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const data = await api.getAudioQueue(position.lat, position.lng, radiusMeters, langId)
        if (!cancelled) setQueue(data?.queue ?? [])
      } catch (e) {
        if (!cancelled) {
          setError(e.message || t('queueLoadError'))
          setQueue([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [position.lat, position.lng, radiusMeters, langId, langLoading, geoLoading, t])

  const totalDuration = useMemo(() => {
    return queue.reduce((acc, q) => acc + (q.audio?.duration ?? 0), 0)
  }, [queue])

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
    setGeoNote(t('queueFixedMode'))
  }, [draftLat, draftLng, stopDeviceTracking, t])

  const useCurrentLocation = useCallback(() => {
    if (followingDevice) {
      stopDeviceTracking()
      return
    }
    if (!navigator.geolocation) {
      setGeoNote(t('queueGeoUnsupported'))
      return
    }

    setGeoLoading(true)
    setGeoNote(t('coordinateTrackingHint'))
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setPosition({ lat, lng })
        setDraftLat(lat)
        setDraftLng(lng)
        setGeoLoading(false)
      },
      () => {
        setGeoNote(t('queueGeoUnavailable'))
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 },
    )
    setFollowingDevice(true)
  }, [followingDevice, stopDeviceTracking, t])

  const onPickLocationFromMap = useCallback(
    (lat, lng) => {
      stopDeviceTracking()
      setDraftLat(Number(lat.toFixed(6)))
      setDraftLng(Number(lng.toFixed(6)))
      setPosition({ lat, lng })
      setGeoNote(t('queueFixedMode'))
    },
    [stopDeviceTracking, t],
  )

  if (langLoading || langId == null) {
    return (
      <div className="vk-queue-loading">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="vk-queue">
      <div className="vk-queue-toolbar">
        <Link to="/" className="vk-queue-back">
          <ArrowLeft size={18} aria-hidden />
          {t('navExplore')}
        </Link>
      </div>

      <header className="vk-queue-header">
        <Headphones size={28} className="vk-queue-icon" aria-hidden />
        <h1 className="vk-page-title">{t('queueTitle')}</h1>
        <p className="vk-muted">{t('queueSubtitle')}</p>
        {geoNote && <Alert type="info" message={geoNote} showIcon />}
      </header>

      <Card className="vk-queue-map-card" styles={{ body: { padding: 0, height: 280 } }}>
        <VisitorMap
          center={[position.lat, position.lng]}
          userPosition={[position.lat, position.lng]}
          radiusMeters={radiusMeters}
          pois={queue.map((q) => ({
            id: q.poiId,
            name: q.poiName,
            latitude: q.latitude ?? position.lat,
            longitude: q.longitude ?? position.lng,
          }))}
          onMarkerClick={() => {}}
          onPickLocation={onPickLocationFromMap}
        />
      </Card>

      <Card className="vk-queue-coordinate-card" size="small">
        <Space wrap align="end" size={10}>
          <div>
            <Typography.Text type="secondary">{t('coordinateLat')}</Typography.Text>
            <InputNumber
              className="vk-queue-coordinate-input"
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
              className="vk-queue-coordinate-input"
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
        <div className="vk-queue-radius-label">
          <LocateFixed size={14} />
          <span>
            {t('radiusLabel')}: {radiusMeters} {t('distanceUnit')}
          </span>
        </div>
      </Card>

      {error && <Alert type="error" message={error} showIcon className="vk-queue-alert" />}

      {loading ? (
        <div className="vk-queue-spin">
          <Spin size="large" />
        </div>
      ) : queue.length === 0 ? (
        <Card>
          <Typography.Paragraph type="secondary">
            {t('queueNone')}
          </Typography.Paragraph>
        </Card>
      ) : (
        <Card
          title={t('playbackOrder')}
          extra={
            <span className="vk-queue-meta">
              {queue.length} stops · ~{totalDuration}s audio
            </span>
          }
        >
          <List
            dataSource={queue}
            renderItem={(item) => (
              <List.Item className="vk-queue-item">
                <List.Item.Meta
                  avatar={
                    <div className="vk-queue-order" aria-hidden>
                      {item.order}
                    </div>
                  }
                  title={
                    <Link to={`/poi/${item.poiId}`} className="vk-queue-title">
                      {item.categoryIcon ? `${item.categoryIcon} ` : ''}
                      {item.poiName}
                    </Link>
                  }
                  description={
                    <div className="vk-queue-desc">
                      {item.distanceMeters != null && (
                        <Tag>{Math.round(item.distanceMeters)} m</Tag>
                      )}
                      {item.shortDescription && (
                        <span className="vk-queue-short">{item.shortDescription}</span>
                      )}
                    </div>
                  }
                />
                {item.audio?.id ? (
                  <audio
                    controls
                    className="vk-queue-audio"
                    src={getAudioStreamUrl(item.audio.id, true)}
                    preload="none"
                  >
                    <track kind="captions" />
                  </audio>
                ) : (
                  <Tag>{t('noAudio')}</Tag>
                )}
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  )
}
