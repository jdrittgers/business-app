import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useRetailerAuthStore } from './store/retailerAuthStore';
import { useSocket } from './hooks/useSocket';
import { registerServiceWorker } from './utils/push-notifications';
import { UserRole } from '@business-app/shared';
import Landing from './pages/Landing';
import Login from './pages/Login';
import FarmerRegister from './pages/FarmerRegister';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Tasks from './pages/Tasks';
import GrainContracts from './pages/GrainContracts';
import GrainProduction from './pages/GrainProduction';
import GrainDashboard from './pages/GrainDashboard';
import BreakEven from './pages/BreakEven';
import ProductCatalog from './pages/ProductCatalog';
import FarmManagement from './pages/FarmManagement';
import FarmCostEntry from './pages/FarmCostEntry';
import InputBids from './pages/InputBids';
import RetailerLogin from './pages/RetailerLogin';
import RetailerRegister from './pages/RetailerRegister';
import RetailerDashboard from './pages/RetailerDashboard';
import RetailerProfile from './pages/RetailerProfile';
import TeamManagement from './pages/TeamManagement';
import AcceptInvitation from './pages/AcceptInvitation';
import UserSettings from './pages/UserSettings';
import InvoiceParsing from './pages/InvoiceParsing';
import RequireRole from './components/RequireRole';

function App() {
  const { loadUser, isAuthenticated } = useAuthStore();
  const { loadRetailer, isAuthenticated: isRetailerAuthenticated } = useRetailerAuthStore();

  // Initialize socket connection
  useSocket();

  useEffect(() => {
    loadUser();
    loadRetailer();

    // Register service worker for push notifications
    registerServiceWorker();
  }, [loadUser, loadRetailer]);

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<FarmerRegister />} />
      <Route path="/accept-invitation" element={<AcceptInvitation />} />
      <Route
        path="/dashboard"
        element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
      />
      <Route
        path="/team"
        element={isAuthenticated ? <TeamManagement /> : <Navigate to="/login" />}
      />
      <Route
        path="/settings"
        element={isAuthenticated ? <UserSettings /> : <Navigate to="/login" />}
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
      <Route
        path="/breakeven"
        element={isAuthenticated ? <RequireRole allowedRoles={[UserRole.OWNER, UserRole.MANAGER]}><BreakEven /></RequireRole> : <Navigate to="/login" />}
      />
      <Route
        path="/breakeven/products"
        element={isAuthenticated ? <RequireRole allowedRoles={[UserRole.OWNER, UserRole.MANAGER]}><ProductCatalog /></RequireRole> : <Navigate to="/login" />}
      />
      <Route
        path="/breakeven/farms"
        element={isAuthenticated ? <RequireRole allowedRoles={[UserRole.OWNER, UserRole.MANAGER]}><FarmManagement /></RequireRole> : <Navigate to="/login" />}
      />
      <Route
        path="/breakeven/farms/:farmId/costs"
        element={isAuthenticated ? <RequireRole allowedRoles={[UserRole.OWNER, UserRole.MANAGER]}><FarmCostEntry /></RequireRole> : <Navigate to="/login" />}
      />
      <Route
        path="/input-bids"
        element={isAuthenticated ? <InputBids /> : <Navigate to="/login" />}
      />
      <Route
        path="/invoice-parsing"
        element={isAuthenticated ? <InvoiceParsing /> : <Navigate to="/login" />}
      />

      {/* Retailer Routes */}
      <Route path="/retailer/login" element={<RetailerLogin />} />
      <Route path="/retailer/register" element={<RetailerRegister />} />
      <Route
        path="/retailer/dashboard"
        element={isRetailerAuthenticated ? <RetailerDashboard /> : <Navigate to="/retailer/login" />}
      />
      <Route
        path="/retailer/profile"
        element={isRetailerAuthenticated ? <RetailerProfile /> : <Navigate to="/retailer/login" />}
      />
    </Routes>
  );
}

export default App;
