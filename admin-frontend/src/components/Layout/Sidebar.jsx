/**
 * Sidebar — Main navigation for the admin web panel.
 *
 * Role-aware rendering:
 *   - Admin sees all navigation items (full panel access)
 *   - Vendor sees a filtered set: My Shop, My Menu, My Analytics
 *     (Users, Settings, Offline Packages, and the global Dashboard are hidden)
 *
 * The actual access control is enforced server-side (JWT role check on every API call).
 * The sidebar filtering is purely for UX — to avoid showing Vendors pages they cannot use.
 *
 * Uses the `useCurrentUser` hook to read the decoded JWT role claim without an extra API call.
 */

import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard, MapPin, Tag, Volume2, UtensilsCrossed,
    Users, BarChart3, Package, Settings, LogOut, ChevronLeft, Menu,
    Store  // Vendor "My Shop" icon
} from 'lucide-react'
import { useState } from 'react'
import useCurrentUser from '../../hooks/useCurrentUser.js'
import { clearTokens } from '../../api.js'
import './Sidebar.css'

// ── Navigation item definitions ──────────────────────────────────────────────
// Each item has an optional `adminOnly` flag; Vendor users won't see those items.
const menuItems = [
    // Admin dashboard (global stats) — hidden for Vendors, they get VendorDashboard instead
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', adminOnly: true },

    // Vendor dashboard — shown only for Vendors (mirrors /dashboard route in App.jsx)
    { icon: Store, label: 'My Shop', path: '/dashboard', vendorOnly: true },

    { icon: MapPin, label: 'Points of Interest', path: '/pois' },
    { icon: Tag, label: 'Categories', path: '/categories' },
    { icon: Volume2, label: 'Audio & Media', path: '/audio' },
    { icon: UtensilsCrossed, label: 'Menu', path: '/menu', vendorOnly: true },

    // Admin-only sections
    { icon: Users, label: 'Users', path: '/users', adminOnly: true },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: Package, label: 'Offline Packages', path: '/offline', adminOnly: true },
    { icon: Settings, label: 'Settings', path: '/settings', adminOnly: true },
]

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false)
    const location = useLocation()
    const navigate = useNavigate()

    // Read role from JWT (no API call, pure localStorage decode)
    const { isVendor, isAdmin, name, role } = useCurrentUser()

    // Filter menu items based on the current user's role
    const visibleItems = menuItems.filter(item => {
        if (item.adminOnly && !isAdmin) return false   // hide admin-only items from Vendors
        if (item.vendorOnly && !isVendor) return false // hide vendor-only items from Admins
        return true
    })

    function handleLogout() {
        clearTokens()
        navigate('/login')
    }

    // Derive the user's avatar initial from their name
    const avatarInitial = name ? name.charAt(0).toUpperCase() : (isVendor ? 'V' : 'A')

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>

            {/* ── Logo ─────────────────────────────────────────────── */}
            <div className="sidebar-logo">
                <button
                    className="sidebar-toggle"
                    onClick={() => setCollapsed(!collapsed)}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            {/* ── Navigation ───────────────────────────────────────── */}
            <nav className="sidebar-nav" aria-label="Main navigation">
                {visibleItems.map(item => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path ||
                        (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
                    return (
                        <NavLink
                            key={`${item.path}-${item.label}`}
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

            {/* ── Footer: user info + logout ────────────────────────── */}
            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div
                        className="sidebar-avatar"
                        style={{ background: isVendor ? '#f59e0b' : undefined }}
                        title={`${name} (${role})`}
                    >
                        {avatarInitial}
                    </div>
                    {!collapsed && (
                        <div className="sidebar-user-info">
                            <span className="sidebar-user-name">{name || 'User'}</span>
                            <span className="sidebar-user-role">
                                {isVendor ? 'Shop owner' : 'Administrator'}
                            </span>
                        </div>
                    )}
                </div>
                {!collapsed && (
                    <button
                        className="sidebar-logout"
                        title="Logout"
                        onClick={handleLogout}
                    >
                        <LogOut size={18} />
                    </button>
                )}
            </div>
        </aside>
    )
}
