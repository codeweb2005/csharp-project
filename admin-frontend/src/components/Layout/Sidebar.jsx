import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Layout, Menu, Avatar, Typography, Button } from 'antd'
import {
    LayoutDashboard, MapPin, Tag, Volume2, UtensilsCrossed,
    Users, BarChart3, Package, Settings, LogOut, ChevronLeft, Menu as MenuIcon,
    Store
} from 'lucide-react'
import useCurrentUser from '../../hooks/useCurrentUser.js'
import { clearTokens } from '../../api.js'
import './Sidebar.css'

const { Sider } = Layout
const { Text } = Typography

// Navigation item definitions
const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', adminOnly: true },
    { icon: Store, label: 'My Shop', path: '/dashboard', vendorOnly: true },
    { icon: MapPin, label: 'Points of Interest', path: '/pois' },
    { icon: Tag, label: 'Categories', path: '/categories' },
    { icon: Volume2, label: 'Audio & Media', path: '/audio' },
    { icon: UtensilsCrossed, label: 'Menu', path: '/menu', vendorOnly: true },
    { icon: Users, label: 'Users', path: '/users', adminOnly: true },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: Package, label: 'Offline Packages', path: '/offline', adminOnly: true },
    { icon: Settings, label: 'Settings', path: '/settings', adminOnly: true },
]

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false)
    const location = useLocation()
    const navigate = useNavigate()

    const { isVendor, isAdmin, name, role } = useCurrentUser()

    const visibleItems = menuItems.filter(item => {
        if (item.adminOnly && !isAdmin) return false
        if (item.vendorOnly && !isVendor) return false
        return true
    })

    const handleLogout = () => {
        clearTokens()
        navigate('/login')
    }

    const avatarInitial = name ? name.charAt(0).toUpperCase() : (isVendor ? 'V' : 'A')

    const items = visibleItems.map(item => {
        const Icon = item.icon
        return {
            key: item.path,
            icon: <Icon size={18} />,
            label: item.label,
        }
    })

    // Determine active key (highlighting)
    let selectedKey = '/dashboard'
    for (const item of items) {
        if (location.pathname === item.key || (item.key !== '/dashboard' && location.pathname.startsWith(item.key))) {
            selectedKey = item.key
            break
        }
    }

    const onMenuClick = ({ key }) => {
        navigate(key)
    }

    return (
        <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={(value) => setCollapsed(value)}
            theme="light"
            width={260}
            className="sidebar-antd"
            trigger={null} // custom trigger below
        >
            <div className="sidebar-logo-antd" style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
                {!collapsed && <Typography.Title level={4} style={{ margin: 0, color: '#2563eb' }}>VK Food Tour</Typography.Title>}
                <Button type="text" onClick={() => setCollapsed(!collapsed)} icon={collapsed ? <MenuIcon size={18} /> : <ChevronLeft size={18} />} />
            </div>

            <Menu
                mode="inline"
                selectedKeys={[selectedKey]}
                items={items}
                onClick={onMenuClick}
                style={{ borderRight: 0 }}
            />

            <div className="sidebar-footer-antd" style={{ position: 'absolute', bottom: 0, width: '100%', padding: '16px', borderTop: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: collapsed ? 'center' : 'flex-start' }}>
                    <Avatar style={{ backgroundColor: isVendor ? '#f59e0b' : '#3b82f6' }}>{avatarInitial}</Avatar>
                    {!collapsed && (
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <Text strong ellipsis style={{ display: 'block', margin: 0 }}>{name || 'User'}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>{isVendor ? 'Shop owner' : 'Administrator'}</Text>
                        </div>
                    )}
                </div>
                {!collapsed && (
                    <Button type="text" icon={<LogOut size={16} />} onClick={handleLogout} style={{ width: '100%', justifyContent: 'flex-start' }} danger>
                        Đăng xuất
                    </Button>
                )}
                {collapsed && (
                    <Button type="text" icon={<LogOut size={16} />} onClick={handleLogout} style={{ width: '100%' }} danger />
                )}
            </div>
        </Sider>
    )
}
