import { Map, Users, Radio, FileText, Bell } from 'lucide-react'
import useCurrentUser from '../../hooks/useCurrentUser'

export default function TopBar() {
    const { name, role, isVendor, shopName } = useCurrentUser()

    return (
        <header className="h-15 bg-bg-topbar border-b border-border-light flex items-center px-8 sticky top-0 z-40 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            {/* Left side app tabs */}
            <div className="flex gap-6 h-full">
                <button className="flex items-center gap-2 text-sm font-semibold text-white bg-primary rounded h-9 px-4 mt-3">
                    <Map size={16} />
                    <span>POI MAP</span>
                </button>
                <button className="flex items-center gap-2 text-sm font-semibold text-text-muted h-full px-1 hover:text-text-dark transition-colors">
                    <Users size={16} />
                    <span>VENDORS</span>
                </button>
                <button className="flex items-center gap-2 text-sm font-semibold text-text-muted h-full px-1 hover:text-text-dark transition-colors">
                    <Radio size={16} />
                    <span>AUDIO</span>
                </button>
                <button className="flex items-center gap-2 text-sm font-semibold text-text-muted h-full px-1 hover:text-text-dark transition-colors">
                    <FileText size={16} />
                    <span>REPORTS</span>
                </button>
            </div>

            <div className="flex-1" />

            {/* Right side user elements */}
            <div className="flex items-center gap-6">
                <button className="relative text-text-muted hover:text-primary transition-colors">
                    <Bell size={20} />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                </button>
                
                <div className="flex items-center gap-3 cursor-pointer pl-6 border-l border-border-light">
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold text-text-dark leading-tight">{name || 'Admin'}</span>
                        <span className="text-[0.7rem] text-text-muted">{isVendor ? shopName : role}</span>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-primary-light text-primary flex items-center justify-center font-semibold text-base">
                        {(name || 'A').charAt(0).toUpperCase()}
                    </div>
                </div>
            </div>
        </header>
    )
}
