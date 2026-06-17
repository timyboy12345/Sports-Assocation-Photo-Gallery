import { NavLink } from 'react-router-dom';
import { Image, LayoutDashboard, Library, X } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const navItems = [
    { name: 'Albums', path: '/', icon: <Image size={20} /> },
    { name: 'Beheer', path: '/admin', icon: <LayoutDashboard size={20} /> },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/30 z-30 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        className={`w-64 h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 z-40 transition-transform md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h1 className="text-xl font-bold text-red-900 flex items-center gap-2">
            <Library className="text-red-900" />
            Foto's
          </h1>
          <button
            onClick={onClose}
            className="md:hidden cursor-pointer text-gray-500 hover:text-red-900"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
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
    </>
  );
};

export default Sidebar;
