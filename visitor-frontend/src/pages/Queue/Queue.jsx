import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, InputNumber, List, Space, Spin, Tag, Typography, Tooltip } from 'antd'
import {
  ArrowLeft, Headphones, LocateFixed, CheckCircle, RotateCcw,
  Play, Pause, SkipForward, Volume2, VolumeX, Music2,
} from 'lucide-react'
import { api, getAudioStreamUrl } from '../../api.js'
import { useLanguage } from '../../context/LanguageContext.jsx'
import VisitorMap from '../../components/VisitorMap/VisitorMap.jsx'
import { useQueuePlayback } from '../../hooks/useQueuePlayback.js'
import './Queue.css'

const FALLBACK = { lat: 10.754, lng: 106.693 }
const WEB_VISITOR_ID_KEY = 'vk_web_visitor_id'

function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function Queue() {
  const { langId, loading: langLoading, t } = useLanguage()

  // ── Position / geo ────────────────────────────────────────────────────────
  const [position, setPosition]           = useState(FALLBACK)
  const [geoNote, setGeoNote]             = useState(t('queueFixedMode'))
  const [geoLoading, setGeoLoading]       = useState(false)
  const [followingDevice, setFollowingDevice] = useState(false)
  const [draftLat, setDraftLat]           = useState(FALLBACK.lat)
  const [draftLng, setDraftLng]           = useState(FALLBACK.lng)
  const watchIdRef = useRef(null)

  // ── Queue data ────────────────────────────────────────────────────────────
  const [radiusMeters] = useState(500)
  const [rawQueue, setRawQueue] = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const { markPlayed, isPlayed, resetSession, processQueue, sortQueue, playedCount } = useQueuePlayback()

  const queue = useMemo(() => {
    const deduped = processQueue(rawQueue)
    return sortQueue(deduped)
  }, [rawQueue, processQueue, sortQueue])

  const playableQueue = useMemo(() => queue.filter(item => item.audio?.id), [queue])

  // ── Single audio element ──────────────────────────────────────────────────
  const audioRef     = useRef(null)   // <audio> element
  const [currentIdx, setCurrentIdx]   = useState(0)   // index dans playableQueue
  const [isPlaying, setIsPlaying]     = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration]       = useState(0)
  const [muted, setMuted]             = useState(false)
  const [hasStarted, setHasStarted]   = useState(false) // user clicked "Bắt đầu nghe" at least once
  const reportedNarrationRef          = useRef(new Set()) // set of audioIds already reported

  // Load audio src when currentIdx changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || playableQueue.length === 0) return
    const item = playableQueue[currentIdx]
    if (!item) return

    const src = getAudioStreamUrl(item.audio.id, true)
    audio.src = src
    audio.load()
    setCurrentTime(0)
    setDuration(0)

    if (hasStarted) {
      audio.play().catch(() => setIsPlaying(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, playableQueue])

  // Sync muted state
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted
  }, [muted])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = '' }
    }
  }, [])

  // Reset player when queue changes significantly
  useEffect(() => {
    if (playableQueue.length === 0) { setCurrentIdx(0); setIsPlaying(false); setHasStarted(false) }
    else setCurrentIdx(0)
  }, [rawQueue]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Audio event handlers ───────────────────────────────────────────────────
  const handlePlay    = () => {
    setIsPlaying(true)
    // Report narration once per audio track (not on resume after pause)
    const item = playableQueue[currentIdx]
    if (item?.audio?.id && !reportedNarrationRef.current.has(item.audio.id)) {
      reportedNarrationRef.current.add(item.audio.id)
      const visitorId = localStorage.getItem(WEB_VISITOR_ID_KEY)
      if (visitorId) api.presenceNarration(visitorId).catch(() => {})
    }
  }
  const handlePause   = () => setIsPlaying(false)
  const handleTimeUpdate = () => setCurrentTime(audioRef.current?.currentTime ?? 0)
  const handleLoadedMetadata = () => setDuration(audioRef.current?.duration ?? 0)

  const handleEnded = useCallback(() => {
    const item = playableQueue[currentIdx]
    if (item) markPlayed(item.poiId)

    const nextIdx = currentIdx + 1
    if (nextIdx < playableQueue.length) {
      setCurrentIdx(nextIdx)
      // play() will be triggered by the useEffect above (hasStarted = true)
    } else {
      // All done
      setIsPlaying(false)
    }
  }, [currentIdx, playableQueue, markPlayed])

  // ── Player controls ────────────────────────────────────────────────────────
  const startPlayback = useCallback(() => {
    setHasStarted(true)
    const audio = audioRef.current
    if (!audio) return
    audio.play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false))
  }, [])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!hasStarted) { startPlayback(); return }
    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {})
    } else {
      audio.pause()
      setIsPlaying(false)
    }
  }, [hasStarted, startPlayback])

  const skipNext = useCallback(() => {
    const item = playableQueue[currentIdx]
    if (item) markPlayed(item.poiId)
    const nextIdx = currentIdx + 1
    if (nextIdx < playableQueue.length) setCurrentIdx(nextIdx)
  }, [currentIdx, playableQueue, markPlayed])

  const jumpTo = useCallback((idx) => {
    setCurrentIdx(idx)
    if (!hasStarted) { setHasStarted(true) }
    else {
      // play starts from useEffect
    }
  }, [hasStarted])

  const seekTo = useCallback((val) => {
    if (audioRef.current) audioRef.current.currentTime = val
    setCurrentTime(val)
  }, [])

  const totalDuration = useMemo(() =>
    playableQueue.reduce((acc, q) => acc + (q.audio?.duration ?? 0), 0)
  , [playableQueue])

  // ── Geo helpers ────────────────────────────────────────────────────────────
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
      if (watchIdRef.current != null && navigator.geolocation)
        navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [])

  // ── Report visitor GPS to backend (for admin heatmap) ──────────────────────
  // Fires immediately on mount (FALLBACK coords) + on every coordinate change
  // (manual input, device GPS, map click). No debounce needed — watchPosition
  // already caps frequency via maximumAge, and manual changes are user-triggered.
  useEffect(() => {
    const visitorId = localStorage.getItem(WEB_VISITOR_ID_KEY)
    if (!visitorId) return
    api.presenceUpdateLocation(visitorId, position.lat, position.lng).catch(() => {})
  }, [position.lat, position.lng])

  // ── Fetch queue ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (langLoading || langId == null || geoLoading) return
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const data = await api.getAudioQueue(position.lat, position.lng, radiusMeters, langId)
        if (!cancelled) setRawQueue(data?.queue ?? [])
      } catch (e) {
        if (!cancelled) { setError(e.message || t('queueLoadError')); setRawQueue([]) }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [position.lat, position.lng, radiusMeters, langId, langLoading, geoLoading, t])

  const applyDraftPosition = useCallback(() => {
    if (
      typeof draftLat !== 'number' || typeof draftLng !== 'number' ||
      Number.isNaN(draftLat) || Number.isNaN(draftLng) ||
      draftLat < -90 || draftLat > 90 || draftLng < -180 || draftLng > 180
    ) return
    stopDeviceTracking()
    setPosition({ lat: draftLat, lng: draftLng })
    setGeoNote(t('queueFixedMode'))
  }, [draftLat, draftLng, stopDeviceTracking, t])

  const useCurrentLocation = useCallback(() => {
    if (followingDevice) { stopDeviceTracking(); return }
    if (!navigator.geolocation) { setGeoNote(t('queueGeoUnsupported')); return }
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
      () => { setGeoNote(t('queueGeoUnavailable')); setGeoLoading(false) },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 },
    )
    setFollowingDevice(true)
  }, [followingDevice, stopDeviceTracking, t])

  const onPickLocationFromMap = useCallback((lat, lng) => {
    stopDeviceTracking()
    setDraftLat(Number(lat.toFixed(6)))
    setDraftLng(Number(lng.toFixed(6)))
    setPosition({ lat, lng })
    setGeoNote(t('queueFixedMode'))
  }, [stopDeviceTracking, t])

  // ── Current playing item ───────────────────────────────────────────────────
  const currentItem = playableQueue[currentIdx] ?? null

  if (langLoading || langId == null) {
    return <div className="vk-queue-loading"><Spin size="large" /></div>
  }

  return (
    <div className={`vk-queue${hasStarted ? ' has-player' : ''}`}>

      {/* Hidden single audio element */}
      <audio
        ref={audioRef}
        onPlay={handlePlay}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="auto"
        style={{ display: 'none' }}
      >
        <track kind="captions" />
      </audio>

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
              value={draftLat} min={-90} max={90} step={0.0001}
              onChange={(v) => setDraftLat(typeof v === 'number' ? v : draftLat)}
            />
          </div>
          <div>
            <Typography.Text type="secondary">{t('coordinateLng')}</Typography.Text>
            <InputNumber
              className="vk-queue-coordinate-input"
              value={draftLng} min={-180} max={180} step={0.0001}
              onChange={(v) => setDraftLng(typeof v === 'number' ? v : draftLng)}
            />
          </div>
          <Button type="primary" onClick={applyDraftPosition}>{t('coordinateApply')}</Button>
          <Button onClick={useCurrentLocation}>
            {followingDevice ? t('coordinateStopDevice') : t('coordinateUseDevice')}
          </Button>
        </Space>
        <div className="vk-queue-radius-label">
          <LocateFixed size={14} />
          <span>{t('radiusLabel')}: {radiusMeters} {t('distanceUnit')}</span>
        </div>
      </Card>

      {error && <Alert type="error" message={error} showIcon className="vk-queue-alert" />}

      {loading ? (
        <div className="vk-queue-spin"><Spin size="large" /></div>
      ) : queue.length === 0 ? (
        <Card>
          <Typography.Paragraph type="secondary">{t('queueNone')}</Typography.Paragraph>
        </Card>
      ) : (
        <>
          {/* ── Start button (before first play) ── */}
          {!hasStarted && playableQueue.length > 0 && (
            <div className="vk-queue-start-wrap">
              <button className="vk-queue-start-btn" onClick={startPlayback}>
                <Play size={22} fill="currentColor" />
                <span>Bắt đầu nghe hết queue</span>
              </button>
              <p className="vk-queue-start-hint">
                {playableQueue.length} audio · ~{fmtTime(totalDuration)} tổng cộng
              </p>
            </div>
          )}

          <Card
            title={t('playbackOrder')}
            extra={
              <Space size={12}>
                <span className="vk-queue-meta">
                  {queue.length} stops · ~{fmtTime(totalDuration)}
                  {playedCount > 0 && (
                    <Tag color="green" style={{ marginLeft: 8 }}>
                      <CheckCircle size={11} style={{ marginRight: 3 }} />
                      {playedCount}/{queue.length} đã nghe
                    </Tag>
                  )}
                </span>
                {playedCount > 0 && (
                  <Tooltip title="Đặt lại tiến độ nghe">
                    <Button size="small" icon={<RotateCcw size={13} />} onClick={resetSession}>
                      Đặt lại
                    </Button>
                  </Tooltip>
                )}
              </Space>
            }
          >
            <List
              dataSource={queue}
              renderItem={(item) => {
                const itemPlayed = isPlayed(item.poiId)
                const playableIdx = playableQueue.findIndex(p => p.poiId === item.poiId)
                const isCurrentlyPlaying = playableIdx === currentIdx && isPlaying
                const isCurrent = playableIdx === currentIdx && playableIdx >= 0

                return (
                  <List.Item
                    className={[
                      'vk-queue-item',
                      itemPlayed ? 'vk-queue-item--played' : '',
                      isCurrent ? 'vk-queue-item--current' : '',
                    ].filter(Boolean).join(' ')}
                    style={{ opacity: itemPlayed ? 0.55 : 1 }}
                  >
                    <List.Item.Meta
                      avatar={
                        <div
                          className={`vk-queue-order${isCurrent ? ' vk-queue-order--active' : ''}`}
                          aria-hidden
                          style={{
                            background: itemPlayed ? '#d9f7be' : isCurrent ? 'var(--vk-accent)' : undefined,
                            color: itemPlayed ? '#52c41a' : isCurrent ? '#fff' : undefined,
                          }}
                        >
                          {isCurrentlyPlaying
                            ? <span className="vk-queue-bars"><span/><span/><span/></span>
                            : itemPlayed ? <CheckCircle size={16} />
                            : item.order
                          }
                        </div>
                      }
                      title={
                        <Space size={6}>
                          <Link to={`/poi/${item.poiId}`} className="vk-queue-title">
                            {item.categoryIcon ? `${item.categoryIcon} ` : ''}
                            {item.poiName}
                          </Link>
                          {isCurrent && isPlaying && <Tag color="processing" style={{ fontSize: 11 }}>Đang phát</Tag>}
                          {isCurrent && !isPlaying && hasStarted && <Tag color="default" style={{ fontSize: 11 }}>Đã tải</Tag>}
                          {itemPlayed && !isCurrent && <Tag color="success" style={{ fontSize: 11 }}>Đã nghe</Tag>}
                        </Space>
                      }
                      description={
                        <div className="vk-queue-desc">
                          {item.distanceMeters != null && (
                            <Tag>{Math.round(item.distanceMeters)} m</Tag>
                          )}
                          {item.audio?.duration > 0 && (
                            <Tag color="blue">{fmtTime(item.audio.duration)}</Tag>
                          )}
                          {item.shortDescription && (
                            <span className="vk-queue-short">{item.shortDescription}</span>
                          )}
                        </div>
                      }
                    />

                    {/* Per-item play button (jump to this track) */}
                    {item.audio?.id ? (
                      <button
                        className={`vk-queue-item-play${isCurrent && isPlaying ? ' active' : ''}`}
                        onClick={() => {
                          if (isCurrent) { togglePlay() }
                          else { jumpTo(playableIdx) ; if (!hasStarted) startPlayback() }
                        }}
                        aria-label={isCurrent && isPlaying ? 'Tạm dừng' : 'Phát'}
                      >
                        {isCurrent && isPlaying
                          ? <Pause size={16} fill="currentColor" />
                          : <Play size={16} fill="currentColor" />
                        }
                      </button>
                    ) : (
                      <Tag>{t('noAudio')}</Tag>
                    )}
                  </List.Item>
                )
              }}
            />
          </Card>
        </>
      )}

      {/* ── Floating Player Bar (visible when playback started) ───────────── */}
      {hasStarted && currentItem && (
        <div className="vk-player-bar">
          <div className="vk-player-info">
            <div className="vk-player-icon">
              <Music2 size={16} />
            </div>
            <div className="vk-player-meta">
              <div className="vk-player-title">
                {currentItem.categoryIcon && `${currentItem.categoryIcon} `}
                {currentItem.poiName}
              </div>
              <div className="vk-player-pos">
                {currentIdx + 1} / {playableQueue.length}
              </div>
            </div>
          </div>

          <div className="vk-player-center">
            <div className="vk-player-progress">
              <span className="vk-player-time">{fmtTime(currentTime)}</span>
              <input
                type="range"
                className="vk-player-slider"
                min={0}
                max={duration || 1}
                step={1}
                value={currentTime}
                onChange={(e) => seekTo(Number(e.target.value))}
                aria-label="Seek"
              />
              <span className="vk-player-time">{fmtTime(duration)}</span>
            </div>
            <div className="vk-player-controls">
              <button
                className="vk-player-btn vk-player-btn--main"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
              >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </button>
              <button
                className="vk-player-btn"
                onClick={skipNext}
                disabled={currentIdx >= playableQueue.length - 1}
                aria-label="Bài tiếp theo"
              >
                <SkipForward size={18} fill="currentColor" />
              </button>
            </div>
          </div>

          <div className="vk-player-side">
            <button
              className="vk-player-btn"
              onClick={() => setMuted(m => !m)}
              aria-label={muted ? 'Bật âm' : 'Tắt âm'}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
