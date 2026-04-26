import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Avatar } from 'antd'
import {
  LayoutDashboard, MapPin, Tag as TagIcon, Volume2,
  Users, Package, Settings, LogOut,
  ChevronLeft, ChevronRight, Radio, Globe
} from 'lucide-react'

import useCurrentUser from '../../hooks/useCurrentUser.js'
import { useAuth } from '../../context/AuthContext.jsx'

const allMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard',         path: '/dashboard'  },
  { icon: MapPin,          label: 'Points of Interest', path: '/pois'       },
  { icon: TagIcon,         label: 'Categories',         path: '/categories' },
  { icon: Volume2,         label: 'Audio & Media',      path: '/audio'      },
  { icon: Radio,           label: 'Live Monitor',       path: '/monitor',  adminOnly: true, live: true },
  { icon: Users,           label: 'Users',              path: '/users',    adminOnly: true },
  { icon: Globe,           label: 'Languages',          path: '/languages', adminOnly: true },
  { icon: Package,         label: 'Offline Packages',   path: '/offline',  adminOnly: true },
  { icon: Settings,        label: 'Settings',           path: '/settings', adminOnly: true },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location  = useLocation()
  const navigate  = useNavigate()
  const { name, isVendor } = useCurrentUser()
  const { logout }         = useAuth()

  const visibleItems = allMenuItems.filter(item => !(item.adminOnly && isVendor))
  const handleLogout = () => { logout(); navigate('/login') }

  const avatarInitial = name ? name.charAt(0).toUpperCase() : 'A'
  const roleLabel     = isVendor ? 'Vendor' : 'Administrator'

  let selectedPath = '/dashboard'
  for (const item of visibleItems) {
    if (location.pathname === item.path ||
        (item.path !== '/dashboard' && location.pathname.startsWith(item.path))) {
      selectedPath = item.path; break
    }
  }

  const sidebarW = collapsed ? 64 : 240

  return (
    <div style={{
      width: sidebarW, flexShrink: 0, height: '100vh',
      display: 'flex', flexDirection: 'column',
      background: '#FFFFFF',
      borderRight: '1px solid #EEEEEE',
      boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
      transition: 'width 0.25s cubic-bezier(0.25,0.8,0.25,1)',
      overflow: 'hidden', position: 'relative',
    }}>

      {/* ─── Logo ─── */}
      <div style={{
        padding: collapsed ? '16px 0' : '16px 14px',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        borderBottom: '1px solid #EEEEEE',
        flexShrink: 0, minHeight: 58,
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg, #C92127, #A81B21)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, flexShrink: 0,
              boxShadow: '0 2px 8px rgba(201,33,39,0.3)',
            }}>🍜</div>
            <div>
              <div style={{
                fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 13,
                color: '#1A1A1A', letterSpacing: '-0.02em', lineHeight: 1.2,
              }}>VK Food Tour</div>
              <div style={{ fontSize: 10, color: '#999', fontWeight: 500 }}>
                {isVendor ? 'Vendor Portal' : 'Admin Panel'}
              </div>
            </div>
          </div>
        )}
        {collapsed && (
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, #C92127, #A81B21)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15,
          }}>🍜</div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            width: 22, height: 22, borderRadius: 6,
            background: '#F5F5F5', border: '1px solid #E8E8E8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#999', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background='#EEEEEE'; e.currentTarget.style.color='#555'; }}
          onMouseLeave={e => { e.currentTarget.style.background='#F5F5F5'; e.currentTarget.style.color='#999'; }}
        >
          {collapsed ? <ChevronRight size={12}/> : <ChevronLeft size={12}/>}
        </button>
      </div>

      {/* ─── Nav Items ─── */}
      <nav style={{ flex: 1, overflow: 'hidden auto', padding: '8px' }}>
        {visibleItems.map(item => {
          const Icon   = item.icon
          const active = selectedPath === item.path

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center',
                gap: collapsed ? 0 : 10,
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '9px 0' : '9px 10px',
                marginBottom: 2,
                borderRadius: 10, border: 'none', cursor: 'pointer',
                background: active ? 'rgba(201,33,39,0.08)' : 'transparent',
                color:      active ? '#C92127' : '#666666',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 13, fontWeight: active ? 600 : 400,
                transition: 'all 0.18s',
                whiteSpace: 'nowrap', overflow: 'hidden', position: 'relative',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = '#F5F5F5'
                  e.currentTarget.style.color = '#C92127'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#666666'
                }
              }}
            >
              {active && (
                <span style={{
                  position: 'absolute', left: 0, top: 5, bottom: 5,
                  width: 3, borderRadius: '0 2px 2px 0',
                  background: '#C92127',
                }}/>
              )}
              <Icon size={17} style={{ flexShrink: 0 }}/>
              {!collapsed && (
                <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
              )}
              {!collapsed && item.live && (
                <span className="live-dot"/>
              )}
            </button>
          )
        })}
      </nav>

      {/* ─── User footer ─── */}
      <div style={{
        padding: collapsed ? '12px 8px' : '12px',
        borderTop: '1px solid #EEEEEE',
        flexShrink: 0,
      }}>
        {!collapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar
              size={30}
              style={{
                background: 'linear-gradient(135deg, #C92127, #A81B21)',
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}
            >{avatarInitial}</Avatar>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: '#1A1A1A',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{name || 'Admin User'}</div>
              <div style={{ fontSize: 11, color: '#999' }}>{roleLabel}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              style={{
                width: 26, height: 26, borderRadius: 7,
                background: 'rgba(201,33,39,0.08)',
                border: '1px solid rgba(201,33,39,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#C92127', cursor: 'pointer', transition: 'all 0.18s', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(201,33,39,0.16)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(201,33,39,0.08)'; }}
            >
              <LogOut size={13}/>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Avatar
              size={30}
              style={{
                background: 'linear-gradient(135deg, #C92127, #A81B21)',
                fontSize: 12, fontWeight: 700,
              }}
            >{avatarInitial}</Avatar>
            <button
              onClick={handleLogout}
              title="Logout"
              style={{
                width: 26, height: 26, borderRadius: 7,
                background: 'rgba(201,33,39,0.08)',
                border: '1px solid rgba(201,33,39,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#C92127', cursor: 'pointer',
              }}
            >
              <LogOut size={13}/>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
