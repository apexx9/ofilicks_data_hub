import { useState, useEffect } from 'react';
import { api, Order } from '@/lib/api';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { orders: data } = await api.getOrders();
      setOrders(data);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'SUCCESS':
        return 'text-green-600';
      case 'FAILED':
        return 'text-red-600';
      case 'PENDING':
        return 'text-yellow-600';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Purchase History</h2>
        <div className="text-center py-8 text-gray-500">Loading...</div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Purchase History</h2>
        <div className="text-center py-8 text-gray-500">No purchases yet</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Purchase History</h2>
      </div>

      <div className="divide-y divide-gray-200">
        {orders.map((order) => (
          <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {getStatusIcon(order.status)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {order.bundleName}
                  </p>
                  <p className={`text-sm font-semibold ${getStatusColor(order.status)}`}>
                    {order.status}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-gray-600">
                    {order.volume} • {order.network.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-gray-600">
                    To: {order.phoneNumber}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(order.createdAt)}
                  </p>
                </div>

                {order.errorMessage && (
                  <p className="text-xs text-red-600 mt-2">
                    {order.errorMessage}
                  </p>
                )}
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  GHS {order.price.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
