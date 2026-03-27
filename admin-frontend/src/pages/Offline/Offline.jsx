import { useState, useEffect, useRef, useCallback } from 'react'
import { PlusOutlined, DownloadOutlined, SyncOutlined, DeleteOutlined, CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined, WarningOutlined } from '@ant-design/icons'
import { Card, List, Modal, Form, Input, Select, Button, Tag, Progress, Space, Typography, Tooltip, Statistic, Row, Col, message, Popconfirm } from 'antd'
import { offlinePackages as pkgApi, API_BASE } from '../../api.js'

const { Title, Text } = Typography

const statusConfig = {
    active: { label: 'Active', color: 'success', icon: <CheckCircleOutlined /> },
    Active: { label: 'Active', color: 'success', icon: <CheckCircleOutlined /> },
    building: { label: 'Đang tạo...', color: 'warning', icon: <ClockCircleOutlined /> },
    Building: { label: 'Đang tạo...', color: 'warning', icon: <ClockCircleOutlined /> },
    draft: { label: 'Bản nháp', color: 'default', icon: <FileTextOutlined /> },
    Draft: { label: 'Bản nháp', color: 'default', icon: <FileTextOutlined /> },
    error: { label: 'Lỗi', color: 'error', icon: <WarningOutlined /> },
    Error: { label: 'Lỗi', color: 'error', icon: <WarningOutlined /> },
}

function formatSize(bytes) {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function Offline() {
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
            message.error('Không thể tải danh sách gói.')
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
            message.success('Đã bắt đầu tạo gói')
        } catch (err) {
            console.error('[Offline] build failed:', err)
            message.error(err?.error?.message || 'Không thể bắt đầu build.')
        }
    }

    const handleDelete = async (id) => {
        try {
            await pkgApi.delete(id)
            fetchPackages()
            message.success('Đã xóa gói')
        } catch (err) {
            console.error('[Offline] delete failed:', err)
            message.error('Lỗi khi xóa gói')
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
            message.success('Đã tạo gói mới')
            fetchPackages()
        } catch (err) {
            message.error(err?.error?.message || 'Không thể tạo gói.')
        } finally {
            setCreateLoading(false)
        }
    }

    const totalDownloads = packages.reduce((sum, p) => sum + (p.downloadCount || 0), 0)

    return (
        <div style={{ padding: '0 0 24px 0', animation: 'fadeIn 0.4s ease-out' }}>
            <Row align="middle" justify="space-between" style={{ marginBottom: 24 }}>
                <Col>
                    <Statistic title="Tổng lượt tải" value={totalDownloads} />
                </Col>
                <Col>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
                        Tạo gói mới
                    </Button>
                </Col>
            </Row>

            <List
                grid={{ gutter: 16, xs: 1, sm: 1, md: 1, lg: 2, xl: 2, xxl: 3 }}
                dataSource={packages}
                loading={loading}
                locale={{ emptyText: 'Chưa có gói offline nào. Hãy tạo gói đầu tiên!' }}
                renderItem={pkg => {
                    const sc = statusConfig[pkg.status] || statusConfig.draft
                    const isBuilding = pkg.status === 'building' || pkg.status === 'Building'
                    const isActive = pkg.status === 'active' || pkg.status === 'Active'
                    const isDraft = pkg.status === 'draft' || pkg.status === 'Draft'

                    return (
                        <List.Item>
                            <Card 
                                bordered={false} 
                                style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}
                                actions={[
                                    isActive && (
                                        <Tooltip title="Tải về" key="download">
                                            <Button type="link" href={`${API_BASE}/offlinepackages/${pkg.id}/download`} download icon={<DownloadOutlined />} />
                                        </Tooltip>
                                    ),
                                    isActive && (
                                        <Tooltip title="Rebuild" key="rebuild">
                                            <Button type="link" onClick={() => handleBuild(pkg.id)} icon={<SyncOutlined />} />
                                        </Tooltip>
                                    ),
                                    isDraft && (
                                        <Button type="link" key="build" onClick={() => handleBuild(pkg.id)}>Tạo gói</Button>
                                    ),
                                    isBuilding && (
                                        <span key="building" style={{ color: '#faad14', fontSize: 13 }}><SyncOutlined spin /> Đang xử lý...</span>
                                    ),
                                    <Popconfirm
                                        key="delete"
                                        title="Xóa gói offline này?"
                                        description="Hành động này không thể hoàn tác."
                                        onConfirm={() => handleDelete(pkg.id)}
                                        okText="Xóa"
                                        cancelText="Hủy"
                                        okButtonProps={{ danger: true }}
                                    >
                                        <Tooltip title="Xóa">
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
                                            <Text type="secondary" style={{ fontSize: 12 }}>Phiên bản {pkg.version}</Text>
                                        </div>
                                    </Space>
                                    <Tag color={sc.color} icon={sc.icon}>{sc.label}</Tag>
                                </div>

                                <Space size="middle" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
                                    <Text type="secondary">📍 {pkg.poiCount} POI</Text>
                                    <Text type="secondary">🔊 {pkg.audioCount} Audio</Text>
                                    <Text type="secondary">🖼️ {pkg.imageCount} Hình</Text>
                                    <Text type="secondary">📦 {formatSize(pkg.fileSize)}</Text>
                                    <Text type="secondary">⬇️ {pkg.downloadCount || 0} lượt tải</Text>
                                </Space>

                                {isBuilding && (
                                    <div style={{ marginTop: 8 }}>
                                        <Progress percent={pkg.progress || 0} status="active" size="small" />
                                        <Text type="secondary" style={{ fontSize: 12 }}>{pkg.currentStep ? `Đang xử lý: ${pkg.currentStep}` : 'Đang xử lý...'}</Text>
                                    </div>
                                )}

                                {pkg.updatedAt && (
                                    <div style={{ marginTop: 16 }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>Cập nhật: {new Date(pkg.updatedAt).toLocaleDateString('vi-VN')}</Text>
                                    </div>
                                )}
                            </Card>
                        </List.Item>
                    )
                }}
            />

            <Modal
                title="Tạo gói Offline mới"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                destroyOnClose
            >
                <Form layout="vertical" form={form} onFinish={handleCreate} initialValues={{ languageId: '1', version: '1.0' }}>
                    <Form.Item name="name" label="Tên gói" rules={[{ required: true, message: 'Vui lòng nhập tên gói!' }]}>
                        <Input placeholder="VD: Vĩnh Khánh Pack - Tiếng Việt" />
                    </Form.Item>

                    <Form.Item name="languageId" label="Ngôn ngữ">
                        <Select>
                            <Select.Option value="1">🇻🇳 Tiếng Việt</Select.Option>
                            <Select.Option value="2">🇬🇧 English</Select.Option>
                            <Select.Option value="3">🇨🇳 中文</Select.Option>
                            <Select.Option value="4">🇯🇵 日本語</Select.Option>
                            <Select.Option value="5">🇰🇷 한국어</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item name="version" label="Phiên bản" rules={[{ required: true, message: 'Vui lòng nhập phiên bản!' }]}>
                        <Input />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                        <Button onClick={() => setIsModalVisible(false)}>Hủy</Button>
                        <Button type="primary" htmlType="submit" loading={createLoading}>
                            Tạo mới
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    )
}
