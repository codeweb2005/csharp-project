import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, Spin, Table, Typography } from 'antd'
import { ArrowLeft, Download, Package } from 'lucide-react'
import { api, getOfflinePackageDownloadUrl } from '../../api.js'
import './Offline.css'

function formatBytes(n) {
  if (n == null || Number.isNaN(n)) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export default function Offline() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await api.getOfflineCatalog()
        if (!cancelled) setItems(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) setError(e.message || 'Could not load packages.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const columns = [
    {
      title: 'Package',
      dataIndex: 'name',
      key: 'name',
      render: (text, row) => (
        <span>
          {row.flagEmoji ? `${row.flagEmoji} ` : ''}
          <strong>{text}</strong>
          <Typography.Text type="secondary" className="vk-offline-ver">
            {' '}
            v{row.version}
          </Typography.Text>
        </span>
      ),
    },
    {
      title: 'Language',
      key: 'lang',
      width: 140,
      render: (_, row) => row.languageName,
    },
    {
      title: 'POIs / Audio',
      key: 'counts',
      width: 140,
      render: (_, row) => `${row.poiCount} / ${row.audioCount}`,
    },
    {
      title: 'Size',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 100,
      render: (s) => formatBytes(s),
    },
    {
      title: '',
      key: 'action',
      width: 140,
      render: (_, row) => (
        <Button
          type="primary"
          icon={<Download size={16} />}
          href={getOfflinePackageDownloadUrl(row.id)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Download
        </Button>
      ),
    },
  ]

  return (
    <div className="vk-offline">
      <div className="vk-offline-toolbar">
        <Link to="/" className="vk-offline-back">
          <ArrowLeft size={18} aria-hidden />
          Explore
        </Link>
      </div>

      <header className="vk-offline-header">
        <Package size={28} className="vk-offline-icon" aria-hidden />
        <h1 className="vk-page-title">Offline packages</h1>
        <p className="vk-muted">
          Download a ZIP bundle for use in the mobile app when you are offline. Large files — Wi‑Fi
          recommended.
        </p>
      </header>

      {error && <Alert type="error" message={error} showIcon className="vk-offline-alert" />}

      <Card>
        {loading ? (
          <div className="vk-offline-spin">
            <Spin size="large" />
          </div>
        ) : items.length === 0 ? (
          <Typography.Paragraph type="secondary">
            No offline packages are published yet.
          </Typography.Paragraph>
        ) : (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={items}
            pagination={false}
            scroll={{ x: true }}
          />
        )}
      </Card>
    </div>
  )
}
