import { useState, useEffect } from 'react'
import { Popconfirm, Drawer, Form, Input, Button, Switch, Card, Row, Col, Typography, Space, Badge, message, Tooltip, InputNumber, ColorPicker, Avatar } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons'
import { categories as catsApi } from '../../api.js'

const { Title, Text } = Typography

const defaultForm = { icon: '📍', color: '#3b82f6', sortOrder: 0, isActive: true, translations: [] }

export default function Categories() {
    const [cats, setCats] = useState([])
    const [loading, setLoading] = useState(true)
    const [drawerVisible, setDrawerVisible] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [saveLoading, setSaveLoading] = useState(false)

    const [form] = Form.useForm()
    const [editingState, setEditingState] = useState(null) // used for translations tracking

    useEffect(() => { fetchCategories() }, [])

    async function fetchCategories() {
        setLoading(true)
        try {
            const res = await catsApi.getAll()
            setCats(res.data ?? [])
        } catch (err) {
            message.error('Không thể tải danh mục. Hãy kiểm tra backend.')
            console.error('[Categories] fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    function openEdit(cat) {
        setIsCreating(false)
        setEditingState(cat)
        
        let transVals = {}
        if (cat.translations) {
            cat.translations.forEach((t, i) => {
                transVals[`trans_${i}`] = t.name
            })
        }

        form.setFieldsValue({
            icon: cat.icon,
            color: cat.color,
            sortOrder: cat.sortOrder,
            ...transVals
        })
        setDrawerVisible(true)
    }

    function openCreate() {
        setIsCreating(true)
        const newCat = {
            ...defaultForm,
            translations: [
                { languageId: 1, languageCode: 'vi', flagEmoji: '🇻🇳', name: '' },
                { languageId: 2, languageCode: 'en', flagEmoji: '🇬🇧', name: '' },
            ]
        }
        setEditingState(newCat)
        
        let transVals = {}
        newCat.translations.forEach((t, i) => {
            transVals[`trans_${i}`] = t.name
        })

        form.setFieldsValue({
            icon: newCat.icon,
            color: newCat.color,
            sortOrder: newCat.sortOrder,
            ...transVals
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
            let translations = []
            if (editingState && editingState.translations) {
                translations = editingState.translations.map((t, i) => ({
                    languageId: t.languageId,
                    name: values[`trans_${i}`]
                }))
            }

            const hexColor = typeof values.color === 'string' ? values.color : values.color.toHexString()

            const payload = {
                icon: values.icon,
                color: hexColor,
                sortOrder: Number(values.sortOrder),
                isActive: isCreating ? true : editingState.isActive,
                translations: translations,
            }

            if (isCreating) {
                await catsApi.create(payload)
                message.success('Đã thêm danh mục mới')
            } else {
                await catsApi.update(editingState.id, payload)
                message.success('Đã cập nhật danh mục')
            }
            closeDrawer()
            fetchCategories()
        } catch (err) {
            message.error(err?.error?.message || 'Lỗi khi lưu danh mục.')
        } finally {
            setSaveLoading(false)
        }
    }

    async function handleDelete(cat) {
        try {
            await catsApi.delete(cat.id)
            message.success('Đã xóa danh mục')
            fetchCategories()
        } catch (err) {
            console.error('[Categories] delete failed:', err)
            message.error(err?.error?.message || 'Không thể xóa danh mục.')
        }
    }

    async function handleToggle(cat, checked) {
        try {
            await catsApi.toggle(cat.id)
            message.success(checked ? 'Đã bật danh mục' : 'Đã tắt danh mục')
            fetchCategories()
        } catch (err) {
            console.error('[Categories] toggle failed:', err)
            message.error('Lỗi khi bật/tắt danh mục')
        }
    }

    // Helper: get the Vietnamese name from translations
    function getName(cat, lang = 'vi') {
        const t = cat.translations?.find(t => t.languageCode === lang)
        return t?.name || cat.translations?.[0]?.name || '—'
    }

    return (
        <div style={{ padding: '0 0 24px 0', animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Space>
                    <Title level={4} style={{ margin: 0 }}>Danh mục</Title>
                    <Badge count={cats.length} style={{ backgroundColor: '#2563eb' }} />
                </Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                    Thêm danh mục
                </Button>
            </div>

            <Row gutter={[16, 16]}>
                {cats.map(cat => (
                    <Col xs={24} sm={12} lg={8} xl={6} key={cat.id}>
                        <Card
                            hoverable
                            bordered={false}
                            style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', height: '100%', opacity: cat.isActive ? 1 : 0.6, borderLeft: `4px solid ${cat.color}` }}
                            actions={[
                                <Tooltip title={cat.isActive ? 'Đang bật' : 'Đang tắt'} key="toggle"><Switch size="small" checked={cat.isActive} onChange={(checked) => handleToggle(cat, checked)} /></Tooltip>,
                                <Tooltip title="Sửa" key="edit"><Button type="text" icon={<EditOutlined style={{ color: '#10b981' }} />} onClick={() => openEdit(cat)} /></Tooltip>,
                                <Tooltip title="Xóa" key="delete">
                                    <Popconfirm title="Bạn có chắc chắn muốn xóa?" description="Tất cả POI thuộc danh mục này cần được chuyển trước." onConfirm={() => handleDelete(cat)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                                        <Button type="text" danger icon={<DeleteOutlined />} />
                                    </Popconfirm>
                                </Tooltip>
                            ]}
                        >
                            <Card.Meta
                                avatar={<Avatar size="large" style={{ backgroundColor: cat.color + '20', color: cat.color, border: `1px solid ${cat.color}` }}>{cat.icon}</Avatar>}
                                title={<Text strong>{getName(cat, 'vi')}</Text>}
                                description={
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                                        <Text type="secondary" style={{ fontSize: 13 }}>{getName(cat, 'en')}</Text>
                                        <Space>
                                            <Badge status={cat.isActive ? 'success' : 'error'} />
                                            <Text type="secondary">{cat.poiCount ?? 0} POI</Text>
                                        </Space>
                                    </div>
                                }
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            <Drawer
                title={isCreating ? 'Thêm danh mục mới' : 'Sửa danh mục'}
                placement="right"
                onClose={closeDrawer}
                open={drawerVisible}
                width={400}
                extra={
                    <Button type="primary" onClick={() => form.submit()} loading={saveLoading} icon={<SaveOutlined />}>
                        {isCreating ? 'Tạo mới' : 'Lưu lại'}
                    </Button>
                }
            >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                    <Avatar size={64} style={{ backgroundColor: '#f1f5f9', fontSize: 32 }}>{form.getFieldValue('icon') || '📍'}</Avatar>
                </div>

                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="icon" label="Emoji Icon" rules={[{ required: true, message: 'Vui lòng nhập icon' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="color" label="Màu sắc" rules={[{ required: true, message: 'Vui lòng chọn màu' }]}>
                        <ColorPicker format="hex" showText />
                    </Form.Item>
                    <Form.Item name="sortOrder" label="Thứ tự hiển thị (càng nhỏ càng đứng trước)">
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>

                    <div style={{ marginTop: 24, marginBottom: 16, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                        <Text strong>Tên đa ngôn ngữ</Text>
                    </div>

                    {editingState?.translations?.map((t, i) => (
                        <Form.Item key={i} name={`trans_${i}`} label={<span>{t.flagEmoji || '🌐'} {t.languageCode?.toUpperCase()}</span>} rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
                            <Input placeholder="Nhập tên..." />
                        </Form.Item>
                    ))}
                </Form>
            </Drawer>
        </div>
    )
}
