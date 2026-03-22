/**
 * Analytics — Detailed analytics page for Admin and Vendor.
 *
 * Wired to live API:
 *   GET /api/v1/analytics/trends?period=30d       → trend summary cards
 *   GET /api/v1/analytics/visits-by-day?from&to    → daily visits chart
 *   GET /api/v1/analytics/visits-by-hour?date      → hourly heatmap
 *   GET /api/v1/analytics/language-distribution     → language pie chart
 *   GET /api/v1/dashboard/recent-activity           → recent visit feed
 */

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, Calendar, Loader } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { analytics as analyticsApi, dashboard as dashboardApi } from '../../api.js'
import './Analytics.css'

const LANG_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

const periods = [
    { key: '7d', label: '7 ngày' },
    { key: '30d', label: '30 ngày' },
    { key: '90d', label: '90 ngày' },
]

function daysFromPeriod(period) {
    return period === '7d' ? 7 : period === '90d' ? 90 : 30
}

export default function Analytics() {
    const [period, setPeriod] = useState('30d')
    const [loading, setLoading] = useState(true)

    // Data
    const [trends, setTrends] = useState(null)
    const [visitsByDay, setVisitsByDay] = useState([])
    const [hourlyData, setHourlyData] = useState([])
    const [langData, setLangData] = useState([])
    const [recentVisits, setRecentVisits] = useState([])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const to = new Date().toISOString()
            const from = new Date(Date.now() - daysFromPeriod(period) * 86400000).toISOString()
            const today = new Date().toISOString().split('T')[0]

            const [trendsRes, visitsRes, hourlyRes, langRes, recentRes] = await Promise.all([
                analyticsApi.getTrends(period),
                analyticsApi.getVisitsByDay(from, to),
                analyticsApi.getVisitsByHour(today),
                analyticsApi.getLanguageDistribution(from, to),
                dashboardApi.getRecentActivity(8),
            ])

            if (trendsRes.success) setTrends(trendsRes.data)
            if (visitsRes.success) setVisitsByDay(visitsRes.data ?? [])
            if (hourlyRes.success) setHourlyData(
                (hourlyRes.data ?? []).map(h => ({ hour: `${h.hour}h`, visits: h.visits }))
            )
            if (langRes.success) setLangData(langRes.data ?? [])
            if (recentRes.success) setRecentVisits(recentRes.data ?? [])
        } catch (err) {
            console.error('[Analytics] fetch error:', err)
        } finally {
            setLoading(false)
        }
    }, [period])

    useEffect(() => { fetchData() }, [fetchData])

    // Build trend cards from API response
    const trendCards = trends ? [
        { label: 'Tổng lượt ghé', value: trends.totalVisits?.value ?? 0, change: trends.totalVisits?.changePercent ?? 0, color: '#3b82f6', bg: '#eff6ff' },
        { label: 'Thuyết minh đã phát', value: trends.narrations?.value ?? 0, change: trends.narrations?.changePercent ?? 0, color: '#22c55e', bg: '#f0fdf4' },
        { label: 'Người dùng mới', value: trends.newUsers?.value ?? 0, change: trends.newUsers?.changePercent ?? 0, color: '#8b5cf6', bg: '#f5f3ff' },
        { label: 'Thời gian nghe TB', value: `${trends.avgListenTime?.value ?? 0}s`, change: trends.avgListenTime?.changePercent ?? 0, color: '#f97316', bg: '#fff7ed' },
    ] : []

    if (loading) {
        return (
            <div className="analytics-page animate-fadeIn" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
                <Loader size={28} className="spin" />
            </div>
        )
    }

    return (
        <div className="analytics-page animate-fadeIn">
            {/* Date Range */}
            <div className="analytics-header">
                <div className="analytics-range">
                    <Calendar size={16} />
                    <span>Khoảng thời gian: {daysFromPeriod(period)} ngày</span>
                </div>
                <div className="analytics-range-btns">
                    {periods.map(p => (
                        <button
                            key={p.key}
                            className={`range-btn ${period === p.key ? 'active' : ''}`}
                            onClick={() => setPeriod(p.key)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Trend Cards */}
            <div className="trend-grid">
                {trendCards.map((t, i) => (
                    <div className="trend-card" key={i} style={{ animationDelay: `${i * 0.08}s` }}>
                        <div className="trend-top">
                            <span className="trend-label">{t.label}</span>
                            <span className={`trend-change ${t.change >= 0 ? 'up' : 'down'}`}>
                                {t.change >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                {t.change > 0 ? '+' : ''}{t.change?.toFixed?.(1) ?? t.change}%
                            </span>
                        </div>
                        <div className="trend-value" style={{ color: t.color }}>{typeof t.value === 'number' ? t.value.toLocaleString() : t.value}</div>
                        <div className="trend-sparkline">
                            <ResponsiveContainer width="100%" height={36}>
                                <LineChart data={visitsByDay.slice(0, 15)}>
                                    <Line type="monotone" dataKey="visits" stroke={t.color} strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Charts */}
            <div className="analytics-row">
                <div className="card chart-card analytics-chart-wide">
                    <div className="chart-header">
                        <h3 className="card-title">📈 Lượt ghé thăm theo ngày</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={visitsByDay}>
                            <defs>
                                <linearGradient id="gVisA" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                            <Area type="monotone" dataKey="visits" stroke="#3b82f6" fill="url(#gVisA)" strokeWidth={2} />
                            {visitsByDay[0]?.narrations !== undefined && (
                                <Area type="monotone" dataKey="narrations" stroke="#22c55e" fill="transparent" strokeWidth={2} />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Hourly Heatmap */}
                <div className="card chart-card">
                    <h3 className="card-title">🕐 Lượt ghé theo giờ (hôm nay)</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={hourlyData}>
                            <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={2} />
                            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
                            <Bar dataKey="visits" radius={[3, 3, 0, 0]}>
                                {hourlyData.map((entry, i) => (
                                    <Cell key={i} fill={entry.visits > 30 ? '#ef4444' : entry.visits > 15 ? '#f59e0b' : '#3b82f6'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="heatmap-legend">
                        <span><span className="legend-dot" style={{ background: '#3b82f6' }} /> Thấp</span>
                        <span><span className="legend-dot" style={{ background: '#f59e0b' }} /> Trung bình</span>
                        <span><span className="legend-dot" style={{ background: '#ef4444' }} /> Cao</span>
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="analytics-row analytics-row-3">
                {/* Language Donut */}
                <div className="card chart-card">
                    <h3 className="card-title">🌐 Ngôn ngữ sử dụng</h3>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie
                                data={langData.length > 0 ? langData : [{ name: 'No data', count: 1 }]}
                                cx="50%" cy="50%"
                                innerRadius={50} outerRadius={75}
                                paddingAngle={4}
                                dataKey="count"
                            >
                                {(langData.length > 0 ? langData : [{}]).map((_, i) =>
                                    <Cell key={i} fill={LANG_COLORS[i % LANG_COLORS.length]} />
                                )}
                            </Pie>
                            <Tooltip formatter={(v, name) => [`${v} lượt`, name]} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="lang-list">
                        {langData.map((l, i) => (
                            <div className="lang-list-item" key={i}>
                                <span className="legend-dot" style={{ background: LANG_COLORS[i % LANG_COLORS.length] }} />
                                <span className="lang-list-name">{l.flagEmoji} {l.name}</span>
                                <span className="lang-list-pct">{l.percentage}%</span>
                            </div>
                        ))}
                        {langData.length === 0 && <p style={{ color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu</p>}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="card chart-card" style={{ gridColumn: 'span 2' }}>
                    <h3 className="card-title">⚡ Hoạt động gần đây</h3>
                    <div className="activity-list">
                        {recentVisits.length === 0 ? (
                            <p style={{ color: '#94a3b8', fontSize: 14, padding: '20px 0' }}>Chưa có hoạt động</p>
                        ) : recentVisits.map((v, i) => (
                            <div className="activity-item" key={i}>
                                <span className="activity-avatar">{v.flagEmoji || '🌐'}</span>
                                <div className="activity-info">
                                    <span className="activity-user">{v.userName}</span>
                                    <span className="activity-desc">ghé <strong>{v.poiName}</strong></span>
                                </div>
                                <div className="activity-right">
                                    <span className={`badge badge-sm ${v.triggerType === 'Geofence' ? 'badge-primary' : v.triggerType === 'Manual' ? 'badge-purple' : 'badge-warning'}`}>
                                        {v.triggerType}
                                    </span>
                                    <span className="activity-time">
                                        {new Date(v.visitedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
