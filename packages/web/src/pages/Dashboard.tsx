import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import NotificationSettings from '../components/NotificationSettings';

export default function Dashboard() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Business App</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user.firstName} {user.lastName}
              </span>
              <button
                onClick={() => navigate('/settings')}
                className="text-gray-700 hover:text-gray-900 text-sm font-medium"
              >
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome, {user.firstName}!
            </h2>

            <div className="space-y-6">
              {/* Businesses - Segregated by Business */}
              {user.businessMemberships.map((membership) => (
                <div key={membership.id} className="border-2 border-gray-300 rounded-lg p-6 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{membership.business.name}</h3>
                      <p className="text-sm text-gray-600">Your Role: {membership.role}</p>
                    </div>
                  </div>

                  {/* Quick Actions per Business */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Quick Actions</h4>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => navigate('/calendar')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium text-sm"
                      >
                        📅 Calendar
                      </button>
                      <button
                        onClick={() => navigate('/tasks')}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-medium text-sm"
                      >
                        ✅ Tasks
                      </button>
                      <button
                        onClick={() => navigate('/input-bids')}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-medium text-sm"
                      >
                        📦 Input Bids
                      </button>
                      <button
                        onClick={() => navigate('/invoice-parsing')}
                        className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 font-medium text-sm"
                      >
                        📄 Invoice Parsing
                      </button>
                      <button
                        onClick={() => navigate('/grain-contracts/dashboard')}
                        className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 font-medium text-sm"
                      >
                        📊 Grain Dashboard
                      </button>
                      <button
                        onClick={() => navigate('/grain-contracts/production')}
                        className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800 font-medium text-sm"
                      >
                        🌱 Production
                      </button>
                      <button
                        onClick={() => navigate('/grain-contracts')}
                        className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 font-medium text-sm"
                      >
                        📝 Contracts
                      </button>
                      <button
                        onClick={() => navigate('/grain-contracts/bins')}
                        className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 font-medium text-sm"
                      >
                        🌾 Grain Bins
                      </button>
                      {membership.role !== 'EMPLOYEE' && (
                        <button
                          onClick={() => navigate('/breakeven')}
                          className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 font-medium text-sm"
                        >
                          💰 Breakeven
                        </button>
                      )}
                      {membership.role === 'OWNER' && (
                        <button
                          onClick={() => navigate('/team')}
                          className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 font-medium text-sm"
                        >
                          👥 Team Management
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Notification Settings</h3>
                <NotificationSettings />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
