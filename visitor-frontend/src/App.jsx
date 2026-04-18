import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import VisitorLayout from './components/VisitorLayout/VisitorLayout.jsx'
import Home from './pages/Home/Home.jsx'
import POIDetail from './pages/POIDetail/POIDetail.jsx'
import Queue from './pages/Queue/Queue.jsx'
import Offline from './pages/Offline/Offline.jsx'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VisitorLayout />}>
          <Route index element={<Home />} />
          <Route path="poi/:id" element={<POIDetail />} />
          <Route path="queue" element={<Queue />} />
          <Route path="offline" element={<Offline />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
