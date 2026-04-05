import { useState, useEffect } from 'react'
import { Popconfirm, Drawer, Form, Input, Button, Switch, Card, Row, Col, Typography, Space, Badge, message, Tooltip, InputNumber, ColorPicker, Avatar } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons'
import { categories as catsApi } from '../../api.js'
import useCurrentUser from '../../hooks/useCurrentUser.js'

const { Title, Text } = Typography

const defaultForm = { icon: '📍', color: '#3b82f6', sortOrder: 0, isActive: true, translations: [] }

export default function Categories() {
    const { isVendor } = useCurrentUser()

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
            message.error('Cannot load categories. Please check backend.')
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
                message.success('Added new category')
            } else {
                await catsApi.update(editingState.id, payload)
                message.success('Updated category')
            }
            closeDrawer()
            fetchCategories()
        } catch (err) {
            message.error(err?.error?.message || 'Error saving category.')
        } finally {
            setSaveLoading(false)
        }
    }

    async function handleDelete(cat) {
        try {
            await catsApi.delete(cat.id)
            message.success('Deleted category')
            fetchCategories()
        } catch (err) {
            console.error('[Categories] delete failed:', err)
            message.error(err?.error?.message || 'Cannot delete category.')
        }
    }

    async function handleToggle(cat, checked) {
        try {
            await catsApi.toggle(cat.id)
            message.success(checked ? 'Enabled category' : 'Disabled category')
            fetchCategories()
        } catch (err) {
            console.error('[Categories] toggle failed:', err)
            message.error('Error toggling category')
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
                    <Title level={4} style={{ margin: 0 }}>Categories</Title>
                    <Badge count={cats.length} style={{ backgroundColor: '#2563eb' }} />
                </Space>
                {!isVendor && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                        Add category
                    </Button>
                )}
            </div>

            {isVendor && (
                <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>Categories are managed by the administrator.</Text>
                </div>
            )}

            <Row gutter={[16, 16]}>
                {cats.map(cat => (
                    <Col xs={24} sm={12} lg={8} xl={6} key={cat.id}>
                        <Card
                            hoverable
                            variant="borderless"
                            style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', height: '100%', opacity: cat.isActive ? 1 : 0.6, borderLeft: `4px solid ${cat.color}` }}
                            actions={isVendor ? undefined : [
                                <Tooltip title={cat.isActive ? 'Enabled' : 'Disabled'} key="toggle"><Switch size="small" checked={cat.isActive} onChange={(checked) => handleToggle(cat, checked)} /></Tooltip>,
                                <Tooltip title="Edit" key="edit"><Button type="text" icon={<EditOutlined style={{ color: '#10b981' }} />} onClick={() => openEdit(cat)} /></Tooltip>,
                                <Tooltip title="Delete" key="delete">
                                    <Popconfirm title="Are you sure you want to delete?" description="All POIs under this category must be reassigned first." onConfirm={() => handleDelete(cat)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
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
                title={isCreating ? 'Add new category' : 'Edit category'}
                placement="right"
                onClose={closeDrawer}
                open={drawerVisible}
                size={400}
                extra={
                    <Button type="primary" onClick={() => form.submit()} loading={saveLoading} icon={<SaveOutlined />}>
                        {isCreating ? 'Create' : 'Save'}
                    </Button>
                }
            >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                    <Avatar size={64} style={{ backgroundColor: '#f1f5f9', fontSize: 32 }}>{form.getFieldValue('icon') || '📍'}</Avatar>
                </div>

                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="icon" label="Emoji Icon" rules={[{ required: true, message: 'Please enter icon' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="color" label="Color" rules={[{ required: true, message: 'Please select a color' }]}>
                        <ColorPicker format="hex" showText />
                    </Form.Item>
                    <Form.Item name="sortOrder" label="Display order (smaller appears first)">
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>

                    <div style={{ marginTop: 24, marginBottom: 16, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                        <Text strong>Multilingual name</Text>
                    </div>

                    {editingState?.translations?.map((t, i) => (
                        <Form.Item key={i} name={`trans_${i}`} label={<span>{t.flagEmoji || '🌐'} {t.languageCode?.toUpperCase()}</span>} rules={[{ required: true, message: 'Please enter a name' }]}>
                            <Input placeholder="Enter name..." />
                        </Form.Item>
                    ))}
                </Form>
            </Drawer>
        </div>
    )
}
