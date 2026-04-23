import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import VisitorLayout from './components/VisitorLayout/VisitorLayout.jsx'
import Home from './pages/Home/Home.jsx'
import POIDetail from './pages/POIDetail/POIDetail.jsx'
import Queue from './pages/Queue/Queue.jsx'
import Offline from './pages/Offline/Offline.jsx'
import { api } from './api.js'
import './index.css'

const WEB_VISITOR_ID_KEY = 'vk_web_visitor_id'
const HEARTBEAT_INTERVAL_MS = 30_000

function getOrCreateVisitorId() {
  const existing = localStorage.getItem(WEB_VISITOR_ID_KEY)
  if (existing) return existing

  const created = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  localStorage.setItem(WEB_VISITOR_ID_KEY, created)
  return created
}

export default function App() {
  useEffect(() => {
    const visitorId = getOrCreateVisitorId()
    const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

    const sendHeartbeat = () => {
      api.presenceHeartbeat(visitorId).catch(() => {})
    }

    sendHeartbeat()
    const timer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)

    const handleBeforeUnload = () => {
      if (!apiBase || typeof navigator === 'undefined' || !navigator.sendBeacon) return
      const blob = new Blob([JSON.stringify({ visitorId })], { type: 'application/json' })
      navigator.sendBeacon(`${apiBase}/presence/web-visitor/exit`, blob)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      clearInterval(timer)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      api.presenceExit(visitorId).catch(() => {})
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VisitorLayout />}>
          <Route index element={<Home />} />
          <Route path="poi/:id" element={<POIDetail />} />
          <Route path="queue" element={<Queue />} />
          <Route path="offline" element={<Offline />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
