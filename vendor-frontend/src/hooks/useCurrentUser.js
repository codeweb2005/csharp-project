/**
 * useCurrentUser — React hook for reading the current authenticated user's context.
 *
 * Decodes the JWT access token stored in localStorage and extracts:
 *   - userId    {number}  JWT 'sub' claim
 *   - role      {string}  'Admin' | 'Vendor' | 'Customer'
 *   - name      {string}  User's display name
 *   - email     {string}  User's email address
 *   - isAdmin   {boolean} convenience shortcut
 *   - isVendor  {boolean} convenience shortcut
 *   - vendorPOIId {number|null}  linked POI id (only for Vendor role)
 *
 * Usage:
 *   const { isVendor, vendorPOIId, name } = useCurrentUser()
 *   if (isVendor) renderVendorView()
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
 * React hook that returns the current user's decoded JWT claims.
 * Memoized so it only re-computes when the token changes.
 *
 * After the 1:N Vendor-POI migration the JWT carries:
 *   vendorPoiIds  — JSON-serialized int array, e.g. "[3,7]"
 *
 * This hook parses that array and exposes:
 *   vendorPOIIds  {number[]}     — full array of linked POI IDs
 *   vendorPOIId   {number|null}  — first element (convenience alias for single-POI usage)
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
                vendorPOIIds: [],
                vendorPOIId: null,
            }
        }

        const role = payload.role ?? ''

        // Backend serialises as JSON array: vendorPoiIds = "[3,7]"
        // (singular vendorPoiId is no longer emitted after 1:N migration)
        let vendorPOIIds = []
        if (payload.vendorPoiIds) {
            try {
                const parsed = JSON.parse(payload.vendorPoiIds)
                if (Array.isArray(parsed)) {
                    vendorPOIIds = parsed.map(Number).filter(Boolean)
                }
            } catch {
                // Fallback: treat as scalar (old tokens)
                const single = parseInt(payload.vendorPoiIds, 10)
                if (!isNaN(single)) vendorPOIIds = [single]
            }
        }
        // Legacy scalar claim (old JWTs before migration)
        if (vendorPOIIds.length === 0 && payload.vendorPoiId) {
            const single = parseInt(payload.vendorPoiId, 10)
            if (!isNaN(single)) vendorPOIIds = [single]
        }

        return {
            userId: parseInt(payload.sub, 10) || null,
            role,
            name: payload.name ?? '',
            email: payload.email ?? '',
            // Convenience booleans for conditional rendering
            isAdmin: role === 'Admin',
            isVendor: role === 'Vendor',
            // Full array of linked POI IDs (1:N)
            vendorPOIIds,
            // First element — convenience alias for pages that only need one POI
            vendorPOIId: vendorPOIIds[0] ?? null,
        }
    }, [
        // Re-memoize if localStorage token changes — effectively triggers on re-render after login
        localStorage.getItem('accessToken')
    ])
}
