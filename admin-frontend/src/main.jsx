import { createRoot } from 'react-dom/client'
import { App as AntdApp, ConfigProvider } from 'antd'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'

// StrictMode removed: causes Leaflet double-init in dev
createRoot(document.getElementById('root')).render(
  <ConfigProvider
    theme={{
      // Light algorithm (default)
      token: {
        // Brand
        colorPrimary:         '#C92127',
        colorSuccess:         '#16a34a',
        colorWarning:         '#D97706',
        colorError:           '#DC2626',
        colorInfo:            '#2563EB',

        // Backgrounds
        colorBgBase:          '#F8F8F8',
        colorBgContainer:     '#FFFFFF',
        colorBgElevated:      '#FFFFFF',
        colorBgLayout:        '#F8F8F8',

        // Text
        colorText:            '#1A1A1A',
        colorTextSecondary:   '#555555',
        colorTextTertiary:    '#999999',
        colorTextDisabled:    '#CCCCCC',

        // Borders
        colorBorder:          '#E8E8E8',
        colorBorderSecondary: '#F0F0F0',

        // Radius
        borderRadius:         10,
        borderRadiusLG:       14,
        borderRadiusSM:       6,
        borderRadiusXS:       4,

        // Typography
        fontFamily:           "'Inter', -apple-system, system-ui, sans-serif",
        fontSize:             14,

        // Shadows
        boxShadow:            '0 2px 8px rgba(0,0,0,0.08)',
        boxShadowSecondary:   '0 4px 16px rgba(0,0,0,0.10)',

        // Control
        controlHeight:   36,
        controlHeightLG: 42,
        controlHeightSM: 28,
      },
      components: {
        Layout: {
          bodyBg:    '#F8F8F8',
          headerBg:  '#FFFFFF',
          siderBg:   '#FFFFFF',
        },
        Menu: {
          itemSelectedBg:    'rgba(201,33,39,0.08)',
          itemSelectedColor: '#C92127',
          itemHoverBg:       '#F5F5F5',
          itemHoverColor:    '#C92127',
          itemBorderRadius:  10,
          itemMarginInline:  0,
        },
        Card: {
          colorBgContainer: '#FFFFFF',
          paddingLG:        20,
          borderRadiusLG:   14,
        },
        Table: {
          headerBg:        '#FAFAFA',
          rowHoverBg:      '#FFF5F5',
          borderColor:     '#E8E8E8',
          colorBgContainer:'#FFFFFF',
        },
        Button: {
          borderRadius:    10,
          fontWeight:      500,
          primaryShadow:   '0 4px 12px rgba(201,33,39,0.25)',
        },
        Input: {
          colorBgContainer: '#FAFAFA',
          activeBorderColor:'#C92127',
          activeShadow:     '0 0 0 3px rgba(201,33,39,0.1)',
          hoverBorderColor: '#C92127',
        },
        Select: {
          colorBgContainer:    '#FAFAFA',
          optionSelectedBg:    'rgba(201,33,39,0.08)',
          optionSelectedColor: '#C92127',
        },
        Modal: {
          borderRadiusLG: 20,
        },
        Tabs: {
          inkBarColor:     '#C92127',
          itemActiveColor: '#C92127',
          itemSelectedColor:'#C92127',
          itemHoverColor:  '#A81B21',
        },
        Switch: {
          colorPrimary:      '#C92127',
          colorPrimaryHover: '#A81B21',
        },
        Tag: { borderRadius: 6 },
        Pagination: {
          itemActiveBg: 'rgba(201,33,39,0.08)',
        },
        Form: {
          labelColor: '#555555',
          itemMarginBottom: 18,
        },
      },
    }}
  >
    <AntdApp>
      <AuthProvider>
        <App />
      </AuthProvider>
    </AntdApp>
  </ConfigProvider>,
)
