import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import '../../index.css'

export default function Layout() {
    return (
        <div className="flex min-h-screen overflow-hidden bg-bg-app">
            <Sidebar />
            <div className="flex-1 ml-24 flex flex-col overflow-y-auto h-screen bg-bg-app">
                <TopBar />
                <main className="p-6 flex-1">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
