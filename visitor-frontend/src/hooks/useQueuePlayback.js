/**
 * useQueuePlayback — tracks which POIs have been listened to during this session.
 *
 * - Persists played POI IDs in sessionStorage (cleared when browser tab closes).
 * - Exposes `markPlayed(poiId)`, `isPlayed(poiId)`, `resetSession()`.
 * - Deduplicates the queue: if backend returns the same POI twice, only the
 *   first occurrence is kept.
 */
import { useState, useCallback, useEffect } from 'react'

const SESSION_KEY = 'vk_played_pois'

function loadPlayed() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function savePlayed(set) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...set]))
  } catch { /* quota exceeded — ignore */ }
}

export function useQueuePlayback() {
  const [played, setPlayed] = useState(() => loadPlayed())

  // Sync to sessionStorage whenever played changes
  useEffect(() => { savePlayed(played) }, [played])

  const markPlayed = useCallback((poiId) => {
    setPlayed(prev => {
      if (prev.has(poiId)) return prev
      const next = new Set(prev)
      next.add(poiId)
      return next
    })
  }, [])

  const isPlayed = useCallback((poiId) => played.has(poiId), [played])

  const resetSession = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setPlayed(new Set())
  }, [])

  /**
   * Deduplicates a queue array by poiId (keeps first occurrence),
   * then sorts so unplayed items come first, played go to the bottom.
   */
  const processQueue = useCallback((rawQueue) => {
    const seen = new Set()
    const deduped = rawQueue.filter(item => {
      if (seen.has(item.poiId)) return false
      seen.add(item.poiId)
      return true
    })
    // Re-number order after dedup
    return deduped.map((item, idx) => ({ ...item, order: idx + 1 }))
  }, [])

  /**
   * Sorts processed queue: unplayed first (order preserved), played last.
   */
  const sortQueue = useCallback((queue) => {
    const unplayed = queue.filter(item => !played.has(item.poiId))
    const playedItems = queue.filter(item => played.has(item.poiId))
    return [...unplayed, ...playedItems]
  }, [played])

  return { markPlayed, isPlayed, resetSession, processQueue, sortQueue, playedCount: played.size }
}
