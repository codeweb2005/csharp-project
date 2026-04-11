/**
 * VendorDashboard — Dashboard page shown to Vendor (shop owner) users.
 *
 * Data flow:
 *   Login → PoiSwitcherContext fetches GET /auth/me (DB-authoritative) to get vendorPOIIds
 *   → activePOIId defaults to first (persisted in localStorage)
 *   → Vendor selects a different shop via the TopBar PoiSwitcher dropdown
 *   → useEffect re-fetches all stats for the newly selected POI
 *   → Backend scopes queries via a fresh DB query (not JWT claim)
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Clock, Globe2, TrendingUp, Users, ShoppingBag, UtensilsCrossed, Volume2, MapPin } from 'lucide-react'
import { Card, Row, Col, Typography, Statistic, Spin, Space, Avatar, Badge, Alert, Button, Tag } from 'antd'
import { dashboard as dashApi, analytics as analyticsApi } from '../../api.js'
import useCurrentUser from '../../hooks/useCurrentUser.js'
import { usePoiSwitcher } from '../../context/PoiSwitcherContext.jsx'
import './VendorDashboard.css'

const { Title, Text } = Typography

export default function VendorDashboard() {
    const { name } = useCurrentUser()
    const { activePOIId, activePOI, hasMultiplePOIs, vendorPOIIds, loadingPois } = usePoiSwitcher()
    const navigate = useNavigate()

    const [stats, setStats] = useState(null)
    const [topPOIs, setTopPOIs] = useState([])
    const [trends, setTrends] = useState(null)
    const [langStats, setLangStats] = useState([])
    const [peakHours, setPeakHours] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Re-fetch whenever the active POI changes
    useEffect(() => {
        if (!activePOIId) return

        async function loadAll() {
            setLoading(true)
            setError(null)
            try {
                const now = new Date()
                const today = now.toISOString().split('T')[0]

                const [statsRes, topRes, trendsRes, langRes, peakRes] = await Promise.all([
                    dashApi.getStats(),
                    dashApi.getTopPOIs(1),
                    analyticsApi.getTrends('30d'),
                    dashApi.getLanguageStats(),
                    analyticsApi.getVisitsByHour(today),
                ])

                setStats(statsRes.data)
                setTopPOIs(topRes.data ?? [])
                setTrends(trendsRes.data)
                setLangStats(langRes.data ?? [])
                setPeakHours(peakRes.data ?? [])
            } catch (err) {
                console.error('[VendorDashboard] load failed:', err)
                setError('Failed to load dashboard data. Ensure the backend is running.')
            } finally {
                setLoading(false)
            }
        }

        loadAll()
    }, [activePOIId]) // <-- re-run when vendor switches shop

    const peakHour = peakHours.length > 0
        ? peakHours.reduce((a, b) => (a.visits > b.visits ? a : b))
        : null

    // Still fetching shop list from server — show spinner
    if (loadingPois || (loading && !activePOIId)) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <Spin size="large" tip="Loading your shop data…" />
            </div>
        )
    }

    // Server responded but no shops assigned yet
    if (!loadingPois && vendorPOIIds.length === 0) {
        return (
            <div style={{ padding: '0 0 24px 0' }}>
                <Alert
                    message="Shop Not Linked"
                    description="Your account hasn't been linked to any shop yet. Please contact the admin — new shops will appear automatically without requiring re-login."
                    type="info"
                    showIcon
                    style={{ margin: 24 }}
                    action={
                        <Button type="primary" onClick={() => navigate('/pois')}>
                            View Shops
                        </Button>
                    }
                />
            </div>
        )
    }

    if (error) {
        return <Alert message="Error" description={error} type="error" showIcon style={{ margin: 24 }} />
    }

    // Prefer activePOI from context (already fetched with full detail), fallback to topPOIs[0]
    const shopName = activePOI?.name ?? topPOIs[0]?.name ?? 'My Shop'

    return (
        <div style={{ padding: '0 0 24px 0', animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                    <Title level={3} style={{ margin: 0 }}>🏪 {shopName}</Title>
                    <Text type="secondary">
                        Welcome back, <Text strong>{name}</Text> — Here's your shop's performance for the last 30 days.
                        {hasMultiplePOIs && (
                            <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                                (Switch shops using the selector in the top bar)
                            </Text>
                        )}
                    </Text>
                </div>
                {activePOI && (
                    <Tag color={activePOI.isActive ? 'green' : 'default'} style={{ fontSize: 13, padding: '2px 10px' }}>
                        {activePOI.isActive ? '🟢 Active' : '⚫ Inactive'}
                    </Tag>
                )}
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        icon={<Users size={22} />}
                        label="Visitors (30 days)"
                        value={stats?.totalVisits?.toLocaleString() ?? '—'}
                        change={stats?.totalVisitsChange}
                        color="#6366f1"
                        bg="#e0e7ff"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        icon={<TrendingUp size={22} />}
                        label="Narrations played"
                        value={trends?.narrations?.value?.toLocaleString() ?? '—'}
                        change={trends?.narrations?.changePercent}
                        color="#10b981"
                        bg="#d1fae5"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        icon={<Clock size={22} />}
                        label="Avg. listen time"
                        value={trends?.avgListenDuration?.value ? `${trends.avgListenDuration.value}s` : '—'}
                        change={trends?.avgListenDuration?.changePercent}
                        color="#f59e0b"
                        bg="#fef3c7"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        icon={<ShoppingBag size={22} />}
                        label="Audio narrations"
                        value={stats?.audioFiles?.toLocaleString() ?? '—'}
                        color="#8b5cf6"
                        bg="#ede9fe"
                    />
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24}>
                    <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <Space size="middle" wrap>
                            <Text strong>Quick Actions:</Text>
                            <Button icon={<UtensilsCrossed size={16} />} onClick={() => navigate('/menu')}>Edit Menu</Button>
                            <Button icon={<Volume2 size={16} />} onClick={() => navigate('/audio')}>Manage Audio</Button>
                            <Button icon={<MapPin size={16} />} onClick={() => navigate('/pois')}>Shop Info</Button>
                        </Space>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <Card title={<Space><Globe2 size={18} /><span>Visitors by Language</span></Space>} variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', height: '100%' }}>
                        {langStats.length === 0 ? (
                            <Text type="secondary">No visits recorded yet.</Text>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {langStats.map(l => (
                                    <div key={l.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <Avatar size="small" style={{ backgroundColor: '#f1f5f9' }}>{l.flagEmoji}</Avatar>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <Text strong style={{ fontSize: 13 }}>{l.name}</Text>
                                                <Text type="secondary" style={{ fontSize: 12 }}>{l.percentage}% ({l.count})</Text>
                                            </div>
                                            <div style={{ background: '#f1f5f9', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{ background: '#3b82f6', height: '100%', width: `${l.percentage}%`, borderRadius: 3 }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </Col>

                <Col xs={24} lg={12}>
                    <Card title={<Space><BarChart3 size={18} /><span>Peak Visit Hours (Today)</span></Space>} variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', height: '100%' }}>
                        {peakHour && peakHour.visits > 0 ? (
                            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                <Text strong style={{ color: '#b45309' }}>
                                    {String(peakHour.hour).padStart(2, '0')}:00 – {String(peakHour.hour + 1).padStart(2, '0')}:00
                                </Text>
                                <Badge count={`${peakHour.visits} visits`} style={{ backgroundColor: '#f59e0b' }} />
                            </div>
                        ) : (
                            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>No visits recorded today.</Text>
                        )}

                        <div style={{ display: 'flex', alignItems: 'flex-end', height: 160, gap: 4, paddingBottom: 8, borderBottom: '1px solid #e2e8f0', marginTop: 'auto' }}>
                            {peakHours.map(h => {
                                const maxVisits = Math.max(...peakHours.map(x => x.visits), 1)
                                const height = Math.round((h.visits / maxVisits) * 100)
                                return (
                                    <div
                                        key={h.hour}
                                        title={`${h.hour}:00 — ${h.visits} visits`}
                                        style={{ height: `${Math.max(height, 2)}%`, flex: 1, backgroundColor: height > 80 ? '#f59e0b' : '#3b82f6', opacity: height > 0 ? 0.8 : 0.2, borderRadius: '4px 4px 0 0', cursor: 'pointer', transition: 'all 0.2s' }}
                                    />
                                )
                            })}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>0:00</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>6:00</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>12:00</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>18:00</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>24:00</Text>
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    )
}

function StatCard({ icon, label, value, change, color, bg }) {
    const isPositive = change > 0
    const isNeutral = change === 0 || change == null

    return (
        <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {icon}
                </div>
                {!isNeutral && (
                    <Space style={{ color: isPositive ? '#10b981' : '#ef4444', fontSize: 13, fontWeight: 500 }}>
                        {isPositive ? '↑' : '↓'} {Math.abs(change)}% vs prev. period
                    </Space>
                )}
            </div>
            <Statistic title={<span style={{ fontWeight: 500 }}>{label}</span>} value={value} styles={{ content: { fontWeight: 600, fontSize: 24 } }} />
        </Card>
    )
}
