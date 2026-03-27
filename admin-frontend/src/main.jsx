import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#2563eb', // var(--primary-600)
          borderRadius: 8,
          fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
          colorBgContainer: 'rgba(255, 255, 255, 0.85)', // Glass effect
        },
      }}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </ConfigProvider>
  </StrictMode>,
)
