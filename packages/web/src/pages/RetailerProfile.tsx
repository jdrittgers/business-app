import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRetailerAuthStore } from '../store/retailerAuthStore';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function RetailerProfile() {
  const navigate = useNavigate();
  const { retailer, user, isAuthenticated, loadRetailer } = useRetailerAuthStore();

  const [formData, setFormData] = useState({
    companyName: '',
    zipCode: '',
    businessLicense: '',
    phone: '',
    radiusPreference: 50
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/retailer/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (retailer) {
      setFormData({
        companyName: retailer.companyName || '',
        zipCode: retailer.zipCode || '',
        businessLicense: retailer.businessLicense || '',
        phone: retailer.phone || '',
        radiusPreference: retailer.radiusPreference || 50
      });
    }
  }, [retailer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('retailerAccessToken');
      await axios.put(
        `${API_BASE_URL}/api/retailer/profile`,
        {
          companyName: formData.companyName,
          zipCode: formData.zipCode || undefined,
          businessLicense: formData.businessLicense || undefined,
          phone: formData.phone || undefined,
          radiusPreference: formData.radiusPreference
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setSuccess('Profile updated successfully!');

      // Reload retailer data to get updated coordinates
      await loadRetailer();

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/retailer/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (!retailer || !user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Retailer Profile</h1>
        <p className="text-gray-600 mt-1">Update your company details and delivery preferences</p>
      </div>

      {/* Profile Form */}
      <div className="max-w-3xl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {/* Account Info (Read-only) */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Email:</span>
                <span className="ml-2 font-medium">{user.email}</span>
              </div>
              <div>
                <span className="text-gray-500">Name:</span>
                <span className="ml-2 font-medium">{user.firstName} {user.lastName}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ZIP Code
              </label>
              <input
                type="text"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="43062"
                pattern="\d{5}"
                title="Please enter a 5-digit ZIP code"
                maxLength={5}
              />
              <p className="mt-1 text-xs text-gray-500">
                Used to find nearby bid requests and calculate distances
              </p>
              {retailer.latitude && retailer.longitude && (
                <p className="mt-1 text-xs text-green-600">
                  ✓ Location set: {retailer.latitude.toFixed(4)}, {retailer.longitude.toFixed(4)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Search Radius
              </label>
              <select
                value={formData.radiusPreference}
                onChange={(e) => setFormData({ ...formData, radiusPreference: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={25}>25 miles</option>
                <option value={50}>50 miles</option>
                <option value={100}>100 miles</option>
                <option value={200}>200 miles</option>
                <option value={500}>500 miles</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Default radius for filtering bid requests on your dashboard
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business License
              </label>
              <input
                type="text"
                value={formData.businessLicense}
                onChange={(e) => setFormData({ ...formData, businessLicense: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/retailer/dashboard')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isLoading ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
