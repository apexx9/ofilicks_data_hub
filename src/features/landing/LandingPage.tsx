"use client";

import { useEffect, useState } from "react";
import { useAuth } from '@/contexts/AuthContext';
import {
  User,
  LogOut,
  Menu,
  X,
  Smartphone
} from 'lucide-react';
import { api, Bundle, Network } from '@/lib/api';
import { useNavigate } from 'react-router-dom';


// Utility to format network names
const formatNetwork = (network: string) => {
  return network.replace('AIRTELTIGO_', 'AT ').replace('_', ' ');
};

export function LandingPage() {
  const { user, isAuthenticated, signout, wallet, refreshWallet } = useAuth();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Widget State
  const [selectedBundleId, setSelectedBundleId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadBundles();
  }, []);

  const loadBundles = async () => {
    try {
      const res = await api.getBundles();
      if (res.success) {
        setBundles(res.bundles);
      }
    } catch (err) {
      console.error('Failed to load bundles:', err);
    }
  };

  const handleLandingPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }

    if (user?.role !== 'USER') {
      setMsg({ type: 'error', text: 'Resellers must use the Dashboard to purchase.' });
      return;
    }

    if (!selectedBundleId || !phoneNumber) {
      setMsg({ type: 'error', text: 'Please fill all fields.' });
      return;
    }

    setMsg(null);
    setIsPurchasing(true);

    try {
      const bundle = bundles.find(b => b.id === selectedBundleId);
      if (!bundle) throw new Error('Bundle not found');

      const { order } = await api.createOrder(bundle.id, phoneNumber);

      if (order.status === 'SUCCESS') {
        setMsg({ type: 'success', text: `Success! ${bundle.volume} sent to ${phoneNumber}` });
        setPhoneNumber('');
        setSelectedBundleId('');
        await refreshWallet();
      } else {
        throw new Error(order.errorMessage || 'Purchase failed');
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Payment failed' });
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleSignOut = () => {
    signout();
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ---------------- NAVBAR ---------------- */}
      <nav className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Ofilicks Logo" className="w-10 h-10 object-contain" />
            <h1 className="font-bold text-xl tracking-tight">Ofilicks Data Hub</h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-4 items-center">
            <a href="#bundles" className="text-sm text-gray-600 hover:text-gray-900">Bundles</a>
            <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900">How It Works</a>

            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 mr-2">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex flex-col -space-y-0.5">
                    <span className="text-sm font-semibold text-gray-900">{user?.name}</span>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">{user?.role}</span>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                >
                  Sign Out
                </button>
                <a
                  href="/dashboard"
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95"
                >
                  Go to Dashboard
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <a
                  href="/signin"
                  className="px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-xl transition-all"
                >
                  Sign In
                </a>
                <a
                  href="/signup"
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95"
                >
                  Get Started Free
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
                    <span className={`inline-block px-2 py-1 text-xs rounded mb-3 ${user?.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
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

          {/* RIGHT – WALLET PREVIEW / ACTIVE FORM */}
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 space-y-6 shadow-sm relative">
            {(!isAuthenticated || user?.role !== 'USER') && (
              <div className="absolute -top-3 left-4 bg-gray-50 px-2 text-sm text-gray-500 font-medium">
                Preview Only
              </div>
            )}

            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Wallet Balance</p>
                <p className="text-3xl font-bold">
                  ₵{isAuthenticated && user?.role === 'USER' ? (wallet?.balance || 0).toFixed(2) : '0.00'}
                </p>
              </div>
              {isAuthenticated && user?.role === 'USER' && (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Fund Wallet
                </button>
              )}
            </div>

            <div className="border-t border-gray-200" />

            <form onSubmit={handleLandingPurchase} className="space-y-4">
              {msg && (
                <div className={`p-3 rounded text-xs ${msg.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {msg.text}
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-600 mb-1">Phone Number</label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={!isAuthenticated || user?.role !== 'USER'}
                    placeholder="024 xxx xxxx"
                    className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${(!isAuthenticated || user?.role !== 'USER') ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                      }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Bundle</label>
                <select
                  value={selectedBundleId}
                  onChange={(e) => setSelectedBundleId(e.target.value)}
                  disabled={!isAuthenticated || user?.role !== 'USER'}
                  className={`w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${(!isAuthenticated || user?.role !== 'USER') ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                    }`}
                >
                  <option value="">Select a bundle...</option>
                  {bundles.map((b: Bundle) => {
                    const displayPrice = user ? (b.pricing[user.role as keyof typeof b.pricing] || b.pricing.USER) : b.pricing.USER;
                    return (
                      <option key={b.id} value={b.id}>
                        {b.network} {b.volume} - ₵{displayPrice.toFixed(2)}
                      </option>
                    );
                  })}
                </select>
              </div>

              <button
                type="submit"
                disabled={isPurchasing || (isAuthenticated && user?.role === 'USER' && (wallet?.balance || 0) < (bundles.find(b => b.id === selectedBundleId)?.pricing[user.role] || 0))}
                className={`w-full px-4 py-3 rounded font-medium transition ${(!isAuthenticated || user?.role !== 'USER' || (isAuthenticated && user?.role === 'USER' && (wallet?.balance || 0) < (bundles.find(b => b.id === selectedBundleId)?.pricing[user.role] || 0)))
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
              >
                {!isAuthenticated ? 'Sign in to Buy' :
                  isPurchasing ? 'Processing...' :
                    user?.role !== 'USER' ? 'Reseller Preview' :
                      (wallet?.balance || 0) < (bundles.find(b => b.id === selectedBundleId)?.pricing[user.role] || 0) ? 'Insufficient Balance' : 'Buy Data Now'}
              </button>
            </form>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500 mb-1">Last Transaction</p>
              <div className="flex justify-between text-sm">
                <span>Demo • 1GB</span>
                <span className="text-gray-400 font-medium italic">Available Instantly</span>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {bundles.map((bundle: Bundle) => (
              <div
                key={bundle.id}
                className="group bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-xl hover:border-blue-200 transition-all duration-300 relative overflow-hidden"
              >
                {/* Network Tag */}
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${bundle.network === 'MTN' ? 'bg-yellow-100 text-yellow-800' :
                    bundle.network.startsWith('AIRTELTIGO') ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                    {bundle.network.replace('AIRTELTIGO_', 'AT ')}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <Smartphone className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-1">
                  <p className="text-2xl font-black text-gray-900">{bundle.volume}</p>
                  <p className="text-sm text-gray-500 font-medium">{bundle.name}</p>
                </div>

                {/* Price Footer */}
                <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center">
                  <div className="text-xs text-gray-400 font-medium">Retail Price</div>
                  <div className="text-xl font-bold text-blue-600">
                    ₵{bundle.pricing.USER.toFixed(2)}
                  </div>
                </div>

                {/* Decorative background element */}
                <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-gray-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
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