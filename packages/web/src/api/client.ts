import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Check if this is a retailer endpoint
    // - /api/retailer/* are retailer-specific endpoints
    // - /grain-marketplace/* are retailer endpoints EXCEPT /grain-marketplace/businesses/* which are farmer endpoints
    // - /businesses/* are always farmer endpoints (including /businesses/:id/retailer-access/*)
    const isRetailerEndpoint = config.url?.includes('/api/retailer/') ||
      (config.url?.includes('/grain-marketplace') && !config.url?.includes('/businesses/'));

    // Use appropriate token based on endpoint
    const token = isRetailerEndpoint
      ? localStorage.getItem('retailerAccessToken')
      : localStorage.getItem('accessToken');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Refresh queue: serialize concurrent 401 refresh attempts
let isRefreshing = false;
let refreshQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

function processQueue(error: any, token: string | null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  refreshQueue = [];
}

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isRetailerEndpoint = originalRequest.url?.includes('/api/retailer/') ||
      (originalRequest.url?.includes('/grain-marketplace') && !originalRequest.url?.includes('/businesses/'));

    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // For retailer endpoints, don't try to refresh, just redirect
      if (isRetailerEndpoint) {
        localStorage.removeItem('retailerAccessToken');
        window.location.href = '/retailer/login';
        return Promise.reject(error);
      }

      // If a refresh is already in progress, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject
          });
        });
      }

      isRefreshing = true;

      // For farmer endpoints, try to refresh
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);

        // Process queued requests with new token
        processQueue(null, accessToken);

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, reject all queued requests
        processQueue(refreshError, null);

        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
