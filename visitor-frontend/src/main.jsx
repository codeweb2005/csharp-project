import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App as AntdApp, ConfigProvider } from 'antd'
import { LanguageProvider } from './context/LanguageContext.jsx'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#c45c26',
          borderRadius: 10,
          fontFamily: "'DM Sans', system-ui, sans-serif",
        },
      }}
    >
      <AntdApp>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
)
