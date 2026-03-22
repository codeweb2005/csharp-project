/**
 * Categories — Admin page for managing POI categories.
 *
 * Wired to live API:
 *   GET    /api/v1/categories           → list all categories
 *   POST   /api/v1/categories           → create category
 *   PUT    /api/v1/categories/:id       → update category
 *   DELETE /api/v1/categories/:id       → delete category
 *   PATCH  /api/v1/categories/:id/toggle → toggle active status
 *
 * DTO shape (CategoryDto):
 *   { id, icon, color, sortOrder, isActive, poiCount, translations: [{ languageId, languageCode, flagEmoji, name }] }
 */

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Save, Loader, ToggleLeft, ToggleRight } from 'lucide-react'
import { categories as catsApi } from '../../api.js'
import './Categories.css'

const defaultForm = { icon: '📍', color: '#3b82f6', sortOrder: 0, isActive: true, translations: [] }

export default function Categories() {
    const [cats, setCats] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [editing, setEditing] = useState(null)         // null = closed, object = editing
    const [isCreating, setIsCreating] = useState(false)  // true = new category mode
    const [saveLoading, setSaveLoading] = useState(false)
    const [saveError, setSaveError] = useState('')

    // Edit form state
    const [form, setForm] = useState(defaultForm)

    async function fetchCategories() {
        setLoading(true)
        setError(null)
        try {
            const res = await catsApi.getAll()
            setCats(res.data ?? [])
        } catch (err) {
            setError('Không thể tải danh mục. Hãy kiểm tra backend.')
            console.error('[Categories] fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchCategories() }, [])

    function openEdit(cat) {
        setIsCreating(false)
        setEditing(cat)
        setForm({
            icon: cat.icon,
            color: cat.color,
            sortOrder: cat.sortOrder,
            isActive: cat.isActive,
            translations: cat.translations?.map(t => ({ ...t })) || [],
        })
        setSaveError('')
    }

    function openCreate() {
        setIsCreating(true)
        setEditing({})
        setForm({
            ...defaultForm,
            translations: [
                { languageId: 1, languageCode: 'vi', flagEmoji: '🇻🇳', name: '' },
                { languageId: 2, languageCode: 'en', flagEmoji: '🇬🇧', name: '' },
            ]
        })
        setSaveError('')
    }

    function closePanel() {
        setEditing(null)
        setIsCreating(false)
    }

    function updateTranslation(idx, value) {
        const updated = [...form.translations]
        updated[idx] = { ...updated[idx], name: value }
        setForm({ ...form, translations: updated })
    }

    async function handleSave() {
        setSaveLoading(true)
        setSaveError('')
        try {
            const payload = {
                icon: form.icon,
                color: form.color,
                sortOrder: Number(form.sortOrder),
                isActive: form.isActive,
                translations: form.translations.map(t => ({
                    languageId: t.languageId,
                    name: t.name,
                })),
            }

            if (isCreating) {
                await catsApi.create(payload)
            } else {
                await catsApi.update(editing.id, payload)
            }
            closePanel()
            fetchCategories()
        } catch (err) {
            setSaveError(err?.error?.message || 'Lỗi khi lưu danh mục.')
        } finally {
            setSaveLoading(false)
        }
    }

    async function handleDelete(cat) {
        if (!window.confirm(`Xóa danh mục "${cat.translations?.[0]?.name || cat.icon}"?\n\nTất cả POI thuộc danh mục này cần được chuyển trước.`)) return
        try {
            await catsApi.delete(cat.id)
            if (editing?.id === cat.id) closePanel()
            fetchCategories()
        } catch (err) {
            console.error('[Categories] delete failed:', err)
            alert(err?.error?.message || 'Không thể xóa danh mục.')
        }
    }

    async function handleToggle(cat) {
        try {
            await catsApi.toggle(cat.id)
            fetchCategories()
        } catch (err) {
            console.error('[Categories] toggle failed:', err)
        }
    }

    // Helper: get the Vietnamese name from translations
    function getName(cat, lang = 'vi') {
        const t = cat.translations?.find(t => t.languageCode === lang)
        return t?.name || cat.translations?.[0]?.name || '—'
    }

    if (loading) {
        return (
            <div className="cats-page animate-fadeIn" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
                <Loader size={28} className="spin" />
            </div>
        )
    }

    return (
        <div className="cats-page animate-fadeIn">
            {error && <div className="poi-error-banner">⚠️ {error}</div>}

            <div className="cats-header">
                <div className="cats-count">{cats.length} danh mục</div>
                <button className="btn btn-primary" onClick={openCreate}>
                    <Plus size={16} /> Thêm danh mục
                </button>
            </div>

            <div className="cats-layout">
                {/* Card Grid */}
                <div className="cats-grid">
                    {cats.map(cat => (
                        <div
                            key={cat.id}
                            className={`cat-card ${editing?.id === cat.id ? 'selected' : ''} ${!cat.isActive ? 'inactive-card' : ''}`}
                            onClick={() => openEdit(cat)}
                        >
                            <div className="cat-card-accent" style={{ background: cat.color }} />
                            <div className="cat-card-body">
                                <div className="cat-icon">{cat.icon}</div>
                                <div className="cat-names">
                                    <span className="cat-name-vi">{getName(cat, 'vi')}</span>
                                    <span className="cat-name-en">{getName(cat, 'en')}</span>
                                </div>
                                <div className="cat-meta">
                                    <div className="cat-color-dot" style={{ background: cat.color }} />
                                    <span className="cat-poi-count">{cat.poiCount ?? 0} POI</span>
                                    <span className={`badge ${cat.isActive ? 'badge-success' : 'badge-danger'}`}>
                                        {cat.isActive ? 'Active' : 'Off'}
                                    </span>
                                </div>
                            </div>
                            <div className="cat-card-actions">
                                <button className="btn-ghost" title="Toggle" onClick={e => { e.stopPropagation(); handleToggle(cat) }}>
                                    {cat.isActive ? <ToggleRight size={14} color="#22c55e" /> : <ToggleLeft size={14} />}
                                </button>
                                <button className="btn-ghost" title="Sửa" onClick={e => { e.stopPropagation(); openEdit(cat) }}>
                                    <Edit2 size={14} />
                                </button>
                                <button className="btn-ghost btn-ghost-danger" title="Xóa" onClick={e => { e.stopPropagation(); handleDelete(cat) }}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Edit Panel */}
                {editing && (
                    <div className="cat-edit-panel animate-slideIn">
                        <div className="cat-edit-header">
                            <h3>{isCreating ? 'Thêm danh mục mới' : 'Sửa danh mục'}</h3>
                            <button className="btn-ghost" onClick={closePanel}><X size={18} /></button>
                        </div>

                        <div className="cat-edit-preview">
                            <span className="cat-edit-icon">{form.icon}</span>
                        </div>

                        {saveError && <div className="login-error" style={{ margin: '0 0 12px', fontSize: 13 }}>⚠️ {saveError}</div>}

                        <div className="cat-edit-form">
                            <div className="form-group">
                                <label className="form-label">Emoji Icon</label>
                                <input
                                    className="form-input"
                                    value={form.icon}
                                    onChange={e => setForm({ ...form, icon: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Màu sắc</label>
                                <div className="cat-color-input">
                                    <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="cat-color-picker" />
                                    <input className="form-input" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ flex: 1 }} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Thứ tự</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    value={form.sortOrder}
                                    onChange={e => setForm({ ...form, sortOrder: e.target.value })}
                                />
                            </div>

                            <div className="cat-edit-divider" />
                            <h4 className="cat-edit-section-title">Tên đa ngôn ngữ</h4>

                            {form.translations.map((t, i) => (
                                <div className="form-group" key={i}>
                                    <label className="form-label">{t.flagEmoji || '🌐'} {t.languageCode?.toUpperCase() || `Lang ${t.languageId}`}</label>
                                    <input
                                        className="form-input"
                                        value={t.name}
                                        onChange={e => updateTranslation(i, e.target.value)}
                                        placeholder={`Nhập tên...`}
                                    />
                                </div>
                            ))}

                            <div className="cat-edit-actions">
                                <button className="btn btn-primary w-full" onClick={handleSave} disabled={saveLoading}>
                                    {saveLoading ? <Loader size={16} className="spin" /> : <Save size={16} />}
                                    {isCreating ? ' Tạo mới' : ' Lưu thay đổi'}
                                </button>
                                <button className="btn btn-secondary w-full" onClick={closePanel}>Hủy</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
