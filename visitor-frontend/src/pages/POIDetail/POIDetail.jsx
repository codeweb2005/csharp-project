import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alert, Button, Card, Col, Empty, Image, Row, Spin, Tag, Typography } from 'antd'
import { ArrowLeft, Pause, Play } from 'lucide-react'
import { api, getAudioStreamUrl } from '../../api.js'
import { useLanguage } from '../../context/LanguageContext.jsx'
import VisitorMap from '../../components/VisitorMap/VisitorMap.jsx'
import './POIDetail.css'

const vnd = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(
    n,
  )

export default function POIDetail() {
  const { id } = useParams()
  const poiId = Number(id)
  const { langId, loading: langLoading, t } = useLanguage()

  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [playingId, setPlayingId] = useState(null)
  const audioRef = useRef(null)

  useEffect(() => {
    if (!Number.isFinite(poiId) || langLoading || langId == null) return

    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const res = await api.getPoiPublic(poiId, langId)
        if (!cancelled) setData(res)
      } catch (e) {
        if (!cancelled) setError(e.message || t('detailUnavailable'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [poiId, langId, langLoading, t])

  const translation = useMemo(() => {
    if (!data?.translations?.length) return null
    return data.translations.find((t) => t.languageId === langId) ?? data.translations[0]
  }, [data, langId])

  const gallery = useMemo(() => {
    if (!data?.media?.length) return []
    const sorted = [...data.media].sort((a, b) => a.sortOrder - b.sortOrder)
    return sorted.filter((m) => m.url || m.filePath)
  }, [data])

  const togglePlay = (audioId) => {
    const el = audioRef.current
    if (!el) return

    if (playingId === audioId) {
      el.pause()
      setPlayingId(null)
      return
    }

    el.src = getAudioStreamUrl(audioId, true)
    el.play().catch(() => {
      setPlayingId(null)
    })
    setPlayingId(audioId)
  }

  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    const onEnded = () => setPlayingId(null)
    el.addEventListener('ended', onEnded)
    return () => el.removeEventListener('ended', onEnded)
  }, [])

  if (langLoading || langId == null) {
    return (
      <div className="vk-detail-loading">
        <Spin size="large" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="vk-detail-loading">
        <Spin size="large" tip={t('detailLoading')} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="vk-detail-empty">
        <Alert type="error" message={error || t('detailUnavailable')} showIcon />
        <Link to="/">
          <Button type="primary" className="vk-detail-back" icon={<ArrowLeft size={16} />}>
            {t('backToMap')}
          </Button>
        </Link>
      </div>
    )
  }

  const hero =
    gallery.find((m) => m.isPrimary)?.url ||
    data.primaryImageUrl ||
    gallery[0]?.url ||
    null

  return (
    <div className="vk-detail">
      <audio ref={audioRef} className="vk-sr-audio" controls={false} crossOrigin="anonymous" />

      <div className="vk-detail-toolbar">
        <Link to="/" className="vk-detail-back-link">
          <ArrowLeft size={18} aria-hidden />
          {t('detailBack')}
        </Link>
      </div>

      {hero && (
        <div className="vk-detail-hero">
          <Image src={hero} alt="" className="vk-detail-hero-img" preview />
        </div>
      )}

      <header className="vk-detail-header">
        <h1 className="vk-page-title">{translation?.name ?? data.name}</h1>
        <div className="vk-detail-tags">
          {data.categoryIcon ? <Tag>{data.categoryIcon}</Tag> : null}
          <Tag color={data.categoryColor || 'default'}>{data.categoryName}</Tag>
        </div>
        <p className="vk-muted">{data.address}</p>
      </header>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          {translation?.shortDescription && (
            <Card title={t('detailOverview')} className="vk-detail-card">
              <Typography.Paragraph>{translation.shortDescription}</Typography.Paragraph>
            </Card>
          )}
          {translation?.fullDescription && (
            <Card title={t('detailAbout')} className="vk-detail-card">
              <Typography.Paragraph className="vk-detail-prose">
                {translation.fullDescription}
              </Typography.Paragraph>
            </Card>
          )}
          {Array.isArray(translation?.highlights) && translation.highlights.length > 0 && (
            <Card title={t('detailHighlights')} className="vk-detail-card">
              <ul className="vk-detail-highlights">
                {translation.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </Card>
          )}
          <Card title={t('detailMap')} className="vk-detail-card" styles={{ body: { padding: 0, height: 240 } }}>
            <VisitorMap
              center={[data.latitude, data.longitude]}
              userPosition={[data.latitude, data.longitude]}
              radiusMeters={Math.max(120, data.geofenceRadius ?? 150)}
              pois={[
                {
                  id: data.id,
                  name: translation?.name ?? data.name,
                  latitude: data.latitude,
                  longitude: data.longitude,
                },
              ]}
              onMarkerClick={() => {}}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title={t('detailAudio')} className="vk-detail-card">
            {data.audio?.length ? (
              <ul className="vk-detail-audio-list">
                {data.audio.map((a) => (
                  <li key={a.id} className="vk-detail-audio-row">
                    <div>
                      <strong>
                        {a.flagEmoji ? `${a.flagEmoji} ` : ''}
                        {a.languageName}
                      </strong>
                      <div className="vk-muted vk-detail-duration">{a.duration}s</div>
                    </div>
                    <Button
                      type={playingId === a.id ? 'default' : 'primary'}
                      icon={playingId === a.id ? <Pause size={16} /> : <Play size={16} />}
                      onClick={() => togglePlay(a.id)}
                      aria-label={playingId === a.id ? t('pause') : t('play')}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <Empty description={t('detailNoNarration')} />
            )}
            {translation?.narrationText && (
              <Typography.Paragraph className="vk-detail-narration">
                {translation.narrationText}
              </Typography.Paragraph>
            )}
          </Card>

          <Card title={t('detailVisit')} className="vk-detail-card">
            {data.phone && (
              <div className="vk-detail-row">
                <span className="vk-detail-label">{t('detailPhone')}</span>
                <a href={`tel:${data.phone}`}>{data.phone}</a>
              </div>
            )}
            {data.website && (
              <div className="vk-detail-row">
                <span className="vk-detail-label">{t('detailWebsite')}</span>
                <a href={data.website} target="_blank" rel="noopener noreferrer">
                  {data.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            {data.openingHours && (
              <div className="vk-detail-row">
                <span className="vk-detail-label">{t('detailHours')}</span>
                <span>{data.openingHours}</span>
              </div>
            )}
            {data.priceRangeMin != null && data.priceRangeMax != null && (
              <div className="vk-detail-row">
                <span className="vk-detail-label">{t('detailPrice')}</span>
                <span>
                  {vnd(Number(data.priceRangeMin))} – {vnd(Number(data.priceRangeMax))}
                </span>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {gallery.length > 1 && (
        <Card title={t('detailGallery')} className="vk-detail-card vk-detail-gallery-card">
          <div className="vk-detail-gallery">
            {gallery.map((m) => (
              <Image
                key={m.id}
                src={m.url || m.filePath}
                alt={m.caption || ''}
                className="vk-detail-thumb"
              />
            ))}
          </div>
        </Card>
      )}

      {data.menuItems?.length > 0 && (
        <Card title={t('detailMenu')} className="vk-detail-card">
          <Row gutter={[12, 12]}>
            {data.menuItems.map((item) => {
              const mt = item.translations?.find((t) => t.languageId === langId)
              const name = mt?.name ?? item.name
              const desc = mt?.description ?? item.description
              return (
                <Col xs={24} sm={12} key={item.id}>
                  <div className="vk-menu-item">
                    {item.imageUrl && (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        className="vk-menu-img"
                        preview={false}
                      />
                    )}
                    <div className="vk-menu-body">
                      <div className="vk-menu-head">
                        <strong>{name}</strong>
                        {item.isSignature ? <Tag color="orange">{t('detailSignature')}</Tag> : null}
                      </div>
                      <div className="vk-menu-price">{vnd(Number(item.price))}</div>
                      {desc && <p className="vk-menu-desc">{desc}</p>}
                    </div>
                  </div>
                </Col>
              )
            })}
          </Row>
        </Card>
      )}
    </div>
  )
}
