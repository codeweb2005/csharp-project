/**
 * Audio — Admin page for managing audio narrations and media images.
 *
 * Wired to live API:
 *   GET    /api/v1/audio/poi/:poiId         → list audio files for a POI
 *   POST   /api/v1/audio/poi/:poiId/upload  → upload audio file
 *   POST   /api/v1/audio/poi/:poiId/generate-tts → generate TTS audio
 *   DELETE /api/v1/audio/:id                → delete audio file
 *   PATCH  /api/v1/audio/:id/set-default    → set as default narration
 *   GET    /api/v1/audio/:id/stream         → stream audio for playback
 *   GET    /api/v1/media/poi/:poiId         → list images for a POI
 *   POST   /api/v1/media/poi/:poiId/upload  → upload image
 *   DELETE /api/v1/media/:id                → delete image
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { UploadOutlined, PlayCircleOutlined, PauseCircleOutlined, DeleteOutlined, DownloadOutlined, AudioOutlined, RobotOutlined, PictureOutlined, StarFilled, StarOutlined, PlusOutlined } from '@ant-design/icons'
import { Card, Select, Button, Table, Space, Typography, Tag, Radio, Form, Input, Slider, Row, Col, message, Tooltip, Spin, Popconfirm, Badge, Divider } from 'antd'
import { audio as audioApi, media as mediaApi, pois as poisApi, API_BASE } from '../../api.js'
import useCurrentUser from '../../hooks/useCurrentUser.js'

const { Title, Text } = Typography

const API_HOST = API_BASE.replace(/\/api\/v1$/, '')
function resolveImageUrl(url) {
    if (!url) return null
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return `${API_HOST}${url.startsWith('/') ? '' : '/'}${url}`
}

function formatDuration(s) {
    if (!s) return '0:00'
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function formatSize(bytes) {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function Audio() {
    const { isVendor, vendorPOIIds } = useCurrentUser()

    const [poiOptions, setPoiOptions] = useState([])
    const [selectedPOI, setSelectedPOI] = useState(null)

    const [audioFiles, setAudioFiles] = useState([])
    const [images, setImages] = useState([])
    const [loading, setLoading] = useState(true)

    const [playingId, setPlayingId] = useState(null)
    const audioRef = useRef(null)

    const [showTTS, setShowTTS] = useState(false)
    const [ttsLoading, setTtsLoading] = useState(false)
    const [ttsForm] = Form.useForm()

    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef(null)
    const imgInputRef = useRef(null)
    const [uploadLangId, setUploadLangId] = useState(1)

    const [filterLang, setFilterLang] = useState('all')

    useEffect(() => {
        async function loadPOIs() {
            try {
                if (isVendor && vendorPOIIds.length > 0) {
                    // Vendor: fetch each owned POI's name to populate the dropdown
                    const results = await Promise.allSettled(
                        vendorPOIIds.map(id => poisApi.getDetail(id).then(r => ({ id, name: r.data?.name || `POI #${id}` })))
                    )
                    const options = results
                        .filter(r => r.status === 'fulfilled')
                        .map(r => r.value)
                    setPoiOptions(options)
                    if (options.length > 0) setSelectedPOI(options[0].id)
                } else if (!isVendor) {
                    const res = await poisApi.getList({ page: 1, size: 100 })
                    const items = res.data?.items ?? []
                    setPoiOptions(items)
                    if (items.length > 0) setSelectedPOI(items[0].id)
                }
            } catch (err) {
                console.error('[Audio] load POIs failed:', err)
            }
        }
        loadPOIs()
    }, [isVendor, vendorPOIIds.join(',')])

    const fetchData = useCallback(async () => {
        if (!selectedPOI) return
        setLoading(true)
        try {
            const [audioRes, mediaRes] = await Promise.all([
                audioApi.getByPOI(selectedPOI),
                mediaApi.getByPOI(selectedPOI),
            ])
            setAudioFiles(audioRes.data ?? [])
            setImages(mediaRes.data ?? [])
        } catch (err) {
            message.error('Failed to load audio/media data.')
            console.error('[Audio] fetch error:', err)
        } finally {
            setLoading(false)
        }
    }, [selectedPOI])

    useEffect(() => { fetchData() }, [fetchData])

    function togglePlay(id) {
        if (playingId === id) {
            audioRef.current?.pause()
            setPlayingId(null)
        } else {
            if (audioRef.current) audioRef.current.pause()
            const audio = new window.Audio(`${API_BASE}/audio/${id}/stream`)
            audio.onended = () => setPlayingId(null)
            audio.play()
            audioRef.current = audio
            setPlayingId(id)
        }
    }

    async function handleSetDefault(id) {
        try {
            await audioApi.setDefault(id)
            message.success('Set as default')
            fetchData()
        } catch (err) {
            console.error('[Audio] set default failed:', err)
            message.error('Error setting as default')
        }
    }

    async function handleDeleteAudio(id) {
        try {
            await audioApi.delete(id)
            if (playingId === id) { audioRef.current?.pause(); setPlayingId(null) }
            message.success('Audio deleted')
            fetchData()
        } catch (err) {
            console.error('[Audio] delete failed:', err)
            message.error('Error deleting audio')
        }
    }

    async function handleUploadAudio(e) {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        try {
            await audioApi.upload(selectedPOI, file, uploadLangId)
            message.success('Audio uploaded')
            fetchData()
        } catch (err) {
            console.error('[Audio] upload failed:', err)
            message.error(err?.error?.message || 'Upload failed.')
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    async function handleGenerateTTS(values) {
        if (!values.text.trim()) return
        setTtsLoading(true)
        try {
            await audioApi.generateTTS(selectedPOI, {
                languageId: Number(values.languageId),
                text: values.text,
                voiceName: values.voiceName,
                speed: Number(values.speed),
            })
            setShowTTS(false)
            message.success('TTS generated successfully')
            fetchData()
        } catch (err) {
            message.error(err?.error?.message || 'Failed to generate TTS.')
        } finally {
            setTtsLoading(false)
        }
    }

    async function handleUploadImage(e) {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        try {
            await mediaApi.upload(selectedPOI, file, null, false)
            message.success('Image uploaded')
            fetchData()
        } catch (err) {
            console.error('[Audio] image upload failed:', err)
            message.error('Image upload failed.')
        } finally {
            setUploading(false)
            if (imgInputRef.current) imgInputRef.current.value = ''
        }
    }

    async function handleDeleteImage(id) {
        try {
            await mediaApi.delete(id)
            message.success('Image deleted')
            fetchData()
        } catch (err) {
            console.error('[Audio] delete image failed:', err)
            message.error('Image deletion failed.')
        }
    }

    async function handleSetPrimary(id) {
        try {
            await mediaApi.setPrimary(id)
            message.success('Primary image set')
            fetchData()
        } catch (err) {
            console.error('[Audio] set primary failed:', err)
            message.error('Failed to set primary image.')
        }
    }

    const filtered = filterLang === 'all'
        ? audioFiles
        : audioFiles.filter(a => a.languageName === filterLang)

    const poiName = poiOptions.find(p => p.id === selectedPOI)?.name || ''

    const columns = [
        {
            title: 'Language',
            key: 'language',
            render: (_, record) => <Space><span>{record.flagEmoji}</span><span>{record.languageName}</span></Space>,
        },
        {
            title: 'File',
            dataIndex: 'filePath',
            key: 'filePath',
            render: (text, record) => <Text>{text?.split('/').pop() || `audio_${record.id}`}</Text>,
        },
        {
            title: 'Type',
            dataIndex: 'voiceType',
            key: 'voiceType',
            render: (type) => (
                <Tag color={type === 'Recorded' ? 'green' : 'blue'} icon={type === 'Recorded' ? <AudioOutlined /> : <RobotOutlined />}>
                    {type}
                </Tag>
            ),
        },
        {
            title: 'Duration',
            dataIndex: 'duration',
            key: 'duration',
            render: (dur) => formatDuration(dur),
        },
        {
            title: 'Size',
            dataIndex: 'fileSize',
            key: 'fileSize',
            render: (size) => formatSize(size),
        },
        {
            title: 'Default',
            key: 'isDefault',
            render: (_, record) => (
                <Radio checked={record.isDefault} onChange={() => handleSetDefault(record.id)} />
            )
        },
        {
            title: 'Listen',
            key: 'play',
            render: (_, record) => (
                <Button 
                    type={playingId === record.id ? 'primary' : 'default'} 
                    shape="circle" 
                    icon={playingId === record.id ? <PauseCircleOutlined /> : <PlayCircleOutlined />} 
                    onClick={() => togglePlay(record.id)} 
                />
            )
        },
        {
            title: 'Actions',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Tooltip title="Download">
                        <Button type="text" icon={<DownloadOutlined />} href={`${API_BASE}/audio/${record.id}/stream`} download target="_blank" />
                    </Tooltip>
                    <Tooltip title="Download QR">
                        <Button type="text" icon={<DownloadOutlined />} href={`${API_BASE}/audio/${record.id}/qr`} download target="_blank" />
                    </Tooltip>
                    <Tooltip title="Delete">
                        <Popconfirm title="Delete this audio file?" onConfirm={() => handleDeleteAudio(record.id)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            )
        }
    ]

    return (
        <div style={{ padding: '0 0 24px 0', animation: 'fadeIn 0.4s ease-out' }}>
            <Card variant="borderless" style={{ marginBottom: 24, borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <Row gutter={[16, 16]} align="middle" justify="space-between">
                    <Col xs={24} md={12}>
                        <Space wrap>
                            <Select
                                style={{ width: 250 }}
                                placeholder="Select POI"
                                value={selectedPOI}
                                onChange={val => { setSelectedPOI(val); setShowTTS(false) }}
                                options={poiOptions.map(p => ({ label: p.name, value: p.id }))}
                                showSearch
                                optionFilterProp="label"
                            />
                            <Select
                                style={{ width: 180 }}
                                value={filterLang}
                                onChange={setFilterLang}
                                options={[
                                    { label: 'All languages', value: 'all' },
                                    ...[...new Set(audioFiles.map(a => a.languageName))].map(lang => ({
                                        label: `${audioFiles.find(a => a.languageName === lang)?.flagEmoji} ${lang}`,
                                        value: lang
                                    }))
                                ]}
                            />
                        </Space>
                    </Col>
                    <Col xs={24} md={12} style={{ textAlign: 'right' }}>
                        <Space wrap>
                            <Select
                                style={{ width: 80 }}
                                value={uploadLangId}
                                onChange={setUploadLangId}
                                options={[
                                    { label: 'VI', value: 1 },
                                    { label: 'EN', value: 2 }
                                ]}
                            />
                            <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()} disabled={uploading || !selectedPOI} loading={uploading}>
                                Upload Audio
                            </Button>
                            <input ref={fileInputRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleUploadAudio} />
                            
                            <Button type="primary" icon={<RobotOutlined />} onClick={() => { setShowTTS(true); ttsForm.setFieldsValue({ languageId: 1, voiceName: 'vi-VN-HoaiMyNeural', speed: 1.0, text: '' }) }} disabled={!selectedPOI}>
                                Generate TTS
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            <Row gutter={[24, 24]} style={{ position: 'relative' }}>
                <Col xs={24} xl={showTTS ? 16 : 24} style={{ transition: 'all 0.3s' }}>
                    
                    <Card title={<span><PictureOutlined /> Images — <Text type="secondary">{poiName}</Text></span>} variant="borderless" style={{ marginBottom: 24, borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
                            {images.map(img => (
                                <div key={img.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: img.isPrimary ? '2px solid #00246a' : '1px solid #e2e8f0', aspectRatio: '1/1', backgroundColor: '#f8fafc' }}>
                                    <div onClick={() => handleSetPrimary(img.id)} style={{ width: '100%', height: '100%', cursor: 'pointer' }} title="Click to set as primary">
                                        {img.url ? (
                                            <img src={resolveImageUrl(img.url)} alt={img.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                                <PictureOutlined style={{ fontSize: 32, color: '#cbd5e1' }} />
                                            </div>
                                        )}
                                    </div>
                                    
                                    {img.isPrimary && (
                                        <div style={{ position: 'absolute', top: 4, left: 4, zIndex: 10 }}>
                                            <Badge count={<StarFilled style={{ color: '#f59e0b', fontSize: 16 }} />} />
                                        </div>
                                    )}

                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 8px 4px', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                        <Space orientation="vertical" size={0} style={{ color: '#fff' }}>
                                            <Text style={{ color: '#fff', fontSize: 12, display: 'block', maxWidth: 100 }} ellipsis>{img.caption || `IMG-${img.id}`}</Text>
                                            <Text style={{ color: '#cbd5e1', fontSize: 10 }}>{formatSize(img.fileSize)}</Text>
                                        </Space>
                                        <Popconfirm title="Delete this image?" onConfirm={() => handleDeleteImage(img.id)} placement="topRight" okText="Delete" cancelText="Cancel">
                                            <Button type="text" danger size="small" icon={<DeleteOutlined />} style={{ color: '#ef4444', backgroundColor: 'rgba(255,255,255,0.9)' }} />
                                        </Popconfirm>
                                    </div>
                                </div>
                            ))}
                            
                            <div 
                                onClick={() => imgInputRef.current?.click()} 
                                style={{ borderRadius: 8, border: '2px dashed #cbd5e1', aspectRatio: '1/1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: '#f8fafc', transition: 'all 0.2s', padding: 12, textAlign: 'center' }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#00246a'; e.currentTarget.style.backgroundColor = '#eff6ff' }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = '#f8fafc' }}
                            >
                                <PlusOutlined style={{ fontSize: 24, color: '#94a3b8', marginBottom: 8 }} />
                                <Text strong style={{ color: '#64748b' }}>Add Image</Text>
                                <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>JPG, PNG • Max 5MB</Text>
                            </div>
                            <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUploadImage} />
                        </div>
                    </Card>

                    <Card title={<span><AudioOutlined /> Narration Audio <Badge count={filtered.length} style={{ backgroundColor: '#00246a', marginLeft: 8 }} /></span>} variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <Table 
                            columns={columns} 
                            dataSource={filtered} 
                            rowKey="id" 
                            pagination={false} 
                            loading={loading}
                            scroll={{ x: 800 }}
                        />
                    </Card>
                </Col>

                <Col
                    xs={24}
                    xl={8}
                    style={
                        showTTS
                            ? { transition: 'all 0.3s' }
                            : {
                                position: 'absolute',
                                width: 1,
                                height: 1,
                                margin: -1,
                                padding: 0,
                                overflow: 'hidden',
                                clip: 'rect(0,0,0,0)',
                                whiteSpace: 'nowrap',
                                border: 0,
                            }
                    }
                    aria-hidden={!showTTS}
                >
                        <Card title={<Space><RobotOutlined style={{ color: '#00246a' }} /><span>Auto Generate TTS</span></Space>} variant="borderless" style={{ borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'sticky', top: 24 }} extra={<Button type="text" onClick={() => setShowTTS(false)}>✕</Button>}>
                            <Form form={ttsForm} layout="vertical" onFinish={handleGenerateTTS}>
                                <Form.Item name="languageId" label="Language">
                                    <Select>
                                        <Select.Option value={1}>🇻🇳 Vietnamese</Select.Option>
                                        <Select.Option value={2}>🇬🇧 English</Select.Option>
                                    </Select>
                                </Form.Item>
                                
                                <Form.Item name="voiceName" label="Voice">
                                    <Select>
                                        <Select.Option value="vi-VN-HoaiMyNeural">vi-VN-HoaiMyNeural (Female)</Select.Option>
                                        <Select.Option value="vi-VN-NamMinhNeural">vi-VN-NamMinhNeural (Male)</Select.Option>
                                        <Select.Option value="en-US-JennyNeural">en-US-JennyNeural (Female)</Select.Option>
                                        <Select.Option value="en-US-GuyNeural">en-US-GuyNeural (Male)</Select.Option>
                                    </Select>
                                </Form.Item>

                                <Form.Item name="text" label="Narration Text" rules={[{ required: true, message: 'Please enter content' }]}>
                                    <Input.TextArea rows={6} placeholder="Enter narration text..." style={{ resize: 'none' }} />
                                </Form.Item>

                                <Form.Item name="speed" label="Speech Rate">
                                    <Slider min={0.5} max={2.0} step={0.1} marks={{ 0.5: '0.5x', 1.0: '1.0x', 1.5: '1.5x', 2.0: '2.0x' }} />
                                </Form.Item>

                                <Divider style={{ margin: '16px 0' }} />

                                <Button type="primary" htmlType="submit" block icon={<AudioOutlined />} loading={ttsLoading}>
                                    {ttsLoading ? 'Generating...' : 'Generate & Save'}
                                </Button>
                            </Form>
                        </Card>
                    </Col>
            </Row>
        </div>
    )
}
