import { useState, useEffect, useCallback } from 'react'
import { PlusOutlined, StarFilled, StarOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import { Card, Table, Popconfirm, Select, Input, Button, Switch, Space, Tooltip, Typography, Tag, message } from 'antd'
import { pois as poisApi, categories as catsApi } from '../../api.js'
import POIForm from '../../components/POIForm/POIForm.jsx'
import POIMiniMap from '../../components/POIMiniMap/POIMiniMap.jsx'
import useCurrentUser from '../../hooks/useCurrentUser.js'

const { Text } = Typography

export default function POIList() {
    const { isVendor, vendorPOIIds } = useCurrentUser()

    const [data, setData] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)

    // Filtering
    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('all')

    // Pagination
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const PAGE_SIZE = 15

    // Modal state
    const [showForm, setShowForm] = useState(false)
    const [editingPOI, setEditingPOI] = useState(null)

    // Mini-map selection
    const [selectedPoiId, setSelectedPoiId] = useState(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
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
            message.error('Failed to load POIs. Ensure the backend is running.')
            console.error('[POIList] fetch error:', err)
        } finally {
            setLoading(false)
        }
    }, [page, search, categoryFilter])

    useEffect(() => { fetchData() }, [fetchData])

    useEffect(() => {
        catsApi.getAll()
            .then(res => setCategories(res.data ?? []))
            .catch(err => console.warn('[POIList] categories fetch failed:', err))
    }, [])

    useEffect(() => { setPage(1) }, [search, categoryFilter])

    // Vendor: load their POI names for the selector
    const [vendorPOIOptions, setVendorPOIOptions] = useState([])
    useEffect(() => {
        if (!isVendor || vendorPOIIds.length === 0) return
        Promise.allSettled(
            vendorPOIIds.map(id => poisApi.getDetail(id).then(r => ({ id, name: r.data?.name || `POI #${id}` })))
        ).then(results => {
            const opts = results.filter(r => r.status === 'fulfilled').map(r => r.value)
            setVendorPOIOptions(opts)
        })
    }, [isVendor, vendorPOIIds.join(',')])

    const handleToggleActive = async (id) => {
        try {
            await poisApi.toggle(id)
            fetchData()
        } catch (err) {
            console.error('[POIList] toggle active failed:', err)
            message.error('Error updating status')
        }
    }

    const handleToggleFeatured = async (id) => {
        try {
            await poisApi.toggleFeatured(id)
            fetchData()
        } catch (err) {
            console.error('[POIList] toggle featured failed:', err)
            message.error('Error updating featured status')
        }
    }

    const handleDelete = async (poi) => {
        try {
            await poisApi.delete(poi.id)
            fetchData()
            message.success('POI deleted')
            if (selectedPoiId === poi.id) setSelectedPoiId(null)
        } catch (err) {
            console.error('[POIList] delete failed:', err)
            message.error('Error deleting POI')
        }
    }

    const openCreate = () => {
        setEditingPOI(null)
        setShowForm(true)
    }

    const openEdit = async (poiId) => {
        try {
            const res = await poisApi.getDetail(poiId)
            setEditingPOI(res.data)
            setShowForm(true)
        } catch (err) {
            console.error('[POIList] load detail for edit failed:', err)
            message.error('Error loading POI details')
        }
    }

    const handleFormSaved = () => {
        setShowForm(false)
        fetchData()
    }

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 60,
        },
        {
            title: 'Name',
            key: 'name',
            render: (_, record) => (
                <Space orientation="vertical" size={0}>
                    <Text strong>{record.name}</Text>
                    {record.isFeatured && <Tag color="gold" icon={<StarFilled />}>Featured</Tag>}
                </Space>
            )
        },
        {
            title: 'Category',
            key: 'category',
            render: (_, record) => (
                <Tag color={record.categoryColor} style={{ color: record.categoryColor, background: 'transparent', borderColor: record.categoryColor }}>
                    {record.categoryIcon} {record.categoryName}
                </Tag>
            )
        },
        {
            title: 'Address',
            dataIndex: 'address',
            key: 'address',
            ellipsis: true,
        },
        {
            title: 'Rating',
            key: 'rating',
            render: (_, record) => (
                <Space>
                    <StarFilled style={{ color: '#f59e0b' }} />
                    <Text>{record.rating?.toFixed(1) ?? '—'}</Text>
                </Space>
            )
        },
        {
            title: 'Visits',
            dataIndex: 'totalVisits',
            key: 'visits',
            render: (visits) => visits?.toLocaleString() ?? 0
        },
        ...(!isVendor ? [{
            title: 'Status',
            key: 'status',
            render: (_, record) => (
                <Switch
                    checked={record.isActive}
                    onChange={() => handleToggleActive(record.id)}
                    checkedChildren="Active"
                    unCheckedChildren="Inactive"
                />
            )
        }] : []),
        {
            title: 'Actions',
            key: 'actions',
            width: isVendor ? 100 : 150,
            render: (_, record) => (
                <Space size="small" onClick={e => e.stopPropagation()}>
                    {!isVendor && (
                        <Tooltip title={record.isFeatured ? 'Unfeature' : 'Feature'}>
                            <Button
                                type="text"
                                icon={record.isFeatured ? <StarFilled style={{ color: '#f59e0b' }} /> : <StarOutlined />}
                                onClick={() => handleToggleFeatured(record.id)}
                            />
                        </Tooltip>
                    )}
                    <Tooltip title="Edit">
                        <Button type="text" icon={<EditOutlined style={{ color: '#C92127' }} />} onClick={() => openEdit(record.id)} />
                    </Tooltip>
                    <Popconfirm
                        title={`Delete "${record.name}"?`}
                        description="This action will permanently delete this POI and all its audio/media."
                        onConfirm={() => handleDelete(record)}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Delete">
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            )
        }
    ]
    return (
        <div style={{ padding: '0 0 24px 0', animation: 'fadeIn 0.4s ease-out' }}>
            {isVendor ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <Text strong style={{ fontSize: 16 }}>My Shop — POIs</Text>
                        {vendorPOIIds.length > 0 && (
                            <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>
                                {vendorPOIIds.length} POI{vendorPOIIds.length > 1 ? 's' : ''}
                            </Text>
                        )}
                    </div>
                    <Space wrap>
                        {vendorPOIOptions.length > 0 ? (
                            <Select
                                placeholder="Select a POI to edit..."
                                style={{ minWidth: 220 }}
                                showSearch
                                optionFilterProp="label"
                                options={vendorPOIOptions.map(p => ({ label: p.name, value: p.id }))}
                                onChange={id => openEdit(id)}
                                value={null}
                            />
                        ) : (
                            <Text type="secondary">No POIs assigned</Text>
                        )}
                    </Space>
                </div>
            ) : null}

            {/* ── VENDOR: compact full-width table ── */}
            {isVendor && (
                <Card variant="borderless" styles={{ body: { padding: 0 } }} style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <Table
                        columns={columns}
                        dataSource={data}
                        rowKey="id"
                        loading={loading}
                        pagination={{
                            current: page, pageSize: PAGE_SIZE, total,
                            onChange: p => setPage(p),
                            showSizeChanger: false,
                            showTotal: (t, r) => `${r[0]}–${r[1]} of ${t} POIs`
                        }}
                        onRow={record => ({ onClick: () => openEdit(record.id), style: { cursor: 'pointer' } })}
                        locale={{ emptyText: <div style={{ padding: '40px 0', color: '#CCC' }}>No POIs assigned to you</div> }}
                    />
                </Card>
            )}

            {/* ── ADMIN: Map LEFT + Card list RIGHT ── */}
            {!isVendor && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 360px',
                    gap: 14,
                    height: 'calc(100vh - 128px)',
                }}>

                    {/* MAP — left, full height */}
                    <div style={{
                        borderRadius: 14, overflow: 'hidden',
                        border: '1px solid #EEEEEE',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                    }}>
                        <POIMiniMap
                            pois={data}
                            selectedPoiId={selectedPoiId}
                            onSelectPoi={poi => setSelectedPoiId(poi.id === selectedPoiId ? null : poi.id)}
                        />
                    </div>

                    {/* RIGHT PANEL */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>

                        {/* ── Toolbar ── */}
                        <div style={{
                            background: '#FFFFFF', border: '1px solid #EEEEEE',
                            borderRadius: 12, padding: '12px 14px',
                            display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0,
                        }}>
                            <Input
                                placeholder="Search by name…"
                                prefix={<SearchOutlined style={{ color: '#CCC' }}/>}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                allowClear size="middle"
                            />
                            <Select
                                value={categoryFilter}
                                onChange={setCategoryFilter}
                                style={{ width: '100%' }}
                                options={[
                                    { value: 'all', label: 'All categories' },
                                    ...categories.map(c => ({
                                        value: c.id,
                                        label: `${c.icon} ${c.translations?.[0]?.name ?? `Category ${c.id}`}`
                                    }))
                                ]}
                            />
                            <Button
                                type="primary" icon={<PlusOutlined/>} onClick={openCreate} block
                                style={{ fontWeight: 600 }}
                            >
                                Add POI
                            </Button>
                        </div>

                        {/* ── POI Card List ── */}
                        <div style={{
                            flex: 1, overflowY: 'auto', overflowX: 'hidden',
                            display: 'flex', flexDirection: 'column', gap: 8,
                            paddingRight: 2,
                        }}>
                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '48px 0', color: '#CCC' }}>Loading…</div>
                            ) : data.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                                    <div style={{ color: '#CCC', marginBottom: 8 }}>No POIs found.</div>
                                    <Button type="link" onClick={openCreate} style={{ color: '#C92127' }}>Add one?</Button>
                                </div>
                            ) : data.map(poi => {
                                const isSelected = selectedPoiId === poi.id
                                return (
                                    <div
                                        key={poi.id}
                                        onClick={() => setSelectedPoiId(poi.id === selectedPoiId ? null : poi.id)}
                                        style={{
                                            background: isSelected ? 'rgba(201,33,39,0.03)' : '#FFFFFF',
                                            border: `1px solid ${isSelected ? '#C92127' : '#EEEEEE'}`,
                                            borderLeft: `3px solid ${isSelected ? '#C92127' : 'transparent'}`,
                                            borderRadius: 10,
                                            padding: '10px 14px',
                                            cursor: 'pointer',
                                            transition: 'border-color 0.15s, background 0.15s',
                                            opacity: poi.isActive ? 1 : 0.55,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {/* Row 1: Name + Status toggle */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                                            <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
                                                <div style={{
                                                    fontSize: 13, fontWeight: 600, color: '#1A1A1A',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {poi.name}
                                                </div>
                                                {poi.isFeatured && (
                                                    <span style={{
                                                        fontSize: 10, color: '#D97706', fontWeight: 600,
                                                        display: 'flex', alignItems: 'center', gap: 3, marginTop: 2,
                                                    }}>
                                                        <StarFilled style={{ fontSize: 9 }}/> Featured
                                                    </span>
                                                )}
                                            </div>
                                            <div onClick={e => e.stopPropagation()}>
                                                <Switch
                                                    size="small"
                                                    checked={poi.isActive}
                                                    onChange={() => handleToggleActive(poi.id)}
                                                />
                                            </div>
                                        </div>

                                        {/* Row 2: Category + Rating + Visits */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                                            <span style={{
                                                fontSize: 11, padding: '2px 7px', borderRadius: 5,
                                                border: `1px solid ${poi.categoryColor || '#DDD'}`,
                                                color: poi.categoryColor || '#666',
                                                lineHeight: '18px',
                                            }}>
                                                {poi.categoryIcon} {poi.categoryName}
                                            </span>
                                            <span style={{ fontSize: 11, color: '#999', display: 'flex', alignItems: 'center', gap: 3 }}>
                                                <StarFilled style={{ color: '#f59e0b', fontSize: 10 }}/>
                                                {poi.rating?.toFixed(1) ?? '—'}
                                            </span>
                                            <span style={{ fontSize: 11, color: '#BBB' }}>
                                                {poi.totalVisits?.toLocaleString() ?? 0} visits
                                            </span>
                                        </div>

                                        {/* Row 3: Actions */}
                                        <div
                                            style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <Tooltip title={poi.isFeatured ? 'Unfeature' : 'Feature'}>
                                                <Button type="text" size="small"
                                                    icon={poi.isFeatured
                                                        ? <StarFilled style={{ color: '#f59e0b', fontSize: 13 }}/>
                                                        : <StarOutlined style={{ fontSize: 13, color: '#CCC' }}/>
                                                    }
                                                    onClick={() => handleToggleFeatured(poi.id)}
                                                />
                                            </Tooltip>
                                            <Tooltip title="Edit">
                                                <Button type="text" size="small"
                                                    icon={<EditOutlined style={{ color: '#C92127', fontSize: 13 }}/>}
                                                    onClick={() => openEdit(poi.id)}
                                                />
                                            </Tooltip>
                                            <Popconfirm
                                                title={`Delete "${poi.name}"?`}
                                                description="This will delete the POI and all its audio/media."
                                                onConfirm={() => handleDelete(poi)}
                                                okText="Delete" cancelText="Cancel"
                                                okButtonProps={{ danger: true }}
                                            >
                                                <Tooltip title="Delete">
                                                    <Button type="text" size="small" danger
                                                        icon={<DeleteOutlined style={{ fontSize: 13 }}/>}
                                                    />
                                                </Tooltip>
                                            </Popconfirm>
                                        </div>
                                    </div>
                                )
                            })}

                            {/* Pagination */}
                            {total > PAGE_SIZE && (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '8px 0', flexShrink: 0 }}>
                                    <Button size="small" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</Button>
                                    <span style={{ fontSize: 12, color: '#999' }}>
                                        {page} / {Math.ceil(total / PAGE_SIZE)}
                                    </span>
                                    <Button size="small" disabled={page >= Math.ceil(total / PAGE_SIZE)} onClick={() => setPage(p => p + 1)}>›</Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
