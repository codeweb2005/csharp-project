import { useState, useEffect, useCallback } from 'react'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { Card, Table, Popconfirm, Input, Button, Switch, Space, Tooltip, Row, Col, Typography, Tag, message, Empty, Descriptions, Image } from 'antd'
import { pois as poisApi, categories as catsApi } from '../../api.js'
import POIForm from '../../components/POIForm/POIForm.jsx'
import POIMiniMap from '../../components/POIMiniMap/POIMiniMap.jsx'
import useCurrentUser from '../../hooks/useCurrentUser.js'
import { usePoiSwitcher } from '../../context/PoiSwitcherContext.jsx'
import { MapPin, Phone, Globe, Clock, Star } from 'lucide-react'

const { Text, Title } = Typography

export default function POIList() {
    const { isVendor } = useCurrentUser()
    const { activePOIId } = usePoiSwitcher()

    const [data, setData] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)

    // Pagination
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const PAGE_SIZE = 15

    // Modal state
    const [showForm, setShowForm] = useState(false)
    const [editingPOI, setEditingPOI] = useState(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const result = await poisApi.getList({ page, size: PAGE_SIZE })
            setData(result.data?.items ?? [])
            setTotal(result.data?.pagination?.totalItems ?? 0)
        } catch (err) {
            message.error('Failed to load shop list. Please check the backend.')
            console.error('[POIList] fetch error:', err)
        } finally {
            setLoading(false)
        }
    }, [page])

    // Re-fetch for admin; for vendor re-fetch whenever active POI changes
    useEffect(() => { fetchData() }, [fetchData])
    useEffect(() => {
        if (isVendor && activePOIId) fetchData()
    }, [activePOIId]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        catsApi.getAll()
            .then(res => setCategories(res.data ?? []))
            .catch(err => console.warn('[POIList] categories fetch failed:', err))
    }, [])


    const handleDelete = async (poi) => {
        try {
            await poisApi.delete(poi.id)
            fetchData()
            message.success(`Deleted "${poi.name}"`)
        } catch (err) {
            console.error('[POIList] delete failed:', err)
            message.error(err?.error?.message ?? 'Error deleting')
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
            message.error('Error loading details')
        }
    }

    const handleFormSaved = () => {
        setShowForm(false)
        fetchData()
    }

    // ── Vendor view: show their POIs as cards ──
    if (isVendor) {
        return (
            <div style={{ padding: '0 0 24px 0', animation: 'fadeIn 0.4s ease-out' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <Title level={4} style={{ margin: 0 }}>Shop Info</Title>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                        Add New Shop
                    </Button>
                </div>

                {loading ? (
                    <Card loading={true} />
                ) : data.length === 0 ? (
                    <Card bordered={false} style={{ borderRadius: 12, textAlign: 'center', padding: '48px 0' }}>
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="You don't have any shops yet"
                        >
                            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                                Create First Shop
                            </Button>
                        </Empty>
                    </Card>
                ) : (
                    <Row gutter={[16, 16]}>
                        {data.map(poi => (
                            <Col xs={24} lg={12} key={poi.id}>
                                <Card
                                    bordered={false}
                                    style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}
                                    actions={[
                                        <Tooltip title="Edit" key="edit">
                                            <Button type="text" icon={<EditOutlined style={{ color: '#3b82f6' }} />} onClick={() => openEdit(poi.id)}>
                                                Edit
                                            </Button>
                                        </Tooltip>,
                                        <Popconfirm
                                            key="delete"
                                            title={`Delete "${poi.name}"?`}
                                            description="This will permanently delete the shop and all its related data."
                                            onConfirm={() => handleDelete(poi)}
                                            okText="Delete"
                                            cancelText="Cancel"
                                            okButtonProps={{ danger: true }}
                                        >
                                            <Button type="text" danger icon={<DeleteOutlined />}>
                                                Delete
                                            </Button>
                                        </Popconfirm>,
                                    ]}
                                >
                                    <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                                        {poi.primaryImageUrl ? (
                                            <Image
                                                src={poi.primaryImageUrl}
                                                alt={poi.name}
                                                width={80}
                                                height={80}
                                                style={{ borderRadius: 8, objectFit: 'cover' }}
                                                fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZjFmNWY5Ii8+PHRleHQgeD0iNDAiIHk9IjQwIiBmb250LXNpemU9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iI2NiZDVlMSI+8J+PqjwvdGV4dD48L3N2Zz4="
                                            />
                                        ) : (
                                            <div style={{
                                                width: 80, height: 80, borderRadius: 8, background: '#f1f5f9',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0
                                            }}>
                                                {poi.categoryIcon || '🏪'}
                                            </div>
                                        )}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                <Text strong style={{ fontSize: 16 }}>{poi.name}</Text>
                                                {poi.isFeatured && <Tag color="gold">Featured</Tag>}
                                            </div>
                                            <Tag color={poi.categoryColor} style={{ color: poi.categoryColor, background: 'transparent', borderColor: poi.categoryColor }}>
                                                {poi.categoryIcon} {poi.categoryName}
                                            </Tag>
                                            <div style={{ marginTop: 4 }}>
                                                <Tag color={poi.isActive ? 'green' : 'default'}>
                                                    {poi.isActive ? 'Active' : 'Inactive'}
                                                </Tag>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, color: '#64748b', fontSize: 13 }}>
                                        {poi.address && (
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                                <MapPin size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                                                <Text type="secondary">{poi.address}</Text>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                            {poi.rating != null && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Star size={14} style={{ color: '#f59e0b' }} />
                                                    <Text>{poi.rating.toFixed(1)}</Text>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Text type="secondary">{poi.totalVisits?.toLocaleString() ?? 0} visits</Text>
                                            </div>
                                            {poi.audioCount > 0 && (
                                                <Text type="secondary">{poi.audioCount} audio</Text>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </Col>
                        ))}
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
            </div>
        )
    }

    // ── Admin view: full table with map ──
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
                    {record.isFeatured && <Tag color="gold">Featured</Tag>}
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
                    <Star size={14} style={{ color: '#f59e0b' }} />
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
        {
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
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space size="small" onClick={e => e.stopPropagation()}>
                    <Tooltip title="Edit">
                        <Button type="text" icon={<EditOutlined style={{ color: '#3b82f6' }} />} onClick={() => openEdit(record.id)} />
                    </Tooltip>
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
                </Space>
            )
        }
    ]

    const [search, setSearch] = useState('')
    const [selectedPoiId, setSelectedPoiId] = useState(null)

    const handleToggleActive = async (id) => {
        try {
            await poisApi.toggle(id)
            fetchData()
        } catch (err) {
            console.error('[POIList] toggle active failed:', err)
            message.error('Error changing status')
        }
    }

    return (
        <div style={{ padding: '0 0 24px 0', animation: 'fadeIn 0.4s ease-out' }}>
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
                </Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                    Add POI
                </Button>
            </div>

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
