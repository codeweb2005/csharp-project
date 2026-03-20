import { useState, useEffect } from 'react'
import { MapPin, Users, Globe, Volume2, TrendingUp, TrendingDown, Eye, Loader } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { dashboard as dashboardApi } from '../../api'
import './Dashboard.css'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

const statConfig = [
    { key: 'activePOIs', label: 'Active POIs', icon: MapPin, color: '#3b82f6', bg: '#eff6ff' },
    { key: 'totalVisits', label: 'Tổng lượt ghé', icon: Eye, color: '#22c55e', bg: '#f0fdf4', changeKey: 'totalVisitsChange' },
    { key: 'languages', label: 'Ngôn ngữ', icon: Globe, color: '#8b5cf6', bg: '#f5f3ff' },
    { key: 'audioFiles', label: 'Audio Files', icon: Volume2, color: '#f97316', bg: '#fff7ed' },
]

export default function Dashboard() {
    const [stats, setStats] = useState(null)
    const [topPOIs, setTopPOIs] = useState([])
    const [visitData, setVisitData] = useState([])
    const [langData, setLangData] = useState([])
    const [recentActivity, setRecentActivity] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadDashboard()
    }, [])

    async function loadDashboard() {
        setLoading(true)
        try {
            const [statsRes, topRes, langRes, recentRes] = await Promise.all([
                dashboardApi.getStats(),
                dashboardApi.getTopPOIs(5),
                dashboardApi.getLanguageStats(),
                dashboardApi.getRecentActivity(10)
            ])

            if (statsRes.success) setStats(statsRes.data)
            if (topRes.success) setTopPOIs(topRes.data)
            if (langRes.success) setLangData(langRes.data)
            if (recentRes.success) setRecentActivity(recentRes.data)

            // Load visit chart — last 30 days
            const to = new Date().toISOString()
            const from = new Date(Date.now() - 30 * 86400000).toISOString()
            const visitRes = await dashboardApi.getVisitsChart(from, to)
            if (visitRes.success) setVisitData(visitRes.data)
        } catch (err) {
            console.error('Dashboard load error:', err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="dashboard" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <Loader size={32} className="spin" />
            </div>
        )
    }

    const maxVisits = topPOIs.length > 0 ? Math.max(...topPOIs.map(p => p.visits), 1) : 1

    return (
        <div className="dashboard">
            {/* Stat Cards */}
            <div className="stats-grid">
                {statConfig.map((s, i) => {
                    const Icon = s.icon
                    const value = stats?.[s.key] ?? 0
                    const change = s.changeKey ? stats?.[s.changeKey] : null
                    return (
                        <div className="stat-card" key={i} style={{ animationDelay: `${i * 0.08}s` }}>
                            <div className="stat-card-top">
                                <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
                                    <Icon size={20} />
                                </div>
                                {change !== null && (
                                    <span className={`stat-change ${change >= 0 ? 'up' : 'down'}`}>
                                        {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        {change > 0 ? '+' : ''}{change}%
                                    </span>
                                )}
                            </div>
                            <div className="stat-value">{value.toLocaleString()}</div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    )
                })}
            </div>

            {/* Charts Row */}
            <div className="charts-row">
                {/* Visits Chart */}
                <div className="card chart-card chart-wide">
                    <div className="chart-header">
                        <h3 className="card-title">Lượt ghé thăm theo ngày</h3>
                        <div className="chart-legend">
                            <span className="legend-dot" style={{ background: '#3b82f6' }} /> Lượt ghé
                            <span className="legend-dot" style={{ background: '#22c55e' }} /> Thuyết minh
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={visitData}>
                            <defs>
                                <linearGradient id="gVisits" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gNarr" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.15} />
                                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                            />
                            <Area type="monotone" dataKey="visits" stroke="#3b82f6" fill="url(#gVisits)" strokeWidth={2} />
                            <Area type="monotone" dataKey="narrations" stroke="#22c55e" fill="url(#gNarr)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Top POIs */}
                <div className="card chart-card">
                    <h3 className="card-title">Top điểm ghé thăm</h3>
                    <div className="top-pois">
                        {topPOIs.length === 0 && <p style={{ color: '#94a3b8', fontSize: 14 }}>Chưa có dữ liệu</p>}
                        {topPOIs.map((poi, i) => (
                            <div className="top-poi-item" key={i}>
                                <span className="top-poi-rank">#{i + 1}</span>
                                <span className="top-poi-icon">{poi.icon || '📍'}</span>
                                <span className="top-poi-name">{poi.name}</span>
                                <div className="top-poi-bar-wrap">
                                    <div
                                        className="top-poi-bar"
                                        style={{ width: `${(poi.visits / maxVisits) * 100}%` }}
                                    />
                                </div>
                                <span className="top-poi-count">{poi.visits}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="charts-row">
                {/* Language Donut */}
                <div className="card chart-card">
                    <h3 className="card-title">Phân bố ngôn ngữ</h3>
                    <div className="lang-chart-wrap">
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={langData.length > 0 ? langData : [{ name: 'No data', count: 1 }]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={80}
                                    paddingAngle={4}
                                    dataKey="count"
                                >
                                    {(langData.length > 0 ? langData : [{}]).map((entry, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v, name) => [`${v} lượt`, name]} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="lang-legend">
                            {langData.map((l, i) => (
                                <div className="lang-legend-item" key={i}>
                                    <span className="legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
                                    <span>{l.flagEmoji} {l.name}</span>
                                    <span className="lang-pct">{l.percentage}%</span>
                                </div>
                            ))}
                            {langData.length === 0 && (
                                <p style={{ color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="card chart-card chart-wide">
                    <h3 className="card-title">Hoạt động gần đây</h3>
                    <div className="recent-list">
                        {recentActivity.length === 0 && (
                            <p style={{ color: '#94a3b8', fontSize: 14, padding: '20px 0' }}>Chưa có hoạt động</p>
                        )}
                        {recentActivity.map((v, i) => (
                            <div className="recent-item" key={i}>
                                <div className="recent-avatar">{v.flagEmoji || '🌐'}</div>
                                <div className="recent-info">
                                    <span className="recent-user">{v.userName}</span>
                                    <span className="recent-action">đã ghé <strong>{v.poiName}</strong></span>
                                </div>
                                <span className={`badge ${v.triggerType === 'Geofence' ? 'badge-primary' : 'badge-purple'}`}>
                                    {v.triggerType}
                                </span>
                                <span className="recent-time">
                                    {new Date(v.visitedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
