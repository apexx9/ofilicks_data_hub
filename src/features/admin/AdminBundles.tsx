import { useState, useEffect } from 'react';
import { api, Bundle, Network } from '@/lib/api';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Search, Filter, RefreshCw, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const networkOptions: Network[] = ['MTN', 'AIRTELTIGO_ISHARE', 'AIRTELTIGO_BIGTIME', 'TELECEL'];

const NetworkBadge = ({ network }: { network: string }) => {
  const colors: Record<string, string> = {
    'MTN': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'AIRTELTIGO': 'bg-red-100 text-red-800 border-red-200',
    'TELECEL': 'bg-purple-100 text-purple-800 border-purple-200',
    'default': 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const key = Object.keys(colors).find(k => network.includes(k)) || 'default';

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${colors[key]} shadow-sm`}>
      {network.replace(/_/g, ' ').replace('AIRTELTIGO', 'AT')}
    </span>
  );
};

export function AdminBundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
  const [selectedBundles, setSelectedBundles] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterNetwork, setFilterNetwork] = useState<string>('ALL');

  const [formData, setFormData] = useState({
    network: 'MTN' as Network,
    name: '',
    volume: '',
    validity: '',
    userPrice: '',
    agentPrice: '',
    dealerPrice: '',
    costPrice: '',
    enabled: true,
  });

  useEffect(() => {
    loadBundles();
  }, []);

  const loadBundles = async () => {
    setIsLoading(true);
    try {
      const { bundles: data } = await api.getAllBundles();
      setBundles(data);
    } catch (error) {
      console.error('Failed to load bundles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const bundleData = {
        network: formData.network,
        name: formData.name,
        volume: formData.volume,
        validity: formData.validity,
        pricing: {
          USER: parseFloat(formData.userPrice),
          AGENT: parseFloat(formData.agentPrice),
          DEALER: parseFloat(formData.dealerPrice),
        },
        costPrice: parseFloat(formData.costPrice),
        enabled: formData.enabled,
      };

      if (editingBundle) {
        await api.updateBundle(editingBundle.id, bundleData);
      } else {
        await api.createBundle(bundleData);
      }

      await loadBundles();
      resetForm();
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save bundle');
    }
  };

  const handleEdit = (bundle: Bundle) => {
    setEditingBundle(bundle);
    setFormData({
      network: bundle.network,
      name: bundle.name,
      volume: bundle.volume,
      validity: bundle.validity,
      userPrice: bundle.pricing.USER.toString(),
      agentPrice: bundle.pricing.AGENT.toString(),
      dealerPrice: bundle.pricing.DEALER.toString(),
      costPrice: (bundle.costPrice || 0).toString(),
      enabled: bundle.enabled,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bundle?')) return;

    try {
      await api.deleteBundle(id);
      await loadBundles();
      setSelectedBundles(prev => prev.filter(bid => bid !== id));
    } catch (error) {
      console.error('Failed to delete bundle:', error);
      alert('Failed to delete bundle');
    }
  };

  const handleToggleEnabled = async (bundle: Bundle) => {
    // Optimistic update
    const updatedBundles = bundles.map(b =>
      b.id === bundle.id ? { ...b, enabled: !b.enabled } : b
    );
    setBundles(updatedBundles);

    try {
      await api.updateBundle(bundle.id, { enabled: !bundle.enabled });
    } catch (error) {
      console.error('Failed to toggle bundle:', error);
      loadBundles(); // Revert on error
    }
  };

  const toggleSelectAll = () => {
    if (selectedBundles.length === filteredBundles.length) {
      setSelectedBundles([]);
    } else {
      setSelectedBundles(filteredBundles.map(b => b.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedBundles.includes(id)) {
      setSelectedBundles(selectedBundles.filter(bid => bid !== id));
    } else {
      setSelectedBundles([...selectedBundles, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedBundles.length} bundles?`)) return;

    try {
      setIsLoading(true);
      for (const id of selectedBundles) {
        await api.deleteBundle(id);
      }
      setSelectedBundles([]);
      await loadBundles();
      alert('Selected bundles deleted successfully');
    } catch (err: any) {
      alert('Failed to delete some bundles: ' + err.message);
      await loadBundles();
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEditingBundle(null);
    setFormData({
      network: 'MTN',
      name: '',
      volume: '',
      validity: '',
      userPrice: '',
      agentPrice: '',
      dealerPrice: '',
      costPrice: '',
      enabled: true,
    });
    setError('');
  };

  const filteredBundles = bundles.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.volume.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesNetwork = filterNetwork === 'ALL' || b.network === filterNetwork;
    return matchesSearch && matchesNetwork;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            Bundle Inventory
          </h2>
          <p className="text-sm text-gray-500 mt-1">Manage data packages, pricing tiers, and availability.</p>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {selectedBundles.length > 0 ? (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-200 font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedBundles.length})
            </motion.button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (confirm('Are you sure you want to delete ALL bundles? This cannot be undone.')) {
                    await api.resetBundles();
                    await loadBundles();
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Reset All</span>
              </button>
              <button
                onClick={loadBundles}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}

          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 hover:shadow-blue-300 active:scale-95 font-medium"
          >
            <Plus className="w-5 h-5" />
            Add Bundle
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Filters and Search */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search bundles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setFilterNetwork('ALL')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${filterNetwork === 'ALL' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                All
              </button>
              {networkOptions.map(net => (
                <button
                  key={net}
                  onClick={() => setFilterNetwork(net)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${filterNetwork === net ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  {net.split('_')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 w-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filteredBundles.length > 0 && selectedBundles.length === filteredBundles.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Plan Details</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Pricing (GHS)</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Profitability</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence>
                {filteredBundles.map((bundle) => {
                  const profit = bundle.pricing.USER - (bundle.costPrice || 0);
                  const margin = bundle.pricing.USER > 0 ? (profit / bundle.pricing.USER) * 100 : 0;

                  return (
                    <motion.tr
                      key={bundle.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      layout
                      className={`group hover:bg-blue-50/30 transition-colors ${selectedBundles.includes(bundle.id) ? 'bg-blue-50/50' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedBundles.includes(bundle.id)}
                          onChange={() => toggleSelect(bundle.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1">
                              <NetworkBadge network={bundle.network} />
                              <span className="text-sm font-bold text-gray-900">{bundle.volume}</span>
                            </div>
                            <span className="text-xs text-gray-500">{bundle.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex justify-between w-32">
                            <span className="text-gray-500 text-xs">Retail:</span>
                            <span className="font-semibold text-gray-900">₵{bundle.pricing.USER.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between w-32 text-xs">
                            <span className="text-gray-400">Agent:</span>
                            <span className="text-gray-600">₵{bundle.pricing.AGENT.toFixed(2)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="text-xs text-gray-500">
                            Cost: <span className="font-medium text-gray-900">₵{(bundle.costPrice || 0).toFixed(2)}</span>
                          </div>
                          <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded w-fit ${margin >= 15 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {margin.toFixed(0)}% Margin
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleEnabled(bundle)}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold transition-all ${bundle.enabled
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                        >
                          {bundle.enabled ? (
                            <>
                              <ToggleRight className="w-4 h-4" />
                              Active
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4" />
                              Disabled
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(bundle)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Edit Bundle"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(bundle.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Bundle"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>

              {filteredBundles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                        <Search className="w-6 h-6 text-gray-300" />
                      </div>
                      <p className="font-medium">No bundles found</p>
                      <p className="text-xs text-gray-400">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-white/20 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingBundle ? 'Edit Bundle' : 'Create New Bundle'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Configure plan details and pricing tiers</p>
              </div>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <Trash2 className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <form id="bundleForm" onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Network Provider</label>
                    <select
                      value={formData.network}
                      onChange={(e) => setFormData({ ...formData, network: e.target.value as Network })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
                    >
                      {networkOptions.map((net) => (
                        <option key={net} value={net}>{net.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Internal Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
                      placeholder="e.g., Daily Special"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Data Volume</label>
                    <input
                      type="text"
                      value={formData.volume}
                      onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
                      placeholder="e.g., 1GB"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Validity</label>
                    <input
                      type="text"
                      value={formData.validity}
                      onChange={(e) => setFormData({ ...formData, validity: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
                      placeholder="e.g., No Expiry"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    Pricing Configuration
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cost Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.costPrice}
                        onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                        required
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-sm"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">User Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.userPrice}
                        onChange={(e) => setFormData({ ...formData, userPrice: e.target.value })}
                        required
                        className="w-full px-3 py-2 bg-blue-50/50 border border-blue-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-sm text-blue-700 font-bold"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Agent Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.agentPrice}
                        onChange={(e) => setFormData({ ...formData, agentPrice: e.target.value })}
                        required
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-sm"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Dealer Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.dealerPrice}
                        onChange={(e) => setFormData({ ...formData, dealerPrice: e.target.value })}
                        required
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center pt-2">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all w-full">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.enabled ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                      {formData.enabled && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                      <input
                        type="checkbox"
                        checked={formData.enabled}
                        onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                        className="hidden"
                      />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-900 block">Enable Bundle Immediately</span>
                      <span className="text-xs text-gray-500 block">Available for purchase once saved</span>
                    </div>
                  </label>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-white transition-colors"
                style={{ backgroundColor: '#fff' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="bundleForm"
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 transition-all"
              >
                {editingBundle ? 'Save Changes' : 'Create Bundle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for checkout box (needed for clean code above)
import { CheckCircle } from 'lucide-react';
