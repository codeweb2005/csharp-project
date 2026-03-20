import { useState } from 'react'
import { Search, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Shield, User as UserIcon } from 'lucide-react'
import './Users.css'

const usersData = [
    { id: 1, name: 'Quản trị viên', email: 'admin@vinhkhanh.app', role: 'Admin', lang: '🇻🇳', lastLogin: 'Đang online', active: true, avatar: 'A' },
    { id: 2, name: 'Nguyễn Văn A', email: 'ocdao@gmail.com', role: 'Vendor', lang: '🇻🇳', lastLogin: '2 giờ trước', active: true, avatar: 'N', shop: 'Ốc Đào' },
    { id: 3, name: 'Trần Thị B', email: 'bahien@gmail.com', role: 'Vendor', lang: '🇻🇳', lastLogin: '1 ngày trước', active: true, avatar: 'T', shop: 'Bà Hiền' },
    { id: 4, name: 'Lê Văn C', email: 'longuong40@gmail.com', role: 'Vendor', lang: '🇻🇳', lastLogin: '3 ngày trước', active: true, avatar: 'L', shop: 'Lồng Uống 40' },
    { id: 5, name: 'Hana Tanaka', email: 'hana@test.com', role: 'Customer', lang: '🇯🇵', lastLogin: '3 giờ trước', active: true, avatar: 'H' },
    { id: 6, name: 'John Smith', email: 'john@test.com', role: 'Customer', lang: '🇬🇧', lastLogin: '5 giờ trước', active: true, avatar: 'J' },
    { id: 7, name: 'Phạm Minh', email: 'minh@test.com', role: 'Customer', lang: '🇻🇳', lastLogin: '1 tuần trước', active: false, avatar: 'P' },
]

const roleBadge = { Admin: 'badge-danger', Vendor: 'badge-purple', Customer: 'badge-primary' }
const roleIcon = { Admin: Shield, Vendor: UserIcon, Customer: UserIcon }

export default function Users() {
    const [tab, setTab] = useState('all')
    const [search, setSearch] = useState('')

    const filtered = usersData.filter(u => {
        if (tab === 'vendor' && u.role !== 'Vendor') return false
        if (tab === 'customer' && u.role !== 'Customer') return false
        if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.includes(search.toLowerCase())) return false
        return true
    })

    const counts = {
        all: usersData.length,
        vendor: usersData.filter(u => u.role === 'Vendor').length,
        customer: usersData.filter(u => u.role === 'Customer').length,
    }

    return (
        <div className="users-page animate-fadeIn">
            {/* Tabs */}
            <div className="users-tabs-row">
                <div className="users-tabs">
                    {[
                        { key: 'all', label: 'Tất cả' },
                        { key: 'vendor', label: 'Chủ quán' },
                        { key: 'customer', label: 'Khách hàng' },
                    ].map(t => (
                        <button
                            key={t.key}
                            className={`users-tab ${tab === t.key ? 'active' : ''}`}
                            onClick={() => setTab(t.key)}
                        >
                            {t.label} <span className="users-tab-count">{counts[t.key]}</span>
                        </button>
                    ))}
                </div>
                <button className="btn btn-primary">
                    <Plus size={16} /> Thêm người dùng
                </button>
            </div>

            {/* Search */}
            <div className="users-search-wrap">
                <Search size={16} />
                <input
                    type="text"
                    placeholder="Tìm theo tên, email..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="users-search"
                />
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>Người dùng</th>
                            <th>Email</th>
                            <th>Vai trò</th>
                            <th>Ngôn ngữ</th>
                            <th>Đăng nhập cuối</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(u => (
                            <tr key={u.id} className={!u.active ? 'inactive-row' : ''}>
                                <td>
                                    <div className="user-cell">
                                        <div className={`user-avatar ${u.role.toLowerCase()}`}>{u.avatar}</div>
                                        <div>
                                            <div className="user-name">{u.name}</div>
                                            {u.shop && <div className="user-shop">🏪 {u.shop}</div>}
                                        </div>
                                    </div>
                                </td>
                                <td className="user-email">{u.email}</td>
                                <td><span className={`badge ${roleBadge[u.role]}`}>{u.role}</span></td>
                                <td className="user-lang">{u.lang}</td>
                                <td className="user-login">
                                    {u.lastLogin === 'Đang online' ? (
                                        <span className="user-online">
                                            <span className="online-dot" /> {u.lastLogin}
                                        </span>
                                    ) : u.lastLogin}
                                </td>
                                <td>
                                    <button className={`toggle-btn ${u.active ? 'on' : 'off'}`}>
                                        {u.active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                    </button>
                                </td>
                                <td>
                                    <div className="user-actions">
                                        <button className="btn-ghost" title="Sửa"><Edit2 size={15} /></button>
                                        <button className="btn-ghost btn-ghost-danger" title="Xóa"><Trash2 size={15} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
