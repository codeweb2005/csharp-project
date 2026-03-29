/**
 * useCurrentUser — React hook for reading the current authenticated user's identity from the JWT.
 *
 * Decodes the JWT access token stored in localStorage and extracts identity claims:
 *   - userId    {number}  JWT 'sub' claim
 *   - role      {string}  'Admin' | 'Vendor' | 'Customer'
 *   - name      {string}  User's display name
 *   - email     {string}  User's email address
 *   - isAdmin   {boolean} convenience shortcut
 *   - isVendor  {boolean} convenience shortcut
 *
 * ⚠️  Vendor POI IDs are NOT read from the JWT.
 *     They are always fetched from the database via GET /auth/me
 *     inside PoiSwitcherContext. This ensures newly assigned shops are
 *     visible immediately without requiring re-login.
 *
 * Usage:
 *   const { isVendor, name } = useCurrentUser()
 *   if (isVendor) renderVendorView()
 *
 * Notes:
 *   - Does NOT make any API calls — reads only identity claims from JWT.
 *   - Returns null/false defaults if no token is present (e.g. on the login page).
 *   - The JWT payload is base64url-encoded and readable client-side.
 *     Never trust client-side role checks for actual security — backend enforces this.
 *     These flags are for UI-only decisions (show/hide elements).
 */

import { useMemo } from 'react'

/**
 * Safely decode a JWT payload without verifying the signature.
 * (Signature is verified server-side on every API call.)
 *
 * @param {string} token - Raw JWT string
 * @returns {object|null} Decoded payload, or null if token is invalid/missing
 */
function decodeJwt(token) {
    if (!token) return null
    try {
        const base64Url = token.split('.')[1]
        if (!base64Url) return null
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonStr = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join(''))
        return JSON.parse(jsonStr)
    } catch {
        return null
    }
}

/**
 * React hook that returns the current user's identity from the JWT.
 * Memoized so it only re-computes when the token changes.
 *
 * Vendor POI IDs are NOT included here — use usePoiSwitcher() for that.
 */
export default function useCurrentUser() {
    return useMemo(() => {
        const token = localStorage.getItem('accessToken')
        const payload = decodeJwt(token)

        if (!payload) {
            return {
                userId: null,
                role: null,
                name: null,
                email: null,
                isAdmin: false,
                isVendor: false,
            }
        }

        const role = payload.role ?? ''

        return {
            userId: parseInt(payload.sub, 10) || null,
            role,
            name: payload.name ?? '',
            email: payload.email ?? '',
            // Convenience booleans for conditional UI rendering
            isAdmin: role === 'Admin',
            isVendor: role === 'Vendor',
        }
    }, [
        // Re-memoize if localStorage token changes — effectively triggers on re-render after login
        localStorage.getItem('accessToken')
    ])
}
