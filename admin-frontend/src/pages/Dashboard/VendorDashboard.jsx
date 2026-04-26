/**
 * VendorDashboard — Role-scoped dashboard shown to Vendor users.
 *
 * Data is fetched from the same Dashboard / Analytics API endpoints as the Admin Dashboard,
 * but the backend automatically scopes the results to the Vendor's own POIs via the JWT
 * `vendorPoiIds` claim.  The frontend does NOT pass any extra params — scoping is entirely
 * server-side.
 *
 * Displays:
 *   - 4 KPI stat cards (total visits, narrations played, avg listen time, active languages)
 *   - Area chart: visits-per-day for the last 30 days
 *   - Bar chart: hourly visits for today
 *   - Pie chart: language distribution
 *   - Top POIs list (scoped to vendor's own POIs)
 *   - Recent activity list
 */

import { useState, useEffect, useCallback } from 'react'
import { Eye, Volume2, Clock, Globe } from 'lucide-react'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import {
    Card, Row, Col, Typography, Statistic, Spin, Space, Badge,
    Avatar, Radio,
} from 'antd'
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { dashboard as dashboardApi, analytics as analyticsApi } from '../../api'
import useCurrentUser from '../../hooks/useCurrentUser.js'

const { Title, Text } = Typography
const COLORS = ['#00246a', '#22c55e', '#f59e0b', '#4059aa', '#ef4444', '#06b6d4']

const periods = [
    { key: '7d', label: '7 days' },
    { key: '30d', label: '30 days' },
    { key: '90d', label: '90 days' },
]
function daysFrom(period) { return period === '7d' ? 7 : period === '90d' ? 90 : 30 }

function getRecentActivityKey(item, index) {
    return item.id ?? `${item.userName}-${item.poiName}-${item.visitedAt}-${index}`
}

