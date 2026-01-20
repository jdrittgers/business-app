import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useRetailerAuthStore } from '../../store/retailerAuthStore';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  children?: { label: string; path: string }[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/retailer/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  {
    label: 'Grain Marketplace',
    path: '/retailer/grain-marketplace',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  }
];

const bottomNavItems: NavItem[] = [
  {
    label: 'Profile',
    path: '/retailer/profile',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )
  }
];

interface RetailerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RetailerSidebar({ isOpen, onClose }: RetailerSidebarProps) {
  const location = useLocation();
  const { retailer, logout } = useRetailerAuthStore();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const isActive = (path: string) => location.pathname === path;
  const isParentActive = (item: NavItem) =>
    item.children?.some(child => location.pathname === child.path);

  const companyName = retailer?.companyName || 'My Company';

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-56 bg-indigo-900 transition-transform duration-300 flex flex-col
          lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo/Brand */}
        <div className="h-14 flex items-center px-4 border-b border-indigo-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="font-semibold text-white text-lg">KernelAG</span>
          </div>
        </div>

        {/* Company selector */}
        <div className="px-3 py-3 border-b border-indigo-800">
          <div className="flex items-center space-x-3 px-2 py-2 rounded-lg bg-indigo-800/50">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {companyName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{companyName}</p>
              <p className="text-xs text-indigo-300">Retailer</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          <ul className="space-y-0.5">
            {navItems.map((item) => (
              <li key={item.label}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleExpanded(item.label)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors
                        ${isParentActive(item)
                          ? 'bg-indigo-600 text-white'
                          : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'}`}
                    >
                      <div className="flex items-center space-x-3">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      <svg
                        className={`w-4 h-4 transition-transform ${expandedItems.includes(item.label) ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {expandedItems.includes(item.label) && (
                      <ul className="mt-1 ml-3 pl-3 border-l border-indigo-700 space-y-0.5">
                        {item.children.map((child) => (
                          <li key={child.path}>
                            <NavLink
                              to={child.path}
                              onClick={handleNavClick}
                              className={`block px-3 py-1.5 rounded-lg text-sm transition-colors
                                ${isActive(child.path)
                                  ? 'bg-indigo-600/50 text-indigo-200 font-medium'
                                  : 'text-indigo-300 hover:bg-indigo-800 hover:text-white'}`}
                            >
                              {child.label}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <NavLink
                    to={item.path}
                    onClick={handleNavClick}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors
                      ${isActive(item.path)
                        ? 'bg-indigo-600 text-white'
                        : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'}`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom navigation */}
        <div className="border-t border-indigo-800 py-3 px-3">
          <ul className="space-y-0.5">
            {bottomNavItems.map((item) => (
              <li key={item.label}>
                <NavLink
                  to={item.path}
                  onClick={handleNavClick}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors
                    ${isActive(item.path)
                      ? 'bg-indigo-600 text-white'
                      : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
            <li>
              <button
                onClick={logout}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-indigo-200 hover:bg-indigo-800 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </li>
          </ul>
        </div>
      </aside>
    </>
  );
}
