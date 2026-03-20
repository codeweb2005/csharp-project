import { TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import './Analytics.css'

const trends = [
    { label: 'Tổng lượt ghé', value: '3,456', change: '+12.5%', trend: 'up', color: '#3b82f6', bg: '#eff6ff' },
    { label: 'Thuyết minh đã phát', value: '2,890', change: '+8.3%', trend: 'up', color: '#22c55e', bg: '#f0fdf4' },
    { label: 'Người dùng mới', value: '156', change: '+15.2%', trend: 'up', color: '#8b5cf6', bg: '#f5f3ff' },
    { label: 'Thời gian nghe TB', value: '38s', change: '-2.1%', trend: 'down', color: '#f97316', bg: '#fff7ed' },
]

const visitsByDay = Array.from({ length: 30 }, (_, i) => ({
    day: `${i + 1}/02`,
    visits: Math.floor(Math.random() * 60) + 25,
    played: Math.floor(Math.random() * 40) + 15,
}))

const categoryData = [
    { name: 'Hải sản', Tuần1: 140, Tuần2: 165, Tuần3: 155, Tuần4: 180 },
    { name: 'Quán nhậu', Tuần1: 80, Tuần2: 95, Tuần3: 88, Tuần4: 110 },
    { name: 'Quán ăn', Tuần1: 65, Tuần2: 72, Tuần3: 68, Tuần4: 85 },
    { name: 'Tráng miệng', Tuần1: 55, Tuần2: 60, Tuần3: 62, Tuần4: 70 },
    { name: 'Đồ uống', Tuần1: 30, Tuần2: 35, Tuần3: 32, Tuần4: 40 },
]

const langData = [
    { name: 'Tiếng Việt', value: 58, color: '#3b82f6' },
    { name: 'English', value: 32, color: '#22c55e' },
    { name: '日本語', value: 5, color: '#f59e0b' },
    { name: '한국어', value: 3, color: '#8b5cf6' },
    { name: '中文', value: 2, color: '#ef4444' },
]

const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}h`,
    visits: i >= 10 && i <= 22
        ? Math.floor(Math.random() * 30) + (i >= 17 && i <= 21 ? 40 : 10)
        : Math.floor(Math.random() * 5),
}))

const recentVisits = [
    { user: 'John Smith', poi: 'Ốc Đào', time: '2 phút', type: 'Geofence', lang: '🇬🇧' },
    { user: 'Hana Tanaka', poi: 'Chè Bà Tư', time: '15 phút', type: 'Manual', lang: '🇯🇵' },
    { user: 'Phạm Minh', poi: 'Bún Riêu Cô Ba', time: '32 phút', type: 'Geofence', lang: '🇻🇳' },
    { user: 'Kim Soo', poi: 'Lồng Uống 40', time: '1 giờ', type: 'Geofence', lang: '🇰🇷' },
    { user: 'David Chen', poi: 'Ốc Oanh', time: '2 giờ', type: 'Manual', lang: '🇨🇳' },
    { user: 'Tourist #42', poi: 'Hải Sản Năm Sao', time: '3 giờ', type: 'List', lang: '🇬🇧' },
]

export default function Analytics() {
    return (
        <div className="analytics-page animate-fadeIn">
            {/* Date Range */}
            <div className="analytics-header">
                <div className="analytics-range">
                    <Calendar size={16} />
                    <span>01/02/2026 — 03/03/2026</span>
                </div>
                <div className="analytics-range-btns">
                    <button className="range-btn">7 ngày</button>
                    <button className="range-btn active">30 ngày</button>
                    <button className="range-btn">90 ngày</button>
                </div>
            </div>

            {/* Trend Cards */}
            <div className="trend-grid">
                {trends.map((t, i) => (
                    <div className="trend-card" key={i} style={{ animationDelay: `${i * 0.08}s` }}>
                        <div className="trend-top">
                            <span className="trend-label">{t.label}</span>
                            <span className={`trend-change ${t.trend}`}>
                                {t.trend === 'up' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                {t.change}
                            </span>
                        </div>
                        <div className="trend-value" style={{ color: t.color }}>{t.value}</div>
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
                        <div className="chart-legend">
                            <span className="legend-dot" style={{ background: '#3b82f6' }} /> Tổng lượt ghé
                            <span className="legend-dot" style={{ background: '#22c55e' }} /> Thuyết minh phát
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={visitsByDay}>
                            <defs>
                                <linearGradient id="gVisA" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gPlayA" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.15} />
                                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                            <Area type="monotone" dataKey="visits" stroke="#3b82f6" fill="url(#gVisA)" strokeWidth={2} />
                            <Area type="monotone" dataKey="played" stroke="#22c55e" fill="url(#gPlayA)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="card chart-card">
                    <h3 className="card-title">📊 Phân bố theo danh mục</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={categoryData} barGap={2}>
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                            <Bar dataKey="Tuần1" fill="#93bbfd" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="Tuần2" fill="#60a5fa" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="Tuần3" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="Tuần4" fill="#2563eb" radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="analytics-row analytics-row-3">
                {/* Hourly Heatmap */}
                <div className="card chart-card">
                    <h3 className="card-title">🕐 Lượt ghé theo giờ</h3>
                    <ResponsiveContainer width="100%" height={200}>
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

                {/* Language Donut */}
                <div className="card chart-card">
                    <h3 className="card-title">🌐 Ngôn ngữ sử dụng</h3>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie data={langData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                                {langData.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                            <Tooltip formatter={v => `${v}%`} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="lang-list">
                        {langData.map((l, i) => (
                            <div className="lang-list-item" key={i}>
                                <span className="legend-dot" style={{ background: l.color }} />
                                <span className="lang-list-name">{l.name}</span>
                                <span className="lang-list-pct">{l.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="card chart-card">
                    <h3 className="card-title">⚡ Hoạt động gần đây</h3>
                    <div className="activity-list">
                        {recentVisits.map((v, i) => (
                            <div className="activity-item" key={i}>
                                <span className="activity-avatar">{v.lang}</span>
                                <div className="activity-info">
                                    <span className="activity-user">{v.user}</span>
                                    <span className="activity-desc">ghé <strong>{v.poi}</strong></span>
                                </div>
                                <div className="activity-right">
                                    <span className={`badge badge-sm ${v.type === 'Geofence' ? 'badge-primary' : v.type === 'Manual' ? 'badge-purple' : 'badge-warning'}`}>
                                        {v.type}
                                    </span>
                                    <span className="activity-time">{v.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
