/**
 * useCurrentUser — React hook for reading the current authenticated user's context.
 *
 * Decodes the JWT access token stored in localStorage and extracts:
 *   - userId       {number}    JWT 'sub' claim
 *   - role         {string}    'Admin' | 'Vendor' | 'Customer'
 *   - name         {string}    User's display name
 *   - email        {string}    User's email address
 *   - isAdmin      {boolean}   convenience shortcut
 *   - isVendor     {boolean}   convenience shortcut
 *   - vendorPOIIds {number[]}  linked POI IDs (only for Vendor role, may contain 1..N ids)
 *
 * Usage:
 *   const { isVendor, vendorPOIIds, name } = useCurrentUser()
 *   if (isVendor) renderVendorView(vendorPOIIds)
 *
 * Notes:
 *   - Does NOT make any API calls — reads from the already-validated JWT in localStorage.
 *   - Returns null/false defaults if no token is present (e.g. on the login page).
 *   - The JWT payload is base64url-encoded and can be read without the signing key.
 *     Never trust client-side role checks for actual security — that is enforced by the backend.
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
        // JWT is three base64url segments: header.payload.signature
        const base64Url = token.split('.')[1]
        if (!base64Url) return null

        // base64url → base64 → JSON
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonStr = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonStr)
    } catch {
        return null  // malformed token — treat as unauthenticated
    }
}

/**
 * Parse the vendorPoiIds claim. The backend encodes it as a JSON array string e.g. "[1,3,5]".
 * Returns an empty array for Admin / Customer tokens (claim is absent).
 *
 * @param {any} raw - Raw claim value from JWT payload
 * @returns {number[]}
 */
function parseVendorPOIIds(raw) {
    if (!raw) return []
    try {
        // The JwtService stores it as JsonSerializer.Serialize(ids) → "[1,2,3]"
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (Array.isArray(parsed)) return parsed.map(Number).filter(n => !isNaN(n))
    } catch {
        // Fallback: single legacy id as plain number string
        const n = parseInt(raw, 10)
        if (!isNaN(n)) return [n]
    }
    return []
}

/**
 * React hook that returns the current user's decoded JWT claims.
 * Memoized so it only re-computes when the token changes.
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
                vendorPOIIds: [],   // always an array — safe to call .length / .includes()
            }
        }

        const role = payload.role ?? ''

        return {
            userId: parseInt(payload.sub, 10) || null,
            role,
            name: payload.name ?? '',
            email: payload.email ?? '',
            // Convenience booleans for conditional rendering
            isAdmin: role === 'Admin',
            isVendor: role === 'Vendor',
            // Array of POI IDs this vendor owns (populated by JwtService for Vendor role).
            // Admins will receive an empty array — backend scopes data via JWT claim server-side.
            vendorPOIIds: parseVendorPOIIds(payload.vendorPoiIds),
        }
    }, [
        // Re-memoize if localStorage token changes — effectively triggers on re-render after login
        localStorage.getItem('accessToken')
    ])
}
