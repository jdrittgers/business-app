import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useRetailerAuthStore } from './store/retailerAuthStore';
import { useSocket } from './hooks/useSocket';
import { registerServiceWorker } from './utils/push-notifications';
import { UserRole } from '@business-app/shared';
import AppLayout from './components/layout/AppLayout';
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
import GrainBins from './pages/GrainBins';
import RetailerGrainMarketplace from './pages/RetailerGrainMarketplace';
import FarmerGrainOffers from './pages/FarmerGrainOffers';
import PricingPage from './pages/PricingPage';
import SubscriptionManagement from './pages/SubscriptionManagement';
import DeletedItems from './pages/DeletedItems';
import MarketingAI from './pages/MarketingAI';
import RequireRole from './components/RequireRole';

// Wrapper for authenticated routes with layout
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <AppLayout>{children}</AppLayout>;
}

function App() {
  const { loadUser } = useAuthStore();
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
      <Route path="/dashboard" element={<AuthRoute><Dashboard /></AuthRoute>} />
      <Route path="/team" element={<AuthRoute><TeamManagement /></AuthRoute>} />
      <Route path="/settings" element={<AuthRoute><UserSettings /></AuthRoute>} />
      <Route path="/calendar" element={<AuthRoute><Calendar /></AuthRoute>} />
      <Route path="/tasks" element={<AuthRoute><Tasks /></AuthRoute>} />
      <Route path="/grain-contracts" element={<AuthRoute><GrainContracts /></AuthRoute>} />
      <Route path="/grain-contracts/production" element={<AuthRoute><GrainProduction /></AuthRoute>} />
      <Route path="/grain-contracts/dashboard" element={<AuthRoute><GrainDashboard /></AuthRoute>} />
      <Route path="/breakeven" element={<AuthRoute><RequireRole allowedRoles={[UserRole.OWNER, UserRole.MANAGER]}><BreakEven /></RequireRole></AuthRoute>} />
      <Route path="/breakeven/products" element={<AuthRoute><RequireRole allowedRoles={[UserRole.OWNER, UserRole.MANAGER]}><ProductCatalog /></RequireRole></AuthRoute>} />
      <Route path="/breakeven/farms" element={<AuthRoute><RequireRole allowedRoles={[UserRole.OWNER, UserRole.MANAGER]}><FarmManagement /></RequireRole></AuthRoute>} />
      <Route path="/breakeven/farms/:farmId/costs" element={<AuthRoute><RequireRole allowedRoles={[UserRole.OWNER, UserRole.MANAGER]}><FarmCostEntry /></RequireRole></AuthRoute>} />
      <Route path="/input-bids" element={<AuthRoute><InputBids /></AuthRoute>} />
      <Route path="/invoice-parsing" element={<AuthRoute><InvoiceParsing /></AuthRoute>} />
      <Route path="/grain-contracts/bins" element={<AuthRoute><GrainBins /></AuthRoute>} />
      <Route path="/grain-contracts/offers" element={<AuthRoute><FarmerGrainOffers /></AuthRoute>} />

      {/* Subscription Routes */}
      <Route path="/pricing" element={<AuthRoute><PricingPage /></AuthRoute>} />
      <Route path="/subscription" element={<AuthRoute><SubscriptionManagement /></AuthRoute>} />
      <Route path="/subscription/success" element={<AuthRoute><SubscriptionManagement /></AuthRoute>} />
      <Route path="/deleted-items" element={<AuthRoute><DeletedItems /></AuthRoute>} />
      <Route path="/marketing-ai" element={<AuthRoute><MarketingAI /></AuthRoute>} />

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
      <Route
        path="/retailer/grain-marketplace"
        element={isRetailerAuthenticated ? <RetailerGrainMarketplace /> : <Navigate to="/retailer/login" />}
      />
    </Routes>
  );
}

export default App;
