/**
 * Users — Admin page for managing users (Admin, Vendor, Customer).
 *
 * Wired to live API:
 *   GET    /api/v1/users           → paginated user list with role/search filter
 *   POST   /api/v1/users           → create new user
 *   PUT    /api/v1/users/:id       → update user
 *   DELETE /api/v1/users/:id       → delete user
 *   PATCH  /api/v1/users/:id/toggle → toggle active status
 *   POST   /api/v1/users/:id/reset-password → reset password
 *
 * DTO shape (UserDto):
 *   { id, email, fullName, role, phone, avatarUrl, isActive, lastLoginAt, shopName }
 */

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Shield, User as UserIcon, X, Save, KeyRound, Loader } from 'lucide-react'
import { users as usersApi } from '../../api.js'
import './Users.css'

const roleBadge = { Admin: 'badge-danger', Vendor: 'badge-purple', Customer: 'badge-primary' }

function timeAgo(dateStr) {
    if (!dateStr) return '—'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Đang online'
    if (mins < 60) return `${mins} phút trước`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} giờ trước`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} ngày trước`
    return new Date(dateStr).toLocaleDateString('vi-VN')
}

export default function Users() {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Filters
    const [tab, setTab] = useState('all')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const PAGE_SIZE = 15

    // Create/Edit modal
    const [showForm, setShowForm] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [formData, setFormData] = useState({ email: '', fullName: '', password: '', role: 'Customer', phone: '', poiId: '' })
    const [formLoading, setFormLoading] = useState(false)
    const [formError, setFormError] = useState('')

    // Counts per role (from paginated response, approximate)
    const [counts, setCounts] = useState({ all: 0, vendor: 0, customer: 0 })

    const roleFilter = tab === 'vendor' ? 'Vendor' : tab === 'customer' ? 'Customer' : undefined

    const fetchUsers = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await usersApi.getList({ page, size: PAGE_SIZE, search: search || undefined, role: roleFilter })
            setData(res.data?.items ?? [])
            setTotal(res.data?.pagination?.totalItems ?? 0)
        } catch (err) {
            setError('Không thể tải danh sách người dùng. Hãy kiểm tra backend.')
            console.error('[Users] fetch error:', err)
        } finally {
            setLoading(false)
        }
    }, [page, search, roleFilter])

    // Load counts once on mount
    useEffect(() => {
        async function loadCounts() {
            try {
                const [allRes, vendorRes, customerRes] = await Promise.all([
                    usersApi.getList({ page: 1, size: 1 }),
                    usersApi.getList({ page: 1, size: 1, role: 'Vendor' }),
                    usersApi.getList({ page: 1, size: 1, role: 'Customer' }),
                ])
                setCounts({
                    all: allRes.data?.pagination?.totalItems ?? 0,
                    vendor: vendorRes.data?.pagination?.totalItems ?? 0,
                    customer: customerRes.data?.pagination?.totalItems ?? 0,
                })
            } catch { /* counts are non-critical */ }
        }
        loadCounts()
    }, [])

    useEffect(() => { fetchUsers() }, [fetchUsers])
    useEffect(() => { setPage(1) }, [tab, search])

    // ── Actions ─────────────────────────────────────────────────────

    async function handleToggle(id) {
        try {
            await usersApi.toggle(id)
            fetchUsers()
        } catch (err) {
            console.error('[Users] toggle failed:', err)
        }
    }

    async function handleDelete(user) {
        if (!window.confirm(`Xóa "${user.fullName}"?\n\nHành động này không thể hoàn tác.`)) return
        try {
            await usersApi.delete(user.id)
            fetchUsers()
        } catch (err) {
            console.error('[Users] delete failed:', err)
        }
    }

    async function handleResetPassword(user) {
        if (!window.confirm(`Reset mật khẩu cho "${user.fullName}"?\n\nMật khẩu mới sẽ được gửi qua email.`)) return
        try {
            await usersApi.resetPassword(user.id)
            alert('Mật khẩu đã được reset thành công.')
        } catch (err) {
            console.error('[Users] reset password failed:', err)
            alert('Không thể reset mật khẩu.')
        }
    }

    function openCreate() {
        setEditingUser(null)
        setFormData({ email: '', fullName: '', password: '', role: 'Customer', phone: '', poiId: '' })
        setFormError('')
        setShowForm(true)
    }

    function openEdit(user) {
        setEditingUser(user)
        setFormData({ email: user.email, fullName: user.fullName, password: '', role: user.role, phone: user.phone || '', poiId: '' })
        setFormError('')
        setShowForm(true)
    }

    async function handleFormSubmit(e) {
        e.preventDefault()
        setFormLoading(true)
        setFormError('')
        try {
            if (editingUser) {
                await usersApi.update(editingUser.id, {
                    fullName: formData.fullName,
                    phone: formData.phone || null,
                })
            } else {
                await usersApi.create({
                    email: formData.email,
                    fullName: formData.fullName,
                    password: formData.password,
                    role: formData.role,
                    phone: formData.phone || null,
                    poiId: formData.poiId ? Number(formData.poiId) : null,
                })
            }
            setShowForm(false)
            fetchUsers()
        } catch (err) {
            setFormError(err?.error?.message || 'Lỗi khi lưu người dùng.')
        } finally {
            setFormLoading(false)
        }
    }

    // ── Render ──────────────────────────────────────────────────────

    const totalPages = Math.ceil(total / PAGE_SIZE)

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
                <button className="btn btn-primary" onClick={openCreate}>
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

            {/* Error */}
            {error && <div className="poi-error-banner">⚠️ {error}</div>}

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                        <Loader size={24} className="spin" />
                    </div>
                ) : (
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>Người dùng</th>
                                <th>Email</th>
                                <th>Vai trò</th>
                                <th>Điện thoại</th>
                                <th>Đăng nhập cuối</th>
                                <th>Trạng thái</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                                        Không tìm thấy người dùng.
                                    </td>
                                </tr>
                            ) : data.map(u => (
                                <tr key={u.id} className={!u.isActive ? 'inactive-row' : ''}>
                                    <td>
                                        <div className="user-cell">
                                            <div className={`user-avatar ${u.role.toLowerCase()}`}>
                                                {(u.fullName || u.email).charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="user-name">{u.fullName || '—'}</div>
                                                {u.shopName && <div className="user-shop">🏪 {u.shopName}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="user-email">{u.email}</td>
                                    <td><span className={`badge ${roleBadge[u.role] || 'badge-primary'}`}>{u.role}</span></td>
                                    <td className="user-lang">{u.phone || '—'}</td>
                                    <td className="user-login">
                                        {timeAgo(u.lastLoginAt) === 'Đang online' ? (
                                            <span className="user-online">
                                                <span className="online-dot" /> Đang online
                                            </span>
                                        ) : timeAgo(u.lastLoginAt)}
                                    </td>
                                    <td>
                                        <button
                                            className={`toggle-btn ${u.isActive ? 'on' : 'off'}`}
                                            onClick={() => handleToggle(u.id)}
                                        >
                                            {u.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                        </button>
                                    </td>
                                    <td>
                                        <div className="user-actions">
                                            <button className="btn-ghost" title="Sửa" onClick={() => openEdit(u)}><Edit2 size={15} /></button>
                                            <button className="btn-ghost" title="Reset mật khẩu" onClick={() => handleResetPassword(u)}><KeyRound size={15} /></button>
                                            <button className="btn-ghost btn-ghost-danger" title="Xóa" onClick={() => handleDelete(u)}><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="poi-pagination">
                        <span className="poi-pagination-info">
                            {total > 0
                                ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`
                                : 'No results'}
                        </span>
                        <div className="poi-pagination-btns">
                            <button className="poi-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>«</button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button key={p} className={`poi-page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                            ))}
                            <button className="poi-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>»</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create / Edit Modal */}
            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingUser ? 'Sửa người dùng' : 'Thêm người dùng mới'}</h3>
                            <button className="btn-ghost" onClick={() => setShowForm(false)}><X size={18} /></button>
                        </div>

                        {formError && <div className="login-error" style={{ margin: '0 0 16px' }}>⚠️ {formError}</div>}

                        <form onSubmit={handleFormSubmit}>
                            {!editingUser && (
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input
                                        className="form-input"
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Họ tên</label>
                                <input
                                    className="form-input"
                                    required
                                    value={formData.fullName}
                                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                />
                            </div>

                            {!editingUser && (
                                <div className="form-group">
                                    <label className="form-label">Mật khẩu</label>
                                    <input
                                        className="form-input"
                                        type="password"
                                        required
                                        minLength={8}
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            )}

                            {!editingUser && (
                                <div className="form-group">
                                    <label className="form-label">Vai trò</label>
                                    <select
                                        className="form-input"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="Customer">Khách hàng</option>
                                        <option value="Vendor">Chủ quán</option>
                                        <option value="Admin">Quản trị viên</option>
                                    </select>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Số điện thoại</label>
                                <input
                                    className="form-input"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={formLoading}>
                                    {formLoading ? <Loader size={16} className="spin" /> : <Save size={16} />}
                                    {editingUser ? ' Cập nhật' : ' Tạo mới'}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Hủy</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
