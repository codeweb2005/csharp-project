/**
 * App.jsx — Root router for the Vendor Web Panel.
 *
 * Routing strategy:
 *   All protected routes require authentication (redirected to /login otherwise).
 *   PoiSwitcherProvider wraps the layout so all pages share the active-POI state.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { PoiSwitcherProvider } from './context/PoiSwitcherContext'
import Layout from './components/Layout/Layout'
import Login from './pages/Login/Login'
import VendorDashboard from './pages/Dashboard/VendorDashboard'
import POIList from './pages/POI/POIList'

import Audio from './pages/Audio/Audio'
import MenuPage from './pages/Menu/Menu'
import Analytics from './pages/Analytics/Analytics'
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

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public route */}
                <Route path="/login" element={<Login />} />

                {/* All other routes require authentication + POI switcher context */}
                <Route path="/" element={
                    <ProtectedRoute>
                        <PoiSwitcherProvider>
                            <Layout />
                        </PoiSwitcherProvider>
                    </ProtectedRoute>
                }>
                    <Route index element={<Navigate to="/dashboard" replace />} />

                    {/* Dashboard — Vendor sees own shop stats */}
                    <Route path="dashboard"  element={<VendorDashboard />} />

                    {/* Shared routes scoped to Vendor by backend */}
                    <Route path="pois"       element={<POIList />} />
                    <Route path="audio"      element={<Audio />} />
                    <Route path="menu"       element={<MenuPage />} />
                    <Route path="analytics"  element={<Analytics />} />
                </Route>

                {/* Catch-all route for unknown URLs: Redirect to / */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    )
}
