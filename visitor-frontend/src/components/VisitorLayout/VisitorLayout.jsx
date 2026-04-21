import { Link, NavLink, Outlet } from 'react-router-dom'
import { Select } from 'antd'
import { Globe, Headphones, MapPin, Package } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext.jsx'
import './VisitorLayout.css'

export default function VisitorLayout() {
  const { languages, langId, setLangId, loading, t } = useLanguage()
  const navClass = ({ isActive }) => `vk-nav-link${isActive ? ' is-active' : ''}`

  return (
    <div className="vk-layout">
      <header className="vk-header">
        <div className="vk-header-inner">
          <Link to="/" className="vk-brand">
            <span className="vk-brand-mark" aria-hidden />
            <span className="vk-brand-wrap">
              <span className="vk-brand-text">Vinh Khanh Food Tour</span>
              <small className="vk-brand-subtitle">{t('brandSubtitle')}</small>
            </span>
          </Link>
          <nav className="vk-nav" aria-label="Main">
            <NavLink to="/" end className={navClass}>
              <MapPin size={18} aria-hidden />
              {t('navExplore')}
            </NavLink>
            <NavLink to="/queue" className={navClass}>
              <Headphones size={18} aria-hidden />
              {t('navQueue')}
            </NavLink>
            <NavLink to="/offline" className={navClass}>
              <Package size={18} aria-hidden />
              {t('navOffline')}
            </NavLink>
          </nav>
          <div className="vk-header-tools">
            <div className="vk-lang-label">
              <Globe size={16} aria-hidden />
              <span>{t('language')}</span>
            </div>
            <Select
              aria-label={t('language')}
              loading={loading}
              value={langId ?? undefined}
              onChange={setLangId}
              style={{ minWidth: 170 }}
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
