import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout/Layout'
import Login from './pages/Login/Login'
import Dashboard from './pages/Dashboard/Dashboard'
import POIList from './pages/POI/POIList'
import Users from './pages/Users/Users'
import Categories from './pages/Categories/Categories'
import Settings from './pages/Settings/Settings'
import Audio from './pages/Audio/Audio'
import MenuPage from './pages/Menu/Menu'
import Analytics from './pages/Analytics/Analytics'
import Offline from './pages/Offline/Offline'
import './index.css'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen">Đang tải...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="pois" element={<POIList />} />
          <Route path="categories" element={<Categories />} />
          <Route path="audio" element={<Audio />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="users" element={<Users />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="offline" element={<Offline />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
