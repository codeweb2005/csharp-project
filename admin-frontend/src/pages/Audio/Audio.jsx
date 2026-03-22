/**
 * Audio — Admin page for managing audio narrations and media images.
 *
 * Wired to live API:
 *   GET    /api/v1/audio/poi/:poiId         → list audio files for a POI
 *   POST   /api/v1/audio/poi/:poiId/upload  → upload audio file
 *   POST   /api/v1/audio/poi/:poiId/generate-tts → generate TTS audio
 *   DELETE /api/v1/audio/:id                → delete audio file
 *   PATCH  /api/v1/audio/:id/set-default    → set as default narration
 *   GET    /api/v1/audio/:id/stream         → stream audio for playback
 *   GET    /api/v1/media/poi/:poiId         → list images for a POI
 *   POST   /api/v1/media/poi/:poiId/upload  → upload image
 *   DELETE /api/v1/media/:id                → delete image
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Upload, Play, Pause, Trash2, Download, Mic, Bot, Volume2, Loader } from 'lucide-react'
import { audio as audioApi, media as mediaApi, pois as poisApi, API_BASE } from '../../api.js'
import './Audio.css'

function formatDuration(s) {
    if (!s) return '0:00'
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function formatSize(bytes) {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function Audio() {
    const [poiOptions, setPoiOptions] = useState([])
    const [selectedPOI, setSelectedPOI] = useState(null)

    // Audio state
    const [audioFiles, setAudioFiles] = useState([])
    const [images, setImages] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Playback
    const [playingId, setPlayingId] = useState(null)
    const audioRef = useRef(null)

    // TTS panel
    const [showTTS, setShowTTS] = useState(false)
    const [ttsForm, setTtsForm] = useState({ languageId: 1, text: '', voiceName: 'vi-VN-HoaiMyNeural', speed: 1.0 })
    const [ttsLoading, setTtsLoading] = useState(false)
    const [ttsError, setTtsError] = useState('')

    // Upload state
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef(null)
    const imgInputRef = useRef(null)
    const [uploadLangId, setUploadLangId] = useState(1)

    // Filter
    const [filterLang, setFilterLang] = useState('all')

    // Load POIs
    useEffect(() => {
        async function loadPOIs() {
            try {
                const res = await poisApi.getList({ page: 1, size: 100 })
                const items = res.data?.items ?? []
                setPoiOptions(items)
                if (items.length > 0) setSelectedPOI(items[0].id)
            } catch (err) {
                console.error('[Audio] load POIs failed:', err)
            }
        }
        loadPOIs()
    }, [])

    // Load audio + images when POI changes
    const fetchData = useCallback(async () => {
        if (!selectedPOI) return
        setLoading(true)
        setError(null)
        try {
            const [audioRes, mediaRes] = await Promise.all([
                audioApi.getByPOI(selectedPOI),
                mediaApi.getByPOI(selectedPOI),
            ])
            setAudioFiles(audioRes.data ?? [])
            setImages(mediaRes.data ?? [])
        } catch (err) {
            setError('Không thể tải dữ liệu audio/media.')
            console.error('[Audio] fetch error:', err)
        } finally {
            setLoading(false)
        }
    }, [selectedPOI])

    useEffect(() => { fetchData() }, [fetchData])

    // ── Audio Actions ───────────────────────────────────────────────

    function togglePlay(id) {
        if (playingId === id) {
            audioRef.current?.pause()
            setPlayingId(null)
        } else {
            if (audioRef.current) audioRef.current.pause()
            const audio = new window.Audio(`${API_BASE}/audio/${id}/stream`)
            audio.onended = () => setPlayingId(null)
            audio.play()
            audioRef.current = audio
            setPlayingId(id)
        }
    }

    async function handleSetDefault(id) {
        try {
            await audioApi.setDefault(id)
            fetchData()
        } catch (err) {
            console.error('[Audio] set default failed:', err)
        }
    }

    async function handleDeleteAudio(id) {
        if (!window.confirm('Xóa file audio này?')) return
        try {
            await audioApi.delete(id)
            if (playingId === id) { audioRef.current?.pause(); setPlayingId(null) }
            fetchData()
        } catch (err) {
            console.error('[Audio] delete failed:', err)
        }
    }

    async function handleUploadAudio(e) {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        try {
            await audioApi.upload(selectedPOI, file, uploadLangId)
            fetchData()
        } catch (err) {
            console.error('[Audio] upload failed:', err)
            alert(err?.error?.message || 'Upload thất bại.')
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    async function handleGenerateTTS() {
        if (!ttsForm.text.trim()) return
        setTtsLoading(true)
        setTtsError('')
        try {
            await audioApi.generateTTS(selectedPOI, {
                languageId: Number(ttsForm.languageId),
                text: ttsForm.text,
                voiceName: ttsForm.voiceName,
                speed: Number(ttsForm.speed),
            })
            setShowTTS(false)
            fetchData()
        } catch (err) {
            setTtsError(err?.error?.message || 'Tạo TTS thất bại.')
        } finally {
            setTtsLoading(false)
        }
    }

    // ── Image Actions ───────────────────────────────────────────────

    async function handleUploadImage(e) {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        try {
            await mediaApi.upload(selectedPOI, file, null, false)
            fetchData()
        } catch (err) {
            console.error('[Audio] image upload failed:', err)
            alert('Upload hình thất bại.')
        } finally {
            setUploading(false)
            if (imgInputRef.current) imgInputRef.current.value = ''
        }
    }

    async function handleDeleteImage(id) {
        if (!window.confirm('Xóa hình này?')) return
        try {
            await mediaApi.delete(id)
            fetchData()
        } catch (err) {
            console.error('[Audio] delete image failed:', err)
        }
    }

    async function handleSetPrimary(id) {
        try {
            await mediaApi.setPrimary(id)
            fetchData()
        } catch (err) {
            console.error('[Audio] set primary failed:', err)
        }
    }

    // ── Filter ──────────────────────────────────────────────────────

    const filtered = filterLang === 'all'
        ? audioFiles
        : audioFiles.filter(a => a.languageName === filterLang)

    const poiName = poiOptions.find(p => p.id === selectedPOI)?.name || ''

    return (
        <div className="audio-page animate-fadeIn">
            {/* Toolbar */}
            <div className="audio-toolbar">
                <select className="poi-filter-select" value={selectedPOI || ''} onChange={e => { setSelectedPOI(Number(e.target.value)); setShowTTS(false) }}>
                    {poiOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select className="poi-filter-select" value={filterLang} onChange={e => setFilterLang(e.target.value)}>
                    <option value="all">Tất cả ngôn ngữ</option>
                    {[...new Set(audioFiles.map(a => a.languageName))].map(lang =>
                        <option key={lang} value={lang}>{audioFiles.find(a => a.languageName === lang)?.flagEmoji} {lang}</option>
                    )}
                </select>
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select className="poi-filter-select" value={uploadLangId} onChange={e => setUploadLangId(Number(e.target.value))} style={{ width: 80 }}>
                        <option value={1}>VI</option>
                        <option value={2}>EN</option>
                    </select>
                    <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading || !selectedPOI}>
                        {uploading ? <Loader size={16} className="spin" /> : <Upload size={16} />} Upload Audio
                    </button>
                </div>
                <input ref={fileInputRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleUploadAudio} />
                <button className="btn btn-primary" onClick={() => setShowTTS(true)} disabled={!selectedPOI}>
                    <Bot size={16} /> Tạo TTS
                </button>
            </div>

            {error && <div className="poi-error-banner">⚠️ {error}</div>}

            <div className="audio-layout">
                {/* Main Content */}
                <div className="audio-main">
                    {/* Images Section */}
                    <div className="card">
                        <div className="card-title">🖼️ Hình ảnh — {poiName}</div>
                        <div className="img-grid">
                            {images.map(img => (
                                <div key={img.id} className={`img-thumb ${img.isPrimary ? 'primary' : ''}`}>
                                    <div className="img-placeholder" onClick={() => handleSetPrimary(img.id)} title="Set as primary">
                                        {img.url
                                            ? <img src={img.url} alt={img.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                                            : <span>📷</span>
                                        }
                                    </div>
                                    {img.isPrimary && <span className="img-star">⭐</span>}
                                    <div className="img-info">
                                        <span className="img-name">{img.caption || `image_${img.id}`}</span>
                                        <span className="img-size">{formatSize(img.fileSize)}</span>
                                    </div>
                                    <button className="img-delete" onClick={() => handleDeleteImage(img.id)}><Trash2 size={12} /></button>
                                </div>
                            ))}
                            <div className="img-upload-zone" onClick={() => imgInputRef.current?.click()}>
                                <Upload size={24} />
                                <span>Kéo thả hoặc click</span>
                                <span className="img-upload-hint">JPG, PNG, WebP — Max 5MB</span>
                            </div>
                            <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUploadImage} />
                        </div>
                    </div>

                    {/* Audio Table */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '20px 20px 0' }}>
                            <div className="card-title">🔊 Audio Thuyết minh ({filtered.length} files)</div>
                        </div>
                        {loading ? (
                            <div style={{ padding: '40px', textAlign: 'center' }}><Loader size={24} className="spin" /></div>
                        ) : (
                            <table className="audio-table">
                                <thead>
                                    <tr>
                                        <th>Ngôn ngữ</th>
                                        <th>File</th>
                                        <th>Loại</th>
                                        <th>Thời lượng</th>
                                        <th>Dung lượng</th>
                                        <th>Mặc định</th>
                                        <th>Nghe</th>
                                        <th>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>Chưa có audio nào.</td></tr>
                                    ) : filtered.map(a => (
                                        <tr key={a.id}>
                                            <td>
                                                <div className="audio-lang">
                                                    <span className="audio-flag">{a.flagEmoji}</span>
                                                    <span>{a.languageName}</span>
                                                </div>
                                            </td>
                                            <td className="audio-filename">{a.filePath?.split('/').pop() || `audio_${a.id}`}</td>
                                            <td>
                                                <span className={`badge ${a.voiceType === 'Recorded' ? 'badge-success' : 'badge-primary'}`}>
                                                    {a.voiceType === 'Recorded' ? <Mic size={11} /> : <Bot size={11} />}
                                                    {a.voiceType}
                                                </span>
                                            </td>
                                            <td className="audio-dur">{formatDuration(a.duration)}</td>
                                            <td className="audio-size">{formatSize(a.fileSize)}</td>
                                            <td>
                                                <input
                                                    type="radio"
                                                    name={`default-${a.languageId}`}
                                                    checked={a.isDefault}
                                                    onChange={() => handleSetDefault(a.id)}
                                                    className="audio-radio"
                                                />
                                            </td>
                                            <td>
                                                <button
                                                    className={`audio-play-btn ${playingId === a.id ? 'playing' : ''}`}
                                                    onClick={() => togglePlay(a.id)}
                                                >
                                                    {playingId === a.id ? <Pause size={14} /> : <Play size={14} />}
                                                </button>
                                                {playingId === a.id && (
                                                    <div className="audio-waveform">
                                                        {Array.from({ length: 20 }).map((_, i) => (
                                                            <div
                                                                key={i}
                                                                className="wave-bar"
                                                                style={{
                                                                    height: `${Math.random() * 16 + 4}px`,
                                                                    animationDelay: `${i * 0.05}s`
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div className="audio-actions">
                                                    <a
                                                        className="btn-ghost"
                                                        title="Tải về"
                                                        href={`${API_BASE}/audio/${a.id}/stream`}
                                                        download
                                                    ><Download size={14} /></a>
                                                    <button className="btn-ghost btn-ghost-danger" title="Xóa" onClick={() => handleDeleteAudio(a.id)}><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* TTS Panel */}
                {showTTS && (
                    <div className="tts-panel card animate-slideIn">
                        <div className="tts-header">
                            <h3>🤖 Tạo TTS tự động</h3>
                            <button className="btn-ghost" onClick={() => setShowTTS(false)}>✕</button>
                        </div>

                        {ttsError && <div className="login-error" style={{ margin: '0 0 12px', fontSize: 13 }}>⚠️ {ttsError}</div>}

                        <div className="form-group">
                            <label className="form-label">Ngôn ngữ</label>
                            <select className="form-input" value={ttsForm.languageId} onChange={e => setTtsForm({ ...ttsForm, languageId: e.target.value })}>
                                <option value={1}>🇻🇳 Tiếng Việt</option>
                                <option value={2}>🇬🇧 English</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Giọng đọc</label>
                            <select className="form-input" value={ttsForm.voiceName} onChange={e => setTtsForm({ ...ttsForm, voiceName: e.target.value })}>
                                <option value="vi-VN-HoaiMyNeural">vi-VN-HoaiMyNeural (Nữ)</option>
                                <option value="vi-VN-NamMinhNeural">vi-VN-NamMinhNeural (Nam)</option>
                                <option value="en-US-JennyNeural">en-US-JennyNeural (Female)</option>
                                <option value="en-US-GuyNeural">en-US-GuyNeural (Male)</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Văn bản thuyết minh</label>
                            <textarea
                                className="form-input tts-textarea"
                                rows={6}
                                value={ttsForm.text}
                                onChange={e => setTtsForm({ ...ttsForm, text: e.target.value })}
                                placeholder="Nhập văn bản thuyết minh..."
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Tốc độ đọc</label>
                            <div className="tts-speed">
                                <input
                                    type="range" min="0.5" max="2" step="0.1"
                                    value={ttsForm.speed}
                                    onChange={e => setTtsForm({ ...ttsForm, speed: e.target.value })}
                                    className="tts-slider"
                                />
                                <span className="tts-speed-val">{Number(ttsForm.speed).toFixed(1)}x</span>
                            </div>
                        </div>

                        <div className="tts-actions">
                            <button className="btn btn-primary w-full" onClick={handleGenerateTTS} disabled={ttsLoading || !ttsForm.text.trim()}>
                                {ttsLoading ? <Loader size={16} className="spin" /> : <Volume2 size={16} />}
                                {ttsLoading ? ' Đang tạo...' : ' Tạo & Lưu'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
