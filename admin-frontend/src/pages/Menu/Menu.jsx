/**
 * Menu — Admin page for managing POI menu items (food dishes).
 *
 * Wired to live API:
 *   GET    /api/v1/menu/poi/:poiId           → list menu items for a POI
 *   POST   /api/v1/menu/poi/:poiId           → create menu item
 *   PUT    /api/v1/menu/:id                  → update menu item
 *   DELETE /api/v1/menu/:id                  → delete menu item
 *   PATCH  /api/v1/menu/:id/toggle-available → toggle availability
 *   PATCH  /api/v1/menu/:id/toggle-signature → toggle signature dish
 *
 * Also loads POIs for the dropdown:
 *   GET    /api/v1/pois                      → POI list (for selector)
 *
 * DTO shape (MenuItemDto):
 *   { id, poiId, price, imageUrl, isSignature, isAvailable, sortOrder, name, description, translations }
 */

import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, X, Save, Star, Upload, Loader } from 'lucide-react'
import { menu as menuApi, pois as poisApi } from '../../api.js'
import './Menu.css'

function formatPrice(p) {
    return Number(p).toLocaleString('vi-VN') + ' ₫'
}

export default function MenuPage() {
    const [poiOptions, setPoiOptions] = useState([])
    const [selectedPOI, setSelectedPOI] = useState(null)
    const [menuItems, setMenuItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Edit panel
    const [editing, setEditing] = useState(null)
    const [isCreating, setIsCreating] = useState(false)
    const [form, setForm] = useState({})
    const [saveLoading, setSaveLoading] = useState(false)
    const [saveError, setSaveError] = useState('')
    const [langTab, setLangTab] = useState(0)  // index into translations

    // Load POI options on mount
    useEffect(() => {
        async function loadPOIs() {
            try {
                const res = await poisApi.getList({ page: 1, size: 100 })
                const items = res.data?.items ?? []
                setPoiOptions(items)
                if (items.length > 0) setSelectedPOI(items[0].id)
            } catch (err) {
                console.error('[Menu] load POIs failed:', err)
            }
        }
        loadPOIs()
    }, [])

    // Load menu items when POI changes
    const fetchMenu = useCallback(async () => {
        if (!selectedPOI) return
        setLoading(true)
        setError(null)
        try {
            const res = await menuApi.getByPOI(selectedPOI)
            setMenuItems(res.data ?? [])
        } catch (err) {
            setError('Không thể tải menu.')
            console.error('[Menu] fetch error:', err)
        } finally {
            setLoading(false)
        }
    }, [selectedPOI])

    useEffect(() => { fetchMenu() }, [fetchMenu])

    function openEdit(item) {
        setIsCreating(false)
        setEditing(item)
        setForm({
            price: item.price,
            isSignature: item.isSignature,
            isAvailable: item.isAvailable,
            sortOrder: item.sortOrder,
            translations: item.translations?.map(t => ({ ...t })) || [
                { languageId: 1, name: item.name || '', description: item.description || '' }
            ],
        })
        setLangTab(0)
        setSaveError('')
    }

    function openCreate() {
        setIsCreating(true)
        setEditing({})
        setForm({
            price: 0,
            isSignature: false,
            isAvailable: true,
            sortOrder: menuItems.length + 1,
            translations: [
                { languageId: 1, name: '', description: '' },
                { languageId: 2, name: '', description: '' },
            ],
        })
        setLangTab(0)
        setSaveError('')
    }

    function closePanel() {
        setEditing(null)
        setIsCreating(false)
    }

    function updateTranslation(field, value) {
        const updated = [...form.translations]
        updated[langTab] = { ...updated[langTab], [field]: value }
        setForm({ ...form, translations: updated })
    }

    async function handleSave() {
        setSaveLoading(true)
        setSaveError('')
        try {
            const payload = {
                price: Number(form.price),
                isSignature: form.isSignature,
                isAvailable: form.isAvailable,
                sortOrder: Number(form.sortOrder),
                translations: form.translations.map(t => ({
                    languageId: t.languageId,
                    name: t.name,
                    description: t.description || null,
                })),
            }

            if (isCreating) {
                await menuApi.create(selectedPOI, payload)
            } else {
                await menuApi.update(editing.id, payload)
            }
            closePanel()
            fetchMenu()
        } catch (err) {
            setSaveError(err?.error?.message || 'Lỗi khi lưu món ăn.')
        } finally {
            setSaveLoading(false)
        }
    }

    async function handleDelete(item) {
        const name = item.name || item.translations?.[0]?.name || 'món này'
        if (!window.confirm(`Xóa "${name}"?\n\nHành động này không thể hoàn tác.`)) return
        try {
            await menuApi.delete(item.id)
            if (editing?.id === item.id) closePanel()
            fetchMenu()
        } catch (err) {
            console.error('[Menu] delete failed:', err)
        }
    }

    async function handleToggleAvailable(item) {
        try {
            await menuApi.toggleAvailable(item.id)
            fetchMenu()
        } catch (err) {
            console.error('[Menu] toggle available failed:', err)
        }
    }

    async function handleToggleSignature(item) {
        try {
            await menuApi.toggleSignature(item.id)
            fetchMenu()
        } catch (err) {
            console.error('[Menu] toggle signature failed:', err)
        }
    }

    const sigCount = menuItems.filter(m => m.isSignature).length

    return (
        <div className="menu-page animate-fadeIn">
            {/* Toolbar */}
            <div className="menu-toolbar">
                <select
                    className="poi-filter-select"
                    value={selectedPOI || ''}
                    onChange={e => { setSelectedPOI(Number(e.target.value)); closePanel() }}
                >
                    {poiOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="menu-count">
                    {menuItems.length} món • {sigCount} đặc trưng
                </div>
                <div style={{ flex: 1 }} />
                <button className="btn btn-primary" onClick={openCreate} disabled={!selectedPOI}>
                    <Plus size={16} /> Thêm món mới
                </button>
            </div>

            {error && <div className="poi-error-banner">⚠️ {error}</div>}

            <div className="menu-layout">
                {/* Card Grid */}
                <div className="menu-grid">
                    {loading ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                            <Loader size={24} className="spin" />
                        </div>
                    ) : menuItems.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                            Chưa có món nào.
                            <button className="btn-link" onClick={openCreate}> Thêm món đầu tiên?</button>
                        </div>
                    ) : menuItems.map(item => {
                        const name = item.translations?.[0]?.name || item.name || '—'
                        const nameEn = item.translations?.[1]?.name || ''
                        const desc = item.translations?.[0]?.description || item.description || ''
                        return (
                            <div
                                key={item.id}
                                className={`menu-card ${!item.isAvailable ? 'sold-out' : ''} ${editing?.id === item.id ? 'selected' : ''}`}
                                onClick={() => openEdit(item)}
                            >
                                <div className="menu-card-img">
                                    {item.imageUrl
                                        ? <img src={item.imageUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <span className="menu-card-emoji">🍽️</span>
                                    }
                                    {item.isSignature && <span className="menu-sig-badge">⭐ Đặc trưng</span>}
                                    {!item.isAvailable && <div className="menu-sold-overlay">Hết hàng</div>}
                                </div>
                                <div className="menu-card-body">
                                    <h4 className="menu-card-name">{name}</h4>
                                    {nameEn && <p className="menu-card-name-en">{nameEn}</p>}
                                    <p className="menu-card-desc">{desc}</p>
                                    <div className="menu-card-bottom">
                                        <span className="menu-card-price">{formatPrice(item.price)}</span>
                                        <span className={`badge ${item.isAvailable ? 'badge-success' : 'badge-danger'}`}>
                                            {item.isAvailable ? 'Còn bán' : 'Hết hàng'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Edit Panel */}
                {editing && (
                    <div className="menu-edit-panel card animate-slideIn">
                        <div className="menu-edit-header">
                            <h3>{isCreating ? 'Thêm món mới' : 'Sửa món ăn'}</h3>
                            <button className="btn-ghost" onClick={closePanel}><X size={18} /></button>
                        </div>

                        <div className="menu-edit-img-upload">
                            <Upload size={20} />
                            <span>Upload ảnh món</span>
                        </div>

                        {saveError && <div className="login-error" style={{ margin: '0 0 12px', fontSize: 13 }}>⚠️ {saveError}</div>}

                        {/* Language tabs */}
                        <div className="menu-lang-tabs">
                            {form.translations?.map((t, i) => (
                                <button
                                    key={i}
                                    className={`menu-lang-tab ${langTab === i ? 'active' : ''}`}
                                    onClick={() => setLangTab(i)}
                                >
                                    {t.languageId === 1 ? '🇻🇳 VI' : t.languageId === 2 ? '🇬🇧 EN' : `Lang ${t.languageId}`}
                                </button>
                            ))}
                        </div>

                        <div className="menu-edit-form">
                            <div className="form-group">
                                <label className="form-label">Tên món</label>
                                <input
                                    className="form-input"
                                    value={form.translations?.[langTab]?.name || ''}
                                    onChange={e => updateTranslation('name', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mô tả</label>
                                <textarea
                                    className="form-input"
                                    rows={3}
                                    value={form.translations?.[langTab]?.description || ''}
                                    onChange={e => updateTranslation('description', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Giá (VNĐ)</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    value={form.price}
                                    onChange={e => setForm({ ...form, price: e.target.value })}
                                />
                            </div>

                            <div className="menu-toggles">
                                <label className="menu-toggle-item">
                                    <span>⭐ Món đặc trưng</span>
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={form.isSignature}
                                            onChange={e => setForm({ ...form, isSignature: e.target.checked })}
                                        />
                                        <span className="switch-slider" />
                                    </label>
                                </label>
                                <label className="menu-toggle-item">
                                    <span>🟢 Còn bán</span>
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={form.isAvailable}
                                            onChange={e => setForm({ ...form, isAvailable: e.target.checked })}
                                        />
                                        <span className="switch-slider" />
                                    </label>
                                </label>
                            </div>

                            <div className="menu-edit-actions">
                                <button className="btn btn-primary w-full" onClick={handleSave} disabled={saveLoading}>
                                    {saveLoading ? <Loader size={16} className="spin" /> : <Save size={16} />}
                                    {isCreating ? ' Tạo mới' : ' Lưu'}
                                </button>
                                <button className="btn btn-secondary w-full" onClick={closePanel}>Hủy</button>
                                {!isCreating && (
                                    <button
                                        className="btn btn-secondary w-full"
                                        style={{ color: '#ef4444', borderColor: '#ef4444' }}
                                        onClick={() => handleDelete(editing)}
                                    >
                                        <Trash2 size={14} /> Xóa món này
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
