import { useState, useEffect } from 'react';
import { api, Bundle, Network } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Smartphone } from 'lucide-react';

const NetworkLabels: Record<Network, { name: string; tagline: string; color: string }> = {
  MTN: { name: 'MTN data bundles', tagline: 'Fast • Reliable', color: 'bg-yellow-500' },
  AIRTELTIGO_ISHARE: { name: 'AT_iShare', tagline: 'Instant • Cheap', color: 'bg-red-500' },
  AIRTELTIGO_BIGTIME: { name: 'AT_BigTime', tagline: 'Affordable • Quick', color: 'bg-red-600' },
  TELECEL: { name: 'Telecel data bundles', tagline: 'Available • Trusted', color: 'bg-purple-600' }
};

export function BuyData() {
  const { user, wallet, refreshWallet } = useAuth();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadBundles();
  }, []);

  const loadBundles = async () => {
    try {
      const { bundles: data } = await api.getBundles();
      setBundles(data);
    } catch (error) {
      console.error('Failed to load bundles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBundle || !user) return;

    setError('');
    setSuccess('');
    setIsPurchasing(true);

    try {
      const price = selectedBundle.pricing[user.role];
      
      if (wallet && wallet.balance < price) {
        throw new Error('Insufficient wallet balance. Please add funds first.');
      }

      const { order } = await api.createOrder(selectedBundle.id, phoneNumber);
      
      if (order.status === 'SUCCESS') {
        setSuccess(`Successfully purchased ${selectedBundle.name} for ${phoneNumber}`);
        setSelectedBundle(null);
        setPhoneNumber('');
        await refreshWallet();
      } else if (order.status === 'FAILED') {
        throw new Error(order.errorMessage || 'Purchase failed. Your wallet has been refunded.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to purchase bundle');
    } finally {
      setIsPurchasing(false);
    }
  };

  const getPriceForUser = (bundle: Bundle) => {
    if (!user) return bundle.pricing.USER;
    return bundle.pricing[user.role];
  };

  // Group bundles by network
  const bundlesByNetwork = bundles.reduce((acc, bundle) => {
    if (!acc[bundle.network]) {
      acc[bundle.network] = [];
    }
    acc[bundle.network].push(bundle);
    return acc;
  }, {} as Record<Network, Bundle[]>);

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-500">Loading bundles...</div>
    );
  }

  return (
    <div className="space-y-6">
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {Object.entries(bundlesByNetwork).map(([network, networkBundles]) => {
        const label = NetworkLabels[network as Network];
        
        return (
          <div key={network} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className={`${label.color} p-4`}>
              <h3 className="text-white font-semibold text-lg">{label.name}</h3>
              <p className="text-white text-sm opacity-90">{label.tagline}</p>
            </div>

            <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {networkBundles.map((bundle) => (
                <div
                  key={bundle.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => setSelectedBundle(bundle)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{bundle.volume}</p>
                      <p className="text-sm text-gray-600">{bundle.validity}</p>
                    </div>
                    <p className="text-blue-600 font-bold">
                      GHS {getPriceForUser(bundle).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">{bundle.name}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {selectedBundle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Purchase Bundle</h2>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Bundle</span>
                <span className="font-semibold text-gray-900">{selectedBundle.name}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Data</span>
                <span className="font-semibold text-gray-900">{selectedBundle.volume}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Validity</span>
                <span className="font-semibold text-gray-900">{selectedBundle.validity}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-sm text-gray-600">Price</span>
                <span className="text-lg font-bold text-blue-600">
                  GHS {getPriceForUser(selectedBundle).toFixed(2)}
                </span>
              </div>
            </div>

            <form onSubmit={handlePurchase} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    pattern="[0-9]{10}"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0241234567"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Enter 10-digit phone number</p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBundle(null);
                    setError('');
                    setPhoneNumber('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPurchasing}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isPurchasing ? 'Processing...' : 'Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
