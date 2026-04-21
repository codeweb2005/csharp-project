/**
 * App.jsx — Root router for the Admin Web Panel.
 *
 * Routing strategy:
 *   All protected routes require authentication (redirected to /login otherwise).
 *   The /dashboard route renders either:
 *     - <VendorDashboard> for Vendor users (role-scoped shop stats, filtered by vendorPoiIds)
 *     - <Dashboard>       for Admin users  (system-wide stats)
 *   This decision is made client-side via the `useCurrentUser` hook; the server
 *   handles the actual data scoping based on the JWT `vendorPoiIds` claim.
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
import Analytics from './pages/Analytics/Analytics'
import Offline from './pages/Offline/Offline'
import LiveMonitorPage from './pages/Monitor/LiveMonitorPage'
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
 * DashboardRoute — Renders the appropriate dashboard based on the user's role.
 * - Vendor → <VendorDashboard> (stats scoped to own POIs via JWT)
 * - Admin  → <Dashboard> (system-wide stats)
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

                    {/* Dashboard — Admin sees global stats, Vendor sees own POI stats */}
                    <Route path="dashboard"  element={<DashboardRoute />} />

                    {/* Shared routes */}
                    <Route path="pois"       element={<POIList />} />
                    <Route path="categories" element={<Categories />} />
                    <Route path="audio"      element={<Audio />} />
                    <Route path="analytics"  element={<Analytics />} />

                    {/* Admin-only routes */}
                    <Route path="users"      element={<Users />} />
                    <Route path="offline"    element={<Offline />} />
                    <Route path="settings"   element={<Settings />} />

                    {/* Admin-only: realtime tour monitor */}
                    <Route path="monitor"    element={<LiveMonitorPage />} />
                </Route>


                {/* Catch-all route for unknown URLs: Redirect to / (which evaluates auth and redirects to /login if needed) */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    )
}
