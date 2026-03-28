import { useState, useEffect, useCallback } from 'react'
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined, ShopOutlined } from '@ant-design/icons'
import { Card, Table, Modal, Form, Input, Button, Switch, Select, Avatar, Tag, Space, Typography, Tooltip, Radio, message, Spin, Badge } from 'antd'
import { users as usersApi, pois as poisApi } from '../../api.js'

const { Title, Text } = Typography

const roleColors = { Admin: 'volcano', Vendor: 'purple', Customer: 'blue' }

function timeAgo(dateStr) {
    if (!dateStr) return '—'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Đang online'
    if (mins < 60) return `${mins} phút trước`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} giờ trước`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} ngày trước`
    return new Date(dateStr).toLocaleDateString('vi-VN')
}

export default function Users() {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [tab, setTab] = useState('all')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const PAGE_SIZE = 15

    // Modal state
    const [isModalVisible, setIsModalVisible] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [formLoading, setFormLoading] = useState(false)
    const [form] = Form.useForm()

    // Counts per role
    const [counts, setCounts] = useState({ all: 0, vendor: 0, customer: 0 })

    // POI options for vendor assignment
    const [poiOptions, setPoiOptions] = useState([])

    const roleFilter = tab === 'vendor' ? 'Vendor' : tab === 'customer' ? 'Customer' : undefined

    const fetchUsers = useCallback(async () => {
        setLoading(true)
        try {
            const res = await usersApi.getList({ page, size: PAGE_SIZE, search: search || undefined, role: roleFilter })
            setData(res.data?.items ?? [])
            setTotal(res.data?.pagination?.totalItems ?? 0)
        } catch (err) {
            message.error('Không thể tải danh sách người dùng. Hãy kiểm tra backend.')
            console.error('[Users] fetch error:', err)
        } finally {
            setLoading(false)
        }
    }, [page, search, roleFilter])

    useEffect(() => {
        async function loadCounts() {
            try {
                const [allRes, vendorRes, customerRes] = await Promise.all([
                    usersApi.getList({ page: 1, size: 1 }),
                    usersApi.getList({ page: 1, size: 1, role: 'Vendor' }),
                    usersApi.getList({ page: 1, size: 1, role: 'Customer' }),
                ])
                setCounts({
                    all: allRes.data?.pagination?.totalItems ?? 0,
                    vendor: vendorRes.data?.pagination?.totalItems ?? 0,
                    customer: customerRes.data?.pagination?.totalItems ?? 0,
                })
            } catch { /* ignore */ }
        }
        loadCounts()
    }, [])

    useEffect(() => { fetchUsers() }, [fetchUsers])
    useEffect(() => { setPage(1) }, [tab, search])

    const handleToggle = async (id) => {
        try {
            await usersApi.toggle(id)
            fetchUsers()
            message.success('Trạng thái đã được cập nhật')
        } catch (err) {
            console.error('[Users] toggle failed:', err)
            message.error('Lỗi khi cập nhật trạng thái')
        }
    }

    const handleDelete = (user) => {
        Modal.confirm({
            title: `Xóa "${user.fullName}"?`,
            content: 'Hành động này không thể hoàn tác.',
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    await usersApi.delete(user.id)
                    fetchUsers()
                    message.success('Đã xóa người dùng')
                } catch (err) {
                    console.error('[Users] delete failed:', err)
                    message.error('Lỗi khi xóa người dùng')
                }
            }
        })
    }

    const handleResetPassword = (user) => {
        Modal.confirm({
            title: `Reset mật khẩu cho "${user.fullName}"?`,
            content: 'Mật khẩu mới sẽ được gửi qua email.',
            okText: 'Reset',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    await usersApi.resetPassword(user.id)
                    message.success('Mật khẩu đã được reset thành công.')
                } catch (err) {
                    console.error('[Users] reset password failed:', err)
                    message.error('Không thể reset mật khẩu.')
                }
            }
        })
    }

    const openCreate = () => {
        setEditingUser(null)
        form.resetFields()
        setIsModalVisible(true)
        loadPoiOptions()
    }

    const openEdit = (user) => {
        setEditingUser(user)
        form.setFieldsValue({
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            phone: user.phone || '',
            // Pre-fill multi-select with current POI assignments
            poiIds: user.vendorPOIIds?.length > 0 ? user.vendorPOIIds : [],
        })
        setIsModalVisible(true)
        if (user.role === 'Vendor') loadPoiOptions()
    }

    const loadPoiOptions = async () => {
        try {
            const res = await poisApi.getList({ page: 1, size: 200 })
            setPoiOptions(res.data?.items ?? [])
        } catch { /* ignore */ }
    }

    const handleModalSubmit = async (values) => {
        setFormLoading(true)
        try {
            const poiIds = values.poiIds ?? []
            if (editingUser) {
                await usersApi.update(editingUser.id, {
                    fullName: values.fullName,
                    phone: values.phone || null,
                    // Send updated POI list only when editing a Vendor
                    poiIds: editingUser.role === 'Vendor' ? poiIds : undefined,
                })
                message.success('Đã cập nhật người dùng')
            } else {
                await usersApi.create({
                    email: values.email,
                    fullName: values.fullName,
                    password: values.password,
                    role: values.role,
                    phone: values.phone || null,
                    poiIds: values.role === 'Vendor' ? poiIds : [],
                })
                message.success('Đã tạo người dùng mới')
            }
            setIsModalVisible(false)
            fetchUsers()
        } catch (err) {
            message.error(err?.error?.message || 'Lỗi khi lưu người dùng.')
        } finally {
            setFormLoading(false)
        }
    }

    const columns = [
        {
            title: 'Người dùng',
            key: 'user',
            render: (text, record) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar 
                        style={{ backgroundColor: roleColors[record.role] === 'blue' ? '#1677ff' : roleColors[record.role] === 'volcano' ? '#d4380d' : '#722ed1', verticalAlign: 'middle' }}
                        size="large"
                    >
                        {(record.fullName || record.email).charAt(0).toUpperCase()}
                    </Avatar>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Text strong style={{ fontSize: 14 }}>{record.fullName || '—'}</Text>
                        {record.shopName && <Text type="secondary" style={{ fontSize: 12 }}><ShopOutlined /> {record.shopName}</Text>}
                        {record.vendorPOIIds?.length > 1 && (
                            <Text type="secondary" style={{ fontSize: 11, color: '#8b5cf6' }}>+{record.vendorPOIIds.length - 1} POI khác</Text>
                        )}
                    </div>
                </div>
            )
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            render: (text) => <Text>{text}</Text>
        },
        {
            title: 'Vai trò',
            dataIndex: 'role',
            key: 'role',
            render: (role) => <Tag color={roleColors[role] || 'default'}>{role}</Tag>
        },
        {
            title: 'Điện thoại',
            dataIndex: 'phone',
            key: 'phone',
            render: (phone) => <Text>{phone || '—'}</Text>
        },
        {
            title: 'Đăng nhập cuối',
            dataIndex: 'lastLoginAt',
            key: 'lastLoginAt',
            render: (lastLoginAt) => {
                const text = timeAgo(lastLoginAt)
                if (text === 'Đang online') {
                    return <Space><Badge status="success" /> <Text type="success">Đang online</Text></Space>
                }
                return <Text type="secondary">{text}</Text>
            }
        },
        {
            title: 'Trạng thái',
            key: 'isActive',
            render: (_, record) => (
                <Switch 
                    checked={record.isActive} 
                    onChange={() => handleToggle(record.id)} 
                    checkedChildren="Bật" 
                    unCheckedChildren="Tắt"
                />
            )
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Tooltip title="Sửa">
                        <Button type="text" icon={<EditOutlined style={{ color: '#3b82f6' }} />} onClick={() => openEdit(record)} />
                    </Tooltip>
                    <Tooltip title="Reset mật khẩu">
                        <Button type="text" icon={<KeyOutlined style={{ color: '#f59e0b' }} />} onClick={() => handleResetPassword(record)} />
                    </Tooltip>
                    <Tooltip title="Xóa">
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
                    </Tooltip>
                </Space>
            )
        }
    ]

    return (
        <div style={{ padding: '0 0 24px 0', animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                <Space align="center" size="large">
                    <Radio.Group value={tab} onChange={e => setTab(e.target.value)} buttonStyle="solid">
                        <Radio.Button value="all">Tất cả ({counts.all})</Radio.Button>
                        <Radio.Button value="vendor">Chủ quán ({counts.vendor})</Radio.Button>
                        <Radio.Button value="customer">Khách hàng ({counts.customer})</Radio.Button>
                    </Radio.Group>
                    <Input
                        placeholder="Tìm theo tên, email..."
                        prefix={<SearchOutlined style={{ color: '#cbd5e1' }} />}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: 250, borderRadius: 20 }}
                        allowClear
                    />
                </Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                    Thêm người dùng
                </Button>
            </div>

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
                        showTotal: (t, range) => `Hiển thị ${range[0]}-${range[1]} trong ${t}`
                    }}
                    rowClassName={record => !record.isActive ? 'ant-table-row-disabled' : ''}
                />
            </Card>

            <Modal
                title={editingUser ? 'Sửa người dùng' : 'Thêm người dùng mới'}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                destroyOnClose
            >
                <Form layout="vertical" form={form} onFinish={handleModalSubmit} initialValues={{ role: 'Customer' }}>
                    {!editingUser && (
                        <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Vui lòng nhập email!' }, { type: 'email', message: 'Email không hợp lệ!' }]}>
                            <Input />
                        </Form.Item>
                    )}

                    <Form.Item name="fullName" label="Họ tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}>
                        <Input />
                    </Form.Item>

                    {!editingUser && (
                        <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }, { min: 8, message: 'Tối thiểu 8 ký tự' }]}>
                            <Input.Password />
                        </Form.Item>
                    )}

                    {!editingUser && (
                        <Form.Item name="role" label="Vai trò">
                            <Select onChange={(val) => { if (val === 'Vendor') loadPoiOptions() }}>
                                <Select.Option value="Customer">Khách hàng</Select.Option>
                                <Select.Option value="Vendor">Chủ quán</Select.Option>
                                <Select.Option value="Admin">Quản trị viên</Select.Option>
                            </Select>
                        </Form.Item>
                    )}

                    <Form.Item noStyle shouldUpdate={(prev, cur) => prev.role !== cur.role}>
                        {({ getFieldValue }) => {
                            const role = getFieldValue('role')
                            const isVendorForm = !editingUser ? role === 'Vendor' : editingUser?.role === 'Vendor'
                            if (!isVendorForm) return null
                            return (
                                <Form.Item
                                    name="poiIds"
                                    label={
                                        <span>
                                            Gán vào quán (POI)
                                            <Text type="secondary" style={{ marginLeft: 6, fontSize: 12 }}>có thể chọn nhiều</Text>
                                        </span>
                                    }
                                >
                                    <Select
                                        mode="multiple"
                                        placeholder="Chọn một hoặc nhiều POI..."
                                        allowClear
                                        showSearch
                                        optionFilterProp="label"
                                        options={poiOptions.map(p => ({ label: p.name, value: p.id }))}
                                        maxTagCount="responsive"
                                        style={{ width: '100%' }}
                                        onFocus={() => poiOptions.length === 0 && loadPoiOptions()}
                                    />
                                </Form.Item>
                            )
                        }}
                    </Form.Item>

                    <Form.Item name="phone" label="Số điện thoại">
                        <Input />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                        <Button onClick={() => setIsModalVisible(false)}>Hủy</Button>
                        <Button type="primary" htmlType="submit" loading={formLoading}>
                            {editingUser ? 'Cập nhật' : 'Tạo mới'}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    )
}
