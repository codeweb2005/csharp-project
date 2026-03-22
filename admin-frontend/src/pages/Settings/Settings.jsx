/**
 * Settings — Admin page for system configuration.
 *
 * Wired to live API:
 *   GET  /api/v1/settings              → load all settings
 *   PUT  /api/v1/settings              → save all settings
 *   PUT  /api/v1/settings/maintenance  → toggle maintenance mode
 *   POST /api/v1/settings/generate-api-key → regenerate API key
 *
 * DTO shape (SystemSettingsDto):
 *   { geofence: { defaultRadius, gpsUpdateFrequency, gpsAccuracy },
 *     narration: { defaultCooldown, defaultMode, ttsVoiceVi, ttsVoiceEn, ttsSpeed, autoGenerateTTS },
 *     sync: { syncFrequency, batchSize, compressData, wifiOnly },
 *     api: { apiKey, maintenanceMode } }
 */

import { Save, RotateCcw, AlertTriangle, Loader, Copy, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { settings as settingsApi } from '../../api.js'
import './Settings.css'

const defaultSettings = {
    geofence: { defaultRadius: 30, gpsUpdateFrequency: 5, gpsAccuracy: 'High' },
    narration: { defaultCooldown: 30, defaultMode: 'Auto', ttsVoiceVi: 'vi-VN-HoaiMyNeural', ttsVoiceEn: 'en-US-JennyNeural', ttsSpeed: 1.0, autoGenerateTTS: true },
    sync: { syncFrequency: 15, batchSize: 50, compressData: true, wifiOnly: false },
    api: { apiKey: '', maintenanceMode: false },
}

export default function Settings() {
    const [form, setForm] = useState(defaultSettings)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        async function load() {
            try {
                const res = await settingsApi.getAll()
                if (res.data) setForm({ ...defaultSettings, ...res.data })
            } catch (err) {
                console.error('[Settings] load error:', err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    function updateGeofence(field, value) {
        setForm(f => ({ ...f, geofence: { ...f.geofence, [field]: value } }))
        setSaved(false)
    }

    function updateNarration(field, value) {
        setForm(f => ({ ...f, narration: { ...f.narration, [field]: value } }))
        setSaved(false)
    }

    function updateSync(field, value) {
        setForm(f => ({ ...f, sync: { ...f.sync, [field]: value } }))
        setSaved(false)
    }

    async function handleSave() {
        setSaving(true)
        setError('')
        try {
            await settingsApi.update(form)
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (err) {
            setError(err?.error?.message || 'Lỗi khi lưu cài đặt.')
        } finally {
            setSaving(false)
        }
    }

    async function handleMaintenance(enabled) {
        setForm(f => ({ ...f, api: { ...f.api, maintenanceMode: enabled } }))
        try {
            await settingsApi.setMaintenance(enabled)
        } catch (err) {
            console.error('[Settings] maintenance toggle failed:', err)
            // revert
            setForm(f => ({ ...f, api: { ...f.api, maintenanceMode: !enabled } }))
        }
    }

    async function handleGenerateApiKey() {
        if (!window.confirm('Tạo API key mới?\n\nKey cũ sẽ bị vô hiệu.')) return
        try {
            const res = await settingsApi.generateApiKey()
            if (res.data) {
                setForm(f => ({ ...f, api: { ...f.api, apiKey: res.data } }))
            }
        } catch (err) {
            console.error('[Settings] generate key failed:', err)
        }
    }

    function handleCopyKey() {
        navigator.clipboard.writeText(form.api?.apiKey || '')
        alert('Đã copy API key!')
    }

    function handleReset() {
        if (!window.confirm('Đặt lại tất cả cài đặt về mặc định?')) return
        setForm(defaultSettings)
        setSaved(false)
    }

    if (loading) {
        return (
            <div className="settings-page animate-fadeIn" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
                <Loader size={28} className="spin" />
            </div>
        )
    }

    return (
        <div className="settings-page animate-fadeIn">
            {error && <div className="poi-error-banner">⚠️ {error}</div>}
            {saved && <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '12px 20px', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>✅ Đã lưu thành công!</div>}

            {/* Geofence */}
            <div className="card settings-card">
                <h3 className="settings-card-title">📍 Cài đặt Geofence</h3>
                <div className="settings-grid">
                    <div className="form-group">
                        <label className="form-label">Bán kính mặc định (mét)</label>
                        <input className="form-input" type="number" value={form.geofence.defaultRadius} onChange={e => updateGeofence('defaultRadius', Number(e.target.value))} />
                        <span className="form-hint">Phạm vi 10 – 500 mét</span>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Tần suất cập nhật GPS (giây)</label>
                        <input className="form-input" type="number" value={form.geofence.gpsUpdateFrequency} onChange={e => updateGeofence('gpsUpdateFrequency', Number(e.target.value))} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Độ chính xác GPS</label>
                        <select className="form-input" value={form.geofence.gpsAccuracy} onChange={e => updateGeofence('gpsAccuracy', e.target.value)}>
                            <option value="High">Cao (High)</option>
                            <option value="Medium">Trung bình (Medium)</option>
                            <option value="Low">Thấp (Low)</option>
                        </select>
                    </div>
                </div>
                <div className="settings-info">
                    ℹ️ Bán kính nhỏ hơn sẽ kích hoạt chính xác hơn nhưng tốn pin thiết bị hơn
                </div>
            </div>

            {/* Narration */}
            <div className="card settings-card">
                <h3 className="settings-card-title">🔊 Cài đặt Thuyết minh</h3>
                <div className="settings-grid">
                    <div className="form-group">
                        <label className="form-label">Cooldown mặc định (phút)</label>
                        <input className="form-input" type="number" value={form.narration.defaultCooldown} onChange={e => updateNarration('defaultCooldown', Number(e.target.value))} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Chế độ thuyết minh mặc định</label>
                        <select className="form-input" value={form.narration.defaultMode} onChange={e => updateNarration('defaultMode', e.target.value)}>
                            <option value="Auto">Tự động (Auto)</option>
                            <option value="Recorded">Chỉ file ghi âm (Recorded Only)</option>
                            <option value="TTS">Chỉ TTS (TTS Only)</option>
                            <option value="Text">Chỉ văn bản (Text Only)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Giọng TTS tiếng Việt</label>
                        <select className="form-input" value={form.narration.ttsVoiceVi} onChange={e => updateNarration('ttsVoiceVi', e.target.value)}>
                            <option value="vi-VN-HoaiMyNeural">vi-VN-HoaiMyNeural (Nữ)</option>
                            <option value="vi-VN-NamMinhNeural">vi-VN-NamMinhNeural (Nam)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Giọng TTS tiếng Anh</label>
                        <select className="form-input" value={form.narration.ttsVoiceEn} onChange={e => updateNarration('ttsVoiceEn', e.target.value)}>
                            <option value="en-US-JennyNeural">en-US-JennyNeural (Female)</option>
                            <option value="en-US-GuyNeural">en-US-GuyNeural (Male)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Tốc độ đọc TTS</label>
                        <div className="settings-slider-wrap">
                            <input type="range" min="0.5" max="2" step="0.1" value={form.narration.ttsSpeed} onChange={e => updateNarration('ttsSpeed', Number(e.target.value))} className="settings-slider" />
                            <span className="settings-slider-value">{Number(form.narration.ttsSpeed).toFixed(1)}x</span>
                        </div>
                    </div>
                </div>
                <div className="settings-toggle-row">
                    <div>
                        <span className="settings-toggle-label">Tự động tạo TTS khi thêm POI</span>
                        <span className="settings-toggle-desc">Hệ thống sẽ tự động gọi Azure TTS API để tạo file audio</span>
                    </div>
                    <label className="switch">
                        <input type="checkbox" checked={form.narration.autoGenerateTTS} onChange={e => updateNarration('autoGenerateTTS', e.target.checked)} />
                        <span className="switch-slider" />
                    </label>
                </div>
            </div>

            {/* Sync */}
            <div className="card settings-card">
                <h3 className="settings-card-title">🔄 Cài đặt Đồng bộ</h3>
                <div className="settings-grid">
                    <div className="form-group">
                        <label className="form-label">Tần suất đồng bộ (phút)</label>
                        <input className="form-input" type="number" value={form.sync.syncFrequency} onChange={e => updateSync('syncFrequency', Number(e.target.value))} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Kích thước batch upload</label>
                        <input className="form-input" type="number" value={form.sync.batchSize} onChange={e => updateSync('batchSize', Number(e.target.value))} />
                        <span className="form-hint">Số records gửi mỗi lần sync</span>
                    </div>
                </div>
                <div className="settings-toggle-row">
                    <div>
                        <span className="settings-toggle-label">Nén dữ liệu khi đồng bộ</span>
                        <span className="settings-toggle-desc">Giảm dung lượng dữ liệu truyền tải</span>
                    </div>
                    <label className="switch">
                        <input type="checkbox" checked={form.sync.compressData} onChange={e => updateSync('compressData', e.target.checked)} />
                        <span className="switch-slider" />
                    </label>
                </div>
                <div className="settings-toggle-row">
                    <div>
                        <span className="settings-toggle-label">Chỉ đồng bộ qua Wi-Fi</span>
                        <span className="settings-toggle-desc">Không sử dụng dữ liệu di động để sync</span>
                    </div>
                    <label className="switch">
                        <input type="checkbox" checked={form.sync.wifiOnly} onChange={e => updateSync('wifiOnly', e.target.checked)} />
                        <span className="switch-slider" />
                    </label>
                </div>
            </div>

            {/* API */}
            <div className="card settings-card">
                <h3 className="settings-card-title">🔌 API & Tích hợp</h3>
                <div className="settings-grid">
                    <div className="form-group">
                        <label className="form-label">API Key</label>
                        <div className="settings-key-input">
                            <input className="form-input" value={form.api?.apiKey || '—'} readOnly style={{ flex: 1 }} />
                            <button className="btn btn-secondary btn-sm" onClick={handleCopyKey} type="button"><Copy size={14} /> Copy</button>
                            <button className="btn btn-secondary btn-sm" onClick={handleGenerateApiKey} type="button"><RefreshCw size={14} /> Tạo mới</button>
                        </div>
                    </div>
                </div>
                <div className="settings-toggle-row settings-maintenance">
                    <div>
                        <span className="settings-toggle-label">
                            <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
                            Chế độ bảo trì
                        </span>
                        <span className="settings-toggle-desc">Bật chế độ này sẽ tạm ngưng tất cả API cho mobile app</span>
                    </div>
                    <label className="switch">
                        <input type="checkbox" checked={form.api?.maintenanceMode || false} onChange={e => handleMaintenance(e.target.checked)} />
                        <span className="switch-slider switch-danger" />
                    </label>
                </div>
                {form.api?.maintenanceMode && (
                    <div className="settings-warning">
                        ⚠️ Chế độ bảo trì đang BẬT — Tất cả API cho mobile app đã tạm ngưng!
                    </div>
                )}
            </div>

            {/* Save */}
            <div className="settings-actions">
                <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader size={18} className="spin" /> : <Save size={18} />} Lưu thay đổi
                </button>
                <button className="btn btn-secondary" onClick={handleReset}>
                    <RotateCcw size={16} /> Đặt lại mặc định
                </button>
            </div>
        </div>
    )
}
