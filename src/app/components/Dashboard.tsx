import { useAuth } from '@/contexts/AuthContext';
import { WalletCard } from '@/app/components/WalletCard';
import { Package, TrendingUp, Users, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, Order, Transaction } from '@/lib/api';

export function Dashboard() {
  const { user, wallet } = useAuth();
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    successfulOrders: 0,
    totalSpent: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [ordersRes, transactionsRes] = await Promise.all([
        api.getOrders(),
        api.getTransactions(),
      ]);

      const orders = ordersRes.orders;
      const transactions = transactionsRes.transactions;

      setRecentOrders(orders.slice(0, 5));
      setRecentTransactions(transactions.slice(0, 5));

      // Calculate stats
      const totalSpent = orders
        .filter(o => o.status === 'SUCCESS')
        .reduce((sum, o) => sum + o.price, 0);

      setStats({
        totalOrders: orders.length,
        successfulOrders: orders.filter(o => o.status === 'SUCCESS').length,
        totalSpent,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const roleLabels: Record<string, string> = {
    USER: 'Retail User',
    AGENT: 'Agent',
    DEALER: 'Dealer',
    ADMIN: 'Administrator',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Welcome back, {user?.name}</h1>
        <p className="text-sm text-gray-600 mt-1">
          {roleLabels[user?.role || 'USER']} Account
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <WalletCard />

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Total Orders</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalOrders}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Successful</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.successfulOrders}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-600">Total Spent</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            GHS {stats.totalSpent.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {recentOrders.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">No orders yet</div>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.bundleName}</p>
                      <p className="text-xs text-gray-500 mt-1">{order.phoneNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">GHS {order.price.toFixed(2)}</p>
                      <p className={`text-xs mt-1 ${
                        order.status === 'SUCCESS' ? 'text-green-600' :
                        order.status === 'FAILED' ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {order.status}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {recentTransactions.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">No transactions yet</div>
            ) : (
              recentTransactions.map((transaction) => (
                <div key={transaction.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{transaction.description}</p>
                    </div>
                    <p className={`text-sm font-semibold ml-4 ${
                      transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'CREDIT' ? '+' : '-'}GHS {transaction.amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
