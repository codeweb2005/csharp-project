import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, MapPin, Globe, Tags, Music, Image as ImageIcon, 
  Menu, Users, BarChart2, TrendingUp, Package, Settings, LogOut
} from 'lucide-react';

const Sidebar = () => {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    navigate('/login');
  };

  const menus = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'POIs', path: '/pois', icon: MapPin },
    { name: 'Languages', path: '/languages', icon: Globe },
    { name: 'Categories', path: '/categories', icon: Tags },
    { name: 'Audio', path: '/audio', icon: Music },
    { name: 'Media', path: '/media', icon: ImageIcon },
    { name: 'Menu', path: '/menu', icon: Menu },
    { name: 'Users', path: '/users', icon: Users },
    { name: 'Analytics', path: '/analytics', icon: TrendingUp },
    { name: 'Offline Packages', path: '/packages', icon: Package },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-800 text-xl font-bold flex items-center space-x-2">
        <MapPin className="w-6 h-6 text-indigo-400" />
        <span>Vinh Khanh Admin</span>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {menus.map((item, index) => {
            const Icon = item.icon;
            return (
              <li key={index}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => 
                    `flex items-center space-x-3 px-4 py-2 hover:bg-gray-800 transition tracking-wide text-sm ${
                      isActive ? 'bg-gray-800 border-l-4 border-indigo-500 text-indigo-100 font-medium' : 'text-gray-400'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="p-4 border-t border-gray-800">
        <button 
          onClick={handleLogout}
          className="flex w-full items-center space-x-3 px-4 py-2 text-red-400 hover:bg-gray-800 hover:text-red-300 rounded-lg transition"
        >
          <LogOut className="w-5 h-5" />
          <span>Đăng Xuất</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
