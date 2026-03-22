import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { DollarSign, Calendar as CalIcon, Users, CreditCard } from 'lucide-react'
import { dashboard as dashboardApi, analytics as analyticsApi } from '../../api.js'

const BLUE = '#1e70d6'

export default function Dashboard() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState(null)
    const [visitsByDay, setVisitsByDay] = useState([])
    const [recentVisits, setRecentVisits] = useState([])
    const [topPOIs, setTopPOIs] = useState([])
    const [langStats, setLangStats] = useState([])

    useEffect(() => {
        async function fetchDashboard() {
            try {
                const to = new Date().toISOString()
                const from = new Date(Date.now() - 30 * 86400000).toISOString()
                
                const [statsRes, listRes, actRes, topRes, langRes] = await Promise.all([
                    dashboardApi.getStats(),
                    analyticsApi.getVisitsByDay(from, to),
                    dashboardApi.getRecentActivity(5),
                    dashboardApi.getTopPOIs(5),
                    dashboardApi.getLanguageStats()
                ])

                setStats(statsRes.data)
                setTopPOIs(topRes.data || [])
                setLangStats(langRes.data || [])
                setRecentVisits(actRes.data || [])
                
                if (listRes.data && Array.isArray(listRes.data)) {
                    setVisitsByDay(listRes.data.map(item => ({
                        d: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        v: item.visits
                    })))
                }
            } catch (err) {
                console.error('[Dashboard] error', err)
            } finally {
                setLoading(false)
            }
        }
        fetchDashboard()
    }, [])

    const StatCard = ({ value, label, icon: Icon, variant }) => {
        const styles = {
            blue: 'bg-blue-soft text-primary border border-blue-200',
            orange: 'bg-orange-soft text-orange-500 border border-orange-200',
            green: 'bg-green-soft text-green-500 border border-green-200',
            solid: 'bg-primary text-white shadow-[0_4px_12px_rgba(30,112,214,0.4)]',
        }
        return (
            <div className="card flex justify-between items-center p-6">
                <div className="flex flex-col gap-1.5">
                    <span className="text-2xl font-bold leading-none text-text-dark">{value}</span>
                    <span className="text-sm font-semibold text-text-dark">{label}</span>
                </div>
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${styles[variant]}`}>
                    <Icon size={24} />
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            {/* 1. Stat Cards Row */}
            <div className="grid grid-cols-4 gap-6">
                <StatCard value={stats?.totalVisits?.toLocaleString() || '0'} label="Total Visits" icon={DollarSign} variant="blue" />
                <StatCard value={stats?.activeUsers || '0'} label="Active Users" icon={CalIcon} variant="orange" />
                <StatCard value={stats?.totalPOIs || '0'} label="Total POIs" icon={Users} variant="green" />
                <StatCard value={`${stats?.storageUsedMB || '0'} MB`} label="Storage Used" icon={CreditCard} variant="solid" />
            </div>

            {/* 2. Area Chart */}
            <div className="flex gap-6 h-[360px]">
                <div className="card flex-1 flex flex-col p-6">
                    <div className="card-title">Visits Trend (30 Days)</div>
                    <div className="flex-1 min-h-0 mt-5 -ml-6">
                        {visitsByDay.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={visitsByDay}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={BLUE} stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor={BLUE} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="d" tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} minTickGap={30} />
                                    <YAxis tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="v" stroke={BLUE} strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" dot={{r: 4, fill: '#fff', stroke: BLUE, strokeWidth: 2}} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-text-muted">No visits data available</div>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. Bottom Row */}
            <div className="flex gap-6">
                <div className="w-[380px] shrink-0 flex flex-col gap-6">
                    {/* Top POIs */}
                    <div className="card flex flex-col">
                        <div className="text-[0.95rem] font-semibold text-text-dark pb-4 mb-0 flex justify-between items-center border-b border-border-light">Top POIs</div>
                        <div className="flex flex-col gap-2 mt-3">
                            {topPOIs.length > 0 ? topPOIs.map(poi => (
                                <div key={poi.id} className="flex justify-between items-center py-2 border-b border-slate-100">
                                    <span className="text-sm font-semibold text-text-dark">{poi.name}</span>
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs text-text-muted">Visits:</span>
                                        <span className="text-xs font-bold text-text-dark">{poi.totalVisits}</span>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center text-sm text-text-muted py-4">No top POIs</div>
                            )}
                        </div>
                    </div>

                    {/* Language Distribution */}
                    <div className="card flex-1 flex flex-col">
                        <div className="card-title">Language Distribution</div>
                        <div className="h-[180px] relative flex justify-center my-4">
                             {langStats.length > 0 ? (
                                <ResponsiveContainer width={180} height={180}>
                                    <PieChart>
                                        <Pie data={langStats} cx="50%" cy="50%" innerRadius="75%" outerRadius="100%" paddingAngle={2} dataKey="visitsCount" stroke="none">
                                            {langStats.map((e,i)=><Cell key={`cell-${i}`} fill={i % 2 === 0 ? '#3b82f6' : i % 3 === 0 ? '#10b981' : '#f59e0b'}/>)}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                             ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-text-muted text-sm">No language data</span>
                                </div>
                             )}
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                                <span className="text-sm font-semibold text-text-dark leading-tight">Total<br/>Visits</span>
                                <strong className="text-xl mt-1 text-primary">{stats?.totalVisits || 0}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity Table */}
                <div className="card flex-1 flex flex-col overflow-hidden">
                     <div className="text-[0.95rem] font-semibold text-text-dark pb-4 mb-0 flex justify-between items-center border-b border-border-light">Recent Activity</div>
                     <div className="overflow-x-auto">
                         <table className="w-full border-collapse text-sm">
                             <thead>
                                 <tr>
                                     <th className="text-left p-4 border-b border-border-light text-text-muted font-semibold text-xs bg-white">Date</th>
                                     <th className="text-left p-4 border-b border-border-light text-text-muted font-semibold text-xs bg-white">Tourist</th>
                                     <th className="text-left p-4 border-b border-border-light text-text-muted font-semibold text-xs bg-white">POI</th>
                                     <th className="text-left p-4 border-b border-border-light text-text-muted font-semibold text-xs bg-white">Type</th>
                                     <th className="text-left p-4 border-b border-border-light text-text-muted font-semibold text-xs bg-white">Status</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 {recentVisits.length > 0 ? recentVisits.map((v, i) => {
                                     const status = v.triggerType === 0 ? 'Completed' : 'Pending'
                                     const statusBadge = status === 'Completed' ? 'badge-completed' : 'badge-pending'
                                     const dateStr = new Date(v.visitedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' })
                                     
                                     return (
                                         <tr key={i} className="hover:bg-slate-50 transition-colors">
                                             <td className="px-4 py-4.5 border-b border-slate-100 text-sm font-medium align-middle">📅 {dateStr}</td>
                                             <td className="px-4 py-4.5 border-b border-slate-100 font-medium text-sm text-text-dark align-middle">{v.userName}</td>
                                             <td className="px-4 py-4.5 border-b border-slate-100 text-sm text-text-muted align-middle">{v.poiName || '-'}</td>
                                             <td className="px-4 py-4.5 border-b border-slate-100 text-sm text-text-dark align-middle">{v.triggerType === 0 ? 'Geofence' : 'Manual'}</td>
                                             <td className="px-4 py-4.5 border-b border-slate-100 align-middle"><span className={`status-badge ${statusBadge}`}>{status}</span></td>
                                         </tr>
                                     )
                                 }) : (
                                     <tr>
                                         <td colSpan="5" className="text-center text-text-muted p-6">No recent activity found.</td>
                                     </tr>
                                 )}
                             </tbody>
                         </table>
                     </div>
                </div>
            </div>
        </div>
    )
}
