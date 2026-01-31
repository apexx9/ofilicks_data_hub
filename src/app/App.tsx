import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { LandingPage } from './components/LandingPage';
import { SignIn } from './components/SignIn';
import { SignUp } from './components/SignUp';
import { Dashboard } from './components/Dashboard';
import { BuyData } from './components/BuyData';
import { TransactionHistory } from './components/TransactionHistory';
import { OrderHistory } from './components/OrderHistory';
import { AdminBundles } from './components/admin/AdminBundles';
import { AdminUsers } from './components/admin/AdminUsers';
import { AdminProvidersEnhanced } from './components/admin/AdminProvidersEnhanced';
import { SeedHelper } from './components/SeedHelper';
import { PaymentCallback } from './components/PaymentCallback';
import { NotFound } from './components/NotFound';
import {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  Receipt,
  Package,
  Users,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';

type Page = 'dashboard' | 'buy-data' | 'transactions' | 'orders' | 'admin-bundles' | 'admin-users' | 'admin-providers';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
}

function AuthenticatedApp() {
  const { user, signout } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Redirect to signin if user is not authenticated
  useEffect(() => {
    if (!user) {
      window.location.href = '/signin';
    }
  }, [user]);

  const isAdmin = user?.role === 'ADMIN';

  const userNavItems = [
    { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'buy-data' as Page, label: 'Buy Data', icon: ShoppingCart },
    { id: 'transactions' as Page, label: 'Transactions', icon: Wallet },
    { id: 'orders' as Page, label: 'Orders', icon: Receipt },
  ];

  const adminNavItems = [
    { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'admin-bundles' as Page, label: 'Bundles', icon: Package },
    { id: 'admin-users' as Page, label: 'Users', icon: Users },
    { id: 'admin-providers' as Page, label: 'API Providers', icon: Settings },
  ];

  const navItems = isAdmin ? adminNavItems : userNavItems;

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'buy-data':
        return <BuyData />;
      case 'transactions':
        return <TransactionHistory />;
      case 'orders':
        return <OrderHistory />;
      case 'admin-bundles':
        return isAdmin ? <AdminBundles /> : <Dashboard />;
      case 'admin-users':
        return isAdmin ? <AdminUsers /> : <Dashboard />;
      case 'admin-providers':
        return isAdmin ? <AdminProvidersEnhanced /> : <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Ofilicks Logo" className="w-8 h-8 object-contain" />
          <h1 className="text-lg font-bold text-gray-900">Ofilicks Data Hub</h1>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-gray-200 min-h-screen sticky top-0">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Ofilicks Data Hub</h1>
            <p className="text-xs text-gray-500 mt-1">Ghana Data Distribution</p>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="px-4 py-3 mb-2 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-600">{user?.email}</p>
              <p className="text-xs text-gray-500 mt-1">{user?.role}</p>
            </div>
            <button
              onClick={() => {
                signout();
                window.location.href = '/signin';
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Sidebar - Mobile */}
        <aside
          className={`lg:hidden fixed top-0 left-0 w-64 bg-white border-r border-gray-200 h-full z-50 transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Ofilicks Data Hub</h1>
            <p className="text-xs text-gray-500 mt-1">Ghana Data Distribution</p>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentPage(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
            <div className="px-4 py-3 mb-2 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-600">{user?.email}</p>
              <p className="text-xs text-gray-500 mt-1">{user?.role}</p>
            </div>
            <button
              onClick={() => {
                signout();
                setIsMobileMenuOpen(false);
                window.location.href = '/signin';
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          {renderPage()}
        </main>
      </div>

      {/* Mobile Bottom Navigation - Only for non-admin users */}
      {!isAdmin && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
          <div className="grid grid-cols-4 gap-1 p-2">
            {userNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors ${isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <>
        <SeedHelper />
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/signin" element={<SignIn onSignUpClick={() => window.location.href = '/signup'} />} />
            <Route path="/signup" element={<SignUp onSignInClick={() => window.location.href = '/signin'} />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AuthenticatedApp />
              </ProtectedRoute>
            } />
            <Route path="/payment/callback" element={<PaymentCallback />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </>
    </Router>
  );
}