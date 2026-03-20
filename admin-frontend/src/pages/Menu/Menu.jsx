import { useState } from 'react'
import { Plus, Edit2, Trash2, X, Save, Star, Upload } from 'lucide-react'
import './Menu.css'

const poisMenu = [
    { id: 1, name: 'Ốc Đào Vĩnh Khánh' },
    { id: 2, name: 'Ốc Bà Hiền' },
    { id: 3, name: 'Lồng Uống 40' },
]

const menuItems = [
    { id: 1, nameVi: 'Ốc hương nướng mỡ hành', nameEn: 'Grilled Horn Snails', descVi: 'Ốc hương tươi nướng với mỡ hành phi thơm', price: 85000, signature: true, available: true },
    { id: 2, nameVi: 'Ốc len xào dừa', nameEn: 'Coconut-Sautéed Snails', descVi: 'Ốc len xào với nước cốt dừa béo ngậy', price: 75000, signature: true, available: true },
    { id: 3, nameVi: 'Sò điệp nướng phô mai', nameEn: 'Baked Scallops with Cheese', descVi: 'Sò điệp tươi nướng phô mai tan chảy', price: 95000, signature: true, available: true },
    { id: 4, nameVi: 'Nghêu hấp sả', nameEn: 'Lemongrass Steamed Clams', descVi: 'Nghêu hấp với sả và lá chanh', price: 65000, signature: false, available: true },
    { id: 5, nameVi: 'Ốc mỡ xào tỏi', nameEn: 'Garlic Butter Snails', descVi: 'Ốc mỡ béo xào tỏi phi giòn', price: 55000, signature: false, available: true },
    { id: 6, nameVi: 'Cua rang me', nameEn: 'Tamarind Crab', descVi: 'Cua biển rang với sốt me chua ngọt', price: 120000, signature: false, available: true },
    { id: 7, nameVi: 'Sò huyết nướng', nameEn: 'Grilled Blood Cockles', descVi: 'Sò huyết nướng mỡ hành', price: 70000, signature: false, available: true },
    { id: 8, nameVi: 'Ốc bươu luộc sả', nameEn: 'Boiled Apple Snails', descVi: 'Ốc bươu luộc nguyên con với sả', price: 45000, signature: false, available: true },
    { id: 9, nameVi: 'Tôm sú nướng muối ớt', nameEn: 'Salt & Chili Tiger Prawns', descVi: 'Tôm sú size lớn nướng muối ớt', price: 150000, signature: false, available: false },
    { id: 10, nameVi: 'Mực nướng sa tế', nameEn: 'Satay Grilled Squid', descVi: 'Mực tươi nướng sốt sa tế cay', price: 80000, signature: false, available: true },
]

function formatPrice(p) {
    return p.toLocaleString('vi-VN') + ' ₫'
}

export default function MenuPage() {
    const [selectedPOI, setSelectedPOI] = useState(1)
    const [editing, setEditing] = useState(null)

    return (
        <div className="menu-page animate-fadeIn">
            {/* Toolbar */}
            <div className="menu-toolbar">
                <select className="poi-filter-select" value={selectedPOI} onChange={e => setSelectedPOI(+e.target.value)}>
                    {poisMenu.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="menu-count">
                    {menuItems.length} món • {menuItems.filter(m => m.signature).length} đặc trưng
                </div>
                <div style={{ flex: 1 }} />
                <button className="btn btn-primary">
                    <Plus size={16} /> Thêm món mới
                </button>
            </div>

            <div className="menu-layout">
                {/* Card Grid */}
                <div className="menu-grid">
                    {menuItems.map(item => (
                        <div
                            key={item.id}
                            className={`menu-card ${!item.available ? 'sold-out' : ''} ${editing?.id === item.id ? 'selected' : ''}`}
                            onClick={() => setEditing(item)}
                        >
                            <div className="menu-card-img">
                                <span className="menu-card-emoji">🍽️</span>
                                {item.signature && <span className="menu-sig-badge">⭐ Đặc trưng</span>}
                                {!item.available && <div className="menu-sold-overlay">Hết hàng</div>}
                            </div>
                            <div className="menu-card-body">
                                <h4 className="menu-card-name">{item.nameVi}</h4>
                                <p className="menu-card-name-en">{item.nameEn}</p>
                                <p className="menu-card-desc">{item.descVi}</p>
                                <div className="menu-card-bottom">
                                    <span className="menu-card-price">{formatPrice(item.price)}</span>
                                    <span className={`badge ${item.available ? 'badge-success' : 'badge-danger'}`}>
                                        {item.available ? 'Còn bán' : 'Hết hàng'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Edit Panel */}
                {editing && (
                    <div className="menu-edit-panel card animate-slideIn">
                        <div className="menu-edit-header">
                            <h3>Sửa món ăn</h3>
                            <button className="btn-ghost" onClick={() => setEditing(null)}><X size={18} /></button>
                        </div>

                        <div className="menu-edit-img-upload">
                            <Upload size={20} />
                            <span>Upload ảnh món</span>
                        </div>

                        <div className="menu-lang-tabs">
                            <button className="menu-lang-tab active">🇻🇳 VI</button>
                            <button className="menu-lang-tab">🇬🇧 EN</button>
                        </div>

                        <div className="menu-edit-form">
                            <div className="form-group">
                                <label className="form-label">Tên món</label>
                                <input className="form-input" defaultValue={editing.nameVi} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mô tả</label>
                                <textarea className="form-input" rows={3} defaultValue={editing.descVi} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Giá (VNĐ)</label>
                                <input className="form-input" type="number" defaultValue={editing.price} />
                            </div>

                            <div className="menu-toggles">
                                <label className="menu-toggle-item">
                                    <span>⭐ Món đặc trưng</span>
                                    <label className="switch">
                                        <input type="checkbox" defaultChecked={editing.signature} />
                                        <span className="switch-slider" />
                                    </label>
                                </label>
                                <label className="menu-toggle-item">
                                    <span>🟢 Còn bán</span>
                                    <label className="switch">
                                        <input type="checkbox" defaultChecked={editing.available} />
                                        <span className="switch-slider" />
                                    </label>
                                </label>
                            </div>

                            <div className="menu-edit-actions">
                                <button className="btn btn-primary w-full"><Save size={16} /> Lưu</button>
                                <button className="btn btn-secondary w-full" onClick={() => setEditing(null)}>Hủy</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
