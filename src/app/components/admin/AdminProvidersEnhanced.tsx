import { useState, useEffect } from 'react';
import { api, ApiProvider } from '../../../lib/api';
import { Plus, CheckCircle, Edit3, DollarSign, TrendingUp } from 'lucide-react';

export function AdminProvidersEnhanced() {
  const [providers, setProviders] = useState<ApiProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [priority, setPriority] = useState('1');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [editingProvider, setEditingProvider] = useState<ApiProvider | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const { providers: data } = await api.getAllProviders();
      setProviders(data);
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await api.createProvider(name, parseInt(priority));
      await loadProviders();
      setShowModal(false);
      setName('');
      setPriority('1');
      setCostPrice('');
      setSellingPrice('');
    } catch (err: any) {
      setError(err.message || 'Failed to create provider');
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      await api.setActiveProvider(id);
      await loadProviders();
    } catch (error) {
      console.error('Failed to set active provider:', error);
      alert('Failed to set active provider');
    }
  };

  const handleUpdatePriority = async (id: string, newPriority: number) => {
    try {
      await api.updateProvider(id, { priority: newPriority });
      await loadProviders();
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  };

  const handleUpdatePricing = async (id: string, cost: number, selling: number) => {
    try {
      const margin = selling > 0 ? ((selling - cost) / selling) * 100 : 0;
      await api.updateProvider(id, { 
        costPrice: cost, 
        sellingPrice: selling,
        margin: parseFloat(margin.toFixed(2))
      });
      await loadProviders();
    } catch (error) {
      console.error('Failed to update pricing:', error);
    }
  };

  const handleEditProvider = (provider: ApiProvider) => {
    setEditingProvider(provider);
    setName(provider.name);
    setPriority(provider.priority.toString());
    setCostPrice(provider.costPrice?.toString() || '');
    setSellingPrice(provider.sellingPrice?.toString() || '');
    setShowModal(true);
  };

  const calculateMargin = (cost: number, selling: number): number => {
    if (selling <= 0) return 0;
    return parseFloat(((selling - cost) / selling * 100).toFixed(2));
  };

  const formatCurrency = (amount: number): string => {
    return amount ? `GHS ${amount.toFixed(2)}` : 'Not set';
  };

  const handleUpdateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!editingProvider) return;

    try {
      const updates: any = {
        name,
        priority: parseInt(priority)
      };

      if (costPrice) updates.costPrice = parseFloat(costPrice);
      if (sellingPrice) updates.sellingPrice = parseFloat(sellingPrice);
      if (costPrice && sellingPrice) {
        const margin = calculateMargin(parseFloat(costPrice), parseFloat(sellingPrice));
        updates.margin = margin;
      }

      await api.updateProvider(editingProvider.id, updates);
      await loadProviders();
      setShowModal(false);
      setEditingProvider(null);
      setName('');
      setPriority('1');
      setCostPrice('');
      setSellingPrice('');
    } catch (err: any) {
      setError(err.message || 'Failed to update provider');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProvider(null);
    setName('');
    setPriority('1');
    setCostPrice('');
    setSellingPrice('');
    setError('');
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">API Providers & Pricing</h2>
          <p className="text-sm text-gray-600 mt-1">Manage external data API providers and pricing</p>
        </div>
        <button
          onClick={() => {
            setEditingProvider(null);
            setName('');
            setPriority('1');
            setCostPrice('');
            setSellingPrice('');
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Provider
        </button>
      </div>

      {providers.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No providers configured yet. Add your first provider to get started.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Provider</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Priority</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Cost Price</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Selling Price</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Margin</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {providers.map((provider) => {
                const margin = provider.margin || 0;
                const marginColor = margin >= 10 ? 'text-green-600' : margin >= 5 ? 'text-yellow-600' : 'text-red-600';
                
                return (
                  <tr key={provider.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {provider.isActive && <CheckCircle className="w-4 h-4 text-green-600" />}
                        <span className={`text-sm font-medium ${provider.isActive ? 'text-green-600' : 'text-gray-900'}`}>
                          {provider.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={provider.priority}
                        onChange={(e) => handleUpdatePriority(provider.id, parseInt(e.target.value))}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {formatCurrency(provider.costPrice || 0)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-900">
                          {formatCurrency(provider.sellingPrice || 0)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <TrendingUp className={`w-4 h-4 ${marginColor}`} />
                        <span className={`text-sm font-medium ${marginColor}`}>
                          {margin.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {provider.isActive ? (
                        <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-700">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-600">
                          INACTIVE
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditProvider(provider)}
                          className="text-sm text-blue-600 hover:underline font-medium"
                        >
                          <Edit3 className="w-4 h-4 inline mr-1" />
                          Edit
                        </button>
                        {!provider.isActive && (
                          <button
                            onClick={() => handleSetActive(provider.id)}
                            className="text-sm text-green-600 hover:underline font-medium"
                          >
                            Set Active
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingProvider ? 'Edit Provider' : 'Add API Provider'}
            </h2>

            <form onSubmit={editingProvider ? handleUpdateProvider : handleCreate} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Provider Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Hubtel Primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Lower numbers = higher priority</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cost Price (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Selling Price (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {(costPrice && sellingPrice) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Projected Margin: {calculateMargin(parseFloat(costPrice), parseFloat(sellingPrice)).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition-colors"
                >
                  {editingProvider ? 'Update Provider' : 'Add Provider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}