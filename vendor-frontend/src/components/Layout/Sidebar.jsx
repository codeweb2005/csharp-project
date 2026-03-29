import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Layout, Menu, Avatar, Typography, Button } from 'antd'
import {
    LayoutDashboard, MapPin, Volume2, UtensilsCrossed,
    BarChart3, LogOut, ChevronLeft, Menu as MenuIcon, Store
} from 'lucide-react'
import useCurrentUser from '../../hooks/useCurrentUser.js'
import { useAuth } from '../../context/AuthContext.jsx'
import './Sidebar.css'

const { Sider } = Layout
const { Text } = Typography

const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Store, label: 'Shop Info', path: '/pois' },
    { icon: Volume2, label: 'Audio & Media', path: '/audio' },
    { icon: UtensilsCrossed, label: 'Menu', path: '/menu' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
]

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false)
    const location = useLocation()
    const navigate = useNavigate()

    const { name } = useCurrentUser()
    const { logout } = useAuth()

    const visibleItems = menuItems

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const avatarInitial = name ? name.charAt(0).toUpperCase() : 'V'

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
                {!collapsed && <Typography.Title level={4} style={{ margin: 0, color: '#f59e0b' }}>Vendor</Typography.Title>}
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
                    <Avatar style={{ backgroundColor: '#f59e0b' }}>{avatarInitial}</Avatar>
                    {!collapsed && (
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <Text strong ellipsis style={{ display: 'block', margin: 0 }}>{name || 'Vendor User'}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>Shop Owner</Text>
                        </div>
                    )}
                </div>
                {!collapsed && (
                    <Button type="text" icon={<LogOut size={16} />} onClick={handleLogout} style={{ width: '100%', justifyContent: 'flex-start' }} danger>
                        Logout
                    </Button>
                )}
                {collapsed && (
                    <Button type="text" icon={<LogOut size={16} />} onClick={handleLogout} style={{ width: '100%' }} danger />
                )}
            </div>
        </Sider>
    )
}
