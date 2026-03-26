import { useState, useEffect, useCallback, useRef } from 'react'
import { PlusOutlined, DeleteOutlined, SaveOutlined, UploadOutlined, StarFilled } from '@ant-design/icons'
import { Card, Drawer, Form, Input, InputNumber, Button, Switch, Row, Col, Typography, Space, Badge, Popconfirm, Select, Tabs, message, Empty, Spin } from 'antd'
import { menu as menuApi, pois as poisApi } from '../../api.js'
import useCurrentUser from '../../hooks/useCurrentUser.js'
import { usePoiSwitcher } from '../../context/PoiSwitcherContext.jsx'

const { Title, Text, Paragraph } = Typography

function formatPrice(p) {
    return Number(p).toLocaleString('vi-VN') + ' â‚«'
}

export default function MenuPage() {
    const { isVendor } = useCurrentUser()
    const { activePOIId } = usePoiSwitcher()

    const [poiOptions, setPoiOptions] = useState([])
    const [selectedPOI, setSelectedPOI] = useState(null)
    const [menuItems, setMenuItems] = useState([])
    const [loading, setLoading] = useState(true)

    // Edit panel
    const [drawerVisible, setDrawerVisible] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [editingState, setEditingState] = useState(null)
    const [saveLoading, setSaveLoading] = useState(false)

    const [form] = Form.useForm()
    const dishImgRef = useRef(null)

    // Sync selectedPOI with PoiSwitcherContext for vendor; load full list for admin
    useEffect(() => {
        async function loadPOIs() {
            try {
                if (isVendor && activePOIId) {
                    setSelectedPOI(activePOIId)
                    try {
                        const res = await poisApi.getDetail(activePOIId)
                        setPoiOptions([{ id: activePOIId, name: res.data?.name || 'My Shop' }])
                    } catch {
                        setPoiOptions([{ id: activePOIId, name: 'My Shop' }])
                    }
                } else {
                    const res = await poisApi.getList({ page: 1, size: 100 })
                    const items = res.data?.items ?? []
                    setPoiOptions(items)
                    if (items.length > 0) setSelectedPOI(items[0].id)
                }
            } catch (err) {
                console.error('[Menu] load POIs failed:', err)
            }
        }
        loadPOIs()
    }, [isVendor, activePOIId])

    const fetchMenu = useCallback(async () => {
        if (!selectedPOI) return
        setLoading(true)
        try {
            const res = await menuApi.getByPOI(selectedPOI)
            setMenuItems(res.data ?? [])
        } catch (err) {
            message.error('Failed to load menu items. Please try again.')
            console.error('[Menu] fetch error:', err)
        } finally {
            setLoading(false)
        }
    }, [selectedPOI])

    useEffect(() => { fetchMenu() }, [fetchMenu])

    function openEdit(item) {
        setIsCreating(false)
        setEditingState(item)

        let transVals = {}
        if (item.translations) {
            item.translations.forEach((t) => {
                transVals[`name_${t.languageId}`] = t.name
                transVals[`desc_${t.languageId}`] = t.description
            })
        } else {
            // fallback if translations missing
            transVals['name_1'] = item.name || ''
            transVals['desc_1'] = item.description || ''
        }

        form.setFieldsValue({
            price: item.price,
            isSignature: item.isSignature,
            isAvailable: item.isAvailable,
            sortOrder: item.sortOrder,
            ...transVals
        })
        setDrawerVisible(true)
    }

    function openCreate() {
        setIsCreating(true)
        const newItem = {
            translations: [
                { languageId: 1, name: '', description: '' },
                { languageId: 2, name: '', description: '' },
            ],
            isSignature: false,
            isAvailable: true,
            sortOrder: menuItems.length + 1
        }
        setEditingState(newItem)

        form.setFieldsValue({
            price: 0,
            isSignature: false,
            isAvailable: true,
            sortOrder: newItem.sortOrder,
            name_1: '',
            desc_1: '',
            name_2: '',
            desc_2: '',
        })
        setDrawerVisible(true)
    }

    function closeDrawer() {
        setDrawerVisible(false)
        setEditingState(null)
        form.resetFields()
    }

    async function handleSave(values) {
        setSaveLoading(true)
        try {
            // Reconstruct translations from form fields
            const translations = editingState.translations.map(t => ({
                languageId: t.languageId,
                name: values[`name_${t.languageId}`],
                description: values[`desc_${t.languageId}`] || null,
            }))

            const payload = {
                price: Number(values.price),
                isSignature: values.isSignature,
                isAvailable: values.isAvailable,
                sortOrder: Number(values.sortOrder || editingState.sortOrder),
                translations: translations,
            }

            if (isCreating) {
                await menuApi.create(selectedPOI, payload)
                message.success('Added new item')
            } else {
                await menuApi.update(editingState.id, payload)
                message.success('Updated item')
            }
            closeDrawer()
            fetchMenu()
        } catch (err) {
            message.error(err?.error?.message || 'Error saving item.')
        } finally {
            setSaveLoading(false)
        }
    }

    async function handleDelete(item) {
        try {
            await menuApi.delete(item.id)
            if (editingState?.id === item.id) closeDrawer()
            message.success('Deleted item')
            fetchMenu()
        } catch (err) {
            console.error('[Menu] delete error (id=' + item?.id + '):', err?.message || err)
            message.error('Error deleting item')
        }
    }

    async function handleUploadImage(e) {
        const file = e.target.files?.[0]
        if (!file || !editingState?.id) return
        try {
            const res = await menuApi.uploadImage(editingState.id, file)
            message.success('Image uploaded')
            setEditingState(prev => ({ ...prev, imageUrl: res.data?.imageUrl }))
            fetchMenu()
        } catch (err) {
            console.error('[Menu] image upload failed:', err)
            message.error('Image upload failed')
        } finally {
            if (dishImgRef.current) dishImgRef.current.value = ''
        }
    }

    const sigCount = menuItems.filter(m => m.isSignature).length

    // Generating Tabs for translations
    const tabItems = [
        {
            key: '1',
            label: 'ðŸ‡»ðŸ‡³ VI',
            children: (
                <>
                    <Form.Item name="name_1" label="Dish name" rules={[{ required: true, message: 'Please enter dish name' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="desc_1" label="Description">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </>
            )
        },
        {
            key: '2',
            label: 'ðŸ‡¬ðŸ‡§ EN',
            children: (
                <>
                    <Form.Item name="name_2" label="Dish name">
                        <Input />
                    </Form.Item>
                    <Form.Item name="desc_2" label="Description">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </>
            )
        }
    ]

    return (
        <div style={{ padding: '0 0 24px 0', animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                <Space size="large" align="center" wrap>
                    <Title level={4} style={{ margin: 0 }}>Menu</Title>
                    {isVendor ? (
                        <Text strong style={{ fontSize: 15 }}>{poiOptions[0]?.name || 'My Shop'}</Text>
                    ) : (
                        <Select
                            style={{ width: 250 }}
                            placeholder="Select POI"
                            value={selectedPOI}
                            onChange={val => { setSelectedPOI(val); closeDrawer() }}
                            options={poiOptions.map(p => ({ label: p.name, value: p.id }))}
                            showSearch
                            optionFilterProp="label"
                        />
                    )}
                    <Text type="secondary">{menuItems.length} items â€¢ {sigCount} signatures</Text>
                </Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={!selectedPOI}>
                    Add new item
                </Button>
            </div>

            <Row gutter={[16, 16]}>
                {loading ? (
                    <Col span={24} style={{ textAlign: 'center', padding: '40px 0' }}>
                        <Spin size="large" />
                    </Col>
                ) : menuItems.length === 0 ? (
                    <Col span={24}>
                        <Empty description="No menu items yet. Add your first dish to get started." image={Empty.PRESENTED_IMAGE_SIMPLE}>
                            <Button type="link" onClick={openCreate}>Add first item?</Button>
                        </Empty>
                    </Col>
                ) : menuItems.map(item => {
                    const name = item.translations?.[0]?.name || item.name || 'â€”'
                    const nameEn = item.translations?.[1]?.name || ''
                    const desc = item.translations?.[0]?.description || item.description || ''
                    return (
                        <Col xs={24} sm={12} lg={8} xl={6} key={item.id}>
                            <Card
                                hoverable
                                onClick={() => openEdit(item)}
                                variant="borderless"
                                styles={{ body: { padding: 16 } }}
                                style={{
                                    borderRadius: 12,
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                                    height: '100%',
                                    opacity: item.isAvailable ? 1 : 0.6,
                                    border: editingState?.id === item.id ? '2px solid #3b82f6' : '1px solid transparent'
                                }}
                                cover={
                                    <div style={{ position: 'relative', height: 160, backgroundColor: '#f1f5f9', borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: 'hidden' }}>
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 40 }}>ðŸ½ï¸</div>
                                        )}
                                        {item.isSignature && (
                                            <div style={{ position: 'absolute', top: 8, left: 8, backgroundColor: '#f59e0b', color: '#fff', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <StarFilled /> Signature
                                            </div>
                                        )}
                                        {!item.isAvailable && (
                                            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a', fontWeight: 600, fontSize: 18 }}>
                                                Out of stock
                                            </div>
                                        )}
                                    </div>
                                }
                            >
                                <Title level={5} style={{ margin: '0 0 4px 0', fontSize: 15 }} ellipsis={{ tooltip: name }}>{name}</Title>
                                {nameEn && <Text type="secondary" style={{ display: 'block', fontSize: 13, marginBottom: 8 }} ellipsis={{ tooltip: nameEn }}>{nameEn}</Text>}
                                <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ fontSize: 13, minHeight: 40, margin: 0 }}>{desc}</Paragraph>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                                    <Text strong style={{ color: '#2563eb', fontSize: 15 }}>{formatPrice(item.price)}</Text>
                                    <Badge status={item.isAvailable ? 'success' : 'error'} text={item.isAvailable ? 'Available' : 'Out of stock'} />
                                </div>
                            </Card>
                        </Col>
                    )
                })}
            </Row>

            <Drawer
                title={isCreating ? 'Add new item' : 'Edit item'}
                placement="right"
                onClose={closeDrawer}
                open={drawerVisible}
                size={400}
                extra={
                    <Space>
                        {!isCreating && editingState && (
                            <Popconfirm title="Delete this item?" onConfirm={() => handleDelete(editingState)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
                                <Button danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                        )}
                        <Button type="primary" onClick={() => form.submit()} loading={saveLoading} icon={<SaveOutlined />}>
                            {isCreating ? 'Create' : 'Save'}
                        </Button>
                    </Space>
                }
            >
                <div
                    onClick={() => !isCreating && dishImgRef.current?.click()}
                    style={{ textAlign: 'center', marginBottom: 24, padding: '24px', backgroundColor: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1', cursor: isCreating ? 'not-allowed' : 'pointer', overflow: 'hidden' }}
                >
                    {editingState?.imageUrl ? (
                        <img src={editingState.imageUrl} alt="Dish" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 6 }} />
                    ) : (
                        <>
                            <UploadOutlined style={{ fontSize: 24, color: '#94a3b8', marginBottom: 8 }} />
                            <div style={{ color: '#64748b' }}>{isCreating ? 'Save item first, then upload image' : 'Upload dish image'}</div>
                        </>
                    )}
                </div>
                <input ref={dishImgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUploadImage} />

                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Tabs items={tabItems} defaultActiveKey="1" style={{ marginBottom: 16 }} />

                    <Form.Item name="price" label="Price (VNÄ)" rules={[{ required: true, message: 'Please enter price' }]}>
                        <InputNumber style={{ width: '100%' }} min={0} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/\$\s?|(,*)/g, '')} />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="isSignature" valuePropName="checked">
                                <Space>
                                    <Switch />
                                    <span>â­ Signature dish</span>
                                </Space>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="isAvailable" valuePropName="checked">
                                <Space>
                                    <Switch />
                                    <span>ðŸŸ¢ Available</span>
                                </Space>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Drawer>
        </div>
    )
}
