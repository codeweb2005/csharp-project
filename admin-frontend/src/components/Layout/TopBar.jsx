import { Search, Bell, Globe, LogOut } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './TopBar.css'

const pageTitles = {
    '/dashboard': { title: 'Dashboard', subtitle: 'Tổng quan hệ thống' },
    '/pois': { title: 'Quản lý POI', subtitle: 'Điểm ăn uống trên phố Vĩnh Khánh' },
    '/categories': { title: 'Danh mục', subtitle: 'Quản lý danh mục loại quán' },
    '/audio': { title: 'Audio & Media', subtitle: 'Quản lý file thuyết minh và hình ảnh' },
    '/menu': { title: 'Thực đơn', subtitle: 'Quản lý thực đơn các quán' },
    '/users': { title: 'Người dùng', subtitle: 'Quản lý tài khoản hệ thống' },
    '/analytics': { title: 'Thống kê', subtitle: 'Phân tích dữ liệu ghé thăm' },
    '/offline': { title: 'Gói Offline', subtitle: 'Quản lý gói dữ liệu tải về cho mobile' },
    '/settings': { title: 'Cài đặt', subtitle: 'Cấu hình hệ thống' },
}

export default function TopBar() {
    const location = useLocation()
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const page = pageTitles[location.pathname] || { title: 'VK Food Tour', subtitle: '' }

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <header className="topbar">
            <div className="topbar-left">
                <div>
                    <h1 className="topbar-title">{page.title}</h1>
                    <p className="topbar-subtitle">{page.subtitle}</p>
                </div>
            </div>

            <div className="topbar-right">
                <div className="topbar-search">
                    <Search size={16} />
                    <input type="text" placeholder="Tìm kiếm..." className="topbar-search-input" />
                </div>

                <button className="topbar-icon-btn" title="Ngôn ngữ">
                    <Globe size={18} />
                </button>

                <button className="topbar-icon-btn topbar-bell" title="Thông báo">
                    <Bell size={18} />
                    <span className="topbar-bell-dot" />
                </button>

                <div className="topbar-user">
                    <div className="topbar-user-avatar">{user?.fullName?.[0] || 'A'}</div>
                    <span className="topbar-user-name">{user?.fullName || 'Admin'}</span>
                </div>

                <button className="topbar-icon-btn" title="Đăng xuất" onClick={handleLogout}>
                    <LogOut size={18} />
                </button>
            </div>
        </header>
    )
}
