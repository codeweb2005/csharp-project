import { useState, useEffect, useCallback } from 'react'
import { ArrowUpOutlined, ArrowDownOutlined, GlobalOutlined, ClockCircleOutlined, ThunderboltOutlined, BarChartOutlined } from '@ant-design/icons'
import { Card, Row, Col, Typography, Radio, Spin, List, Avatar, Tag, Statistic, Space, Badge } from 'antd'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { analytics as analyticsApi, dashboard as dashboardApi } from '../../api.js'

const { Title, Text } = Typography

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

    const trendCards = trends ? [
        { label: 'Tổng lượt ghé', value: trends.totalVisits?.value ?? 0, change: trends.totalVisits?.changePercent ?? 0, color: '#3b82f6', bg: '#eff6ff' },
        { label: 'Thuyết minh đã phát', value: trends.narrations?.value ?? 0, change: trends.narrations?.changePercent ?? 0, color: '#22c55e', bg: '#f0fdf4' },
        { label: 'Người dùng mới', value: trends.newUsers?.value ?? 0, change: trends.newUsers?.changePercent ?? 0, color: '#8b5cf6', bg: '#f5f3ff' },
        { label: 'Thời gian nghe TB', value: `${trends.avgListenTime?.value ?? 0}s`, change: trends.avgListenTime?.changePercent ?? 0, color: '#f97316', bg: '#fff7ed' },
    ] : []

    if (loading && !trends) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Spin size="large" />
            </div>
        )
    }

    return (
        <div style={{ padding: '0 0 24px 0', animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                <Title level={4} style={{ margin: 0 }}>Analytics</Title>
                <Radio.Group value={period} onChange={e => setPeriod(e.target.value)} optionType="button" buttonStyle="solid">
                    {periods.map(p => (
                        <Radio.Button key={p.key} value={p.key}>{p.label}</Radio.Button>
                    ))}
                </Radio.Group>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {trendCards.map((t, i) => (
                    <Col xs={24} sm={12} lg={6} key={i}>
                        <Card bordered={false} bodyStyle={{ padding: '20px' }} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <Statistic
                                title={<Text type="secondary">{t.label}</Text>}
                                value={t.value}
                                valueStyle={{ color: t.color, fontWeight: 700, fontSize: 24, margin: '8px 0' }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text
                                    type={t.change >= 0 ? 'success' : 'danger'}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 13 }}
                                >
                                    {t.change >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                                    {Math.abs(t.change).toFixed(1)}%
                                </Text>
                                <div style={{ width: 60, height: 30 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={visitsByDay.slice(0, 15)}>
                                            <Line type="monotone" dataKey="visits" stroke={t.color} strokeWidth={2} dot={false} isAnimationActive={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={16}>
                    <Card
                        title={<><BarChartOutlined style={{ color: '#3b82f6', marginRight: 8 }} /> Lượt ghé thăm biên độ ngày</>}
                        bordered={false}
                        bodyStyle={{ padding: '20px 24px' }}
                        style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', height: '100%' }}
                    >
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={visitsByDay}>
                                    <defs>
                                        <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    <Area type="monotone" dataKey="visits" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVisits)" strokeWidth={2} />
                                    {visitsByDay[0]?.narrations !== undefined && (
                                        <Area type="monotone" dataKey="narrations" stroke="#22c55e" fill="transparent" strokeWidth={2} />
                                    )}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>

                <Col xs={24} lg={8}>
                    <Card
                        title={<><ClockCircleOutlined style={{ color: '#f59e0b', marginRight: 8 }} /> Lượt ghé theo giờ</>}
                        bordered={false}
                        bodyStyle={{ padding: '20px 24px' }}
                        style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', height: '100%' }}
                    >
                        <div style={{ height: 260 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={hourlyData}>
                                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} interval={2} />
                                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="visits" radius={[4, 4, 0, 0]}>
                                        {hourlyData.map((entry, i) => (
                                            <Cell key={i} fill={entry.visits > 30 ? '#ef4444' : entry.visits > 15 ? '#f59e0b' : '#3b82f6'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <Space style={{ marginTop: 12, justifyContent: 'center', width: '100%', fontSize: 12 }}>
                            <Badge color="#3b82f6" text="Thấp" />
                            <Badge color="#f59e0b" text="TB" />
                            <Badge color="#ef4444" text="Cao" />
                        </Space>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={24} md={10} lg={8}>
                    <Card
                        title={<><GlobalOutlined style={{ color: '#10b981', marginRight: 8 }} /> Ngôn ngữ sử dụng</>}
                        bordered={false}
                        bodyStyle={{ padding: '20px 24px' }}
                        style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', height: '100%' }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ height: 180, flexShrink: 0 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={langData.length > 0 ? langData : [{ name: 'No data', count: 1 }]}
                                            cx="50%" cy="50%"
                                            innerRadius={55} outerRadius={80}
                                            paddingAngle={3}
                                            dataKey="count"
                                            stroke="none"
                                        >
                                            {(langData.length > 0 ? langData : [{}]).map((_, i) =>
                                                <Cell key={i} fill={langData.length > 0 ? LANG_COLORS[i % LANG_COLORS.length] : '#f1f5f9'} />
                                            )}
                                        </Pie>
                                        <Tooltip formatter={(v, name) => [`${v} lượt`, name]} contentStyle={{ borderRadius: 8 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            
                            <List
                                size="small"
                                dataSource={langData}
                                renderItem={(item, i) => (
                                    <List.Item style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', border: 'none' }}>
                                        <Space>
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: LANG_COLORS[i % LANG_COLORS.length], display: 'inline-block' }} />
                                            <Text>{item.flagEmoji} {item.name}</Text>
                                        </Space>
                                        <Text strong>{item.percentage}%</Text>
                                    </List.Item>
                                )}
                                locale={{ emptyText: 'Chưa có dữ liệu' }}
                                style={{ flex: 1, overflowY: 'auto' }}
                            />
                        </div>
                    </Card>
                </Col>

                <Col xs={24} md={14} lg={16}>
                    <Card
                        title={<><ThunderboltOutlined style={{ color: '#8b5cf6', marginRight: 8 }} /> Hoạt động gần đây</>}
                        bordered={false}
                        bodyStyle={{ padding: 0 }}
                        style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', height: '100%' }}
                    >
                        <List
                            itemLayout="horizontal"
                            dataSource={recentVisits}
                            locale={{ emptyText: <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8' }}>Chưa có hoạt động</div> }}
                            renderItem={item => (
                                <List.Item style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
                                    <List.Item.Meta
                                        avatar={<Avatar style={{ backgroundColor: '#f8fafc', fontSize: 20 }}>{item.flagEmoji || '🌐'}</Avatar>}
                                        title={<Text strong>{item.userName}</Text>}
                                        description={<span>ghé thăm <strong>{item.poiName}</strong></span>}
                                    />
                                    <div style={{ textAlign: 'right' }}>
                                        <Tag color={item.triggerType === 'Geofence' ? 'blue' : item.triggerType === 'Manual' ? 'purple' : 'orange'} style={{ borderRadius: 12 }}>
                                            {item.triggerType}
                                        </Tag>
                                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                                            {new Date(item.visitedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                        </div>
                                    </div>
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    )
}
