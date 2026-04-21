# Vinh Khanh Food Tour — Visitor site

> **Stack:** React 19 · Vite 7 · React Router v7 · Ant Design 6 · Leaflet · Vanilla CSS  
> **Audience:** Tourists — anonymous public API only (no login)

---

## Quick Start

```powershell
# 1. Install dependencies
npm install

# 2. Configure (copy example and set API URL)
Copy-Item .env.example .env

# 3. Run dev server
npm run dev
# → http://localhost:5175
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | Yes | Backend API base, e.g. `http://localhost:5015/api/v1` or `http://localhost:8080/api/v1` (Docker) |
| `VITE_BASE_PATH` | No | Asset base for subpath deploys, e.g. `/visit/` (must end with `/` if set) |
| `VITE_DEV_API_PROXY_TARGET` | No | When using same-origin `VITE_API_BASE_URL` with host `localhost:5175`, proxy forwards `/api/v1` here (default `http://127.0.0.1:5015`) |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server (port 5175) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build on port 5175 |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── api.js                 ← Central HTTP helper (anonymous endpoints only)
├── App.jsx                ← Router: home, POI, queue, offline
├── context/
│   └── LanguageContext.jsx
├── components/
│   ├── VisitorLayout/
│   └── VisitorMap/
└── pages/
    ├── Home/
    ├── POIDetail/
    ├── Queue/
    └── Offline/
```

## Docker

From the repository root, `visitor-frontend` is included in `docker compose` with the same `VITE_API_BASE_URL` convention as admin and vendor. See root [`README.md`](../README.md) and [`DEPLOYMENT.md`](../DEPLOYMENT.md).
