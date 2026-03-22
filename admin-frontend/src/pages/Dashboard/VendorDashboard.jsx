/**
 * VendorDashboard — Dashboard page shown to Vendor (shop owner) users.
 *
 * Displays the same API data as the Admin dashboard, BUT:
 *   - The backend automatically scopes all stats to the Vendor's own POI
 *     (via the `vendorPoiId` JWT claim read by GetVendorPOIId() in controllers)
 *   - The UI shows a simplified view: visit count, peak hours, language breakdown
 *   - System-wide stats (total users, all vendors, all POIs) are NOT shown
 *
 * Data flow:
 *   Login → JWT includes `vendorPoiId` claim
 *   → React calls same dashboard + analytics API endpoints
 *   → Backend detects Vendor role, filters DB queries to that POI automatically
 *   → Vendor sees only their own shop's data
 */

import { useEffect, useState } from 'react'
import { BarChart3, Clock, Globe2, TrendingUp, Users, ShoppingBag } from 'lucide-react'
import { dashboard as dashApi, analytics as analyticsApi } from '../../api.js'
import useCurrentUser from '../../hooks/useCurrentUser.js'
import './VendorDashboard.css'

export default function VendorDashboard() {
    const { name } = useCurrentUser()

    // ── State ──────────────────────────────────────────────────────────
    const [stats,     setStats]     = useState(null)
    const [topPOIs,   setTopPOIs]   = useState([])
    const [trends,    setTrends]    = useState(null)
    const [langStats, setLangStats] = useState([])
    const [peakHours, setPeakHours] = useState([])
    const [loading,   setLoading]   = useState(true)
    const [error,     setError]     = useState(null)

    // ── Load all stats on mount ────────────────────────────────────────
    useEffect(() => {
        async function loadAll() {
            setLoading(true)
            setError(null)
            try {
                // All these API calls hit the same endpoints as Admin.
                // Backend scoping (via vendorPoiId JWT claim) ensures Vendor only
                // receives data for their own POI — no extra client-side filtering needed.
                const now     = new Date()
                const from    = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
                const to      = now.toISOString()
                const today   = now.toISOString().split('T')[0]

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
    }, [])

    // ── Derived values ─────────────────────────────────────────────────

    // Find the peak hour (hour with the most visits)
    const peakHour = peakHours.length > 0
        ? peakHours.reduce((a, b) => (a.visits > b.visits ? a : b))
        : null

    // ── Render ─────────────────────────────────────────────────────────

    if (loading) {
        return <div className="vendor-dash-loading">Loading your shop data…</div>
    }

    if (error) {
        return <div className="vendor-dash-error">⚠️ {error}</div>
    }

    return (
        <div className="vendor-dash animate-fadeIn">

            {/* Welcome header */}
            <div className="vendor-dash-header">
                <div>
                    <h1 className="vendor-dash-title">
                        🏪 {topPOIs[0]?.name ?? 'My Shop'}
                    </h1>
                    <p className="vendor-dash-subtitle">
                        Welcome back, <strong>{name}</strong> — Here's your shop's performance for the last 30 days.
                    </p>
                </div>
            </div>

            {/* Stat cards */}
            <div className="vendor-dash-cards">
                <StatCard
                    icon={<Users size={22} />}
                    label="Visitors (30 days)"
                    value={stats?.totalVisits?.toLocaleString() ?? '—'}
                    change={stats?.totalVisitsChange}
                    color="indigo"
                />
                <StatCard
                    icon={<TrendingUp size={22} />}
                    label="Narrations played"
                    value={trends?.narrations?.value?.toLocaleString() ?? '—'}
                    change={trends?.narrations?.changePercent}
                    color="emerald"
                />
                <StatCard
                    icon={<Clock size={22} />}
                    label="Avg. listen time"
                    value={trends?.avgListenDuration?.value
                        ? `${trends.avgListenDuration.value}s`
                        : '—'}
                    change={trends?.avgListenDuration?.changePercent}
                    color="amber"
                />
                <StatCard
                    icon={<ShoppingBag size={22} />}
                    label="Audio narrations"
                    value={stats?.audioFiles?.toLocaleString() ?? '—'}
                    color="violet"
                />
            </div>

            {/* Language stats + Peak hour */}
            <div className="vendor-dash-bottom">

                {/* Language breakdown */}
                <div className="card vendor-dash-section">
                    <div className="vendor-dash-section-header">
                        <Globe2 size={18} />
                        <h2>Visitors by Language</h2>
                    </div>
                    {langStats.length === 0 ? (
                        <p className="vendor-dash-empty">No visits recorded yet.</p>
                    ) : (
                        <ul className="vendor-lang-list">
                            {langStats.map(l => (
                                <li key={l.name} className="vendor-lang-item">
                                    <span className="vendor-lang-flag">{l.flagEmoji}</span>
                                    <span className="vendor-lang-name">{l.name}</span>
                                    <div className="vendor-lang-bar-wrap">
                                        <div
                                            className="vendor-lang-bar"
                                            style={{ width: `${l.percentage}%` }}
                                        />
                                    </div>
                                    <span className="vendor-lang-pct">{l.percentage}%</span>
                                    <span className="vendor-lang-count">({l.count})</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Peak visit hour */}
                <div className="card vendor-dash-section">
                    <div className="vendor-dash-section-header">
                        <BarChart3 size={18} />
                        <h2>Peak Visit Hours (Today)</h2>
                    </div>
                    {peakHour && peakHour.visits > 0 ? (
                        <div className="vendor-peak-highlight">
                            <span className="vendor-peak-time">
                                {String(peakHour.hour).padStart(2, '0')}:00
                                – {String(peakHour.hour + 1).padStart(2, '0')}:00
                            </span>
                            <span className="vendor-peak-visits">
                                {peakHour.visits} visits
                            </span>
                        </div>
                    ) : (
                        <p className="vendor-dash-empty">No visits recorded today.</p>
                    )}

                    {/* Simple bar chart */}
                    <div className="vendor-hourly-chart">
                        {peakHours.map(h => {
                            const maxVisits = Math.max(...peakHours.map(x => x.visits), 1)
                            const height = Math.round((h.visits / maxVisits) * 100)
                            return (
                                <div
                                    key={h.hour}
                                    className="vendor-hour-bar"
                                    title={`${h.hour}:00 — ${h.visits} visits`}
                                    style={{ height: `${Math.max(height, 2)}%` }}
                                />
                            )
                        })}
                    </div>
                    <div className="vendor-hourly-labels">
                        <span>0:00</span>
                        <span>6:00</span>
                        <span>12:00</span>
                        <span>18:00</span>
                        <span>24:00</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

/**
 * StatCard — a single KPI card on the vendor dashboard.
 */
function StatCard({ icon, label, value, change, color = 'indigo' }) {
    const isPositive = change > 0
    const isNeutral  = change === 0 || change == null

    return (
        <div className={`vendor-stat-card vendor-stat-card--${color}`}>
            <div className="vendor-stat-icon">{icon}</div>
            <div className="vendor-stat-body">
                <span className="vendor-stat-label">{label}</span>
                <span className="vendor-stat-value">{value}</span>
                {!isNeutral && (
                    <span className={`vendor-stat-change ${isPositive ? 'positive' : 'negative'}`}>
                        {isPositive ? '↑' : '↓'} {Math.abs(change)}% vs prev. period
                    </span>
                )}
            </div>
        </div>
    )
}
