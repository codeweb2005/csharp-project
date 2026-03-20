import { Plus, Download, RefreshCw, Trash2, AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import './Offline.css'

const packages = [
    {
        id: 1, lang: '🇻🇳', langName: 'Tiếng Việt', name: 'Vĩnh Khánh Pack - Tiếng Việt',
        version: 'v1.0', pois: 10, audios: 10, images: 30, size: '50 MB',
        downloads: 234, status: 'active', updated: '03/03/2026', checksum: 'a1b2c3d4e5f6',
        progress: 100,
    },
    {
        id: 2, lang: '🇬🇧', langName: 'English', name: 'Vĩnh Khánh Pack - English',
        version: 'v1.0', pois: 10, audios: 10, images: 30, size: '46 MB',
        downloads: 189, status: 'active', updated: '03/03/2026', checksum: 'f6e5d4c3b2a1',
        progress: 100,
    },
    {
        id: 3, lang: '🇨🇳', langName: '中文', name: 'Vĩnh Khánh Pack - 中文',
        version: 'v1.0', pois: 10, audios: 8, images: 30, size: '~44 MB',
        downloads: 0, status: 'building', updated: '—', checksum: '—',
        progress: 65,
    },
    {
        id: 4, lang: '🇯🇵', langName: '日本語', name: 'Vĩnh Khánh Pack - 日本語',
        version: 'v1.0', pois: 10, audios: 6, images: 30, size: '—',
        downloads: 0, status: 'draft', updated: '—', checksum: '—',
        progress: 0, warning: 'Thiếu 4 file audio',
    },
    {
        id: 5, lang: '🇰🇷', langName: '한국어', name: 'Vĩnh Khánh Pack - 한국어',
        version: 'v1.0', pois: 10, audios: 4, images: 30, size: '—',
        downloads: 0, status: 'draft', updated: '—', checksum: '—',
        progress: 0, warning: 'Thiếu 6 file audio',
    },
]

const downloadStats = [
    { week: 'Tuần 1', vi: 45, en: 28 },
    { week: 'Tuần 2', vi: 52, en: 35 },
    { week: 'Tuần 3', vi: 68, en: 42 },
    { week: 'Tuần 4', vi: 69, en: 84 },
]

const statusConfig = {
    active: { label: 'Active', badge: 'badge-success', icon: CheckCircle },
    building: { label: 'Đang tạo...', badge: 'badge-warning', icon: Clock },
    draft: { label: 'Bản nháp', badge: 'badge-secondary', icon: FileText },
}

export default function Offline() {
    return (
        <div className="offline-page animate-fadeIn">
            <div className="offline-header">
                <div>
                    <span className="offline-total">Tổng lượt tải: <strong>423</strong></span>
                </div>
                <button className="btn btn-primary">
                    <Plus size={16} /> Tạo gói mới
                </button>
            </div>

            {/* Package Cards */}
            <div className="pkg-list">
                {packages.map(pkg => {
                    const sc = statusConfig[pkg.status]
                    const Icon = sc.icon
                    return (
                        <div className={`pkg-card card ${pkg.status}`} key={pkg.id}>
                            <div className="pkg-card-left">
                                <div className="pkg-flag">{pkg.lang}</div>
                                <div className="pkg-info">
                                    <div className="pkg-name">{pkg.name}</div>
                                    <div className="pkg-meta">
                                        <span className="pkg-version">{pkg.version}</span>
                                        <span className="pkg-stat">📍 {pkg.pois} POI</span>
                                        <span className="pkg-stat">🔊 {pkg.audios} Audio</span>
                                        <span className="pkg-stat">🖼️ {pkg.images} Hình</span>
                                        <span className="pkg-stat">📦 {pkg.size}</span>
                                    </div>
                                    {pkg.status === 'building' && (
                                        <div className="pkg-progress-wrap">
                                            <div className="pkg-progress-bar">
                                                <div className="pkg-progress-fill building" style={{ width: `${pkg.progress}%` }} />
                                            </div>
                                            <span className="pkg-progress-text">{pkg.progress}% — Ước tính: 2 phút</span>
                                        </div>
                                    )}
                                    {pkg.warning && (
                                        <div className="pkg-warning">
                                            <AlertTriangle size={13} /> {pkg.warning}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pkg-card-right">
                                <span className={`badge ${sc.badge}`}>
                                    <Icon size={12} /> {sc.label}
                                </span>
                                <div className="pkg-downloads">
                                    <span className="pkg-dl-count">{pkg.downloads}</span>
                                    <span className="pkg-dl-label">lượt tải</span>
                                </div>
                                <div className="pkg-actions">
                                    {pkg.status === 'active' && (
                                        <>
                                            <button className="btn btn-sm btn-secondary" title="Tải về"><Download size={14} /> Tải</button>
                                            <button className="btn btn-sm btn-secondary" title="Rebuild"><RefreshCw size={14} /></button>
                                        </>
                                    )}
                                    {pkg.status === 'draft' && (
                                        <button className="btn btn-sm btn-primary">Tạo gói</button>
                                    )}
                                    <button className="btn-ghost btn-ghost-danger" title="Xóa"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Download Stats */}
            <div className="card">
                <h3 className="card-title">📊 Thống kê tải về theo tuần</h3>
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={downloadStats} barGap={2}>
                        <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                        <Bar dataKey="vi" name="🇻🇳 Tiếng Việt" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="en" name="🇬🇧 English" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
                <div className="dl-legend">
                    <span><span className="legend-dot" style={{ background: '#3b82f6' }} /> Tiếng Việt (55%)</span>
                    <span><span className="legend-dot" style={{ background: '#22c55e' }} /> English (45%)</span>
                </div>
            </div>
        </div>
    )
}
