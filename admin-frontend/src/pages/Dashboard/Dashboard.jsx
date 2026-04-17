import { useState, useEffect } from 'react'
import { MapPin, Users, Globe, Volume2, TrendingUp, TrendingDown, Eye } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Card, Row, Col, Typography, Statistic, Spin, Avatar, Badge, Space } from 'antd'
import { dashboard as dashboardApi } from '../../api'
import './Dashboard.css'

const { Title, Text } = Typography

const COLORS = ['#00246a', '#22c55e', '#5c3800', '#4059aa', '#ba1a1a', '#06b6d4']

function getRecentActivityKey(item, index) {
    return item.id ?? `${item.userName}-${item.poiName}-${item.visitedAt}-${index}`
}

const statConfig = [
    { key: 'activePOIs', label: 'Active POIs', icon: MapPin, color: '#00246a', bg: '#dbe1ff' },
    { key: 'totalVisits', label: 'Total Visits', icon: Eye, color: '#22c55e', bg: '#d1fae5', changeKey: 'totalVisitsChange' },
    { key: 'languages', label: 'Languages', icon: Globe, color: '#4059aa', bg: '#dce1ff' },
    { key: 'audioFiles', label: 'Audio Files', icon: Volume2, color: '#5c3800', bg: '#ffddb8' },
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
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <Spin size="large" />
            </div>
        )
    }

    const maxVisits = topPOIs.length > 0 ? Math.max(...topPOIs.map(p => p.visits), 1) : 1

    return (
        <div style={{ padding: '0 0 24px 0', animation: 'fadeIn 0.4s ease-out' }}>
            {/* Stat Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {statConfig.map((s, i) => {
                    const Icon = s.icon
                    const value = stats?.[s.key] ?? 0
                    const change = s.changeKey ? stats?.[s.changeKey] : null
                    return (
                        <Col xs={24} sm={12} lg={6} key={i}>
                            <Card variant="borderless" style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,36,106,0.06)', border: 'none' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <div style={{ width: 42, height: 42, borderRadius: 12, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Icon size={20} />
                                    </div>
                                    {change !== null && (
                                        <Space style={{ color: change >= 0 ? '#10b981' : '#ba1a1a', fontSize: 13, fontWeight: 600 }}>
                                            {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                            {change > 0 ? '+' : ''}{change}%
                                        </Space>
                                    )}
                                </div>
                                <Statistic title={<span style={{ fontWeight: 500, fontFamily: "'Inter', sans-serif", fontSize: 13 }}>{s.label}</span>} value={value} styles={{ content: { fontWeight: 700, fontSize: 26, fontFamily: "'Manrope', sans-serif", letterSpacing: '-0.02em' } }} />
                            </Card>
                        </Col>
                    )
                })}
            </Row>

            {/* Charts Row */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={16} style={{ minWidth: 0 }}>
                    <Card variant="borderless" style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,36,106,0.06)', height: '100%', border: 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <Title level={5} style={{ margin: 0 }}>Visits by Day</Title>
                            <Space size="middle">
                                <Space><Badge color="#00246a" /><Text type="secondary" style={{ fontSize: 13 }}>Visits</Text></Space>
                                <Space><Badge color="#22c55e" /><Text type="secondary" style={{ fontSize: 13 }}>Narrations</Text></Space>
                            </Space>
                        </div>
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={visitData}>
                                <defs>
                                    <linearGradient id="gVisitsAnt" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#00246a" stopOpacity={0.2} />
                                        <stop offset="100%" stopColor="#00246a" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gNarrAnt" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.15} />
                                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 12px 40px rgba(0,36,106,0.06)', fontSize: 12 }} />
                                <Area type="monotone" dataKey="visits" stroke="#00246a" fill="url(#gVisitsAnt)" strokeWidth={2} />
                                <Area type="monotone" dataKey="narrations" stroke="#22c55e" fill="url(#gNarrAnt)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>

                <Col xs={24} lg={8} style={{ minWidth: 0 }}>
                    <Card title={<Title level={5} style={{ margin: 0 }}>Top Locations</Title>} variant="borderless" style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,36,106,0.06)', height: '100%', border: 'none' }}>
                        {topPOIs.length === 0 && <Text type="secondary">No data yet</Text>}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
                            {topPOIs.map((poi, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <Text type="secondary" style={{ width: 24, fontSize: 12 }}>#{i + 1}</Text>
                                    <Avatar size="small" style={{ backgroundColor: 'rgba(143,167,254,0.2)' }}>{poi.icon || '📍'}</Avatar>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text strong style={{ fontSize: 13, width: 100 }} ellipsis>{poi.name}</Text>
                                            <Text type="secondary" style={{ fontSize: 12 }}>{poi.visits}</Text>
                                        </div>
                                        <div style={{ background: '#e9e7ef', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                                            <div style={{ background: 'linear-gradient(90deg, #00246a, #8fa7fe)', height: '100%', width: `${(poi.visits / maxVisits) * 100}%`, borderRadius: 3 }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Bottom Row */}
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={8} style={{ minWidth: 0 }}>
                    <Card title={<Title level={5} style={{ margin: 0 }}>Language Distribution</Title>} variant="borderless" style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,36,106,0.06)', height: '100%', border: 'none' }}>
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
                                <Tooltip formatter={(v, name) => [`${v} visits`, name]} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {langData.map((l, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Space>
                                        <Badge color={COLORS[i % COLORS.length]} />
                                        <Text>{l.flagEmoji} {l.name}</Text>
                                    </Space>
                                    <Text strong>{l.percentage}%</Text>
                                </div>
                            ))}
                            {langData.length === 0 && <Text type="secondary">No data yet</Text>}
                        </div>
                    </Card>
                </Col>

                <Col xs={24} lg={16} style={{ minWidth: 0 }}>
                    <Card title={<Title level={5} style={{ margin: 0 }}>Recent Activity</Title>} variant="borderless" style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,36,106,0.06)', height: '100%', border: 'none' }}>
                        {recentActivity.length === 0 ? (
                            <Text type="secondary">No recent activity</Text>
                        ) : (
                            recentActivity.map((item, index) => (
                                <div key={getRecentActivityKey(item, index)} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <Avatar style={{ backgroundColor: 'rgba(143,167,254,0.15)' }}>{item.flagEmoji || '🌐'}</Avatar>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div>
                                            <Text strong>{item.userName}</Text> <Text type="secondary">visited</Text> <Text strong>{item.poiName}</Text>
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 12 }}>{new Date(item.visitedAt).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</Text>
                                    </div>
                                    <Space>
                                        <Badge status={item.triggerType === 'Geofence' ? 'processing' : 'warning'} text={<span style={{ fontSize: 12 }}>{item.triggerType}</span>} style={{ background: '#eeedf4', padding: '4px 10px', borderRadius: 12, border: 'none' }} />
                                    </Space>
                                </div>
                            ))
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    )
}
