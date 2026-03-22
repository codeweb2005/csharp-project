/**
 * App.jsx — Root router for the Admin Web Panel.
 *
 * Routing strategy:
 *   All protected routes require authentication (redirected to /login otherwise).
 *   The /dashboard route renders either:
 *     - <VendorDashboard> for Vendor users (role-scoped shop stats)
 *     - <Dashboard>       for Admin users  (system-wide stats)
 *   This decision is made client-side via the `useCurrentUser` hook; the server
 *   handles the actual data scoping based on the JWT vendorPoiId claim.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import useCurrentUser from './hooks/useCurrentUser.js'
import Layout from './components/Layout/Layout'
import Login from './pages/Login/Login'
import Dashboard from './pages/Dashboard/Dashboard'
import VendorDashboard from './pages/Dashboard/VendorDashboard'
import POIList from './pages/POI/POIList'
import Users from './pages/Users/Users'
import Categories from './pages/Categories/Categories'
import Settings from './pages/Settings/Settings'
import Audio from './pages/Audio/Audio'
import MenuPage from './pages/Menu/Menu'
import Analytics from './pages/Analytics/Analytics'
import Offline from './pages/Offline/Offline'
import './index.css'

/**
 * ProtectedRoute — Wraps route children and redirects to /login
 * if the user is not authenticated or auth is still loading.
 */
function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()
    if (loading) return <div className="loading-screen">Loading…</div>
    if (!user)   return <Navigate to="/login" replace />
    return children
}

/**
 * DashboardRoute — Smart route that renders either the Admin or Vendor dashboard
 * based on the JWT role claim. Both use the same backend endpoints; the server
 * scopes the data automatically.
 */
function DashboardRoute() {
    const { isVendor } = useCurrentUser()
    return isVendor ? <VendorDashboard /> : <Dashboard />
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public route */}
                <Route path="/login" element={<Login />} />

                {/* All other routes require authentication */}
                <Route path="/" element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }>
                    <Route index element={<Navigate to="/dashboard" replace />} />

                    {/* Dashboard — Admin sees global stats; Vendor sees own shop stats */}
                    <Route path="dashboard"  element={<DashboardRoute />} />

                    {/* Shared routes (visible to both Admin and Vendor, data scoped server-side) */}
                    <Route path="pois"       element={<POIList />} />
                    <Route path="categories" element={<Categories />} />
                    <Route path="audio"      element={<Audio />} />
                    <Route path="menu"       element={<MenuPage />} />
                    <Route path="analytics"  element={<Analytics />} />

                    {/* Admin-only routes (sidebar hides these from Vendors, but backend also enforces) */}
                    <Route path="users"      element={<Users />} />
                    <Route path="offline"    element={<Offline />} />
                    <Route path="settings"   element={<Settings />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}
