/**
 * POIList — Admin & Vendor page for managing Points of Interest
 *
 * Features (Admin):
 *  - Live search + category filter
 *  - Paginated table of POIs with status badges
 *  - Create / Edit via POIForm modal (with Google Maps coordinate picker)
 *  - Toggle active / featured status
 *  - Delete with confirmation
 *
 * Vendor mode (role = Vendor):
 *  - "Add POI" button hidden (Vendors cannot create POIs — Admin assigns them)
 *  - "Delete" button hidden (Vendors cannot delete their own POI)
 *  - "Toggle Featured" hidden (feature curation is an Admin responsibility)
 *  - Edit button still shown — Vendor edits are validated server-side (ownership guard)
 *  - The backend automatically scopes the POI list to the Vendor's own POI
 *    via the `vendorPoiId` JWT claim (no extra client-side filtering needed)
 *
 * Data flow:
 *  On mount → fetchPOIs() → GET /api/v1/pois (authenticated)
 *  On create/edit → POIForm modal → POST or PUT /api/v1/pois
 *  On toggle/delete → PATCH or DELETE /api/v1/pois/:id
 */

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Star, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { pois as poisApi, categories as catsApi } from '../../api.js'
import POIForm from '../../components/POIForm/POIForm.jsx'
import POIMiniMap from '../../components/POIMiniMap/POIMiniMap.jsx'
import useCurrentUser from '../../hooks/useCurrentUser.js'
import './POIList.css'

