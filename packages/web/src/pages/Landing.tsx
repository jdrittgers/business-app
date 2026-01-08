import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Agricultural Business Platform
          </h1>
          <p className="text-xl text-gray-600">
            Manage your farm operations, grain marketing, and input bidding all in one place
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Farmer Card */}
          <div
            onClick={() => navigate('/login')}
            className="bg-white rounded-2xl shadow-xl p-8 cursor-pointer transform transition-all hover:scale-105 hover:shadow-2xl"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">🌾</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">I'm a Farmer</h2>
              <p className="text-gray-600 mb-6">
                Access grain marketing, break-even analysis, farm management, and create input bid requests
              </p>
              <button className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors">
                Farmer Login
              </button>
            </div>
          </div>

          {/* Retailer Card */}
          <div
            onClick={() => navigate('/retailer/login')}
            className="bg-white rounded-2xl shadow-xl p-8 cursor-pointer transform transition-all hover:scale-105 hover:shadow-2xl"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">🏪</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">I'm a Retailer</h2>
              <p className="text-gray-600 mb-6">
                View open bid requests from farmers and submit competitive bids for fertilizers and chemicals
              </p>
              <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                Retailer Login
              </button>
            </div>
          </div>
        </div>

        {/* Demo Account Info */}
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-700 mb-4">
            <span className="font-semibold">Want to try it first?</span> Use our demo account to explore all features
          </p>
          <div className="flex justify-center gap-4 text-sm text-gray-600">
            <div className="bg-gray-50 px-4 py-2 rounded">
              <span className="font-medium">Email:</span> demo@demo.com
            </div>
            <div className="bg-gray-50 px-4 py-2 rounded">
              <span className="font-medium">Password:</span> demo
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>© 2026 Agricultural Business Platform. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
