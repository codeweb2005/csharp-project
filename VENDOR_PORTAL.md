# 🏪 Vinh Khanh — Vendor Portal

> The Vendor Portal allows shop owners (Vendors) to manage their own POI, menu, and audio narrations through the **same web panel** as the Admin — but with a scoped, filtered view.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Security Model (Two Layers)](#2-security-model-two-layers)
3. [JWT Vendor Claim](#3-jwt-vendor-claim)
4. [Backend Data Scoping](#4-backend-data-scoping)
5. [POI Ownership Guard](#5-poi-ownership-guard)
6. [Frontend Role-Gating](#6-frontend-role-gating)
7. [Creating a Vendor User](#7-creating-a-vendor-user)
8. [Vendor Capabilities Matrix](#8-vendor-capabilities-matrix)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Overview

**Design choice:** Option 1 — Shared web panel with scoped views.

Vendors log into the same URL as Admins (`/login`). After authentication:

- The **sidebar** shows only Vendor-appropriate nav items
- The **dashboard** shows only their shop's stats
- **API calls** are silently scoped to their POI on the server side
- **Admin sections** (Users, Settings, Offline Packages) are hidden and blocked

```
Admin login          → Full panel, system-wide data
Vendor login         → Partial panel, own POI data only
Tourist (mobile)     → No web panel (mobile app only)
```

---

## 2. Security Model (Two Layers)

The Vendor Portal uses **two independent security layers**. Never rely on only one.

```
┌─────────────────────────────────────────────┐
│  Layer 1 — Frontend (UX only)               │
│  useCurrentUser() → isVendor flag           │
│  → Hide Add POI / Delete / Featured buttons │
│  → Show VendorDashboard instead of Dashboard│
│  → Filter sidebar nav items                 │
│                                             │
│  ⚠️ Client-side code can be bypassed!      │
│     Never trust this alone.                 │
└─────────────────┬───────────────────────────┘
                  │
                  ▼ HTTP request
┌─────────────────────────────────────────────┐
│  Layer 2 — Backend (authoritative)          │
│  JWT role claim: "Vendor"                   │
│  → [Authorize(Roles="Admin,Vendor")]        │
│    or [Authorize(Roles="Admin")] blocks     │
│                                             │
│  vendorPoiId claim → GetVendorPOIId()      │
│  → Service methods filter all DB queries    │
│    to WHERE POIId = vendorPoiId             │
│                                             │
│  POI update ownership check:               │
│  → 403 if poi.VendorUserId ≠ callerId      │
└─────────────────────────────────────────────┘
```

**Even if a Vendor bypasses the frontend**, the backend will:

- Return only their own data from scoped services
- Return `403 Forbidden` if they try to edit another vendor's POI
- Return `403 Forbidden` if they try to access Admin-only endpoints

---

## 3. JWT Vendor Claim

When a Vendor logs in, their JWT includes an extra claim:

```json
{
  "sub": "5",
  "email": "vendor@example.com",
  "name": "Trần Thị B",
  "role": "Vendor",
  "vendorPoiId": "3",     ← only present for Vendor role
  "jti": "...",
  "iat": 1742549000
}
```

### How it gets there

**`JwtService.GenerateAccessToken(User user)`:**

```csharp
// VinhKhanh.Infrastructure/Services/JwtService.cs

// The VendorPOI navigation property must be eagerly loaded for this to work.
// AuthService.LoginAsync() includes: .Include(u => u.VendorPOI)
if (user.Role == UserRole.Vendor && user.VendorPOI is not null)
{
    claims.Add(new Claim("vendorPoiId", user.VendorPOI.Id.ToString()));
}
```

### How controllers read it

**`BaseApiController.GetVendorPOIId()`:**

```csharp
/// Returns the Vendor's linked POI ID from the JWT vendorPoiId claim.
/// Returns null for Admin and Customer users (claim not present in their tokens).
protected int? GetVendorPOIId()
{
    var raw = User.FindFirst("vendorPoiId")?.Value;
    return raw != null && int.TryParse(raw, out var id) ? id : null;
}
```

---

## 4. Backend Data Scoping

All Dashboard and Analytics methods accept an optional `vendorPOIId` parameter.

```
Controller action calls:
  svc.GetStatsAsync(GetVendorPOIId())

Service receives:
  vendorPOIId = 3   (Vendor)    → WHERE POIId = 3
  vendorPOIId = null (Admin)    → No filter (system-wide)
```

### DashboardService example

```csharp
public async Task<ApiResponse<DashboardStatsDto>> GetStatsAsync(int? vendorPOIId = null)
{
    if (vendorPOIId.HasValue)
    {
        // Vendor mode: stats for their POI only
        var visits = await _db.VisitHistory
            .CountAsync(v => v.POIId == vendorPOIId.Value && v.VisitedAt >= thirtyDaysAgo);
        ...
    }
    // Admin mode: system-wide stats
    var allVisits = await _db.VisitHistory.CountAsync(v => v.VisitedAt >= thirtyDaysAgo);
    ...
}
```

### Affected services

| Service | Methods scoped |
|---|---|
| `DashboardService` | `GetStatsAsync`, `GetTopPOIsAsync`, `GetVisitsChartAsync`, `GetLanguageStatsAsync`, `GetRecentActivityAsync` |
| `AnalyticsService` | `GetTrendsAsync`, `GetVisitsByDayAsync`, `GetVisitsByHourAsync`, `GetLanguageDistributionAsync` |

---

## 5. POI Ownership Guard

`POIService.UpdateAsync` verifies the caller owns the POI before applying any changes:

```csharp
public async Task<ApiResponse<POIDetailDto>> UpdateAsync(
    int id, UpdatePOIRequest request, int? callerId = null, string? callerRole = null)
{
    var poi = await _db.POIs.Include(p => p.Translations).FirstOrDefaultAsync(p => p.Id == id);
    if (poi == null) return ApiResponse<POIDetailDto>.Fail("NOT_FOUND", "...");

    // ── Vendor ownership guard ─────────────────────────────
    // Admins bypass this check. Vendors must own the POI.
    if (callerRole == "Vendor" && poi.VendorUserId != callerId)
    {
        _logger.LogWarning(
            "Vendor {UserId} attempted to edit POI {POIId} owned by Vendor {OwnerId}",
            callerId, id, poi.VendorUserId);
        return ApiResponse<POIDetailDto>.Fail("FORBIDDEN",
            "Bạn chỉ có thể chỉnh sửa thông tin quán của mình.");
    }

    // Additional guard: Vendors cannot reassign VendorUserId
    if (callerRole != "Vendor")
        poi.VendorUserId = request.VendorUserId;
    ...
}
```

**`POIsController`** passes caller info:

```csharp
[HttpPut("{id}")]
public async Task<IActionResult> Update(int id, [FromBody] UpdatePOIRequest req)
    => ApiResult(await svc.UpdateAsync(id, req, GetUserId(), GetUserRole()));
```

---

## 6. Frontend Role-Gating

### `useCurrentUser` hook

```js
// src/hooks/useCurrentUser.js

export default function useCurrentUser() {
    return useMemo(() => {
        const token = localStorage.getItem('accessToken')
        const payload = decodeJwt(token)
        return {
            userId:      parseInt(payload?.sub, 10) || null,
            role:        payload?.role ?? null,
            name:        payload?.name ?? '',
            isAdmin:     payload?.role === 'Admin',
            isVendor:    payload?.role === 'Vendor',
            vendorPOIId: payload?.vendorPoiId ? parseInt(payload.vendorPoiId, 10) : null,
        }
    }, [localStorage.getItem('accessToken')])
}
```

**Usage pattern (any component):**

```jsx
const { isVendor, isAdmin, vendorPOIId } = useCurrentUser()

{!isVendor && <button>Delete</button>}   // hidden from Vendors
{isAdmin   && <AdminPanel />}            // Admins only
```

### Sidebar nav gating

```js
// Sidebar.jsx — menuItems array
const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard',    path: '/dashboard', adminOnly: true  },
  { icon: Store,           label: 'My Shop',       path: '/dashboard', vendorOnly: true },
  { icon: MapPin,          label: 'Points of Interest', path: '/pois' },
  // ...
  { icon: Users,    label: 'Users',    path: '/users',    adminOnly: true },
  { icon: Settings, label: 'Settings', path: '/settings', adminOnly: true },
]

// Filtered in render:
const visibleItems = menuItems.filter(item => {
    if (item.adminOnly && !isAdmin)   return false
    if (item.vendorOnly && !isVendor) return false
    return true
})
```

### Dashboard routing

```jsx
// App.jsx

function DashboardRoute() {
    const { isVendor } = useCurrentUser()
    return isVendor ? <VendorDashboard /> : <Dashboard />
}
```

### POIList restrictions

```jsx
// POIList.jsx — buttons hidden for Vendors
{!isVendor && <button onClick={openCreate}>Add POI</button>}
{!isVendor && <button onClick={() => handleDelete(poi)}>Delete</button>}
{!isVendor && <button onClick={() => handleToggleFeatured(poi.id)}>⭐</button>}
```

---

## 7. Creating a Vendor User

### Step 1 — Create the Vendor's POI (as Admin)

```
POST /api/v1/pois
{
  "categoryId": 2,
  "vendorUserId": null,   ← set after creating the user
  "translations": [...],
  ...
}
→ Returns: { "id": 7 }
```

### Step 2 — Create the Vendor user (as Admin)

```
POST /api/v1/users
{
  "email": "vendor@restaurant.com",
  "fullName": "Trần Thị B",
  "role": "Vendor",
  "vendorPoiId": 7        ← links to the POI created above
}
→ Returns: { "id": 12, "tempPassword": "..." }
```

The backend sets `POI.VendorUserId = 12` automatically when creating a Vendor user with `vendorPoiId`.

### Step 3 — Send credentials to the Vendor

- URL: `https://admin.vinhkhanh.com`
- Email: `vendor@restaurant.com`
- Temp password: (from response) — Vendor must change on first login via `/auth/change-password`

### Step 4 — Verify

Log in as the Vendor. Their JWT will contain `vendorPoiId: 7`. The dashboard will show only that POI's stats. The POI list will show only their shop.

---

## 8. Vendor Capabilities Matrix

| Capability | Admin | Vendor |
|---|---|---|
| View dashboard (global stats) | ✅ | ❌ |
| View own shop's dashboard | ✅ | ✅ |
| View analytics (global) | ✅ | ❌ (scoped) |
| View analytics (own POI) | ✅ | ✅ |
| View POI list (all) | ✅ | ❌ (scoped to own) |
| Create POI | ✅ | ❌ |
| Edit own POI | ✅ | ✅ |
| Edit other vendor's POI | ✅ | ❌ (403) |
| Delete POI | ✅ | ❌ |
| Toggle POI active | ✅ | ✅ |
| Toggle POI featured | ✅ | ❌ |
| Upload audio | ✅ | ✅ |
| Manage menu | ✅ | ✅ |
| Manage users | ✅ | ❌ |
| Manage categories | ✅ | ❌ |
| View settings | ✅ | ❌ |
| Manage offline packages | ✅ | ❌ |

---

## 9. Troubleshooting

### Vendor sees no POIs in the list

**Cause:** The Vendor's `VendorPOI` relation was not set.  
**Fix:** In the Users management page, ensure `vendorPoiId` is set on the user. Then ask the Vendor to log out and log back in (the JWT is re-issued on login).

### `vendorPoiId` claim missing from JWT

**Cause:** `AuthService.LoginAsync` did not eagerly load `user.VendorPOI`.  
**Fix:** Check that the login query includes `.Include(u => u.VendorPOI)` before calling `JwtService.GenerateAccessToken(user)`.

### Vendor getting 403 on POI update

**Cause:** `POI.VendorUserId` does not match the Vendor's `User.Id`.  
**Fix:** In Admin panel → Users → edit the Vendor → confirm their `vendorPoiId` matches the intended POI.

### Vendor can see another shop's data

This should be impossible if the two security layers are intact.  

1. Check the JWT `vendorPoiId` claim value (decode at [jwt.io](https://jwt.io))  
2. Check `DashboardService` / `AnalyticsService` — ensure `vendorPOIId` branch is not being bypassed  
3. Check `DashboardController` — ensure `GetVendorPOIId()` is passed, not `null`
