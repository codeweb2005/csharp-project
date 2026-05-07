import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Avatar, Dropdown } from 'antd'
import { LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import useCurrentUser from '../../hooks/useCurrentUser.js'

const pageTitles = {
  '/dashboard':  { title: 'Dashboard',         subtitle: 'System overview' },
  '/pois':       { title: 'Points of Interest', subtitle: 'Food locations on Vĩnh Khánh' },
  '/categories': { title: 'Categories',         subtitle: 'Manage shop categories' },
  '/audio':      { title: 'Audio & Media',      subtitle: 'Narrations and images' },
  '/analytics':  { title: 'Analytics',          subtitle: 'Visit data analysis' },
  '/monitor':    { title: 'Live Monitor',       subtitle: 'Real-time tourist tracking' },
  '/users':      { title: 'Users',              subtitle: 'Manage system accounts' },
  '/offline':    { title: 'Offline Packages',   subtitle: 'Mobile download packages' },

}

export default function TopBar() {
  const location = useLocation()
  const navigate  = useNavigate()
  const { user, logout } = useAuth()
  const { isVendor }     = useCurrentUser()

  const page      = pageTitles[location.pathname] || { title: 'VK Food Tour', subtitle: '' }
  const roleLabel = isVendor ? 'Vendor' : 'Admin'
  const initial   = user?.fullName?.[0] || (isVendor ? 'V' : 'A')

  useEffect(() => { document.title = `${page.title} — VK Admin` }, [page.title])

  const handleLogout = () => { logout(); navigate('/login') }

  const menuItems = [{
    key: 'logout', label: 'Logout', icon: <LogOut size={14}/>,
    danger: true, onClick: handleLogout,
  }]

  return (
    <header style={{
      height: 56,
      background: '#FFFFFF',
      borderBottom: '1px solid #EEEEEE',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      flexShrink: 0,
      zIndex: 10,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      {/* Page title */}
      <div>
        <div style={{
          fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 15,
          color: '#1A1A1A', letterSpacing: '-0.02em', lineHeight: 1.2,
        }}>{page.title}</div>
        {page.subtitle && (
          <div style={{ fontSize: 11, color: '#999', marginTop: 1 }}>{page.subtitle}</div>
        )}
      </div>

      {/* User menu */}
      <Dropdown menu={{ items: menuItems }} placement="bottomRight">
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 10px 5px 5px',
            background: '#F8F8F8',
            border: '1px solid #EEEEEE',
            borderRadius: 10, cursor: 'pointer',
            transition: 'all 0.18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background='#F0F0F0'; e.currentTarget.style.borderColor='#DDD'; }}
          onMouseLeave={e => { e.currentTarget.style.background='#F8F8F8'; e.currentTarget.style.borderColor='#EEEEEE'; }}
        >
          <Avatar
            size={26}
            style={{
              background: 'linear-gradient(135deg, #C92127, #A81B21)',
              fontSize: 11, fontWeight: 700,
            }}
          >{initial}</Avatar>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', lineHeight: 1.2 }}>
              {user?.fullName || (isVendor ? 'Vendor' : 'Admin')}
            </div>
            <div style={{ fontSize: 10, color: '#999' }}>{roleLabel}</div>
          </div>
          <ChevronDown size={13} style={{ color: '#CCC', marginLeft: 2 }}/>
        </div>
      </Dropdown>
    </header>
  )
}