export default function VendorDashboard() {
    const { name, vendorPOIIds } = useCurrentUser()
    const [period, setPeriod] = useState('30d')
    const [loading, setLoading] = useState(true)

    const [stats, setStats] = useState(null)
    const [trends, setTrends] = useState(null)
    const [visitsByDay, setVisitsByDay] = useState([])
    const [hourlyData, setHourlyData] = useState([])
    const [langData, setLangData] = useState([])
    const [topPOIs, setTopPOIs] = useState([])
    const [recentActivity, setRecentActivity] = useState([])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const to = new Date().toISOString()
            const from = new Date(Date.now() - daysFrom(period) * 86400000).toISOString()
            const today = new Date().toISOString().split('T')[0]

            const [statsRes, trendsRes, visitsRes, hourlyRes, langRes, topRes, recentRes] = await Promise.all([
                dashboardApi.getStats(),
                analyticsApi.getTrends(period),
                analyticsApi.getVisitsByDay(from, to),
                analyticsApi.getVisitsByHour(today),
                analyticsApi.getLanguageDistribution(from, to),
                dashboardApi.getTopPOIs(10),
                dashboardApi.getRecentActivity(8),
            ])

            if (statsRes.success) setStats(statsRes.data)
            if (trendsRes.success) setTrends(trendsRes.data)
            if (visitsRes.success) setVisitsByDay(visitsRes.data ?? [])
            if (hourlyRes.success) setHourlyData(
                (hourlyRes.data ?? []).map(h => ({ hour: `${h.hour}h`, visits: h.visits }))
            )
            if (langRes.success) setLangData(langRes.data ?? [])
            if (topRes.success) setTopPOIs(topRes.data ?? [])
            if (recentRes.success) setRecentActivity(recentRes.data ?? [])
        } catch (err) {
            console.error('[VendorDashboard] fetch error:', err)
        } finally {
            setLoading(false)
        }
    }, [period])

    useEffect(() => { fetchData() }, [fetchData])

    // ── Polling 30s: tự động refresh visits chart + Total Visits KPI ───────────
    // Vendor không thể kết nối SignalR hub (hub chỉ cho Admin role).
    // Giải pháp: poll nhẹ 30s — fetch visits-by-day, visits-by-hour và stats
    // để Total Visits card cũng cập nhật khi có visitor mới.
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const to = new Date().toISOString()
                const from = new Date(Date.now() - daysFrom(period) * 86400000).toISOString()
                const today = new Date().toISOString().split('T')[0]

                const [statsRes, visitsRes, hourlyRes] = await Promise.all([
                    dashboardApi.getStats(),
                    analyticsApi.getVisitsByDay(from, to),
                    analyticsApi.getVisitsByHour(today),
                ])
                if (statsRes.success) setStats(statsRes.data)
                if (visitsRes.success) setVisitsByDay(visitsRes.data ?? [])
                if (hourlyRes.success) setHourlyData(
                    (hourlyRes.data ?? []).map(h => ({ hour: `${h.hour}h`, visits: h.visits }))
                )
            } catch (err) {
                console.warn('[VendorDashboard] polling error:', err)
            }
        }, 30_000) // 30 giây

        return () => clearInterval(interval)
    }, [period])

    if (loading && !stats) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Spin size="large" />
            </div>
        )
    }

    const kpiCards = [
        {
            label: 'Total Visits',
            value: stats?.totalVisits ?? 0,
            change: trends?.totalVisits?.changePercent ?? 0,
            icon: Eye, color: '#00246a', bg: '#eff6ff',
        },
        {
            label: 'Narrations Played',
            value: trends?.narrations?.value ?? 0,
            change: trends?.narrations?.changePercent ?? 0,
            icon: Volume2, color: '#22c55e', bg: '#f0fdf4',
        },
        {
            label: 'Avg Listen Time',
            value: `${trends?.avgListenTime?.value ?? 0}s`,
            change: trends?.avgListenTime?.changePercent ?? 0,
            icon: Clock, color: '#4059aa', bg: '#f5f3ff',
        },
        {
            label: 'Active Languages',
            value: stats?.languages ?? langData.length,
            change: null,
            icon: Globe, color: '#5c3800', bg: '#fff7ed',
        },
    ]

    const maxVisits = topPOIs.length > 0 ? Math.max(...topPOIs.map(p => p.visits), 1) : 1

    return (
        <div style={{ padding: '0 0 24px 0', animation: 'fadeIn 0.4s ease-out' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>🏪 My Shop Dashboard</Title>
                    {vendorPOIIds.length > 0 && (
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            {vendorPOIIds.length} POI{vendorPOIIds.length > 1 ? 's' : ''} managed
                        </Text>
                    )}
                </div>
                <Radio.Group value={period} onChange={e => setPeriod(e.target.value)} optionType="button" buttonStyle="solid">
                    {periods.map(p => (
                        <Radio.Button key={p.key} value={p.key}>{p.label}</Radio.Button>
                    ))}
                </Radio.Group>
            </div>

            {/* KPI Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {kpiCards.map((k, i) => {
                    const Icon = k.icon
                    return (
                        <Col xs={24} sm={12} lg={6} key={i}>
                            <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 8, background: k.bg, color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Icon size={20} />
                                    </div>
                                    {k.change !== null && (
                                        <Text
                                            type={k.change >= 0 ? 'success' : 'danger'}
                                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 13 }}
                                        >
                                            {k.change >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                                            {Math.abs(k.change).toFixed(1)}%
                                        </Text>
                                    )}
                                </div>
                                <Statistic
                                    title={<span style={{ fontWeight: 500 }}>{k.label}</span>}
                                    value={k.value}
                                    styles={{ content: { fontWeight: 600, fontSize: 24 } }}
                                />
                            </Card>
                        </Col>
                    )
                })}
            </Row>

            {/* Charts Row */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {/* Visits/day Area Chart */}
                <Col xs={24} lg={16} style={{ minWidth: 0 }}>
                    <Card
                        title={<Title level={5} style={{ margin: 0 }}>Visits by Day</Title>}
                        variant="borderless"
                        style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', height: '100%' }}
                    >
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={visitsByDay}>
                                <defs>
                                    <linearGradient id="gVendorVisits" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#00246a" stopOpacity={0.2} />
                                        <stop offset="100%" stopColor="#00246a" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                                <Area type="monotone" dataKey="visits" stroke="#00246a" fill="url(#gVendorVisits)" strokeWidth={2} />
                                {visitsByDay[0]?.narrations !== undefined && (
                                    <Area type="monotone" dataKey="narrations" stroke="#22c55e" fill="transparent" strokeWidth={2} />
                                )}
                            </AreaChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>

                {/* Hourly Bar Chart */}
                <Col xs={24} lg={8} style={{ minWidth: 0 }}>
                    <Card
                        title={<Title level={5} style={{ margin: 0 }}>Visits by Hour (Today)</Title>}
                        variant="borderless"
                        style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', height: '100%' }}
                    >
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={hourlyData}>
                                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} interval={2} />
                                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="visits" radius={[4, 4, 0, 0]}>
                                    {hourlyData.map((entry, i) => (
                                        <Cell key={i} fill={entry.visits > 30 ? '#ef4444' : entry.visits > 15 ? '#f59e0b' : '#00246a'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        <Space style={{ marginTop: 8, justifyContent: 'center', width: '100%', fontSize: 11 }}>
                            <Badge color="#00246a" text="Low" /><Badge color="#f59e0b" text="Avg" /><Badge color="#ef4444" text="High" />
                        </Space>
                    </Card>
                </Col>
            </Row>

            {/* Bottom Row */}
            <Row gutter={[16, 16]}>
                {/* Language Pie */}
                <Col xs={24} lg={8} style={{ minWidth: 0 }}>
                    <Card
                        title={<Title level={5} style={{ margin: 0 }}>Language Distribution</Title>}
                        variant="borderless"
                        style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', height: '100%' }}
                    >
                        <ResponsiveContainer width="100%" height={180}>
                            <PieChart>
                                <Pie
                                    data={langData.length > 0 ? langData : [{ name: 'No data', count: 1 }]}
                                    cx="50%" cy="50%"
                                    innerRadius={55} outerRadius={80}
                                    paddingAngle={4} dataKey="count"
                                >
                                    {(langData.length > 0 ? langData : [{}]).map((_, i) => (
                                        <Cell key={i} fill={langData.length > 0 ? COLORS[i % COLORS.length] : '#f1f5f9'} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v, name) => [`${v} visits`, name]} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {langData.map((l, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Space>
                                        <Badge color={COLORS[i % COLORS.length]} />
                                        <Text>{l.flagEmoji} {l.name}</Text>
                                    </Space>
                                    <Text strong>{l.percentage}%</Text>
                                </div>
                            ))}
                            {langData.length === 0 && <Text type="secondary">No data available</Text>}
                        </div>
                    </Card>
                </Col>

                {/* Top POIs */}
                <Col xs={24} lg={8} style={{ minWidth: 0 }}>
                    <Card
                        title={<Title level={5} style={{ margin: 0 }}>Top Visited POIs</Title>}
                        variant="borderless"
                        style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', height: '100%' }}
                    >
                        {topPOIs.length === 0 && <Text type="secondary">No data available</Text>}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {topPOIs.map((poi, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <Text type="secondary" style={{ width: 20, fontSize: 12 }}>#{i + 1}</Text>
                                    <Avatar size="small" style={{ backgroundColor: '#f1f5f9' }}>{poi.icon || '📍'}</Avatar>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text strong style={{ fontSize: 13, maxWidth: 120 }} ellipsis>{poi.name}</Text>
                                            <Text type="secondary" style={{ fontSize: 12 }}>{poi.visits}</Text>
                                        </div>
                                        <div style={{ background: '#f1f5f9', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                                            <div style={{ background: '#00246a', height: '100%', width: `${(poi.visits / maxVisits) * 100}%`, borderRadius: 3 }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </Col>

                {/* Recent Activity */}
                <Col xs={24} lg={8} style={{ minWidth: 0 }}>
                    <Card
                        title={<Title level={5} style={{ margin: 0 }}>Recent Activity</Title>}
                        variant="borderless"
                        style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', height: '100%' }}
                    >
                        {recentActivity.length === 0 ? (
                            <Text type="secondary">No recent activity</Text>
                        ) : (
                            recentActivity.map((item, index) => (
                                <div key={getRecentActivityKey(item, index)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <Avatar size="small" style={{ backgroundColor: '#f8fafc', fontSize: 14 }}>{item.flagEmoji || '🌐'}</Avatar>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <Text strong style={{ fontSize: 13 }}>{item.userName}</Text>
                                        <div style={{ fontSize: 12 }}>
                                            visited <strong>{item.poiName}</strong> ·{' '}
                                            {new Date(item.visitedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    )
}
