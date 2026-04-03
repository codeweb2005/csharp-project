/**
 * PoiSwitcherContext — Tracks the "active POI" for Vendor users who manage multiple shops.
 *
 * POI list is ALWAYS fetched from the server (never from the JWT):
 *   - On mount: calls GET /auth/me to get the DB-authoritative vendorPOIIds list
 *   - On window focus / tab visibility restore: re-fetches /auth/me to pick up
 *     any POIs added by the Admin while this tab was in the background
 *   - Exposes refresh() so components can force a re-fetch on demand
 *
 * Why not use the JWT claim?
 *   The JWT is issued at login time. If an admin adds a new shop to a vendor
 *   after login, the old JWT wouldn't contain the new POI ID. By always querying
 *   /auth/me (which reads from the DB), the vendor sees new shops immediately
 *   without needing to re-login.
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
// Minimum ms between two consecutive /auth/me refreshes (prevents hammering on rapid focus events)
const REFETCH_COOLDOWN_MS = 10_000

export function PoiSwitcherProvider({ children }) {
    const { isVendor, userId } = useCurrentUser()

    // Live list of POI IDs — always sourced from DB, never from JWT
    const [liveIds, setLiveIds] = useState([])

    // Restore last selected POI from localStorage
    const [activePOIId, setActivePOIIdState] = useState(null)

    // Map of id → full POI detail object
    const [poisMap, setPoisMap] = useState({})
    const [loadingPois, setLoadingPois] = useState(false)
    const lastFetchTime = useRef(0)
    const initialized = useRef(false)

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

    // ── Step 2: fetch /auth/me → get DB-authoritative POI list ─────────────────
    const refreshFromServer = useCallback(async (force = false) => {
        if (!isVendor) return
        const now = Date.now()
        if (!force && now - lastFetchTime.current < REFETCH_COOLDOWN_MS) return
        lastFetchTime.current = now

        try {
            const res = await authApi.getMe()
            if (!res?.data) return

            // Backend returns vendorPOIIds (C# → camelCase via JSON serialiser)
            const freshIds = (res.data.vendorPOIIds ?? res.data.VendorPOIIds ?? []).map(Number)

            setLiveIds(prev => {
                // Only update (and reload details) if the list actually changed
                const prevStr = [...prev].sort().join(',')
                const nextStr = [...freshIds].sort().join(',')
                if (prevStr === nextStr) return prev
                return freshIds
            })
        } catch (err) {
            // Non-fatal — log and keep showing whatever we have
            console.warn('[PoiSwitcher] /auth/me refresh failed:', err)
        }
    }, [isVendor])

    // ── On mount: immediate server sync (force = skip cooldown) ───────────────
    useEffect(() => {
        if (isVendor && !initialized.current) {
            initialized.current = true
            refreshFromServer(true)
        }
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

        // Restore saved selection; fall back to first item
        setActivePOIIdState(prev => {
            const saved = parseInt(localStorage.getItem(STORAGE_KEY), 10)
            const candidate = prev ?? (saved && liveIds.includes(saved) ? saved : null)
            if (candidate && liveIds.includes(candidate)) return candidate
            const first = liveIds[0] ?? null
            if (first) localStorage.setItem(STORAGE_KEY, String(first))
            return first
        })
    }, [liveIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Keep localStorage in sync & update state ────────────────────────────────
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
            /** Call this to force an immediate re-sync from the server */
            refresh: () => refreshFromServer(true),
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
