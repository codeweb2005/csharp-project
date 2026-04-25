import { useState, useEffect, useCallback } from 'react'
import { App, Table, Button, Modal, Form, Input, InputNumber, Switch, Tag, Space, Tooltip, Typography, Badge } from 'antd'
import { Plus, Pencil, Trash2, ToggleLeft, Globe, Languages as LanguagesIcon } from 'lucide-react'
import { languages as languagesApi } from '../../api.js'
import './Languages.css'

const { Title, Text } = Typography

// Common TTS locale codes for quick reference
const TTS_PRESETS = [
  { code: 'vi-VN', label: 'Tiếng Việt' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'zh-CN', label: '中文 (简)' },
  { code: 'zh-TW', label: '中文 (繁)' },
  { code: 'ja-JP', label: '日本語' },
  { code: 'ko-KR', label: '한국어' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'es-ES', label: 'Español' },
  { code: 'th-TH', label: 'ภาษาไทย' },
]

export default function Languages() {
  const { message, modal } = App.useApp()
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState(null)   // null = create, obj = edit
  const [saving, setSaving]       = useState(false)
  const [form] = Form.useForm()

  // ── Data fetching ─────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await languagesApi.getAll()
      setData(res.data ?? [])
    } catch {
      message.error('Không thể tải danh sách ngôn ngữ')
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => { load() }, [load])

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ isActive: true, sortOrder: (data.length + 1) * 10 })
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    form.setFieldsValue({
      code:       record.code,
      name:       record.name,
      nativeName: record.nativeName,
      ttsCode:    record.ttsCode ?? '',
      flagEmoji:  record.flagEmoji ?? '',
      sortOrder:  record.sortOrder,
      isActive:   record.isActive,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values) => {
    setSaving(true)
    try {
      const payload = {
        code:       values.code,
        name:       values.name,
        nativeName: values.nativeName,
        ttsCode:    values.ttsCode || null,
        flagEmoji:  values.flagEmoji || null,
        sortOrder:  values.sortOrder ?? 0,
        isActive:   values.isActive ?? true,
      }
      if (editing) {
        await languagesApi.update(editing.id, payload)
        message.success('Cập nhật ngôn ngữ thành công')
      } else {
        await languagesApi.create(payload)
        message.success('Thêm ngôn ngữ thành công')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      message.error(err?.error?.message || 'Có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (record) => {
    try {
      await languagesApi.toggle(record.id)
      message.success(`${record.name} đã ${record.isActive ? 'tắt' : 'bật'}`)
      load()
    } catch {
      message.error('Không thể thay đổi trạng thái')
    }
  }

  const handleDelete = (record) => {
    modal.confirm({
      title: `Xóa ngôn ngữ "${record.name}"?`,
      content: 'Chỉ xóa được nếu ngôn ngữ không có bản dịch POI hoặc audio đang sử dụng.',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await languagesApi.delete(record.id)
          message.success('Đã xóa ngôn ngữ')
          load()
        } catch (err) {
          message.error(err?.error?.message || 'Không thể xóa ngôn ngữ này')
        }
      }
    })
  }

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Ngôn ngữ',
      key: 'name',
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>{r.flagEmoji || '🌐'}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>{r.name}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{r.nativeName}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Mã ISO',
      dataIndex: 'code',
      key: 'code',
      width: 90,
      render: (v) => (
        <Tag style={{ fontFamily: 'monospace', fontWeight: 600, borderRadius: 6 }}>{v}</Tag>
      ),
    },
    {
      title: 'TTS Code',
      dataIndex: 'ttsCode',
      key: 'ttsCode',
      width: 140,
      render: (v) => v
        ? <Tag color="blue" style={{ fontFamily: 'monospace', borderRadius: 6 }}>{v}</Tag>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: 'Thứ tự',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 90,
      sorter: (a, b) => a.sortOrder - b.sortOrder,
      defaultSortOrder: 'ascend',
      render: (v) => <Text style={{ color: '#888', fontSize: 13 }}>{v}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 110,
      render: (v) => (
        <Badge
          status={v ? 'success' : 'default'}
          text={<Text style={{ fontSize: 13, color: v ? '#52c41a' : '#aaa' }}>{v ? 'Kích hoạt' : 'Ẩn'}</Text>}
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 130,
      render: (_, r) => (
        <Space>
          <Tooltip title="Chỉnh sửa">
            <Button
              size="small" type="text"
              icon={<Pencil size={14} />}
              onClick={() => openEdit(r)}
            />
          </Tooltip>
          <Tooltip title={r.isActive ? 'Tắt' : 'Bật'}>
            <Button
              size="small" type="text"
              icon={<ToggleLeft size={14} />}
              onClick={() => handleToggle(r)}
              style={{ color: r.isActive ? '#faad14' : '#52c41a' }}
            />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button
              size="small" type="text" danger
              icon={<Trash2 size={14} />}
              onClick={() => handleDelete(r)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="lang-page" style={{ animation: 'fadeIn 0.4s ease-out' }}>
      {/* Header */}
      <div className="lang-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div className="lang-icon-wrap">
              <LanguagesIcon size={18} color="#C92127" />
            </div>
            <Title level={4} style={{ margin: 0 }}>Quản lý Ngôn ngữ</Title>
          </div>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Thêm và cấu hình các ngôn ngữ hỗ trợ thuyết minh âm thanh
          </Text>
        </div>
        <Button
          type="primary"
          icon={<Plus size={15} />}
          onClick={openCreate}
          style={{
            background: 'linear-gradient(135deg, #C92127, #a01820)',
            border: 'none', borderRadius: 10, height: 38, paddingInline: 20,
            fontWeight: 600,
          }}
        >
          Thêm ngôn ngữ
        </Button>
      </div>

      {/* Stats bar */}
      <div className="lang-stats">
        <div className="lang-stat-card">
          <Globe size={20} color="#C92127" />
          <div>
            <div className="lang-stat-num">{data.length}</div>
            <div className="lang-stat-label">Tổng ngôn ngữ</div>
          </div>
        </div>
        <div className="lang-stat-card">
          <div className="lang-stat-dot active" />
          <div>
            <div className="lang-stat-num">{data.filter(d => d.isActive).length}</div>
            <div className="lang-stat-label">Đang kích hoạt</div>
          </div>
        </div>
        <div className="lang-stat-card">
          <div className="lang-stat-dot" />
          <div>
            <div className="lang-stat-num">{data.filter(d => d.ttsCode).length}</div>
            <div className="lang-stat-label">Hỗ trợ TTS</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="lang-table-wrap">
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="middle"
          rowClassName={(r) => !r.isActive ? 'row-inactive' : ''}
        />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LanguagesIcon size={16} color="#C92127" />
            <span>{editing ? 'Chỉnh sửa ngôn ngữ' : 'Thêm ngôn ngữ mới'}</span>
          </div>
        }
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'Lưu thay đổi' : 'Thêm mới'}
        cancelText="Hủy"
        confirmLoading={saving}
        width={520}
        okButtonProps={{ style: { background: '#C92127', borderColor: '#C92127' } }}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
          style={{ marginTop: 16 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item
              name="code"
              label="Mã ISO 639-1"
              rules={[
                { required: true, message: 'Nhập mã ngôn ngữ' },
                { pattern: /^[a-z]{2}(-[A-Z]{2})?$/, message: 'VD: vi, en, zh-CN' },
              ]}
              extra="VD: vi, en, zh, ko"
            >
              <Input
                placeholder="vi"
                maxLength={10}
                style={{ fontFamily: 'monospace', fontWeight: 600 }}
              />
            </Form.Item>

            <Form.Item
              name="flagEmoji"
              label="Flag Emoji"
              extra="VD: 🇻🇳 🇺🇸 🇨🇳"
            >
              <Input placeholder="🇻🇳" maxLength={4} style={{ fontSize: 20, textAlign: 'center' }} />
            </Form.Item>
          </div>

          <Form.Item
            name="name"
            label="Tên tiếng Anh"
            rules={[{ required: true, message: 'Nhập tên ngôn ngữ' }]}
          >
            <Input placeholder="Vietnamese" maxLength={80} />
          </Form.Item>

          <Form.Item
            name="nativeName"
            label="Tên bản địa"
            rules={[{ required: true, message: 'Nhập tên bản địa' }]}
          >
            <Input placeholder="Tiếng Việt" maxLength={80} />
          </Form.Item>

          <Form.Item
            name="ttsCode"
            label="TTS Locale Code"
            extra={
              <div style={{ marginTop: 6 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Gợi ý: </Text>
                {TTS_PRESETS.slice(0, 6).map(p => (
                  <Button
                    key={p.code}
                    size="small" type="link"
                    style={{ padding: '0 4px', fontSize: 11, height: 'auto' }}
                    onClick={() => form.setFieldValue('ttsCode', p.code)}
                  >
                    {p.code}
                  </Button>
                ))}
              </div>
            }
          >
            <Input
              placeholder="vi-VN"
              maxLength={20}
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="sortOrder" label="Thứ tự hiển thị">
              <InputNumber min={0} max={9999} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="isActive" label="Kích hoạt" valuePropName="checked">
              <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
