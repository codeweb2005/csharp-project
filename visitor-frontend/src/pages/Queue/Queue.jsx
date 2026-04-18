import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, List, Spin, Tag, Typography } from 'antd'
import { ArrowLeft, Headphones } from 'lucide-react'
import { api, getAudioStreamUrl } from '../../api.js'
import { useLanguage } from '../../context/LanguageContext.jsx'
import './Queue.css'

const FALLBACK = { lat: 10.754, lng: 106.693 }

export default function Queue() {
  const { langId, loading: langLoading } = useLanguage()
  const [position, setPosition] = useState(FALLBACK)
  const [geoNote, setGeoNote] = useState(null)
  const [geoLoading, setGeoLoading] = useState(true)
  const [radiusMeters] = useState(500)
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoLoading(false)
      setGeoNote('Geolocation is not supported. Using default area.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoLoading(false)
      },
      () => {
        setGeoNote('Location unavailable. Queue uses default coordinates.')
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
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
          setError(e.message || 'Could not load queue.')
          setQueue([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [position.lat, position.lng, radiusMeters, langId, langLoading, geoLoading])

  const totalDuration = useMemo(() => {
    return queue.reduce((acc, q) => acc + (q.audio?.duration ?? 0), 0)
  }, [queue])

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
          Explore
        </Link>
      </div>

      <header className="vk-queue-header">
        <Headphones size={28} className="vk-queue-icon" aria-hidden />
        <h1 className="vk-page-title">Tour queue</h1>
        <p className="vk-muted">
          Narrations near you are ordered by priority and distance — same order as the mobile app.
        </p>
        {geoNote && <Alert type="info" message={geoNote} showIcon />}
      </header>

      {error && <Alert type="error" message={error} showIcon className="vk-queue-alert" />}

      {loading ? (
        <div className="vk-queue-spin">
          <Spin size="large" />
        </div>
      ) : queue.length === 0 ? (
        <Card>
          <Typography.Paragraph type="secondary">
            No narrations in range. Try exploring the map on the home page or move closer to Vinh Khanh
            street.
          </Typography.Paragraph>
        </Card>
      ) : (
        <Card
          title="Playback order"
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
                  <Tag>No audio</Tag>
                )}
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  )
}
