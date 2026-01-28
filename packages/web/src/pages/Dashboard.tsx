import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import NotificationSettings from '../components/NotificationSettings';

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const businessName = user.businessMemberships?.[0]?.business?.name || 'My Farm';

  return (
    <div className="space-y-6">
      {/* Hero Welcome Section — matches login dark gradient */}
      <div
        className="rounded-xl p-8 text-white shadow-2xl"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}
      >
        <div className="flex items-center space-x-4 mb-4">
          <img
            src="/kernelag-logo.jpg"
            alt="KernelAg"
            className="w-14 h-14 rounded-xl object-cover ring-2 ring-white/20"
          />
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user.firstName}!</h1>
            <p className="text-slate-300 mt-0.5">{businessName}</p>
          </div>
        </div>
        <p className="text-slate-400 text-sm">Here's an overview of your farm operations</p>
      </div>

      {/* Quick Actions */}
      {user.businessMemberships.map((membership) => (
        <div key={membership.id} className="bg-white rounded-xl shadow-2xl border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-5">
            <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
              {membership.business.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{membership.business.name}</h2>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{membership.role}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <button
              onClick={() => navigate('/grain-contracts/dashboard')}
              className="flex flex-col items-center p-4 rounded-xl border border-gray-200 hover:border-emerald-500 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-2 group-hover:bg-emerald-100">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Grain Dashboard</span>
            </button>

            <button
              onClick={() => navigate('/marketing-ai')}
              className="flex flex-col items-center p-4 rounded-xl border border-gray-200 hover:border-emerald-500 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-2 group-hover:bg-emerald-100">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Marketing AI</span>
            </button>

            <button
              onClick={() => navigate('/grain-contracts')}
              className="flex flex-col items-center p-4 rounded-xl border border-gray-200 hover:border-emerald-500 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-2 group-hover:bg-emerald-100">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Contracts</span>
            </button>

            <button
              onClick={() => navigate('/grain-contracts/bins')}
              className="flex flex-col items-center p-4 rounded-xl border border-gray-200 hover:border-emerald-500 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-2 group-hover:bg-emerald-100">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Grain Bins</span>
            </button>

            <button
              onClick={() => navigate('/calendar')}
              className="flex flex-col items-center p-4 rounded-xl border border-gray-200 hover:border-emerald-500 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-2 group-hover:bg-emerald-100">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Calendar</span>
            </button>

            <button
              onClick={() => navigate('/tasks')}
              className="flex flex-col items-center p-4 rounded-xl border border-gray-200 hover:border-emerald-500 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-2 group-hover:bg-emerald-100">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Tasks</span>
            </button>

            <button
              onClick={() => navigate('/marketplace/input-bids')}
              className="flex flex-col items-center p-4 rounded-xl border border-gray-200 hover:border-emerald-500 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-2 group-hover:bg-emerald-100">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Input Bids</span>
            </button>

            <button
              onClick={() => navigate('/invoice-parsing')}
              className="flex flex-col items-center p-4 rounded-xl border border-gray-200 hover:border-emerald-500 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-2 group-hover:bg-emerald-100">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">Invoices</span>
            </button>

            {membership.role !== 'EMPLOYEE' && (
              <button
                onClick={() => navigate('/breakeven')}
                className="flex flex-col items-center p-4 rounded-xl border border-gray-200 hover:border-emerald-500 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-2 group-hover:bg-emerald-100">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700">Break-Even</span>
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Notification Settings */}
      <div className="bg-white rounded-xl shadow-2xl border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h2>
        <NotificationSettings />
      </div>
    </div>
  );
}
