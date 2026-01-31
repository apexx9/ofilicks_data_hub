"use client";

import { useEffect, useState } from "react";
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, 
  LogOut,
  Menu,
  X
} from 'lucide-react';

/* ---------------- TYPES ---------------- */
type Bundle = {
  id: string;
  network: "MTN" | "AirtelTigo" | "Telecel";
  size: string;
  price: number;
};

/* ---------------- MOCK FETCH ----------------
Replace this with your real API later.
-------------------------------------------- */
const fetchBundles = async (): Promise<Bundle[]> => {
  return [
    { id: "1", network: "MTN", size: "1GB", price: 5 },
    { id: "2", network: "MTN", size: "5GB", price: 20 },
    { id: "3", network: "AirtelTigo", size: "2GB", price: 10 },
    { id: "4", network: "Telecel", size: "3GB", price: 15 },
    { id: "5", network: "MTN", size: "10GB", price: 35 },
    { id: "6", network: "AirtelTigo", size: "5GB", price: 25 },
    { id: "7", network: "Telecel", size: "8GB", price: 30 },
    { id: "8", network: "MTN", size: "20GB", price: 60 },
  ];
};

export function LandingPage() {
  const { user, isAuthenticated, signout } = useAuth();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Debug logs
  console.log('LandingPage - isAuthenticated:', isAuthenticated);
  console.log('LandingPage - user:', user);
  console.log('LandingPage - user role:', user?.role);

  useEffect(() => {
    fetchBundles().then(setBundles);
  }, []);

  const handleSignOut = () => {
    signout();
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ---------------- NAVBAR ---------------- */}
      <nav className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="font-bold text-xl">Ofilicks Data Hub</h1>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-4 items-center">
            <a href="#bundles" className="text-sm text-gray-600 hover:text-gray-900">Bundles</a>
            <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900">How It Works</a>
            
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="text-sm">{user?.name}</span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    user?.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                    user?.role === 'DEALER' ? 'bg-green-100 text-green-800' :
                    user?.role === 'AGENT' ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
                <a 
                  href="/dashboard"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                >
                  Dashboard
                </a>
              </div>
            ) : (
              <div className="flex gap-3">
                <a 
                  href="/signin"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Sign In
                </a>
                <a 
                  href="/signup"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                >
                  Get Started
                </a>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-gray-600 hover:text-gray-900"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 px-4">
            <div className="space-y-3">
              <a href="#bundles" className="block text-sm text-gray-600">Bundles</a>
              <a href="#how-it-works" className="block text-sm text-gray-600">How It Works</a>
              
              {isAuthenticated ? (
                <>
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4" />
                      <span className="text-sm">{user?.name}</span>
                    </div>
                    <span className={`inline-block px-2 py-1 text-xs rounded mb-3 ${
                      user?.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                      user?.role === 'DEALER' ? 'bg-green-100 text-green-800' :
                      user?.role === 'AGENT' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {user?.role}
                    </span>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-1 w-full text-left text-sm text-red-600 hover:bg-red-50 py-2 px-3 rounded"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                    <a 
                      href="/dashboard"
                      className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm mt-2"
                    >
                      Dashboard
                    </a>
                  </div>
                </>
              ) : (
                <div className="pt-2 border-t border-gray-200 space-y-2">
                  <a 
                    href="/signin"
                    className="block w-full text-left text-sm text-gray-600 hover:text-gray-900 py-2"
                  >
                    Sign In
                  </a>
                  <a 
                    href="/signup"
                    className="block w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm"
                  >
                    Get Started
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ---------------- HERO ---------------- */}
      <section className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-14 grid lg:grid-cols-2 gap-12">
          {/* LEFT */}
          <div>
            <h2 className="text-4xl font-bold leading-tight">
              {isAuthenticated ? (
                user?.role === 'ADMIN' ? 'Manage Data Distribution' :
                user?.role === 'DEALER' ? 'Wholesale Data Solutions' :
                user?.role === 'AGENT' ? 'Agent Data Distribution' :
                'Buy Mobile Data'
              ) : 'Buy Mobile Data'} <br /> 
              {isAuthenticated ? (
                user?.role === 'ADMIN' ? 'Across Ghana' :
                user?.role === 'DEALER' ? 'For Your Business' :
                user?.role === 'AGENT' ? 'For Your Customers' :
                'Instantly in Ghana'
              ) : 'Instantly in Ghana'}
            </h2>

            <p className="mt-4 text-lg text-gray-600 max-w-xl">
              {isAuthenticated ? (
                user?.role === 'ADMIN' ? 'Manage bundles, users, and providers. Control pricing and distribution.' :
                user?.role === 'DEALER' ? 'Bulk data purchases at wholesale prices. Manage your inventory efficiently.' :
                user?.role === 'AGENT' ? 'Sell data bundles to customers. Earn commissions on every transaction.' :
                'Wallet-based data purchases for MTN, AirtelTigo and Telecel. Admin-controlled pricing. Instant delivery.'
              ) : 'Wallet-based data purchases for MTN, AirtelTigo and Telecel. Admin-controlled pricing. Instant delivery.'}
            </p>

            <div className="mt-6 flex gap-2 flex-wrap">
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded">MTN</span>
              <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded">AirtelTigo</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded">Telecel</span>
            </div>

            {!isAuthenticated ? (
              <div className="mt-8 flex gap-3">
                <a 
                  href="/signin"
                  className="px-6 py-3 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700"
                >
                  Create Account
                </a>
                <a 
                  href="/signin"
                  className="px-6 py-3 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Sign In
                </a>
              </div>
            ) : (
              <a 
                href="/dashboard"
                className="mt-8 inline-block px-6 py-3 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700"
              >
                Go to Dashboard
              </a>
            )}
          </div>

          {/* RIGHT – WALLET PREVIEW (Demo Only) */}
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 space-y-6 shadow-sm relative">
            <div className="absolute -top-3 left-4 bg-gray-50 px-2 text-sm text-gray-500 font-medium">
              Preview Only
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Wallet Balance</p>
                <p className="text-3xl font-bold">₵0.00</p>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                Fund Wallet
              </button>
            </div>

            <div className="border-t border-gray-200" />

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Phone Number</label>
                <input
                  disabled
                  placeholder="024 xxx xxxx"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-100 cursor-not-allowed"
                  title="This is a preview. Sign in to use the actual data purchase form."
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">Network</label>
                <select
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-100 cursor-not-allowed"
                  title="This is a preview. Sign in to use the actual data purchase form."
                >
                  <option>MTN</option>
                  <option>AirtelTigo</option>
                  <option>Telecel</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">Bundle</label>
                <select
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-100 cursor-not-allowed"
                  title="This is a preview. Sign in to use the actual data purchase form."
                >
                  <option>Select a bundle...</option>
                  <option>1GB - ₵5.00</option>
                  <option>5GB - ₵20.00</option>
                  <option>10GB - ₵35.00</option>
                </select>
              </div>

              <button 
                disabled 
                className="w-full px-4 py-3 bg-gray-300 text-gray-500 rounded font-medium cursor-not-allowed"
                title="This is a preview. Sign in to use the actual data purchase form."
              >
                Sign in to Buy Data
              </button>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500 mb-1">Last Transaction</p>
              <div className="flex justify-between text-sm">
                <span>MTN • 5GB</span>
                <span className="text-green-600 font-medium">Delivered</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- LIVE BUNDLES ---------------- */}
      <section id="bundles" className="py-14 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-2xl font-bold mb-6">
            Live Data Bundles
          </h3>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {bundles.map((bundle) => (
              <div
                key={bundle.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500">{bundle.network}</p>
                    <p className="text-xl font-bold">{bundle.size}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    bundle.network === 'MTN' ? 'bg-yellow-100 text-yellow-800' :
                    bundle.network === 'AirtelTigo' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {bundle.network}
                  </span>
                </div>
                <p className="mt-2 text-blue-600 font-semibold">
                  ₵{bundle.price.toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-sm text-gray-500">
            {isAuthenticated ? (
              user?.role === 'ADMIN' ? '* You can manage and update these prices in real time' :
              user?.role === 'DEALER' ? '* Wholesale pricing available for bulk purchases' :
              user?.role === 'AGENT' ? '* Commission rates apply to reseller transactions' :
              '* Prices are set and managed by the admin in real time.'
            ) : '* Prices are set and managed by the admin in real time.'}
          </p>
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section id="how-it-works" className="py-14">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-2xl font-bold text-center mb-12">
            How It Works
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              ["Create Account", "Register and verify your number"],
              ["Fund Wallet", "Add money once, use anytime"],
              ["Buy Data", "Instant delivery to any network"],
            ].map(([title, desc], index) => (
              <div key={title} className="relative">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-600 font-bold">{index + 1}</span>
                </div>
                <h4 className="font-bold text-lg">{title}</h4>
                <p className="mt-2 text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="bg-blue-600 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-4">
            Ready to buy data the smart way?
          </h3>
          <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of users enjoying instant delivery.
          </p>
          
          {!isAuthenticated ? (
            <a 
              href="/signup"
              className="inline-block px-8 py-4 bg-white text-blue-600 rounded-md font-semibold hover:bg-gray-100 transition-colors"
            >
              Get Started
            </a>
          ) : (
            <div className="space-y-4">
              <a 
                href="/dashboard"
                className="inline-block px-8 py-4 bg-white text-blue-600 rounded-md font-semibold hover:bg-gray-100 transition-colors"
              >
                {user?.role === 'ADMIN' ? 'Go to Admin Panel' :
                 user?.role === 'DEALER' ? 'Manage Inventory' :
                 user?.role === 'AGENT' ? 'Start Selling' :
                 'Go to Dashboard'}
              </a>
              {user?.role !== 'USER' && (
                <p className="text-blue-100 text-sm">
                  {user?.role === 'ADMIN' ? 'Manage bundles, users, and API providers' :
                   user?.role === 'DEALER' ? 'Access wholesale pricing and bulk operations' :
                   user?.role === 'AGENT' ? 'View commission rates and customer management' :
                   ''}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <h4 className="font-semibold text-gray-900">Ofilicks Data Hub</h4>
              <p className="text-sm text-gray-600 mt-1">Ghana's trusted data distribution platform</p>
            </div>
            <div className="flex gap-6 text-sm text-gray-600">
              <a href="#" className="hover:text-gray-900">About</a>
              <a href="#" className="hover:text-gray-900">Contact</a>
              <a href="#" className="hover:text-gray-900">Privacy</a>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-6 pt-6 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Ofilicks Data Hub. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}