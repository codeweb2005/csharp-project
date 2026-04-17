import { useState, useEffect, useRef, useCallback } from 'react'
import { PlusOutlined, DownloadOutlined, SyncOutlined, DeleteOutlined, CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined, WarningOutlined } from '@ant-design/icons'
import { App, Card, Modal, Form, Input, Select, Button, Tag, Progress, Space, Typography, Tooltip, Statistic, Row, Col, Popconfirm, Spin } from 'antd'
import { offlinePackages as pkgApi, API_BASE } from '../../api.js'

const { Title, Text } = Typography

const statusConfig = {
    active: { label: 'Active', color: 'success', icon: <CheckCircleOutlined /> },
    Active: { label: 'Active', color: 'success', icon: <CheckCircleOutlined /> },
    building: { label: 'Building...', color: 'warning', icon: <ClockCircleOutlined /> },
    Building: { label: 'Building...', color: 'warning', icon: <ClockCircleOutlined /> },
    draft: { label: 'Draft', color: 'default', icon: <FileTextOutlined /> },
    Draft: { label: 'Draft', color: 'default', icon: <FileTextOutlined /> },
    error: { label: 'Error', color: 'error', icon: <WarningOutlined /> },
    Error: { label: 'Error', color: 'error', icon: <WarningOutlined /> },
}

