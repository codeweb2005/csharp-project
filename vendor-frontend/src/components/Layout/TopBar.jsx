import { useLocation, useNavigate } from 'react-router-dom'
import { Layout, Typography, Avatar, Dropdown } from 'antd'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import useCurrentUser from '../../hooks/useCurrentUser.js'
import PoiSwitcher from '../PoiSwitcher/PoiSwitcher.jsx'
import './TopBar.css'

const { Header } = Layout
const { Title, Text } = Typography

const pageTitles = {
    '/dashboard': { title: 'Dashboard', subtitle: 'System Overview' },
    '/pois': { title: 'Manage POIs', subtitle: 'Vinh Khanh food street locations' },
    '/categories': { title: 'Categories', subtitle: 'Manage shop categories' },
    '/audio': { title: 'Audio & Media', subtitle: 'Manage narration files and images' },
    '/menu': { title: 'Menu', subtitle: 'Manage shop menus' },
    '/users': { title: 'Users', subtitle: 'Manage system accounts' },
    '/analytics': { title: 'Analytics', subtitle: 'Analyze visitor data' },
    '/offline': { title: 'Offline Packages', subtitle: 'Manage downloadable data packages for mobile' },
    '/settings': { title: 'Settings', subtitle: 'System configuration' },
}

const vendorPageTitles = {
    '/dashboard': { title: 'My Shop', subtitle: 'Your shop overview' },
    '/pois': { title: 'Shop Info', subtitle: 'Edit your shop details' },
    '/categories': { title: 'Categories', subtitle: 'Browse shop categories' },
    '/audio': { title: 'Audio & Media', subtitle: 'Manage narrations and images' },
    '/menu': { title: 'Menu', subtitle: "Manage your shop's menu" },
    '/analytics': { title: 'Analytics', subtitle: "Your shop's visit analytics" },
}

export default function TopBar() {
    const location = useLocation()
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const { isVendor } = useCurrentUser()
    const page = (isVendor ? vendorPageTitles[location.pathname] : null) || pageTitles[location.pathname] || { title: 'VK Food Tour', subtitle: '' }

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const userMenuProps = {
        items: [
            {
                key: 'logout',
                label: 'Logout',
                icon: <LogOut size={16} />,
                danger: true,
                onClick: handleLogout,
            },
        ],
    }

    return (
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)', zIndex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, paddingTop: 10 }}>
                <Title level={4} style={{ margin: 0 }}>{page.title}</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>{page.subtitle}</Text>
            </div>

            {/* POI switcher — only visible for vendors with 2+ shops */}
            <PoiSwitcher />

            <Dropdown menu={userMenuProps} placement="bottomRight" arrow>
                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 8, transition: 'background 0.2s' }} className="topbar-user-dropdown">
                    <Avatar style={{ backgroundColor: isVendor ? '#f59e0b' : '#2563eb' }}>{user?.fullName?.[0] || (isVendor ? 'V' : 'A')}</Avatar>
                    <Text strong>{user?.fullName || (isVendor ? 'Vendor' : 'Admin')}</Text>
                </div>
            </Dropdown>
        </Header>
    )
}
