import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import { createTranslator } from '../i18n.js'

const LANG_KEY = 'vk_visitor_lang_id'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [languages, setLanguages] = useState([])
  const [langId, setLangIdState] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.getLanguages()
        if (cancelled) return
        setLanguages(list)
        const stored = localStorage.getItem(LANG_KEY)
        const parsed = Number.parseInt(stored ?? '', 10)
        const valid = list.some((l) => l.id === parsed)
        setLangIdState(valid ? parsed : list[0]?.id ?? 1)
      } catch {
        setLangIdState(1)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setLangId = (id) => {
    setLangIdState(id)
    localStorage.setItem(LANG_KEY, String(id))
  }

  const currentLanguage = languages.find((l) => l.id === langId) || null
  const t = useMemo(() => createTranslator(currentLanguage?.code), [currentLanguage?.code])

  return (
    <LanguageContext.Provider value={{ languages, langId, setLangId, loading, currentLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
