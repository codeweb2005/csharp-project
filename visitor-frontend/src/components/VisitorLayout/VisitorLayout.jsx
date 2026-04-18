import { Link, Outlet } from 'react-router-dom'
import { Select } from 'antd'
import { MapPin, Headphones, Package } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext.jsx'
import './VisitorLayout.css'

export default function VisitorLayout() {
  const { languages, langId, setLangId, loading } = useLanguage()

  return (
    <div className="vk-layout">
      <header className="vk-header">
        <div className="vk-header-inner">
          <Link to="/" className="vk-brand">
            <span className="vk-brand-mark" aria-hidden />
            <span className="vk-brand-text">Vinh Khanh Food Tour</span>
          </Link>
          <nav className="vk-nav" aria-label="Main">
            <Link to="/" className="vk-nav-link">
              <MapPin size={18} aria-hidden />
              Explore
            </Link>
            <Link to="/queue" className="vk-nav-link">
              <Headphones size={18} aria-hidden />
              Tour queue
            </Link>
            <Link to="/offline" className="vk-nav-link">
              <Package size={18} aria-hidden />
              Offline
            </Link>
          </nav>
          <div className="vk-header-tools">
            <span className="vk-sr-only" id="lang-label">
              Language
            </span>
            <Select
              aria-labelledby="lang-label"
              loading={loading}
              value={langId ?? undefined}
              onChange={setLangId}
              style={{ minWidth: 200 }}
              options={languages.map((l) => ({
                value: l.id,
                label: `${l.flagEmoji ? `${l.flagEmoji} ` : ''}${l.nativeName || l.name}`,
              }))}
              disabled={loading || languages.length === 0}
            />
          </div>
        </div>
      </header>
      <main className="vk-main">
        <Outlet />
      </main>
    </div>
  )
}
