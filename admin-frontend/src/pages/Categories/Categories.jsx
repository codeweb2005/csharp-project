import { useState } from 'react'
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react'
import './Categories.css'

const initialCats = [
    { id: 1, icon: '🍜', name: 'Quán ăn', nameEn: 'Restaurant', color: '#FF6B35', poiCount: 1, active: true, sort: 1 },
    { id: 2, icon: '🦪', name: 'Hải sản & Ốc', nameEn: 'Seafood & Snails', color: '#2EC4B6', poiCount: 4, active: true, sort: 2 },
    { id: 3, icon: '🍻', name: 'Quán nhậu', nameEn: 'Bar & Grill', color: '#E71D36', poiCount: 1, active: true, sort: 3 },
    { id: 4, icon: '🧋', name: 'Đồ uống', nameEn: 'Drinks', color: '#FF9F1C', poiCount: 1, active: true, sort: 4 },
    { id: 5, icon: '🍰', name: 'Tráng miệng', nameEn: 'Dessert', color: '#CB997E', poiCount: 1, active: true, sort: 5 },
    { id: 6, icon: '🍲', name: 'Lẩu', nameEn: 'Hot Pot', color: '#6A4C93', poiCount: 1, active: true, sort: 6 },
    { id: 7, icon: '🔥', name: 'Nướng & BBQ', nameEn: 'BBQ & Grill', color: '#F25C54', poiCount: 1, active: true, sort: 7 },
]

export default function Categories() {
    const [cats] = useState(initialCats)
    const [editing, setEditing] = useState(null)

    return (
        <div className="cats-page animate-fadeIn">
            <div className="cats-header">
                <div className="cats-count">{cats.length} danh mục</div>
                <button className="btn btn-primary">
                    <Plus size={16} /> Thêm danh mục
                </button>
            </div>

            <div className="cats-layout">
                {/* Card Grid */}
                <div className="cats-grid">
                    {cats.map(cat => (
                        <div
                            key={cat.id}
                            className={`cat-card ${editing?.id === cat.id ? 'selected' : ''}`}
                            onClick={() => setEditing(cat)}
                        >
                            <div className="cat-card-accent" style={{ background: cat.color }} />
                            <div className="cat-card-body">
                                <div className="cat-icon">{cat.icon}</div>
                                <div className="cat-names">
                                    <span className="cat-name-vi">{cat.name}</span>
                                    <span className="cat-name-en">{cat.nameEn}</span>
                                </div>
                                <div className="cat-meta">
                                    <div className="cat-color-dot" style={{ background: cat.color }} />
                                    <span className="cat-poi-count">{cat.poiCount} POI</span>
                                    <span className={`badge ${cat.active ? 'badge-success' : 'badge-danger'}`}>
                                        {cat.active ? 'Active' : 'Off'}
                                    </span>
                                </div>
                            </div>
                            <div className="cat-card-actions">
                                <button className="btn-ghost" title="Sửa" onClick={e => { e.stopPropagation(); setEditing(cat) }}>
                                    <Edit2 size={14} />
                                </button>
                                <button className="btn-ghost btn-ghost-danger" title="Xóa" onClick={e => e.stopPropagation()}>
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
                            <h3>Sửa danh mục</h3>
                            <button className="btn-ghost" onClick={() => setEditing(null)}><X size={18} /></button>
                        </div>

                        <div className="cat-edit-preview">
                            <span className="cat-edit-icon">{editing.icon}</span>
                        </div>

                        <div className="cat-edit-form">
                            <div className="form-group">
                                <label className="form-label">Emoji Icon</label>
                                <input className="form-input" defaultValue={editing.icon} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Màu sắc</label>
                                <div className="cat-color-input">
                                    <input type="color" defaultValue={editing.color} className="cat-color-picker" />
                                    <input className="form-input" defaultValue={editing.color} style={{ flex: 1 }} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Thứ tự</label>
                                <input className="form-input" type="number" defaultValue={editing.sort} />
                            </div>

                            <div className="cat-edit-divider" />
                            <h4 className="cat-edit-section-title">Tên đa ngôn ngữ</h4>

                            {[
                                { flag: '🇻🇳', label: 'Tiếng Việt', value: editing.name },
                                { flag: '🇬🇧', label: 'English', value: editing.nameEn },
                                { flag: '🇨🇳', label: '中文', value: '' },
                                { flag: '🇯🇵', label: '日本語', value: '' },
                                { flag: '🇰🇷', label: '한국어', value: '' },
                            ].map((lang, i) => (
                                <div className="form-group" key={i}>
                                    <label className="form-label">{lang.flag} {lang.label}</label>
                                    <input className="form-input" defaultValue={lang.value} placeholder={`Nhập tên ${lang.label}...`} />
                                </div>
                            ))}

                            <div className="cat-edit-actions">
                                <button className="btn btn-primary w-full">
                                    <Save size={16} /> Lưu thay đổi
                                </button>
                                <button className="btn btn-secondary w-full" onClick={() => setEditing(null)}>Hủy</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