export default function POIList() {
    // ── Role context (vendor-mode UI) ───────────────────────────
    // NOTE: UI hiding is for UX only. The actual security enforcement is:
    //   • Backend POIService.UpdateAsync → 403 if Vendor edits a POI not theirs
    //   • Backend scopes GET /pois list via vendorPoiId JWT claim (future: add filter)
    const { isVendor } = useCurrentUser()

    // ── State ─────────────────────────────────────────────────────────────
    const [data, setData] = useState([])          // current page POI list
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Filtering
    const [search, setSearch]           = useState('')
    const [categoryFilter, setCategoryFilter] = useState('all')

    // Pagination
    const [page, setPage]   = useState(1)
    const [total, setTotal] = useState(0)
    const PAGE_SIZE = 15

    // Modal state
    const [showForm, setShowForm] = useState(false)
    const [editingPOI, setEditingPOI] = useState(null)  // null = create mode

    // Mini-map selection: highlighted row/pin
    const [selectedPoiId, setSelectedPoiId] = useState(null)

    // ── Data fetching ──────────────────────────────────────────────────

    const fetchData = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const result = await poisApi.getList({
                page,
                size: PAGE_SIZE,
                search: search || undefined,
                categoryId: categoryFilter !== 'all' ? Number(categoryFilter) : undefined,
            })
            setData(result.data?.items ?? [])
            setTotal(result.data?.pagination?.totalItems ?? 0)
        } catch (err) {
            setError('Failed to load POIs. Ensure the backend is running.')
            console.error('[POIList] fetch error:', err)
        } finally {
            setLoading(false)
        }
    }, [page, search, categoryFilter])

    useEffect(() => { fetchData() }, [fetchData])

    // Load categories once for the form dropdown and filter select
    useEffect(() => {
        catsApi.getAll()
            .then(res => setCategories(res.data ?? []))
            .catch(err => console.warn('[POIList] categories fetch failed:', err))
    }, [])

    // Reset to page 1 when filters change
    useEffect(() => { setPage(1) }, [search, categoryFilter])

    // ── Actions ────────────────────────────────────────────────────────

    async function handleToggleActive(id) {
        try {
            await poisApi.toggle(id)
            fetchData()
        } catch (err) {
            console.error('[POIList] toggle active failed:', err)
        }
    }

    async function handleToggleFeatured(id) {
        try {
            await poisApi.toggleFeatured(id)
            fetchData()
        } catch (err) {
            console.error('[POIList] toggle featured failed:', err)
        }
    }

    async function handleDelete(poi) {
        const confirmed = window.confirm(
            `Delete "${poi.name}"?\n\nThis will permanently remove the POI and all its audio/media files.`
        )
        if (!confirmed) return
        try {
            await poisApi.delete(poi.id)
            fetchData()
        } catch (err) {
            console.error('[POIList] delete failed:', err)
        }
    }

    function openCreate() {
        setEditingPOI(null)
        setShowForm(true)
    }

    async function openEdit(poiId) {
        try {
            // Load full detail for the form (list items don't have translations)
            const res = await poisApi.getDetail(poiId)
            setEditingPOI(res.data)
            setShowForm(true)
        } catch (err) {
            console.error('[POIList] load detail for edit failed:', err)
        }
    }

    function handleFormSaved() {
        setShowForm(false)
        fetchData()
    }

    // ── Render ─────────────────────────────────────────────────────────

    const totalPages = Math.ceil(total / PAGE_SIZE)

    return (
        <div className="poi-page animate-fadeIn">

            {/* Toolbar */}
            <div className="poi-toolbar">
                <div className="poi-search-wrap">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search by name…"
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
                    <option value="all">All categories</option>
                    {categories.map(c => (
                        <option key={c.id} value={c.id}>
                            {c.icon} {c.translations?.[0]?.name ?? `Category ${c.id}`}
                        </option>
                    ))}
                </select>

                {!isVendor && (
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={16} />
                        Add POI
                    </button>
                )}
            </div>

            {error && <div className="poi-error-banner">⚠️ {error}</div>}

            {/* Two-column layout: table + mini-map */}
            <div className="poi-layout">

                {/* Table column */}
                <div className="poi-table-col">
                <div className="card poi-table-card">
                {loading ? (
                    <div className="poi-loading">Loading…</div>
                ) : (
                    <table className="poi-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Category</th>
                                <th>Address</th>
                                <th>Rating</th>
                                <th>Visits</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                                        {/* Vendor: no "Add" link — they cannot create POIs */}
                                        No POIs found.
                                        {!isVendor && (
                                            <button className="btn-link" onClick={openCreate}> Add the first one?</button>
                                        )}
                                    </td>
                                </tr>
                            ) : data.map(poi => (
                                <tr
                                    key={poi.id}
                                    className={[
                                        !poi.isActive ? 'inactive-row' : '',
                                        selectedPoiId === poi.id ? 'selected-row' : ''
                                    ].filter(Boolean).join(' ')}
                                    onClick={() => setSelectedPoiId(poi.id === selectedPoiId ? null : poi.id)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td className="poi-id">{poi.id}</td>
                                    <td>
                                        <div className="poi-name-cell">
                                            <span className="poi-name">{poi.name}</span>
                                            {poi.isFeatured && (
                                                <span className="badge badge-warning">⭐ Featured</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span
                                            className="poi-cat-badge"
                                            style={{ borderColor: poi.categoryColor, color: poi.categoryColor }}
                                        >
                                            {poi.categoryIcon} {poi.categoryName}
                                        </span>
                                    </td>
                                    <td className="poi-addr">{poi.address}</td>
                                    <td>
                                        <div className="poi-rating">
                                            <Star size={14} fill="#f59e0b" color="#f59e0b" />
                                            <span>{poi.rating?.toFixed(1) ?? '—'}</span>
                                        </div>
                                    </td>
                                    <td className="poi-visits">{poi.totalVisits?.toLocaleString() ?? 0}</td>
                                    <td>
                                        <span className={`badge ${poi.isActive ? 'badge-success' : 'badge-danger'}`}>
                                            {poi.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td onClick={e => e.stopPropagation()}>
                                        <div className="poi-actions">
                                            {/* Toggle active — shown for all roles */}
                                            <button
                                                className="btn-ghost"
                                                title={poi.isActive ? 'Deactivate' : 'Activate'}
                                                onClick={() => handleToggleActive(poi.id)}
                                            >
                                                {poi.isActive
                                                    ? <ToggleRight size={16} color="#22c55e" />
                                                    : <ToggleLeft size={16} />}
                                            </button>

                                            {/*
                                              * Toggle featured — hidden for Vendors.
                                              * Featuring/unfeaturing a shop is an editorial decision
                                              * made by the platform's Admin, not the shop owner.
                                              */}
                                            {!isVendor && (
                                                <button
                                                    className="btn-ghost"
                                                    title="Toggle featured"
                                                    onClick={() => handleToggleFeatured(poi.id)}
                                                >
                                                    <Star
                                                        size={16}
                                                        fill={poi.isFeatured ? '#f59e0b' : 'none'}
                                                        color={poi.isFeatured ? '#f59e0b' : 'currentColor'}
                                                    />
                                                </button>
                                            )}

                                            {/* Edit — shown for all roles; server enforces ownership */}
                                            <button
                                                className="btn-ghost"
                                                title="Edit"
                                                onClick={() => openEdit(poi.id)}
                                            >
                                                <Edit2 size={16} />
                                            </button>

                                            {/*
                                              * Delete — hidden for Vendors.
                                              * A Vendor cannot delete their own shop; that would
                                              * remove them from the platform entirely. Only Admins
                                              * can delete or reassign POIs.
                                              */}
                                            {!isVendor && (
                                                <button
                                                    className="btn-ghost btn-ghost-danger"
                                                    title="Delete"
                                                    onClick={() => handleDelete(poi)}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                <div className="poi-pagination">
                    <span className="poi-pagination-info">
                        {total > 0
                            ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`
                            : 'No results'}
                    </span>
                    <div className="poi-pagination-btns">
                        <button
                            className="poi-page-btn"
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                        >«</button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button
                                key={p}
                                className={`poi-page-btn ${p === page ? 'active' : ''}`}
                                onClick={() => setPage(p)}
                            >{p}</button>
                        ))}
                        <button
                            className="poi-page-btn"
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                        >»</button>
                    </div>
                </div>
                </div>{/* end poi-table-card */}
                </div>{/* end poi-table-col */}

                {/* Mini-map column */}
                <div className="poi-map-col">
                    <POIMiniMap
                        pois={data}
                        selectedPoiId={selectedPoiId}
                        onSelectPoi={poi => setSelectedPoiId(poi.id === selectedPoiId ? null : poi.id)}
                    />
                </div>

            </div>{/* end poi-layout */}

            {/* POI Create / Edit Modal */}
            {showForm && (
                <POIForm
                    poi={editingPOI}
                    categories={categories}
                    onClose={() => setShowForm(false)}
                    onSaved={handleFormSaved}
                />
            )}
        </div>
    )
}
