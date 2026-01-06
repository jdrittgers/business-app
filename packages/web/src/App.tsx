import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useSocket } from './hooks/useSocket';
import { registerServiceWorker } from './utils/push-notifications';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Tasks from './pages/Tasks';
import GrainContracts from './pages/GrainContracts';
import GrainProduction from './pages/GrainProduction';
import GrainDashboard from './pages/GrainDashboard';

function App() {
  const { loadUser, isAuthenticated } = useAuthStore();

  // Initialize socket connection
  useSocket();

  useEffect(() => {
    loadUser();

    // Register service worker for push notifications
    registerServiceWorker();
  }, [loadUser]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
      />
      <Route
        path="/calendar"
        element={isAuthenticated ? <Calendar /> : <Navigate to="/login" />}
      />
      <Route
        path="/tasks"
        element={isAuthenticated ? <Tasks /> : <Navigate to="/login" />}
      />
      <Route
        path="/grain-contracts"
        element={isAuthenticated ? <GrainContracts /> : <Navigate to="/login" />}
      />
      <Route
        path="/grain-contracts/production"
        element={isAuthenticated ? <GrainProduction /> : <Navigate to="/login" />}
      />
      <Route
        path="/grain-contracts/dashboard"
        element={isAuthenticated ? <GrainDashboard /> : <Navigate to="/login" />}
      />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default App;
