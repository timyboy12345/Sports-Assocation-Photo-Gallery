import { NavLink } from 'react-router-dom';
import { Image, LayoutDashboard, Library } from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { name: 'Albums', path: '/', icon: <Image size={20} /> },
    { name: 'Beheer', path: '/admin', icon: <LayoutDashboard size={20} /> },
  ];

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-xl font-bold text-red-900 flex items-center gap-2">
          <Library className="text-red-900" />
          Foto's
        </h1>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-red-50 text-red-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            {item.icon}
            {item.name}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
