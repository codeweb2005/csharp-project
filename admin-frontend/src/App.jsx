import React from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

// Layout wrapper that includes the Sidebar and Header
const Layout = () => {
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Placeholder Header */}
        <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-6">
          <h2 className="text-xl font-semibold text-gray-800">Management Area</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 font-medium">Administrator</span>
            <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">
              A
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Placeholder for unbuilt pages
const Placeholder = ({ title }) => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-800 mb-6">{title}</h1>
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm text-center text-gray-400">
      Screen UI for {title} (WIP)
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="pois" element={<Placeholder title="POIs Management" />} />
          <Route path="languages" element={<Placeholder title="Languages" />} />
          <Route path="categories" element={<Placeholder title="Categories" />} />
          <Route path="audio" element={<Placeholder title="Audio Narrations" />} />
          <Route path="media" element={<Placeholder title="Media Assets" />} />
          <Route path="menu" element={<Placeholder title="Restaurant Menus" />} />
          <Route path="users" element={<Placeholder title="Users Management" />} />
          <Route path="analytics" element={<Placeholder title="Analytics & Trends" />} />
          <Route path="packages" element={<Placeholder title="Offline Mobile Packages" />} />
          <Route path="settings" element={<Placeholder title="System Settings" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
