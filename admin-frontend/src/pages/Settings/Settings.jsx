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
                message.error('Failed to load settings')
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
            message.success('System settings saved successfully!')
        } catch (err) {
            message.error(err?.error?.message || 'Error saving settings.')
        } finally {
            setSaving(false)
        }
    }

    const handleMaintenance = async (enabled) => {
        setIsMaintenance(enabled)
        try {
            await settingsApi.setMaintenance(enabled)
            message.success(`Maintenance mode ${enabled ? 'ENABLED' : 'DISABLED'}`)
        } catch (err) {
            console.error('[Settings] maintenance toggle failed:', err)
            setIsMaintenance(!enabled) // revert
            message.error('Error changing maintenance mode')
        }
    }

    const handleGenerateApiKey = () => {
        Modal.confirm({
            title: 'Generate new API key?',
            content: 'The old API key will be invalidated immediately.',
            okText: 'Generate',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    const res = await settingsApi.generateApiKey()
                    if (res.data) {
                        form.setFieldsValue({ api_apiKey: res.data })
                        message.success('New API key generated')
                    }
                } catch (err) {
                    console.error('[Settings] generate key failed:', err)
                    message.error('Error generating new API key')
                }
            }
        })
    }

    const handleCopyKey = () => {
        const key = form.getFieldValue('api_apiKey')
        if (key) {
            navigator.clipboard.writeText(key)
            message.success('API key copied!')
        }
    }

    const handleReset = () => {
        Modal.confirm({
            title: 'Reset to defaults?',
            content: 'All settings will return to system defaults.',
            okText: 'Reset',
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
                message.info('Default settings restored (not saved)')
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
                        <Card title={<Space><EnvironmentOutlined /> Geofence Settings</Space>} bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="geofence_defaultRadius" label="Default Radius (meters)" extra="Range 10 – 500">
                                        <InputNumber min={10} max={500} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="geofence_gpsUpdateFrequency" label="GPS Update Frequency (seconds)">
                                        <InputNumber min={1} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                                <Col span={24}>
                                    <Form.Item name="geofence_gpsAccuracy" label="GPS Accuracy">
                                        <Select>
                                            <Select.Option value="High">High</Select.Option>
                                            <Select.Option value="Medium">Medium</Select.Option>
                                            <Select.Option value="Low">Low</Select.Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Alert type="info" message="Smaller radius triggers more accurately but consumes more device battery" showIcon />
                        </Card>

                        {/* Sync */}
                        <Card title={<Space><RetweetOutlined /> Sync Settings</Space>} bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginTop: 24 }}>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="sync_syncFrequency" label="Sync Frequency (minutes)">
                                        <InputNumber min={1} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="sync_batchSize" label="Batch Size" extra="Records/sync">
                                        <InputNumber min={1} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                            </Row>
                            
                            <Divider style={{ margin: '12px 0' }} />
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <Text strong>Compress sync data</Text><br />
                                    <Text type="secondary" style={{ fontSize: 13 }}>Reduces data transfer size</Text>
                                </div>
                                <Form.Item name="sync_compressData" valuePropName="checked" style={{ marginBottom: 0 }}>
                                    <Switch />
                                </Form.Item>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <Text strong>Sync over Wi-Fi only</Text><br />
                                    <Text type="secondary" style={{ fontSize: 13 }}>Do not use cellular data for syncing</Text>
                                </div>
                                <Form.Item name="sync_wifiOnly" valuePropName="checked" style={{ marginBottom: 0 }}>
                                    <Switch />
                                </Form.Item>
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} lg={12}>
                        {/* Narration */}
                        <Card title={<Space><SoundOutlined /> Narration Settings</Space>} bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="narration_defaultCooldown" label="Default Cooldown (minutes)">
                                        <InputNumber min={0} style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="narration_defaultMode" label="Default Mode">
                                        <Select>
                                            <Select.Option value="Auto">Auto</Select.Option>
                                            <Select.Option value="Recorded">Recorded audio only</Select.Option>
                                            <Select.Option value="TTS">TTS only</Select.Option>
                                            <Select.Option value="Text">Text only</Select.Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="narration_ttsVoiceVi" label="TTS Voice (Vietnamese)">
                                        <Select>
                                            <Select.Option value="vi-VN-HoaiMyNeural">Hoài My (Female)</Select.Option>
                                            <Select.Option value="vi-VN-NamMinhNeural">Nam Minh (Male)</Select.Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="narration_ttsVoiceEn" label="TTS Voice (English)">
                                        <Select>
                                            <Select.Option value="en-US-JennyNeural">Jenny (Female)</Select.Option>
                                            <Select.Option value="en-US-GuyNeural">Guy (Male)</Select.Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={24}>
                                    <Form.Item name="narration_ttsSpeed" label="TTS Speech Rate" style={{ marginBottom: 8 }}>
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
                                    <Text strong>Auto-generate TTS when adding POI</Text><br />
                                    <Text type="secondary" style={{ fontSize: 13 }}>System will call Azure TTS API to generate audio files</Text>
                                </div>
                                <Form.Item name="narration_autoGenerateTTS" valuePropName="checked" style={{ marginBottom: 0 }}>
                                    <Switch />
                                </Form.Item>
                            </div>
                        </Card>

                        {/* API Config */}
                        <Card title={<Space><ApiOutlined /> API & Integration</Space>} bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginTop: 24 }}>
                            <Form.Item name="api_apiKey" label="API Key">
                                <Space.Compact style={{ width: '100%' }}>
                                    <Input readOnly placeholder="—" />
                                    <Button icon={<CopyOutlined />} onClick={handleCopyKey}>Copy</Button>
                                    <Button icon={<SyncOutlined />} onClick={handleGenerateApiKey}>New</Button>
                                </Space.Compact>
                            </Form.Item>

                            <Divider style={{ margin: '12px 0' }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <Space><WarningOutlined style={{ color: '#faad14' }} /><Text strong>Maintenance Mode</Text></Space><br />
                                    <Text type="secondary" style={{ fontSize: 13 }}>Suspend all mobile app APIs</Text>
                                </div>
                                <Switch checked={isMaintenance} onChange={handleMaintenance} checkedChildren="On" unCheckedChildren="Off" />
                            </div>

                            {isMaintenance && (
                                <Alert type="error" message="Maintenance mode is ON — All mobile app APIs are suspended!" banner />
                            )}
                        </Card>
                    </Col>
                </Row>

                <div style={{ marginTop: 24, padding: 24, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: 16 }}>
                    <Button type="primary" htmlType="submit" size="large" icon={<SaveOutlined />} loading={saving}>
                        Save changes
                    </Button>
                    <Button size="large" icon={<ReloadOutlined />} onClick={handleReset}>
                        Reset to defaults
                    </Button>
                </div>
            </Form>
        </div>
    )
}
