import { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import NotificationBell from '../NotificationBell';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function AppLayout({ children, title, subtitle, actions }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="lg:pl-56 min-h-screen flex flex-col">
        {/* Top header bar */}
        <header className="sticky top-0 z-30 glass-subtle border-b border-white/20">
          <div className="flex items-center justify-between h-14 px-4 sm:px-6">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Page title */}
            <div className="flex-1 min-w-0 lg:ml-0 ml-4">
              {title && (
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
                  {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
                </div>
              )}
            </div>

            {/* Notification Bell and Actions */}
            <div className="flex items-center space-x-3">
              <NotificationBell />
              {actions}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
