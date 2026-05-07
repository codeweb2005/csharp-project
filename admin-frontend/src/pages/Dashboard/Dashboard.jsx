import { useState, useEffect } from 'react'
import { MapPin, Eye, Globe, Volume2, TrendingUp, TrendingDown } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'
import { Spin, Avatar } from 'antd'
import { dashboard as dashboardApi, analytics as analyticsApi } from '../../api'

const CHART_COLORS = ['#C92127', '#E05B1A', '#D97706', '#2563EB', '#7C3AED']

const statConfig = [
  { key: 'activePOIs', label: 'Active POIs', icon: MapPin, accent: 'indigo' },
  { key: 'totalVisits', label: 'Total Visits', icon: Eye, accent: 'emerald', changeKey: 'totalVisitsChange' },
  { key: 'narrationsToday', label: 'Audio Plays Today', icon: Volume2, accent: 'rose' },
  { key: 'languages', label: 'Languages', icon: Globe, accent: 'amber' },
  { key: 'audioFiles', label: 'Total Audio Files', icon: Volume2, accent: 'purple' },
]

function StatCard({ label, value, icon: Icon, accent, change }) {
  return (
    <div className={`stat-card ${accent}`}>
      <div className={`stat-card-icon ${accent}`}>
        <Icon size={18} />
      </div>
      <div className="stat-card-value">{value ?? 0}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <div className="stat-card-label">{label}</div>
        {change != null && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3,
            fontSize: 11, fontWeight: 600,
            color: change >= 0 ? '#16a34a' : '#DC2626',
          }}>
            {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {change > 0 ? '+' : ''}{change}%
          </div>
        )}
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#FFF', border: '1px solid #E8E8E8',
      borderRadius: 10, padding: '10px 14px', fontSize: 12,
      boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
    }}>
      <div style={{ color: '#999', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  )
}

// Format ngày hôm nay theo "dd/MM" — khớp format backend trả về
function todayLabel() {
  const now = new Date()
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [visitData, setVisitData] = useState([])
  const [langData, setLangData] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    setLoading(true)
    try {
        const [statsRes, langRes, recentRes] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getLanguageStats(),
          dashboardApi.getRecentActivity(10),
        ])
        if (statsRes.success) setStats(statsRes.data)
      if (langRes.success) setLangData(langRes.data)
      if (recentRes.success) setRecentActivity(recentRes.data)

      const to = new Date().toISOString()
      const from = new Date(Date.now() - 30 * 86400000).toISOString()
      const vRes = await dashboardApi.getVisitsChart(from, to)
      if (vRes.success) {
        // Backend chỉ trả ngày có data — đảm bảo ngày hôm nay luôn hiện trên chart
        const today = todayLabel()
        const data = vRes.data ?? []
        if (!data.find(d => d.date === today)) {
          data.push({ date: today, visits: 0, narrations: 0 })
        }
        setVisitData(data)
      }
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Polling 30s: tự động refresh Total Visits + Visits by Day ──────────────
  // SignalR hub yêu cầu Admin JWT qua WebSocket — không đáng tin cậy với Vite dev
  // proxy. Polling nhẹ 30s đảm bảo luôn cập nhật mà không cần WS connection.
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [statsRes, vRes, langRes, recentRes] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getVisitsChart(
            new Date(Date.now() - 30 * 86400000).toISOString(),
            new Date().toISOString()
          ),
          dashboardApi.getLanguageStats(),
          dashboardApi.getRecentActivity(10),
        ])
        if (statsRes.success) setStats(statsRes.data)
        if (langRes.success) setLangData(langRes.data)
        if (recentRes.success) setRecentActivity(recentRes.data)
        if (vRes.success) {
          // Đảm bảo ngày hôm nay luôn xuất hiện trong chart
          // (backend chỉ trả ngày có data, ngày chưa có visit sẽ không có entry)
          const today = todayLabel()
          const data = vRes.data ?? []
          if (!data.find(d => d.date === today)) {
            data.push({ date: today, visits: 0, narrations: 0 })
          }
          setVisitData(data)
        }
      } catch (err) {
        console.warn('[Dashboard] polling error:', err)
      }
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
      <Spin size="large" />
    </div>
  )

  const cardStyle = {
    background: '#FFFFFF',
    border: '1px solid #EEEEEE',
    borderRadius: 14,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'fadeInUp 0.35s ease-out' }}>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {statConfig.map((s, i) => (
          <StatCard key={i} label={s.label} value={stats?.[s.key]} icon={s.icon}
            accent={s.accent} change={s.changeKey ? stats?.[s.changeKey] : null} />
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Area Chart */}
        <div style={{ ...cardStyle, padding: '20px 20px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', fontFamily: "'Manrope', sans-serif" }}>
                Visits by Day
              </div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>Last 30 days</div>
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              {[['#C92127', 'Visits']].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#999' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                  {l}
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={visitData}>
              <defs>
                <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C92127" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#C92127" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#CCC' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#CCC' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="visits" name="Visits" stroke="#C92127" fill="url(#gV)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 14 }}>

        {/* Language Distribution */}
        <div style={{ ...cardStyle, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', fontFamily: "'Manrope', sans-serif", marginBottom: 12 }}>
            Language Distribution
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={langData.length > 0 ? langData : [{ name: 'No data', count: 1 }]}
                cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                paddingAngle={3} dataKey="count"
              >
                {(langData.length > 0 ? langData : [{}]).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]}/>
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #EEE', borderRadius: 8, fontSize: 12 }}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {langData.map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }}/>
                  <span style={{ fontSize: 12, color: '#666' }}>{l.flagEmoji} {l.name}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{l.percentage}%</span>
              </div>
            ))}
            {langData.length === 0 && <div style={{ fontSize: 12, color: '#CCC' }}>No data yet</div>}
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ ...cardStyle, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', fontFamily: "'Manrope', sans-serif", marginBottom: 16 }}>
            Recent Activity
          </div>
          {recentActivity.length === 0 ? (
            <div style={{ color: '#CCC', fontSize: 13, textAlign: 'center', marginTop: 40 }}>No recent activity</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentActivity.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0',
                  borderBottom: i < recentActivity.length - 1 ? '1px solid #F5F5F5' : 'none',
                }}>
                  <Avatar size={32} style={{ background: 'rgba(201,33,39,0.1)', fontSize: 14, flexShrink: 0 }}>
                    {item.flagEmoji || '🌐'}
                  </Avatar>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: '#333' }}>
                      <strong>{item.userName}</strong>
                      <span style={{ color: '#999' }}> visited </span>
                      <strong>{item.poiName}</strong>
                    </div>
                    <div style={{ fontSize: 11, color: '#BBB', marginTop: 2 }}>
                      {new Date(item.visitedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                    background: item.triggerType === 'Geofence' ? 'rgba(201,33,39,0.08)' : 'rgba(245,158,11,0.1)',
                    color: item.triggerType === 'Geofence' ? '#C92127' : '#D97706',
                    flexShrink: 0,
                  }}>{item.triggerType}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
