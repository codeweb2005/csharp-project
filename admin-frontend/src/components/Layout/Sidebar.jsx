import { useLocation, Link } from 'react-router-dom'
import { PieChart, Users, MapPin, List, Radio, BarChart2, Package, Settings, LogOut } from 'lucide-react'
import useCurrentUser from '../../hooks/useCurrentUser'
import { useAuth } from '../../context/AuthContext'

export default function Sidebar() {
    const loc = useLocation()
    const { isVendor } = useCurrentUser()
    const { logout } = useAuth()

    const allItems = [
        { path: '/', label: 'Dashboard', icon: PieChart, adminOnly: false },
        { path: '/pois', label: 'POIs', icon: MapPin, adminOnly: false },
        { path: '/menu', label: 'Menu', icon: List, adminOnly: false },
        { path: '/categories', label: 'Categories', icon: Package, adminOnly: false },
        { path: '/audio', label: 'Audio', icon: Radio, adminOnly: false },
        { path: '/analytics', label: 'Analytics', icon: BarChart2, adminOnly: false },
        { path: '/users', label: 'Users', icon: Users, adminOnly: true },
        { path: '/offline', label: 'Offline', icon: Package, adminOnly: true },
        { path: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
    ]

    const menuItems = allItems.filter(item => isVendor ? !item.adminOnly : true)

    return (
        <aside className="w-24 h-screen bg-bg-sidebar border-r border-border-light flex flex-col fixed z-50">
            {/* Logo area */}
            <div className="h-15 flex items-center justify-center border-b border-border-light bg-slate-50">
                <span className="font-bold text-sm text-text-dark uppercase tracking-wide">VK Food</span>
            </div>

            {/* Nav list */}
            <nav className="flex-1 overflow-y-auto pt-4 flex flex-col gap-2">
                {menuItems.map(item => {
                    const active = loc.pathname === item.path
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center justify-center py-3 mx-2 rounded-md no-underline transition-all duration-200 relative
                                ${active ? 'text-primary' : 'text-text-muted hover:text-primary hover:bg-bg-app'}`}
                        >
                            {active && (
                                <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-sm" />
                            )}
                            <item.icon size={20} strokeWidth={active ? 2.5 : 1.5} className="mb-1.5" />
                            <span className="text-[0.65rem] font-medium">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>

            <div className="py-4 border-t border-border-light">
                <button
                    className="flex flex-col items-center justify-center py-3 w-full text-text-muted hover:text-primary transition-colors duration-200"
                    onClick={logout}
                    title="Logout"
                >
                    <LogOut size={20} className="mb-1.5" />
                    <span className="text-[0.65rem] font-medium">Exit</span>
                </button>
            </div>
        </aside>
    )
}
