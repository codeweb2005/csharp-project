import { NavLink, useLocation } from 'react-router-dom'
import {
    LayoutDashboard, MapPin, Tag, Volume2, UtensilsCrossed,
    Users, BarChart3, Package, Settings, LogOut, ChevronLeft, Menu
} from 'lucide-react'
import { useState } from 'react'
import './Sidebar.css'

const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: MapPin, label: 'Quản lý POI', path: '/pois' },
    { icon: Tag, label: 'Danh mục', path: '/categories' },
    { icon: Volume2, label: 'Audio & Media', path: '/audio' },
    { icon: UtensilsCrossed, label: 'Thực đơn', path: '/menu' },
    { icon: Users, label: 'Người dùng', path: '/users' },
    { icon: BarChart3, label: 'Thống kê', path: '/analytics' },
    { icon: Package, label: 'Gói Offline', path: '/offline' },
    { icon: Settings, label: 'Cài đặt', path: '/settings' },
]

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false)
    const location = useLocation()

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            {/* Logo */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">🍜</div>
                {!collapsed && (
                    <div className="sidebar-logo-text">
                        <span className="sidebar-logo-title">VK Food Tour</span>
                        <span className="sidebar-logo-subtitle">Admin Panel</span>
                    </div>
                )}
                <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
                    {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                {menuItems.map(item => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path ||
                        (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={`sidebar-link ${isActive ? 'active' : ''}`}
                            title={collapsed ? item.label : ''}
                        >
                            <Icon size={20} />
                            {!collapsed && <span>{item.label}</span>}
                            {isActive && <div className="sidebar-indicator" />}
                        </NavLink>
                    )
                })}
            </nav>

            {/* User */}
            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-avatar">A</div>
                    {!collapsed && (
                        <div className="sidebar-user-info">
                            <span className="sidebar-user-name">Admin</span>
                            <span className="sidebar-user-role">Quản trị viên</span>
                        </div>
                    )}
                </div>
                {!collapsed && (
                    <button className="sidebar-logout" title="Đăng xuất">
                        <LogOut size={18} />
                    </button>
                )}
            </div>
        </aside>
    )
}
