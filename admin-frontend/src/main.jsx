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
          colorPrimary: '#00246a',
          colorBgContainer: '#ffffff', // surface-container-lowest
          colorBgLayout: '#faf8ff',    // surface
          borderRadius: 12,
          fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
          colorBorder: 'rgba(197, 197, 211, 0.15)', // ghost border
          colorBorderSecondary: 'rgba(197, 197, 211, 0.08)',
          boxShadow: '0 4px 12px rgba(0, 36, 106, 0.06)',
          colorText: '#1a1b21',           // on-surface
          colorTextSecondary: '#444651',  // on-surface-variant
          colorTextTertiary: '#757682',   // outline
        },
        components: {
          Card: { borderRadiusLG: 16, boxShadow: '0 4px 12px rgba(0, 36, 106, 0.06)' },
          Button: { borderRadius: 24, fontWeight: 600 },
          Menu: { itemBorderRadius: 16 },
          Table: { headerBg: '#f4f3fa', borderColor: '#e9e7ef' },
        },
      }}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </ConfigProvider>
  </StrictMode>,
)
