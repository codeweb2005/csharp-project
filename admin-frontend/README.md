# 🎛️ Vinh Khanh Food Tour — Admin & Vendor Panel

> **Stack:** React 19 · Vite 7 · React Router v7 · Vanilla CSS  
> **Serves:** Admins (full panel) and Vendors (scoped shop view)

---

## Quick Start

```powershell
# 1. Install dependencies
npm install

# 2. Configure (copy example and fill in values)
cp .env.example .env.local

# 3. Run dev server
npm run dev
# → http://localhost:5173
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | ✅ | Backend API, e.g. `http://localhost:5015/api/v1` |
| `VITE_GOOGLE_MAPS_API_KEY` | ⚠️ Optional | Google Maps JS API key (MapPicker falls back to text inputs if missing) |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Build for production → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── api.js                        ← Centralised HTTP client (auto token refresh)
├── App.jsx                       ← Root router, DashboardRoute (Admin vs Vendor)
├── index.css                     ← Global design tokens and base styles
│
├── context/
│   └── AuthContext.jsx           ← Auth state provider (useAuth hook)
│
├── hooks/
│   └── useCurrentUser.js         ← JWT claim decoder → { isAdmin, isVendor, vendorPOIId }
│
├── components/
│   ├── Layout/
│   │   ├── Layout.jsx            ← App shell (sidebar + outlet)
│   │   ├── Sidebar.jsx           ← Role-gated navigation
│   │   └── Sidebar.css
│   ├── POIForm/
│   │   ├── POIForm.jsx           ← Create/edit POI modal with MapPicker
│   │   └── POIForm.css
│   ├── MapPicker/
│   │   └── MapPicker.jsx         ← Google Maps coordinate picker
│   └── AudioPreview/
│       └── AudioPreview.jsx      ← Inline HTML5 audio player
│
└── pages/
    ├── Login/           Login.jsx
    ├── Dashboard/       Dashboard.jsx, VendorDashboard.jsx
    ├── POI/             POIList.jsx, POIList.css
    ├── Analytics/       Analytics.jsx
    ├── Categories/      Categories.jsx
    ├── Audio/           Audio.jsx
    ├── Menu/            Menu.jsx
    ├── Users/           Users.jsx (Admin only)
    ├── Settings/        Settings.jsx (Admin only)
    └── Offline/         Offline.jsx (Admin only)
```

## Role-Based UI

The panel serves two roles with different views:

| Feature | Admin | Vendor |
|---|---|---|
| Dashboard | Global stats | Own shop stats only |
| POI list | All POIs | Own POI only |
| Add/Delete POI | ✅ | ❌ |
| Edit POI | ✅ | ✅ (own only) |
| Analytics | Global | Own POI |
| Users / Settings / Offline | ✅ | ❌ |

See `src/hooks/useCurrentUser.js` for the JWT decoding hook, and the backend's `VENDOR_PORTAL.md` for the full security specification.

## Authentication Flow

1. `POST /auth/login` → access token + refresh token → stored in `localStorage`
2. `api.js` attaches `Authorization: Bearer <token>` to every request
3. On `401`, `api.js` auto-calls `POST /auth/refresh` and retries the original request
4. On refresh failure → `clearTokens()` + redirect to `/login`
5. `useCurrentUser()` decodes the JWT at render time (no API call)

## Production Build

```powershell
npm run build
# Output: dist/ — deploy to S3/CloudFront or Nginx static hosting
```

See `DEPLOYMENT.md` in the project root for full server deployment instructions.
