import { useState } from 'react'
import { Search, Plus, Filter, Star, MoreVertical, Edit2, Trash2, Eye } from 'lucide-react'
import './POIList.css'

const pois = [
    { id: 1, name: 'Ốc Đào Vĩnh Khánh', cat: '🦪 Hải sản & Ốc', catColor: '#2EC4B6', addr: '149 Vĩnh Khánh, P.10, Q.4', rating: 4.5, visits: 450, active: true, featured: true },
    { id: 2, name: 'Ốc Bà Hiền', cat: '🦪 Hải sản & Ốc', catColor: '#2EC4B6', addr: '115 Vĩnh Khánh, P.10, Q.4', rating: 4.3, visits: 380, active: true, featured: true },
    { id: 3, name: 'Lồng Uống 40', cat: '🍻 Quán nhậu', catColor: '#E71D36', addr: '40 Vĩnh Khánh, P.10, Q.4', rating: 4.2, visits: 310, active: true, featured: false },
    { id: 4, name: 'Ốc Oanh', cat: '🦪 Hải sản & Ốc', catColor: '#2EC4B6', addr: '152 Vĩnh Khánh, P.10, Q.4', rating: 4.4, visits: 295, active: true, featured: true },
    { id: 5, name: 'Hải Sản Năm Sao', cat: '🦪 Hải sản & Ốc', catColor: '#2EC4B6', addr: '98 Vĩnh Khánh, P.10, Q.4', rating: 4.1, visits: 260, active: true, featured: false },
    { id: 6, name: 'Bún Riêu Cô Ba', cat: '🍜 Quán ăn', catColor: '#FF6B35', addr: '56 Vĩnh Khánh, P.10, Q.4', rating: 4.6, visits: 290, active: true, featured: false },
    { id: 7, name: 'Lẩu Dê Vĩnh Khánh', cat: '🍲 Lẩu', catColor: '#6A4C93', addr: '125 Vĩnh Khánh, P.10, Q.4', rating: 4.0, visits: 180, active: true, featured: false },
    { id: 8, name: 'Nướng Ngói Vĩnh Khánh', cat: '🔥 Nướng & BBQ', catColor: '#F25C54', addr: '75 Vĩnh Khánh, P.10, Q.4', rating: 4.15, visits: 155, active: true, featured: false },
    { id: 9, name: 'Chè Bà Tư', cat: '🍰 Tráng miệng', catColor: '#CB997E', addr: '110 Vĩnh Khánh, P.10, Q.4', rating: 4.7, visits: 270, active: true, featured: false },
    { id: 10, name: 'Trà Sữa Vĩnh Khánh', cat: '🧋 Đồ uống', catColor: '#FF9F1C', addr: '30 Vĩnh Khánh, P.10, Q.4', rating: 4.25, visits: 120, active: false, featured: false },
]

export default function POIList() {
    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('all')

    const filtered = pois.filter(p => {
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
        if (categoryFilter !== 'all' && !p.cat.includes(categoryFilter)) return false
        return true
    })

    return (
        <div className="poi-page animate-fadeIn">
            {/* Toolbar */}
            <div className="poi-toolbar">
                <div className="poi-search-wrap">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Tìm theo tên quán..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="poi-search"
                    />
                </div>
                <select
                    className="poi-filter-select"
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                >
                    <option value="all">Tất cả danh mục</option>
                    <option value="Hải sản">🦪 Hải sản & Ốc</option>
                    <option value="Quán nhậu">🍻 Quán nhậu</option>
                    <option value="Quán ăn">🍜 Quán ăn</option>
                    <option value="Tráng miệng">🍰 Tráng miệng</option>
                    <option value="Đồ uống">🧋 Đồ uống</option>
                    <option value="Lẩu">🍲 Lẩu</option>
                    <option value="Nướng">🔥 Nướng & BBQ</option>
                </select>
                <button className="btn btn-primary">
                    <Plus size={16} />
                    Thêm POI mới
                </button>
            </div>

            {/* Table */}
            <div className="card poi-table-card">
                <table className="poi-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Tên quán</th>
                            <th>Danh mục</th>
                            <th>Địa chỉ</th>
                            <th>Rating</th>
                            <th>Lượt ghé</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(poi => (
                            <tr key={poi.id} className={!poi.active ? 'inactive-row' : ''}>
                                <td className="poi-id">{poi.id}</td>
                                <td>
                                    <div className="poi-name-cell">
                                        <span className="poi-name">{poi.name}</span>
                                        {poi.featured && <span className="badge badge-warning">⭐ Nổi bật</span>}
                                    </div>
                                </td>
                                <td>
                                    <span className="poi-cat-badge" style={{ borderColor: poi.catColor, color: poi.catColor }}>
                                        {poi.cat}
                                    </span>
                                </td>
                                <td className="poi-addr">{poi.addr}</td>
                                <td>
                                    <div className="poi-rating">
                                        <Star size={14} fill="#f59e0b" color="#f59e0b" />
                                        <span>{poi.rating}</span>
                                    </div>
                                </td>
                                <td className="poi-visits">{poi.visits.toLocaleString()}</td>
                                <td>
                                    <span className={`badge ${poi.active ? 'badge-success' : 'badge-danger'}`}>
                                        {poi.active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td>
                                    <div className="poi-actions">
                                        <button className="btn-ghost" title="Xem"><Eye size={16} /></button>
                                        <button className="btn-ghost" title="Sửa"><Edit2 size={16} /></button>
                                        <button className="btn-ghost btn-ghost-danger" title="Xóa"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="poi-pagination">
                    <span className="poi-pagination-info">
                        Hiển thị {filtered.length} / {pois.length} kết quả
                    </span>
                    <div className="poi-pagination-btns">
                        <button className="poi-page-btn" disabled>«</button>
                        <button className="poi-page-btn active">1</button>
                        <button className="poi-page-btn">»</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
