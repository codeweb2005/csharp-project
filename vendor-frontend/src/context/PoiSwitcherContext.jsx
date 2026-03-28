/**
 * PoiSwitcherContext — Tracks the "active POI" for Vendor users who manage multiple shops.
 *
 * POI list is always fresh from the server (not just the JWT):
 *   - On mount: calls GET /auth/me to get the server-authoritative vendorPOIIds list
 *   - On window focus / tab visibility restore: re-fetches /auth/me to pick up
 *     any POIs added by the Admin while this tab was in the background
 *   - Exposes refresh() so components can force a re-fetch
 *
 * The active selection is persisted to localStorage so it survives page refresh.
 *
 * Usage:
 *   const { activePOIId, setActivePOIId, activePOI, refresh } = usePoiSwitcher()
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { auth as authApi, pois as poisApi } from '../api.js'
import useCurrentUser from '../hooks/useCurrentUser.js'

const PoiSwitcherContext = createContext(null)

const STORAGE_KEY = 'vendor_active_poi_id'
// Re-fetch on focus only if last fetch was > 30s ago
const REFETCH_COOLDOWN_MS = 30_000

export function PoiSwitcherProvider({ children }) {
    const { vendorPOIIds: jwtPOIIds, isVendor } = useCurrentUser()

    // Live list of POI IDs — starts from JWT, then synced from /auth/me
    const [liveIds, setLiveIds] = useState(jwtPOIIds ?? [])

    // Restore last selected POI from localStorage, or fall back to first in list
    const [activePOIId, setActivePOIIdState] = useState(() => {
        if (!isVendor || !jwtPOIIds?.length) return null
        const saved = parseInt(localStorage.getItem(STORAGE_KEY), 10)
        if (saved && jwtPOIIds.includes(saved)) return saved
        return jwtPOIIds[0] ?? null
    })

    // Map of id → full POI detail object
    const [poisMap, setPoisMap] = useState({})
    const [loadingPois, setLoadingPois] = useState(false)
    const lastFetchTime = useRef(0)

    // ── Step 1: fetch POI details for a given list of IDs ──────────────────────
    const loadPoiDetails = useCallback(async (ids) => {
        if (!ids?.length) return
        setLoadingPois(true)
        try {
            const results = await Promise.all(ids.map(id => poisApi.getDetail(id)))
            const map = {}
            results.forEach(res => {
                const p = res.data
                if (p) map[p.id] = p
            })
            setPoisMap(map)
        } catch (err) {
            console.warn('[PoiSwitcher] Failed to load POI details:', err)
        } finally {
            setLoadingPois(false)
        }
    }, [])

    // ── Step 2: fetch /auth/me → get the server-authoritative POI list ─────────
    const refreshFromServer = useCallback(async () => {
        if (!isVendor) return
        const now = Date.now()
        if (now - lastFetchTime.current < REFETCH_COOLDOWN_MS) return
        lastFetchTime.current = now

        try {
            const res = await authApi.getMe()
            if (!res?.data) return

            // API returns camelCase vendorPOIIds (serialised from C# VendorPOIIds)
            const freshIds = (res.data.vendorPOIIds ?? res.data.VendorPOIIds ?? []).map(Number)
            if (!freshIds.length) return

            setLiveIds(prev => {
                // Only update (and reload details) if the list actually changed
                const prevStr = [...prev].sort().join(',')
                const nextStr = [...freshIds].sort().join(',')
                if (prevStr === nextStr) return prev
                return freshIds
            })
        } catch (err) {
            // Non-fatal — we still have JWT-based IDs
            console.warn('[PoiSwitcher] /auth/me refresh failed:', err)
        }
    }, [isVendor])

    // ── On mount: immediate server sync ───────────────────────────────────────
    useEffect(() => {
        if (isVendor) refreshFromServer()
    }, [isVendor]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── On window focus / tab restore: re-sync (picks up admin changes) ────────
    useEffect(() => {
        if (!isVendor) return

        const onFocus = () => refreshFromServer()
        const onVisibility = () => {
            if (document.visibilityState === 'visible') refreshFromServer()
        }

        window.addEventListener('focus', onFocus)
        document.addEventListener('visibilitychange', onVisibility)
        return () => {
            window.removeEventListener('focus', onFocus)
            document.removeEventListener('visibilitychange', onVisibility)
        }
    }, [isVendor, refreshFromServer])

    // ── When liveIds changes: load POI details + validate activePOIId ──────────
    useEffect(() => {
        if (!liveIds.length) return
        loadPoiDetails(liveIds)

        // If current active POI was removed, or nothing is selected, pick first
        setActivePOIIdState(prev => {
            if (prev && liveIds.includes(prev)) return prev
            const newFirst = liveIds[0] ?? null
            if (newFirst) localStorage.setItem(STORAGE_KEY, String(newFirst))
            return newFirst
        })
    }, [liveIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Keep localStorage in sync & update state ───────────────────────────────
    const setActivePOIId = useCallback((id) => {
        const numId = Number(id)
        setActivePOIIdState(numId)
        localStorage.setItem(STORAGE_KEY, String(numId))
    }, [])

    const activePOI = poisMap[activePOIId] ?? null

    return (
        <PoiSwitcherContext.Provider value={{
            activePOIId,
            setActivePOIId,
            activePOI,
            poisMap,
            vendorPOIIds: liveIds,
            loadingPois,
            hasMultiplePOIs: liveIds.length > 1,
            /** Call this after admin grants a new POI to force an immediate re-sync */
            refresh: refreshFromServer,
        }}>
            {children}
        </PoiSwitcherContext.Provider>
    )
}

export function usePoiSwitcher() {
    const ctx = useContext(PoiSwitcherContext)
    if (!ctx) throw new Error('usePoiSwitcher must be used within PoiSwitcherProvider')
    return ctx
}
