import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BusinessDataProvider } from './context/BusinessDataContext';
import BottomNav from './components/BottomNav';
import BusinessSidebar from './components/BusinessSidebar';
import BusinessBottomNav from './components/BusinessBottomNav';
import RoleSwitcher from './components/RoleSwitcher';
import ToastContainer from './components/Toast';
import { useEffect } from 'react';

// Auth
import AuthPage from './pages/auth/AuthPage';

// Customer Pages
import HomePage from './pages/customer/HomePage';
import CardsPage from './pages/customer/CardsPage';
import CardDetailPage from './pages/customer/CardDetailPage';
import ProfilePage from './pages/customer/ProfilePage';

// Business Pages
import OverviewPage from './pages/business/OverviewPage';
import CustomersPage from './pages/business/CustomersPage';
import ProductsPage from './pages/business/ProductsPage';
import PromotionsPage from './pages/business/PromotionsPage';
import RewardsPage from './pages/business/RewardsPage';
import NewsPage from './pages/business/NewsPage';
import SettingsPage from './pages/business/SettingsPage';
import ScanPurchasePage from './pages/business/ScanPurchasePage';

function CustomerLayout() {
  return (
    <div className="max-w-[430px] mx-auto min-h-screen bg-[#F4F3FB] relative">
      <div className="px-5 pt-4 flex justify-end">
        <RoleSwitcher />
      </div>
      <Routes>
        <Route path="/home" element={<HomePage />} />
        <Route path="/cards" element={<CardsPage />} />
        <Route path="/cards/:businessId" element={<CardDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

function BusinessLayout() {
  return (
    <BusinessDataProvider>
      <div className="flex min-h-screen">
        <BusinessSidebar />
        <div className="flex-1 overflow-y-auto bg-[#F4F3FB]">
          <Routes>
            <Route path="/business/overview" element={<OverviewPage />} />
            <Route path="/business/customers" element={<CustomersPage />} />
            <Route path="/business/products" element={<ProductsPage />} />
            <Route path="/business/promotions" element={<PromotionsPage />} />
            <Route path="/business/rewards" element={<RewardsPage />} />
            <Route path="/business/news" element={<NewsPage />} />
            <Route path="/business/settings" element={<SettingsPage />} />
            <Route path="/business/scan/:cardId" element={<ScanPurchasePage />} />
            <Route path="*" element={<Navigate to="/business/overview" replace />} />
          </Routes>
        </div>
        <BusinessBottomNav />
      </div>
    </BusinessDataProvider>
  );
}

function AuthenticatedRoutes() {
  const { role } = useApp();

  return (
    <>
      {role === 'customer' ? <CustomerLayout /> : <BusinessLayout />}
      <ToastContainer />
    </>
  );
}

function AuthGuard() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    return <AuthenticatedRoutes />;
  }

  return <Navigate to="/auth" replace state={{ from: location.pathname + location.search }} />;
}

function AppRoutes() {
  const { isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) return;

    const timeoutId = setTimeout(() => {
      console.warn('Auth loading timeout (>12s) → forcing reload');
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/auth?redirect=${redirect}`;
    }, 6000);

    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F3FB] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7546ED] to-[#DC89FF] flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">F</span>
          </div>
          <div className="animate-pulse">
            <div className="w-8 h-8 bg-[#7546ED] rounded-full mx-auto mb-2"></div>
            <p className="text-[#B1A9E5] text-sm">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/*" element={<AuthGuard />} />
      </Routes>
      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
