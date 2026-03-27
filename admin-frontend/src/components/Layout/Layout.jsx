import { Outlet } from 'react-router-dom'
import { Layout as AntLayout } from 'antd'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import './Layout.css'

const { Content } = AntLayout

export default function Layout() {
    return (
        <AntLayout className="layout" style={{ minHeight: '100vh' }}>
            <Sidebar />
            <AntLayout className="layout-main">
                <TopBar />
                <Content className="layout-content" style={{ padding: '24px', overflowY: 'auto' }}>
                    <Outlet />
                </Content>
            </AntLayout>
        </AntLayout>
    )
}
