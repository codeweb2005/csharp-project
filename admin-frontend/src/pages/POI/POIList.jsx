import { useState, useEffect, useCallback } from 'react'
import { PlusOutlined, StarFilled, StarOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import { Card, Table, Popconfirm, Select, Input, Button, Switch, Space, Tooltip, Row, Col, Typography, Tag, message } from 'antd'
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
            message.error('Lỗi khi thay đổi trạng thái')
        }
    }

    const handleToggleFeatured = async (id) => {
        try {
            await poisApi.toggleFeatured(id)
            fetchData()
        } catch (err) {
            console.error('[POIList] toggle featured failed:', err)
            message.error('Lỗi khi thay đổi nổi bật')
        }
    }

    const handleDelete = async (poi) => {
        try {
            await poisApi.delete(poi.id)
            fetchData()
            message.success('Đã xóa POI')
            if (selectedPoiId === poi.id) setSelectedPoiId(null)
        } catch (err) {
            console.error('[POIList] delete failed:', err)
            message.error('Lỗi khi xóa POI')
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
            message.error('Lỗi khi tải thông tin POI')
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
                <Space direction="vertical" size={0}>
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
                        <Button type="text" icon={<EditOutlined style={{ color: '#00246a' }} />} onClick={() => openEdit(record.id)} />
                    </Tooltip>
                    {!isVendor && (
                        <Popconfirm
                            title={`Delete "${record.name}"?`}
                            description="This will permanently remove the POI and all its audio/media files."
                            onConfirm={() => handleDelete(record)}
                            okText="Delete"
                            cancelText="Cancel"
                            okButtonProps={{ danger: true }}
                        >
                            <Tooltip title="Delete">
                                <Button type="text" danger icon={<DeleteOutlined />} />
                            </Tooltip>
                        </Popconfirm>
                    )}
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
                                placeholder="Chọn POI để chỉnh sửa..."
                                style={{ minWidth: 220 }}
                                showSearch
                                optionFilterProp="label"
                                options={vendorPOIOptions.map(p => ({ label: p.name, value: p.id }))}
                                onChange={id => openEdit(id)}
                                value={null}  // always reset after selection
                            />
                        ) : (
                            <Text type="secondary">Chưa được gán POI nào</Text>
                        )}
                    </Space>
                </div>
            ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                    <Space align="center" size="middle" wrap>
                        <Input
                            placeholder="Search by name…"
                            prefix={<SearchOutlined style={{ color: '#cbd5e1' }} />}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ width: 250, borderRadius: 20 }}
                            allowClear
                        />
                        <Select
                            value={categoryFilter}
                            onChange={setCategoryFilter}
                            style={{ width: 200 }}
                            options={[
                                { value: 'all', label: 'All categories' },
                                ...categories.map(c => ({
                                    value: c.id,
                                    label: `${c.icon} ${c.translations?.[0]?.name ?? `Category ${c.id}`}`
                                }))
                            ]}
                        />
                    </Space>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                        Add POI
                    </Button>
                </div>
            )}

            {/* Vendor: compact full-width table; Admin: table + mini-map side-by-side */}
            {isVendor ? (
                <Card bordered={false} bodyStyle={{ padding: 0 }} style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <Table
                        columns={columns}
                        dataSource={data}
                        rowKey="id"
                        loading={loading}
                        pagination={{
                            current: page,
                            pageSize: PAGE_SIZE,
                            total: total,
                            onChange: (p) => setPage(p),
                            showSizeChanger: false,
                            showTotal: (t, range) => `Hiển thị ${range[0]}–${range[1]} trong ${t} POI`
                        }}
                        onRow={(record) => ({
                            onClick: () => openEdit(record.id),
                            style: { cursor: 'pointer' }
                        })}
                        locale={{ emptyText: <div style={{ padding: '40px 0', color: '#94a3b8' }}>Chưa có POI nào được gán cho bạn</div> }}
                    />
                </Card>
            ) : (
                <Row gutter={[24, 24]}>
                    <Col xs={24} xl={16}>
                        <Card bordered={false} bodyStyle={{ padding: 0 }} style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <Table
                                columns={columns}
                                dataSource={data}
                                rowKey="id"
                                loading={loading}
                                pagination={{
                                    current: page,
                                    pageSize: PAGE_SIZE,
                                    total: total,
                                    onChange: (p) => setPage(p),
                                    showSizeChanger: false,
                                    showTotal: (t, range) => `Showing ${range[0]}–${range[1]} of ${t}`
                                }}
                                rowClassName={record => {
                                    let classes = []
                                    if (!record.isActive) classes.push('ant-table-row-disabled')
                                    if (selectedPoiId === record.id) classes.push('ant-table-row-selected')
                                    return classes.join(' ')
                                }}
                                onRow={(record) => ({
                                    onClick: () => setSelectedPoiId(record.id === selectedPoiId ? null : record.id),
                                    style: { cursor: 'pointer' }
                                })}
                                locale={{
                                    emptyText: (
                                        <Space direction="vertical" align="center">
                                            No POIs found.
                                            <Button type="link" onClick={openCreate}>Add the first one?</Button>
                                        </Space>
                                    )
                                }}
                            />
                        </Card>
                    </Col>

                    <Col xs={24} xl={8}>
                        <div style={{
                            height: 'calc(100vh - 180px)',
                            position: 'sticky',
                            top: 24,
                            borderRadius: 12,
                            overflow: 'hidden',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                            background: '#fff'
                        }}>
                            <POIMiniMap
                                pois={data}
                                selectedPoiId={selectedPoiId}
                                onSelectPoi={poi => setSelectedPoiId(poi.id === selectedPoiId ? null : poi.id)}
                            />
                        </div>
                    </Col>
                </Row>
            )}

            {showForm && (
                <POIForm
                    poi={editingPOI}
                    categories={categories}
                    onClose={() => setShowForm(false)}
                    onSaved={handleFormSaved}
                />
            )}
            
            <style>{`
                .ant-table-row-selected > td {
                    background-color: #f0fdf4 !important;
                }
                .ant-table-row-disabled > td {
                    opacity: 0.6;
                    background-color: #f8fafc;
                }
            `}</style>
        </div>
    )
}
