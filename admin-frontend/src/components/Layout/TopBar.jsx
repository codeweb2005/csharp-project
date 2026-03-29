import { useLocation, useNavigate } from 'react-router-dom'
import { Layout, Typography, Avatar, Dropdown, Space, Button } from 'antd'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import useCurrentUser from '../../hooks/useCurrentUser.js'
import './TopBar.css'

const { Header } = Layout
const { Title, Text } = Typography

const pageTitles = {
    '/dashboard': { title: 'Dashboard', subtitle: 'System overview' },
    '/pois': { title: 'POI Management', subtitle: 'Food locations on Vinh Khanh street' },
    '/categories': { title: 'Categories', subtitle: 'Manage shop categories' },
    '/audio': { title: 'Audio & Media', subtitle: 'Manage narration audio and images' },
    '/menu': { title: 'Menu', subtitle: 'Manage shop menus' },
    '/users': { title: 'Users', subtitle: 'Manage system accounts' },
    '/analytics': { title: 'Analytics', subtitle: 'Visit data analysis' },
    '/offline': { title: 'Offline Packages', subtitle: 'Manage mobile download packages' },
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
        <Header style={{ background: '#ffffff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0, 36, 106, 0.04)', zIndex: 1, borderBottom: 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, paddingTop: 10 }}>
                <Title level={4} style={{ margin: 0, fontFamily: "'Manrope', sans-serif", letterSpacing: '-0.02em' }}>{page.title}</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>{page.subtitle}</Text>
            </div>

            <Dropdown menu={userMenuProps} placement="bottomRight" arrow>
                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 8, transition: 'background 0.2s' }} className="topbar-user-dropdown">
                    <Avatar style={{ backgroundColor: isVendor ? '#5c3800' : '#00246a' }}>{user?.fullName?.[0] || (isVendor ? 'V' : 'A')}</Avatar>
                    <Text strong>{user?.fullName || (isVendor ? 'Vendor' : 'Admin')}</Text>
                </div>
            </Dropdown>
        </Header>
    )
}
