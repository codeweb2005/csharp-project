import { useState, useEffect, useCallback } from 'react'
import { PlusOutlined, DeleteOutlined, SaveOutlined, UploadOutlined, StarFilled } from '@ant-design/icons'
import { Card, Drawer, Form, Input, InputNumber, Button, Switch, Row, Col, Typography, Space, Badge, Popconfirm, Select, Tabs, message, Empty, Spin } from 'antd'
import { menu as menuApi, pois as poisApi } from '../../api.js'

const { Title, Text, Paragraph } = Typography

function formatPrice(p) {
    return Number(p).toLocaleString('vi-VN') + ' ₫'
}

export default function MenuPage() {
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

    const fetchMenu = useCallback(async () => {
        if (!selectedPOI) return
        setLoading(true)
        try {
            const res = await menuApi.getByPOI(selectedPOI)
            setMenuItems(res.data ?? [])
        } catch (err) {
            message.error('Không thể tải menu.')
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
                message.success('Đã thêm món mới')
            } else {
                await menuApi.update(editingState.id, payload)
                message.success('Đã cập nhật món ăn')
            }
            closeDrawer()
            fetchMenu()
        } catch (err) {
            message.error(err?.error?.message || 'Lỗi khi lưu món ăn.')
        } finally {
            setSaveLoading(false)
        }
    }

    async function handleDelete(item) {
        try {
            await menuApi.delete(item.id)
            if (editingState?.id === item.id) closeDrawer()
            message.success('Đã xóa món ăn')
            fetchMenu()
        } catch (err) {
            console.error('[Menu] delete failed:', err)
            message.error('Lỗi khi xóa món ăn')
        }
    }

    const sigCount = menuItems.filter(m => m.isSignature).length

    // Generating Tabs for translations
    const tabItems = [
        {
            key: '1',
            label: '🇻🇳 VI',
            children: (
                <>
                    <Form.Item name="name_1" label="Tên món" rules={[{ required: true, message: 'Vui lòng nhập tên món' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="desc_1" label="Mô tả">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </>
            )
        },
        {
            key: '2',
            label: '🇬🇧 EN',
            children: (
                <>
                    <Form.Item name="name_2" label="Tên món">
                        <Input />
                    </Form.Item>
                    <Form.Item name="desc_2" label="Mô tả">
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
                    <Select
                        style={{ width: 250 }}
                        placeholder="Chọn POI"
                        value={selectedPOI}
                        onChange={val => { setSelectedPOI(val); closeDrawer() }}
                        options={poiOptions.map(p => ({ label: p.name, value: p.id }))}
                        showSearch
                        optionFilterProp="label"
                    />
                    <Text type="secondary">{menuItems.length} món • {sigCount} đặc trưng</Text>
                </Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={!selectedPOI}>
                    Thêm món mới
                </Button>
            </div>

            <Row gutter={[16, 16]}>
                {loading ? (
                    <Col span={24} style={{ textAlign: 'center', padding: '40px 0' }}>
                        <Spin size="large" />
                    </Col>
                ) : menuItems.length === 0 ? (
                    <Col span={24}>
                        <Empty description="Chưa có món nào." image={Empty.PRESENTED_IMAGE_SIMPLE}>
                            <Button type="link" onClick={openCreate}>Thêm món đầu tiên?</Button>
                        </Empty>
                    </Col>
                ) : menuItems.map(item => {
                    const name = item.translations?.[0]?.name || item.name || '—'
                    const nameEn = item.translations?.[1]?.name || ''
                    const desc = item.translations?.[0]?.description || item.description || ''
                    return (
                        <Col xs={24} sm={12} lg={8} xl={6} key={item.id}>
                            <Card
                                hoverable
                                onClick={() => openEdit(item)}
                                bordered={false}
                                bodyStyle={{ padding: 16 }}
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
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 40 }}>🍽️</div>
                                        )}
                                        {item.isSignature && (
                                            <div style={{ position: 'absolute', top: 8, left: 8, backgroundColor: '#f59e0b', color: '#fff', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <StarFilled /> Đặc trưng
                                            </div>
                                        )}
                                        {!item.isAvailable && (
                                            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a', fontWeight: 600, fontSize: 18 }}>
                                                Hết hàng
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
                                    <Badge status={item.isAvailable ? 'success' : 'error'} text={item.isAvailable ? 'Còn bán' : 'Hết hàng'} />
                                </div>
                            </Card>
                        </Col>
                    )
                })}
            </Row>

            <Drawer
                title={isCreating ? 'Thêm món mới' : 'Sửa món ăn'}
                placement="right"
                onClose={closeDrawer}
                open={drawerVisible}
                width={400}
                extra={
                    <Space>
                        {!isCreating && editingState && (
                            <Popconfirm title="Xóa món ăn này?" onConfirm={() => handleDelete(editingState)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                                <Button danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                        )}
                        <Button type="primary" onClick={() => form.submit()} loading={saveLoading} icon={<SaveOutlined />}>
                            {isCreating ? 'Tạo mới' : 'Lưu'}
                        </Button>
                    </Space>
                }
            >
                <div style={{ textAlign: 'center', marginBottom: 24, padding: '24px', backgroundColor: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1', cursor: 'pointer' }}>
                    <UploadOutlined style={{ fontSize: 24, color: '#94a3b8', marginBottom: 8 }} />
                    <div style={{ color: '#64748b' }}>Upload ảnh món</div>
                </div>

                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Tabs items={tabItems} defaultActiveKey="1" style={{ marginBottom: 16 }} />

                    <Form.Item name="price" label="Giá (VNĐ)" rules={[{ required: true, message: 'Vui lòng nhập giá' }]}>
                        <InputNumber style={{ width: '100%' }} min={0} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/\$\s?|(,*)/g, '')} />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="isSignature" valuePropName="checked">
                                <Space>
                                    <Switch />
                                    <span>⭐ Món đặc trưng</span>
                                </Space>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="isAvailable" valuePropName="checked">
                                <Space>
                                    <Switch />
                                    <span>🟢 Còn bán</span>
                                </Space>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Drawer>
        </div>
    )
}
