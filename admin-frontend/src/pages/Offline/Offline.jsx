/**
 * Offline — Admin page for managing offline download packages.
 *
 * Wired to live API:
 *   GET    /api/v1/offlinepackages           → list all packages
 *   POST   /api/v1/offlinepackages           → create new package
 *   POST   /api/v1/offlinepackages/:id/build → trigger build
 *   GET    /api/v1/offlinepackages/:id/status → poll build status
 *   DELETE /api/v1/offlinepackages/:id       → delete package
 *   GET    /api/v1/offlinepackages/:id/download → download ZIP
 *
 * DTO shape (OfflinePackageDto):
 *   { id, languageId, languageName, flagEmoji, name, version, status, progress, currentStep, fileSize, checksum, downloadCount, poiCount, audioCount, imageCount, updatedAt }
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Download, RefreshCw, Trash2, AlertTriangle, CheckCircle, Clock, FileText, Loader, X, Save } from 'lucide-react'
import { offlinePackages as pkgApi, API_BASE } from '../../api.js'
import './Offline.css'

const statusConfig = {
    active: { label: 'Active', badge: 'badge-success', icon: CheckCircle },
    Active: { label: 'Active', badge: 'badge-success', icon: CheckCircle },
    building: { label: 'Đang tạo...', badge: 'badge-warning', icon: Clock },
    Building: { label: 'Đang tạo...', badge: 'badge-warning', icon: Clock },
    draft: { label: 'Bản nháp', badge: 'badge-secondary', icon: FileText },
    Draft: { label: 'Bản nháp', badge: 'badge-secondary', icon: FileText },
    error: { label: 'Lỗi', badge: 'badge-danger', icon: AlertTriangle },
    Error: { label: 'Lỗi', badge: 'badge-danger', icon: AlertTriangle },
}

function formatSize(bytes) {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function Offline() {
    const [packages, setPackages] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Create form
    const [showCreate, setShowCreate] = useState(false)
    const [createForm, setCreateForm] = useState({ languageId: 1, name: '', version: '1.0' })
    const [createLoading, setCreateLoading] = useState(false)
    const [createError, setCreateError] = useState('')

    // Polling for building packages
    const pollRef = useRef(null)

    const fetchPackages = useCallback(async () => {
        try {
            const res = await pkgApi.getAll()
            setPackages(res.data ?? [])
            setLoading(false)
        } catch (err) {
            setError('Không thể tải danh sách gói.')
            setLoading(false)
            console.error('[Offline] fetch error:', err)
        }
    }, [])

    useEffect(() => {
        fetchPackages()
        return () => { if (pollRef.current) clearInterval(pollRef.current) }
    }, [fetchPackages])

    // Poll building packages
    useEffect(() => {
        const building = packages.filter(p => p.status === 'building' || p.status === 'Building')
        if (building.length > 0 && !pollRef.current) {
            pollRef.current = setInterval(() => {
                fetchPackages()
            }, 5000) // poll every 5s
        } else if (building.length === 0 && pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
        }
    }, [packages, fetchPackages])

    async function handleBuild(id) {
        try {
            await pkgApi.build(id)
            fetchPackages()
        } catch (err) {
            console.error('[Offline] build failed:', err)
            alert(err?.error?.message || 'Không thể bắt đầu build.')
        }
    }

    async function handleDelete(id) {
        if (!window.confirm('Xóa gói offline này?\n\nHành động này không thể hoàn tác.')) return
        try {
            await pkgApi.delete(id)
            fetchPackages()
        } catch (err) {
            console.error('[Offline] delete failed:', err)
        }
    }

    async function handleCreate(e) {
        e.preventDefault()
        setCreateLoading(true)
        setCreateError('')
        try {
            await pkgApi.create({
                languageId: Number(createForm.languageId),
                name: createForm.name,
                version: createForm.version,
            })
            setShowCreate(false)
            fetchPackages()
        } catch (err) {
            setCreateError(err?.error?.message || 'Không thể tạo gói.')
        } finally {
            setCreateLoading(false)
        }
    }

    const totalDownloads = packages.reduce((sum, p) => sum + (p.downloadCount || 0), 0)

    if (loading) {
        return (
            <div className="offline-page animate-fadeIn" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
                <Loader size={28} className="spin" />
            </div>
        )
    }

    return (
        <div className="offline-page animate-fadeIn">
            {error && <div className="poi-error-banner">⚠️ {error}</div>}

            <div className="offline-header">
                <div>
                    <span className="offline-total">Tổng lượt tải: <strong>{totalDownloads.toLocaleString()}</strong></span>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                    <Plus size={16} /> Tạo gói mới
                </button>
            </div>

            {/* Package Cards */}
            <div className="pkg-list">
                {packages.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        Chưa có gói offline nào. Hãy tạo gói đầu tiên!
                    </div>
                ) : packages.map(pkg => {
                    const sc = statusConfig[pkg.status] || statusConfig.draft
                    const Icon = sc.icon
                    const isBuilding = pkg.status === 'building' || pkg.status === 'Building'
                    const isActive = pkg.status === 'active' || pkg.status === 'Active'
                    const isDraft = pkg.status === 'draft' || pkg.status === 'Draft'

                    return (
                        <div className={`pkg-card card ${pkg.status?.toLowerCase()}`} key={pkg.id}>
                            <div className="pkg-card-left">
                                <div className="pkg-flag">{pkg.flagEmoji || '🌐'}</div>
                                <div className="pkg-info">
                                    <div className="pkg-name">{pkg.name}</div>
                                    <div className="pkg-meta">
                                        <span className="pkg-version">{pkg.version}</span>
                                        <span className="pkg-stat">📍 {pkg.poiCount} POI</span>
                                        <span className="pkg-stat">🔊 {pkg.audioCount} Audio</span>
                                        <span className="pkg-stat">🖼️ {pkg.imageCount} Hình</span>
                                        <span className="pkg-stat">📦 {formatSize(pkg.fileSize)}</span>
                                    </div>
                                    {isBuilding && (
                                        <div className="pkg-progress-wrap">
                                            <div className="pkg-progress-bar">
                                                <div className="pkg-progress-fill building" style={{ width: `${pkg.progress || 0}%` }} />
                                            </div>
                                            <span className="pkg-progress-text">
                                                {pkg.progress}% {pkg.currentStep ? `— ${pkg.currentStep}` : ''}
                                            </span>
                                        </div>
                                    )}
                                    {pkg.updatedAt && (
                                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                                            Cập nhật: {new Date(pkg.updatedAt).toLocaleDateString('vi-VN')}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pkg-card-right">
                                <span className={`badge ${sc.badge}`}>
                                    <Icon size={12} /> {sc.label}
                                </span>
                                <div className="pkg-downloads">
                                    <span className="pkg-dl-count">{pkg.downloadCount || 0}</span>
                                    <span className="pkg-dl-label">lượt tải</span>
                                </div>
                                <div className="pkg-actions">
                                    {isActive && (
                                        <>
                                            <a className="btn btn-sm btn-secondary" title="Tải về" href={`${API_BASE}/offlinepackages/${pkg.id}/download`} download>
                                                <Download size={14} /> Tải
                                            </a>
                                            <button className="btn btn-sm btn-secondary" title="Rebuild" onClick={() => handleBuild(pkg.id)}>
                                                <RefreshCw size={14} />
                                            </button>
                                        </>
                                    )}
                                    {isDraft && (
                                        <button className="btn btn-sm btn-primary" onClick={() => handleBuild(pkg.id)}>
                                            Tạo gói
                                        </button>
                                    )}
                                    {isBuilding && (
                                        <span style={{ fontSize: 12, color: '#f59e0b' }}>
                                            <Loader size={14} className="spin" /> Đang xử lý...
                                        </span>
                                    )}
                                    <button className="btn-ghost btn-ghost-danger" title="Xóa" onClick={() => handleDelete(pkg.id)}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Tạo gói Offline mới</h3>
                            <button className="btn-ghost" onClick={() => setShowCreate(false)}><X size={18} /></button>
                        </div>

                        {createError && <div className="login-error" style={{ margin: '0 0 12px', fontSize: 13 }}>⚠️ {createError}</div>}

                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Tên gói</label>
                                <input
                                    className="form-input"
                                    required
                                    value={createForm.name}
                                    onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                                    placeholder="VD: Vĩnh Khánh Pack - Tiếng Việt"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ngôn ngữ</label>
                                <select className="form-input" value={createForm.languageId} onChange={e => setCreateForm({ ...createForm, languageId: e.target.value })}>
                                    <option value={1}>🇻🇳 Tiếng Việt</option>
                                    <option value={2}>🇬🇧 English</option>
                                    <option value={3}>🇨🇳 中文</option>
                                    <option value={4}>🇯🇵 日本語</option>
                                    <option value={5}>🇰🇷 한국어</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phiên bản</label>
                                <input
                                    className="form-input"
                                    value={createForm.version}
                                    onChange={e => setCreateForm({ ...createForm, version: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={createLoading}>
                                    {createLoading ? <Loader size={16} className="spin" /> : <Save size={16} />} Tạo mới
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Hủy</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