function formatSize(bytes) {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function Offline() {
    const { message } = App.useApp()
    const [packages, setPackages] = useState([])
    const [loading, setLoading] = useState(true)

    // Create form
    const [isModalVisible, setIsModalVisible] = useState(false)
    const [form] = Form.useForm()
    const [createLoading, setCreateLoading] = useState(false)

    // Polling for building packages
    const pollRef = useRef(null)

    const fetchPackages = useCallback(async () => {
        try {
            const res = await pkgApi.getAll()
            setPackages(res.data ?? [])
            setLoading(false)
        } catch (err) {
            message.error('Failed to load packages.')
            setLoading(false)
            console.error('[Offline] fetch error:', err)
        }
    }, [])

    useEffect(() => {
        fetchPackages()
        return () => { if (pollRef.current) clearInterval(pollRef.current) }
    }, [fetchPackages])

    // Poll building packages
    useEffect(() => {
        const building = packages.filter(p => p.status === 'building' || p.status === 'Building')
        if (building.length > 0 && !pollRef.current) {
            pollRef.current = setInterval(() => {
                fetchPackages()
            }, 5000) // poll every 5s
        } else if (building.length === 0 && pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
        }
    }, [packages, fetchPackages])

    const handleBuild = async (id) => {
        try {
            await pkgApi.build(id)
            fetchPackages()
            message.success('Package building started')
        } catch (err) {
            console.error('[Offline] build failed:', err)
            message.error(err?.error?.message || 'Failed to start build.')
        }
    }

    const handleDelete = async (id) => {
        try {
            await pkgApi.delete(id)
            fetchPackages()
            message.success('Package deleted')
        } catch (err) {
            console.error('[Offline] delete failed:', err)
            message.error('Error deleting package')
        }
    }

    const handleCreate = async (values) => {
        setCreateLoading(true)
        try {
            await pkgApi.create({
                languageId: Number(values.languageId),
                name: values.name,
                version: values.version,
            })
            setIsModalVisible(false)
            form.resetFields()
            message.success('New package created')
            fetchPackages()
        } catch (err) {
            message.error(err?.error?.message || 'Failed to create package.')
        } finally {
            setCreateLoading(false)
        }
    }

    const totalDownloads = packages.reduce((sum, p) => sum + (p.downloadCount || 0), 0)
    const handleCloseModal = () => {
        setIsModalVisible(false)
        form.resetFields()
    }

    return (
        <div style={{ padding: '0 0 24px 0', animation: 'fadeIn 0.4s ease-out' }}>
            <Row align="middle" justify="space-between" style={{ marginBottom: 24 }}>
                <Col>
                    <Statistic title="Total Downloads" value={totalDownloads} />
                </Col>
                <Col>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
                        Create Package
                    </Button>
                </Col>
            </Row>

            <Spin spinning={loading}>
            <Row gutter={[16, 16]}>
                {packages.length === 0 && !loading && (
                    <Col span={24}><Text type="secondary">No offline packages found. Create one!</Text></Col>
                )}
                {packages.map(pkg => {
                    const sc = statusConfig[pkg.status] || statusConfig.draft
                    const isBuilding = pkg.status === 'building' || pkg.status === 'Building'
                    const isActive = pkg.status === 'active' || pkg.status === 'Active'
                    const isDraft = pkg.status === 'draft' || pkg.status === 'Draft'

                    return (
                        <Col key={pkg.id} xs={24} sm={24} md={24} lg={12} xl={12} xxl={8}>
                            <Card
                                variant="borderless"
                                style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}
                                actions={[
                                    isActive && (
                                        <Tooltip title="Download" key="download">
                                            <Button type="link" href={`${API_BASE}/offlinepackages/${pkg.id}/download`} download icon={<DownloadOutlined />} />
                                        </Tooltip>
                                    ),
                                    isActive && (
                                        <Tooltip title="Rebuild" key="rebuild">
                                            <Button type="link" onClick={() => handleBuild(pkg.id)} icon={<SyncOutlined />} />
                                        </Tooltip>
                                    ),
                                    isDraft && (
                                        <Button type="link" key="build" onClick={() => handleBuild(pkg.id)}>Build Package</Button>
                                    ),
                                    isBuilding && (
                                        <span key="building" style={{ color: '#faad14', fontSize: 13 }}><SyncOutlined spin /> Processing...</span>
                                    ),
                                    <Popconfirm
                                        key="delete"
                                        title="Delete this offline package?"
                                        description="This action cannot be undone."
                                        onConfirm={() => handleDelete(pkg.id)}
                                        okText="Delete"
                                        cancelText="Cancel"
                                        okButtonProps={{ danger: true }}
                                    >
                                        <Tooltip title="Delete">
                                            <Button type="link" danger icon={<DeleteOutlined />} />
                                        </Tooltip>
                                    </Popconfirm>
                                ].filter(Boolean)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                    <Space align="start">
                                        <div style={{ fontSize: 32, lineHeight: 1 }}>{pkg.flagEmoji || '🌐'}</div>
                                        <div>
                                            <Title level={5} style={{ margin: 0 }}>{pkg.name}</Title>
                                            <Text type="secondary" style={{ fontSize: 12 }}>Version {pkg.version}</Text>
                                        </div>
                                    </Space>
                                    <Tag color={sc.color} icon={sc.icon}>{sc.label}</Tag>
                                </div>

                                <Space size="middle" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
                                    <Text type="secondary">📍 {pkg.poiCount} POI</Text>
                                    <Text type="secondary">🔊 {pkg.audioCount} Audio</Text>
                                    <Text type="secondary">🖼️ {pkg.imageCount} Images</Text>
                                    <Text type="secondary">📦 {formatSize(pkg.fileSize)}</Text>
                                    <Text type="secondary">⬇️ {pkg.downloadCount || 0} downloads</Text>
                                </Space>

                                {isBuilding && (
                                    <div style={{ marginTop: 8 }}>
                                        <Progress percent={pkg.progress || 0} status="active" size="small" />
                                        <Text type="secondary" style={{ fontSize: 12 }}>{pkg.currentStep ? `Processing: ${pkg.currentStep}` : 'Processing...'}</Text>
                                    </div>
                                )}

                                {pkg.updatedAt && (
                                    <div style={{ marginTop: 16 }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>Updated: {new Date(pkg.updatedAt).toLocaleDateString()}</Text>
                                    </div>
                                )}
                            </Card>
                        </Col>
                    )
                })}
            </Row>
            </Spin>

            <Modal
                title="Create Offline Package"
                open={isModalVisible}
                onCancel={handleCloseModal}
                footer={null}
            >
                <Form layout="vertical" form={form} onFinish={handleCreate} initialValues={{ languageId: '1', version: '1.0' }}>
                    <Form.Item name="name" label="Package Name" rules={[{ required: true, message: 'Please enter package name!' }]}>
                        <Input placeholder="e.g. Vinh Khanh Pack - English" />
                    </Form.Item>

                    <Form.Item name="languageId" label="Language">
                        <Select>
                            <Select.Option value="1">🇻🇳 Vietnamese</Select.Option>
                            <Select.Option value="2">🇬🇧 English</Select.Option>
                            <Select.Option value="3">🇨🇳 Chinese</Select.Option>
                            <Select.Option value="4">🇯🇵 Japanese</Select.Option>
                            <Select.Option value="5">🇰🇷 Korean</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item name="version" label="Version" rules={[{ required: true, message: 'Please enter version!' }]}>
                        <Input />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                        <Button onClick={handleCloseModal}>Cancel</Button>
                        <Button type="primary" htmlType="submit" loading={createLoading}>
                            Create
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    )
}
