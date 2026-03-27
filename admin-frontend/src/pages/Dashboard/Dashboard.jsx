import { useState, useEffect } from 'react'
import { MapPin, Users, Globe, Volume2, TrendingUp, TrendingDown, Eye } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Card, Row, Col, Typography, Statistic, Spin, List, Avatar, Badge, Space } from 'antd'
import { dashboard as dashboardApi } from '../../api'
import './Dashboard.css'

const { Title, Text } = Typography

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
                            <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 8, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Icon size={20} />
                                    </div>
                                    {change !== null && (
                                        <Space style={{ color: change >= 0 ? '#10b981' : '#ef4444', fontSize: 13, fontWeight: 500 }}>
                                            {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                            {change > 0 ? '+' : ''}{change}%
                                        </Space>
                                    )}
                                </div>
                                <Statistic title={<span style={{ fontWeight: 500 }}>{s.label}</span>} value={value} valueStyle={{ fontWeight: 600, fontSize: 24 }} />
                            </Card>
                        </Col>
                    )
                })}
            </Row>

            {/* Charts Row */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={16}>
                    <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', height: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <Title level={5} style={{ margin: 0 }}>Lượt ghé thăm theo ngày</Title>
                            <Space size="middle">
                                <Space><Badge color="#3b82f6" /><Text type="secondary" style={{ fontSize: 13 }}>Lượt ghé</Text></Space>
                                <Space><Badge color="#22c55e" /><Text type="secondary" style={{ fontSize: 13 }}>Thuyết minh</Text></Space>
                            </Space>
                        </div>
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={visitData}>
                                <defs>
                                    <linearGradient id="gVisitsAnt" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gNarrAnt" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.15} />
                                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                                <Area type="monotone" dataKey="visits" stroke="#3b82f6" fill="url(#gVisitsAnt)" strokeWidth={2} />
                                <Area type="monotone" dataKey="narrations" stroke="#22c55e" fill="url(#gNarrAnt)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>

                <Col xs={24} lg={8}>
                    <Card title={<Title level={5} style={{ margin: 0 }}>Top điểm ghé thăm</Title>} bordered={false} style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', height: '100%' }}>
                        {topPOIs.length === 0 && <Text type="secondary">Chưa có dữ liệu</Text>}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
                            {topPOIs.map((poi, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <Text type="secondary" style={{ width: 24, fontSize: 12 }}>#{i + 1}</Text>
                                    <Avatar size="small" style={{ backgroundColor: '#f1f5f9' }}>{poi.icon || '📍'}</Avatar>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text strong style={{ fontSize: 13, width: 100 }} ellipsis>{poi.name}</Text>
                                            <Text type="secondary" style={{ fontSize: 12 }}>{poi.visits}</Text>
                                        </div>
                                        <div style={{ background: '#f1f5f9', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                                            <div style={{ background: '#3b82f6', height: '100%', width: `${(poi.visits / maxVisits) * 100}%`, borderRadius: 3 }} />
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
                <Col xs={24} lg={8}>
                    <Card title={<Title level={5} style={{ margin: 0 }}>Phân bố ngôn ngữ</Title>} bordered={false} style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', height: '100%' }}>
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
                            {langData.length === 0 && <Text type="secondary">Chưa có dữ liệu</Text>}
                        </div>
                    </Card>
                </Col>

                <Col xs={24} lg={16}>
                    <Card title={<Title level={5} style={{ margin: 0 }}>Hoạt động gần đây</Title>} bordered={false} style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', height: '100%' }}>
                        <List
                            itemLayout="horizontal"
                            dataSource={recentActivity}
                            locale={{ emptyText: 'Chưa có hoạt động' }}
                            renderItem={(item) => (
                                <List.Item>
                                    <List.Item.Meta
                                        avatar={<Avatar style={{ backgroundColor: '#f1f5f9' }}>{item.flagEmoji || '🌐'}</Avatar>}
                                        title={<>
                                            <Text strong>{item.userName}</Text> <Text type="secondary">đã ghé</Text> <Text strong>{item.poiName}</Text>
                                        </>}
                                        description={new Date(item.visitedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                    />
                                    <Space>
                                        <Badge status={item.triggerType === 'Geofence' ? 'processing' : 'warning'} text={<span style={{ fontSize: 12 }}>{item.triggerType}</span>} style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: 4, border: '1px solid #e2e8f0' }} />
                                    </Space>
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    )
}
