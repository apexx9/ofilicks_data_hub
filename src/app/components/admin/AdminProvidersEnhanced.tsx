import { useState, useEffect } from 'react';
import { api, ApiProvider } from '../../../lib/api';
import { Plus, CheckCircle, Edit3, DollarSign, TrendingUp, Key, Shield } from 'lucide-react';

const PROVIDER_TYPES = ["DATA4UGH", "GODLYDATA", "SIMULATED"];

export function AdminProvidersEnhanced() {
  const [providers, setProviders] = useState<ApiProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('DATA4UGH');
  const [priority, setPriority] = useState('1');
  const [apiKey, setApiKey] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [editingProvider, setEditingProvider] = useState<ApiProvider | null>(null);
  const [showKey, setShowKey] = useState<string | null>(null);
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
      await api.createProvider(name, type, parseInt(priority), apiKey);
      await loadProviders();
      closeModal();
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
    setType(provider.type || 'DATA4UGH');
    setPriority(provider.priority.toString());
    setApiKey(provider.apiKey || '');
    setCostPrice(provider.costPrice?.toString() || '');
    setSellingPrice(provider.sellingPrice?.toString() || '');
    setShowModal(true);
  };

  const calculateMargin = (cost: number, selling: number): number => {
    if (selling <= 0) return 0;
    return parseFloat(((selling - cost) / selling * 100).toFixed(2));
  };

  const formatCurrency = (amount: number): string => {
    return amount ? `₵${amount.toFixed(2)}` : 'Not set';
  };

  const handleUpdateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!editingProvider) return;

    try {
      const updates: any = {
        name,
        type,
        priority: parseInt(priority),
        apiKey
      };

      if (costPrice) updates.costPrice = parseFloat(costPrice);
      if (sellingPrice) updates.sellingPrice = parseFloat(sellingPrice);
      if (costPrice && sellingPrice) {
        updates.margin = calculateMargin(parseFloat(costPrice), parseFloat(sellingPrice));
      }

      await api.updateProvider(editingProvider.id, updates);
      await loadProviders();
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Failed to update provider');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProvider(null);
    setName('');
    setType('DATA4UGH');
    setPriority('1');
    setApiKey('');
    setCostPrice('');
    setSellingPrice('');
    setError('');
  };

  const maskKey = (key?: string) => {
    if (!key) return '••••••••';
    if (showKey === key) return key;
    return key.substring(0, 4) + '••••' + key.substring(key.length - 4);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500 font-medium">Loading Providers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            API Provider Infrastructure
          </h2>
          <p className="text-sm text-gray-500 mt-1">Configure external gateways, API keys, and failover priority</p>
        </div>
        <button
          onClick={() => {
            setEditingProvider(null);
            setName('');
            setType('DATA4UGH');
            setPriority('1');
            setApiKey('');
            setCostPrice('');
            setSellingPrice('');
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:scale-[1.02] transition-transform active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          Add Secure Gateway
        </button>
      </div>

      {providers.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No providers configured yet. Add your first provider to get started.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Provider Context</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Priority</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Auth Credentials</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Commercials</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {providers.sort((a, b) => a.priority - b.priority).map((provider) => {
                  const margin = provider.margin || 0;
                  const marginColor = margin >= 10 ? 'bg-green-100 text-green-700' : margin >= 5 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700';

                  return (
                    <tr key={provider.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">{provider.name}</span>
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-tight">{provider.type || 'LEGACY'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 border border-gray-200">
                            {provider.priority}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-400 group">
                        <div className="flex items-center gap-2">
                          <Key className="w-3.5 h-3.5" />
                          <span>{maskKey(provider.apiKey)}</span>
                          <button
                            onClick={() => setShowKey(showKey === provider.apiKey ? null : (provider.apiKey || ''))}
                            className="opacity-0 group-hover:opacity-100 text-blue-500 text-[10px] font-bold"
                          >
                            {showKey === provider.apiKey ? 'HIDE' : 'REVEAL'}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-400">Cost:</span>
                            <span className="text-sm font-bold text-gray-900">{formatCurrency(provider.costPrice || 0)}</span>
                          </div>
                          <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${marginColor} w-fit`}>
                            Margin: {margin.toFixed(1)}%
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {provider.isActive ? (
                          <div className="flex items-center gap-2 text-green-600 font-bold text-xs uppercase tracking-wider">
                            <CheckCircle className="w-4 h-4" />
                            Live
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Standby</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleEditProvider(provider)}
                            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-bold text-sm"
                          >
                            <Edit3 className="w-4 h-4" />
                            Update
                          </button>
                          {!provider.isActive && (
                            <button
                              onClick={() => handleSetActive(provider.id)}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                            >
                              Go Live
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
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-white/20">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
              <h2 className="text-2xl font-bold">
                {editingProvider ? 'Update Configuration' : 'Register API Gateway'}
              </h2>
              <p className="text-blue-100 text-sm mt-1">Securely connect Ofilicks to external data providers</p>
            </div>

            <form onSubmit={editingProvider ? handleUpdateProvider : handleCreate} className="p-8 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-center gap-3">
                  <span className="w-2 h-2 bg-red-600 rounded-full animate-bounce"></span>
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Internal Recognition Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold"
                    placeholder="e.g., Primary Data4UGH Hub"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Provider Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
                  >
                    {PROVIDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Priority Rank</label>
                  <input
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    required
                    min="1"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Secret API Key</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                      placeholder="sk_live_..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Cost Rate (₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Selling Rate (₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
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

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-6 py-4 border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-colors"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-2xl font-bold hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all"
                >
                  {editingProvider ? 'Commit Changes' : 'Initialize Gateway'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}