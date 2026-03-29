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
    if (mins < 1) return 'Online'
    if (mins < 60) return `${mins} mins ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} hours ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} days ago`
    return new Date(dateStr).toLocaleDateString()
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
            message.error('Failed to load users. Check backend.')
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
            message.success('Status updated')
        } catch (err) {
            console.error('[Users] toggle failed:', err)
            message.error('Error updating status')
        }
    }

    const handleDelete = (user) => {
        Modal.confirm({
            title: `Delete "${user.fullName}"?`,
            content: 'This action cannot be undone.',
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await usersApi.delete(user.id)
                    fetchUsers()
                    message.success('User deleted')
                } catch (err) {
                    console.error('[Users] delete failed:', err)
                    message.error('Error deleting user')
                }
            }
        })
    }

    const handleResetPassword = (user) => {
        Modal.confirm({
            title: `Reset password for "${user.fullName}"?`,
            content: 'New password will be sent via email.',
            okText: 'Reset',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await usersApi.resetPassword(user.id)
                    message.success('Password reset successfully.')
                } catch (err) {
                    console.error('[Users] reset password failed:', err)
                    message.error('Failed to reset password.')
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
                message.success('User updated')
            } else {
                await usersApi.create({
                    email: values.email,
                    fullName: values.fullName,
                    password: values.password,
                    role: values.role,
                    phone: values.phone || null,
                    poiIds: values.role === 'Vendor' ? poiIds : [],
                })
                message.success('New user created')
            }
            setIsModalVisible(false)
            fetchUsers()
        } catch (err) {
            message.error(err?.error?.message || 'Error saving user.')
        } finally {
            setFormLoading(false)
        }
    }

    const columns = [
        {
            title: 'User',
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
                            <Text type="secondary" style={{ fontSize: 11, color: '#4059aa' }}>+{record.vendorPOIIds.length - 1} other POIs</Text>
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
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            render: (role) => <Tag color={roleColors[role] || 'default'}>{role}</Tag>
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone',
            render: (phone) => <Text>{phone || '—'}</Text>
        },
        {
            title: 'Last Login',
            dataIndex: 'lastLoginAt',
            key: 'lastLoginAt',
            render: (lastLoginAt) => {
                const text = timeAgo(lastLoginAt)
                if (text === 'Online') {
                    return <Space><Badge status="success" /> <Text type="success">Online</Text></Space>
                }
                return <Text type="secondary">{text}</Text>
            }
        },
        {
            title: 'Status',
            key: 'isActive',
            render: (_, record) => (
                <Switch 
                    checked={record.isActive} 
                    onChange={() => handleToggle(record.id)} 
                    checkedChildren="On" 
                    unCheckedChildren="Off"
                />
            )
        },
        {
            title: 'Actions',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Tooltip title="Edit">
                        <Button type="text" icon={<EditOutlined style={{ color: '#00246a' }} />} onClick={() => openEdit(record)} />
                    </Tooltip>
                    <Tooltip title="Reset Password">
                        <Button type="text" icon={<KeyOutlined style={{ color: '#f59e0b' }} />} onClick={() => handleResetPassword(record)} />
                    </Tooltip>
                    <Tooltip title="Delete">
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
                        <Radio.Button value="all">All ({counts.all})</Radio.Button>
                        <Radio.Button value="vendor">Vendors ({counts.vendor})</Radio.Button>
                        <Radio.Button value="customer">Customers ({counts.customer})</Radio.Button>
                    </Radio.Group>
                    <Input
                        placeholder="Search by name, email..."
                        prefix={<SearchOutlined style={{ color: '#cbd5e1' }} />}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: 250, borderRadius: 20 }}
                        allowClear
                    />
                </Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                    Add User
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
                        showTotal: (t, range) => `Showing ${range[0]}-${range[1]} of ${t}`
                    }}
                    rowClassName={record => !record.isActive ? 'ant-table-row-disabled' : ''}
                />
            </Card>

            <Modal
                title={editingUser ? 'Edit User' : 'Add New User'}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                destroyOnClose
            >
                <Form layout="vertical" form={form} onFinish={handleModalSubmit} initialValues={{ role: 'Customer' }}>
                    {!editingUser && (
                        <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Please enter email!' }, { type: 'email', message: 'Invalid email!' }]}>
                            <Input />
                        </Form.Item>
                    )}

                    <Form.Item name="fullName" label="Full Name" rules={[{ required: true, message: 'Please enter full name!' }]}>
                        <Input />
                    </Form.Item>

                    {!editingUser && (
                        <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Please enter password!' }, { min: 8, message: 'Min 8 characters' }]}>
                            <Input.Password />
                        </Form.Item>
                    )}

                    {!editingUser && (
                        <Form.Item name="role" label="Role">
                            <Select onChange={(val) => { if (val === 'Vendor') loadPoiOptions() }}>
                                <Select.Option value="Customer">Customer</Select.Option>
                                <Select.Option value="Vendor">Vendor</Select.Option>
                                <Select.Option value="Admin">Admin</Select.Option>
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
                                            Assign to POIs
                                            <Text type="secondary" style={{ marginLeft: 6, fontSize: 12 }}>multiple selection allowed</Text>
                                        </span>
                                    }
                                >
                                    <Select
                                        mode="multiple"
                                        placeholder="Select one or more POIs..."
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

                    <Form.Item name="phone" label="Phone Number">
                        <Input />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                        <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
                        <Button type="primary" htmlType="submit" loading={formLoading}>
                            {editingUser ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    )
}
