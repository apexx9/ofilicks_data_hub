import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api';
import { 
  CreditCard, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Search,
  Filter
} from 'lucide-react';

interface PaymentTransaction {
  id: string;
  userId: string;
  reference: string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  paymentMethod: 'MOBILE_MONEY' | 'CARD' | 'BANK_TRANSFER';
  network?: 'MTN' | 'TELECEL' | 'AIRTELTIGO';
  phoneNumber?: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export function AdminPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED' | 'PENDING' | 'REFUNDED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadPayments();
    }
  }, [user, filter]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/payments');
      if (response.success) {
        setPayments(response.payments);
      }
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesFilter = filter === 'ALL' || payment.status === filter;
    const matchesSearch = searchTerm === '' || 
      payment.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.phoneNumber?.includes(searchTerm) ||
      payment.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'FAILED': return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'PENDING': return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'REFUNDED': return <TrendingUp className="w-5 h-5 text-blue-600" />;
      default: return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'bg-green-100 text-green-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'REFUNDED': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GH');
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Access Denied</span>
        </div>
        <p className="text-red-700 mt-2">Only administrators can access payment management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-gray-600 mt-1">Monitor and manage all payment transactions</p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Successful</option>
            <option value="FAILED">Failed</option>
            <option value="PENDING">Pending</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Successful</p>
              <p className="text-2xl font-bold text-gray-900">
                {payments.filter(p => p.status === 'SUCCESS').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-gray-900">
                {payments.filter(p => p.status === 'FAILED').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(payments
                  .filter(p => p.status === 'SUCCESS')
                  .reduce((sum, p) => sum + p.amount, 0)
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Payment Transactions</h2>
        </div>
        
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading payments...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No payments found</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 text-blue-600 hover:text-blue-700"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Network
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {payment.reference.substring(0, 12)}...
                      </div>
                      <div className="text-sm text-gray-500">{payment.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(payment.status)}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.paymentMethod.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.network || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.phoneNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(payment.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}