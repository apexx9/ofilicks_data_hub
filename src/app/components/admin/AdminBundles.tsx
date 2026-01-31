import { useState, useEffect } from 'react';
import { api, Bundle, Network } from '@/lib/api';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

const networkOptions: Network[] = ['MTN', 'AIRTELTIGO_ISHARE', 'AIRTELTIGO_BIGTIME', 'TELECEL'];

export function AdminBundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
  const [selectedBundles, setSelectedBundles] = useState<string[]>([]);
  const [error, setError] = useState('');

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
    } catch (error) {
      console.error('Failed to delete bundle:', error);
      alert('Failed to delete bundle');
    }
  };

  const handleToggleEnabled = async (bundle: Bundle) => {
    try {
      await api.updateBundle(bundle.id, { enabled: !bundle.enabled });
      await loadBundles();
    } catch (error) {
      console.error('Failed to toggle bundle:', error);
    }
  };

  const toggleSelectAll = () => {
    if (selectedBundles.length === bundles.length) {
      setSelectedBundles([]);
    } else {
      setSelectedBundles(bundles.map(b => b.id));
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
      // Execute deletions in sequence to avoid race conditions/overwhelming server
      for (const id of selectedBundles) {
        await api.deleteBundle(id);
      }
      setSelectedBundles([]);
      await loadBundles();
      alert('Selected bundles deleted successfully');
    } catch (err: any) {
      alert('Failed to delete some bundles: ' + err.message);
      await loadBundles(); // Reload to show what's left
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

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Manage Bundles</h2>
        <div className="flex gap-2">
          {selectedBundles.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              Delete Selected ({selectedBundles.length})
            </button>
          )}
          <button
            onClick={async () => {
              if (confirm('Are you sure you want to delete ALL bundles? This cannot be undone.')) {
                try {
                  setIsLoading(true);
                  await api.resetBundles();
                  await loadBundles();
                  alert('All bundles have been deleted.');
                } catch (err: any) {
                  alert('Failed to reset bundles: ' + err.message);
                } finally {
                  setIsLoading(false);
                }
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            Reset All
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Bundle
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 w-4">
                <input
                  type="checkbox"
                  checked={bundles.length > 0 && selectedBundles.length === bundles.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Network</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Name</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Volume</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Validity</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Prices (U/A/D)</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Cost</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Status</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {bundles.map((bundle) => (
              <tr key={bundle.id} className={`hover:bg-gray-50 ${selectedBundles.includes(bundle.id) ? 'bg-blue-50' : ''}`}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedBundles.includes(bundle.id)}
                    onChange={() => toggleSelect(bundle.id)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{bundle.network.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{bundle.name}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{bundle.volume}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{bundle.validity}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {bundle.pricing.USER.toFixed(2)} / {bundle.pricing.AGENT.toFixed(2)} / {bundle.pricing.DEALER.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">GHS {(bundle.costPrice || 0).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleEnabled(bundle)}
                    className={`flex items-center gap-1 text-sm font-medium ${bundle.enabled ? 'text-green-600' : 'text-gray-400'
                      }`}
                  >
                    {bundle.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    {bundle.enabled ? 'Active' : 'Disabled'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleEdit(bundle)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(bundle.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingBundle ? 'Edit Bundle' : 'Add Bundle'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Network</label>
                  <select
                    value={formData.network}
                    onChange={(e) => setFormData({ ...formData, network: e.target.value as Network })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {networkOptions.map((net) => (
                      <option key={net} value={net}>{net.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., MTN 1GB Daily"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Volume</label>
                  <input
                    type="text"
                    value={formData.volume}
                    onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 1GB"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Validity</label>
                  <input
                    type="text"
                    value={formData.validity}
                    onChange={(e) => setFormData({ ...formData, validity: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 1 day"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">User Price (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.userPrice}
                    onChange={(e) => setFormData({ ...formData, userPrice: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Agent Price (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.agentPrice}
                    onChange={(e) => setFormData({ ...formData, agentPrice: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cost Price (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your cost"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Enabled</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition-colors"
                >
                  {editingBundle ? 'Update' : 'Create'} Bundle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
