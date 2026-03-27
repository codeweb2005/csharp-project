import { SaveOutlined, ReloadOutlined, WarningOutlined, CopyOutlined, SyncOutlined, EnvironmentOutlined, SoundOutlined, RetweetOutlined, ApiOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import { Card, Form, Input, InputNumber, Select, Slider, Switch, Button, Typography, Space, Row, Col, Alert, Divider, Modal, message } from 'antd'
import { settings as settingsApi } from '../../api.js'

const { Title, Text } = Typography

const defaultSettings = {
    geofence: { defaultRadius: 30, gpsUpdateFrequency: 5, gpsAccuracy: 'High' },
    narration: { defaultCooldown: 30, defaultMode: 'Auto', ttsVoiceVi: 'vi-VN-HoaiMyNeural', ttsVoiceEn: 'en-US-JennyNeural', ttsSpeed: 1.0, autoGenerateTTS: true },
    sync: { syncFrequency: 15, batchSize: 50, compressData: true, wifiOnly: false },
    api: { apiKey: '', maintenanceMode: false },
}

export default function Settings() {
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isMaintenance, setIsMaintenance] = useState(false)

    useEffect(() => {
        async function load() {
            try {
                const res = await settingsApi.getAll()
                const data = res.data ? { ...defaultSettings, ...res.data } : defaultSettings
                
                // Flatten structural data for Ant Design form
                form.setFieldsValue({
                    geofence_defaultRadius: data.geofence.defaultRadius,
                    geofence_gpsUpdateFrequency: data.geofence.gpsUpdateFrequency,
                    geofence_gpsAccuracy: data.geofence.gpsAccuracy,
                    narration_defaultCooldown: data.narration.defaultCooldown,
                    narration_defaultMode: data.narration.defaultMode,
                    narration_ttsVoiceVi: data.narration.ttsVoiceVi,
                    narration_ttsVoiceEn: data.narration.ttsVoiceEn,
                    narration_ttsSpeed: data.narration.ttsSpeed,
                    narration_autoGenerateTTS: data.narration.autoGenerateTTS,
                    sync_syncFrequency: data.sync.syncFrequency,
                    sync_batchSize: data.sync.batchSize,
                    sync_compressData: data.sync.compressData,
                    sync_wifiOnly: data.sync.wifiOnly,
                    api_apiKey: data.api.apiKey,
                })
                setIsMaintenance(data.api.maintenanceMode)
            } catch (err) {
                console.error('[Settings] load error:', err)
                message.error('Không thể tải cài đặt')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [form])

    const handleSave = async (values) => {
        setSaving(true)
        try {
            // Unflatten data for API
            const updatePayload = {
                geofence: {
                    defaultRadius: values.geofence_defaultRadius,
                    gpsUpdateFrequency: values.geofence_gpsUpdateFrequency,
                    gpsAccuracy: values.geofence_gpsAccuracy,
                },
                narration: {
                    defaultCooldown: values.narration_defaultCooldown,
                    defaultMode: values.narration_defaultMode,
                    ttsVoiceVi: values.narration_ttsVoiceVi,
                    ttsVoiceEn: values.narration_ttsVoiceEn,
                    ttsSpeed: values.narration_ttsSpeed,
                    autoGenerateTTS: values.narration_autoGenerateTTS,
                },
                sync: {
                    syncFrequency: values.sync_syncFrequency,
                    batchSize: values.sync_batchSize,
                    compressData: values.sync_compressData,
                    wifiOnly: values.sync_wifiOnly,
                },
                api: {
                    apiKey: values.api_apiKey,
                    maintenanceMode: isMaintenance,
                }
            }
            await settingsApi.update(updatePayload)
            message.success('Đã lưu cài đặt hệ thống thành công!')
        } catch (err) {
            message.error(err?.error?.message || 'Lỗi khi lưu cài đặt.')
        } finally {
            setSaving(false)
        }
    }

    const handleMaintenance = async (enabled) => {
        setIsMaintenance(enabled)
        try {
            await settingsApi.setMaintenance(enabled)
            message.success(`Đã ${enabled ? 'BẬT' : 'TẮT'} chế độ bảo trì`)
        } catch (err) {
            console.error('[Settings] maintenance toggle failed:', err)
            setIsMaintenance(!enabled) // revert
            message.error('Lỗi khi thay đổi chế độ bảo trì')
        }
    }

    const handleGenerateApiKey = () => {
        Modal.confirm({
            title: 'Tạo API key mới?',
            content: 'API key cũ sẽ bị vô hiệu ngay lập tức.',
            okText: 'Tạo mới',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    const res = await settingsApi.generateApiKey()
                    if (res.data) {
                        form.setFieldsValue({ api_apiKey: res.data })
                        message.success('Đã tạo API key mới')
                    }
                } catch (err) {
                    console.error('[Settings] generate key failed:', err)
                    message.error('Lỗi khi tạo API key mới')
                }
            }
        })
    }

    const handleCopyKey = () => {
        const key = form.getFieldValue('api_apiKey')
        if (key) {
            navigator.clipboard.writeText(key)
            message.success('Đã copy API key!')
        }
    }

    const handleReset = () => {
        Modal.confirm({
            title: 'Đặt lại về mặc định?',
            content: 'Tất cả cài đặt sẽ trở về giá trị mặc định của hệ thống.',
            okText: 'Đặt lại',
            onOk: () => {
                form.setFieldsValue({
                    geofence_defaultRadius: defaultSettings.geofence.defaultRadius,
                    geofence_gpsUpdateFrequency: defaultSettings.geofence.gpsUpdateFrequency,
                    geofence_gpsAccuracy: defaultSettings.geofence.gpsAccuracy,
                    narration_defaultCooldown: defaultSettings.narration.defaultCooldown,
                    narration_defaultMode: defaultSettings.narration.defaultMode,
                    narration_ttsVoiceVi: defaultSettings.narration.ttsVoiceVi,
                    narration_ttsVoiceEn: defaultSettings.narration.ttsVoiceEn,
                    narration_ttsSpeed: defaultSettings.narration.ttsSpeed,
                    narration_autoGenerateTTS: defaultSettings.narration.autoGenerateTTS,
                    sync_syncFrequency: defaultSettings.sync.syncFrequency,
                    sync_batchSize: defaultSettings.sync.batchSize,
                    sync_compressData: defaultSettings.sync.compressData,
                    sync_wifiOnly: defaultSettings.sync.wifiOnly,
                })
                message.info('Đã khôi phục cài đặt mặc định (chưa lưu)')
            }
        })
    }

    if (loading) {
        return <div style={{ padding: 40, textAlign: 'center' }}><SyncOutlined spin style={{ fontSize: 24 }} /></div>
    }

    return (
        <div style={{ padding: '0 0 24px 0', animation: 'fadeIn 0.4s ease-out' }}>
            <Form 
                form={form} 
                layout="vertical" 
                onFinish={handleSave}
                requiredMark={false}
            >
                <Row gutter={[24, 24]}>
                    <Col xs={24} lg={12}>
                        {/* Geofence */}
                        <Card title={<Space><EnvironmentOutlined /> Cài đặt Geofence</Space>} bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="geofence_defaultRadius" label="Bán kính mặc định (mét)" extra="Phạm vi 10 – 500">
                                        <InputNumber min={10} max={500} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="geofence_gpsUpdateFrequency" label="Tần suất GPS (giây)">
                                        <InputNumber min={1} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                                <Col span={24}>
                                    <Form.Item name="geofence_gpsAccuracy" label="Độ chính xác GPS">
                                        <Select>
                                            <Select.Option value="High">Cao (High)</Select.Option>
                                            <Select.Option value="Medium">Trung bình (Medium)</Select.Option>
                                            <Select.Option value="Low">Thấp (Low)</Select.Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Alert type="info" message="Bán kính nhỏ hơn sẽ kích hoạt chính xác hơn nhưng tốn pin thiết bị hơn" showIcon />
                        </Card>

                        {/* Sync */}
                        <Card title={<Space><RetweetOutlined /> Cài đặt Đồng bộ</Space>} bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginTop: 24 }}>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="sync_syncFrequency" label="Tần suất đồng bộ (phút)">
                                        <InputNumber min={1} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="sync_batchSize" label="Kích thước batch" extra="Records/lần sync">
                                        <InputNumber min={1} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                            </Row>
                            
                            <Divider style={{ margin: '12px 0' }} />
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <Text strong>Nén dữ liệu khi đồng bộ</Text><br />
                                    <Text type="secondary" style={{ fontSize: 13 }}>Giảm dung lượng dữ liệu truyền tải</Text>
                                </div>
                                <Form.Item name="sync_compressData" valuePropName="checked" style={{ marginBottom: 0 }}>
                                    <Switch />
                                </Form.Item>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <Text strong>Chỉ đồng bộ qua Wi-Fi</Text><br />
                                    <Text type="secondary" style={{ fontSize: 13 }}>Không sử dụng dữ liệu di động để sync</Text>
                                </div>
                                <Form.Item name="sync_wifiOnly" valuePropName="checked" style={{ marginBottom: 0 }}>
                                    <Switch />
                                </Form.Item>
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} lg={12}>
                        {/* Narration */}
                        <Card title={<Space><SoundOutlined /> Cài đặt Thuyết minh</Space>} bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="narration_defaultCooldown" label="Cooldown mặc định (phút)">
                                        <InputNumber min={0} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="narration_defaultMode" label="Chế độ mặc định">
                                        <Select>
                                            <Select.Option value="Auto">Tự động</Select.Option>
                                            <Select.Option value="Recorded">Chỉ file ghi âm</Select.Option>
                                            <Select.Option value="TTS">Chỉ TTS</Select.Option>
                                            <Select.Option value="Text">Chỉ văn bản</Select.Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="narration_ttsVoiceVi" label="Giọng TTS (Tiếng Việt)">
                                        <Select>
                                            <Select.Option value="vi-VN-HoaiMyNeural">Hoài My (Nữ)</Select.Option>
                                            <Select.Option value="vi-VN-NamMinhNeural">Nam Minh (Nam)</Select.Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="narration_ttsVoiceEn" label="Giọng TTS (Tiếng Anh)">
                                        <Select>
                                            <Select.Option value="en-US-JennyNeural">Jenny (Nữ)</Select.Option>
                                            <Select.Option value="en-US-GuyNeural">Guy (Nam)</Select.Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={24}>
                                    <Form.Item name="narration_ttsSpeed" label="Tốc độ đọc TTS" style={{ marginBottom: 8 }}>
                                        <Row>
                                            <Col span={20}>
                                                <Slider min={0.5} max={2.0} step={0.1} marks={{ 0.5: '0.5x', 1: '1x', 2: '2x' }} />
                                            </Col>
                                            <Col span={4}>
                                                <InputNumber min={0.5} max={2.0} step={0.1} style={{ margin: '0 8px' }} />
                                            </Col>
                                        </Row>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Divider style={{ margin: '12px 0' }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <Text strong>Tự động tạo TTS khi thêm POI</Text><br />
                                    <Text type="secondary" style={{ fontSize: 13 }}>Hệ thống sẽ gọi Azure TTS API để tạo file audio</Text>
                                </div>
                                <Form.Item name="narration_autoGenerateTTS" valuePropName="checked" style={{ marginBottom: 0 }}>
                                    <Switch />
                                </Form.Item>
                            </div>
                        </Card>

                        {/* API Config */}
                        <Card title={<Space><ApiOutlined /> API & Tích hợp</Space>} bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginTop: 24 }}>
                            <Form.Item name="api_apiKey" label="API Key">
                                <Space.Compact style={{ width: '100%' }}>
                                    <Input readOnly placeholder="—" />
                                    <Button icon={<CopyOutlined />} onClick={handleCopyKey}>Copy</Button>
                                    <Button icon={<SyncOutlined />} onClick={handleGenerateApiKey}>Mới</Button>
                                </Space.Compact>
                            </Form.Item>

                            <Divider style={{ margin: '12px 0' }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <Space><WarningOutlined style={{ color: '#faad14' }} /><Text strong>Chế độ bảo trì</Text></Space><br />
                                    <Text type="secondary" style={{ fontSize: 13 }}>Tạm ngưng tất cả API cho mobile app</Text>
                                </div>
                                <Switch checked={isMaintenance} onChange={handleMaintenance} checkedChildren="Bật" unCheckedChildren="Tắt" />
                            </div>

                            {isMaintenance && (
                                <Alert type="error" message="Chế độ bảo trì đang BẬT — Tất cả API cho mobile app đã tạm ngưng!" banner />
                            )}
                        </Card>
                    </Col>
                </Row>

                <div style={{ marginTop: 24, padding: 24, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: 16 }}>
                    <Button type="primary" htmlType="submit" size="large" icon={<SaveOutlined />} loading={saving}>
                        Lưu thay đổi
                    </Button>
                    <Button size="large" icon={<ReloadOutlined />} onClick={handleReset}>
                        Đặt lại mặc định
                    </Button>
                </div>
            </Form>
        </div>
    )
}
