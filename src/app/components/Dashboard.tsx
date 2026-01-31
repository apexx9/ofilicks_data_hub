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
  const [adminStats, setAdminStats] = useState({
    totalOrders: 0,
    totalVolume: 0,
    totalCost: 0,
    totalProfit: 0,
    providerBalance: 1250.50, // Simulated admin balance with external provider
  });
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);

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

      setRecentOrders(orders?.slice(0, 5) || []);
      setRecentTransactions(transactions?.slice(0, 5) || []);

      setStats({
        totalOrders: orders.length,
        successfulOrders: orders.filter((o: Order) => o.status === 'SUCCESS').length,
        totalSpent: orders
          .filter((o: Order) => o.status === 'SUCCESS')
          .reduce((sum: number, o: Order) => sum + o.price, 0),
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }

    if (user?.role === 'ADMIN') {
      try {
        setIsLoadingAdmin(true);
        const res = await api.getRevenue();
        if (res.success) {
          setAdminStats(prev => ({ ...prev, ...res.stats }));
        }
      } catch (error) {
        console.error('Failed to load admin stats:', error);
      } finally {
        setIsLoadingAdmin(false);
      }
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

      {user?.role === 'ADMIN' && (
        <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 space-y-4">
          <h2 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            System Performance Overview
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm border-t-4 border-t-yellow-500">
              <p className="text-xs font-medium text-yellow-600 uppercase tracking-wider">Provider Liquidity (Adm)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">GHS {(adminStats.providerBalance || 0).toFixed(2)}</p>
              <p className="text-[10px] text-gray-400 mt-1 italic">Balance with external data providers</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm border-t-4 border-t-green-500">
              <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Net Profit</p>
              <p className="text-3xl font-bold text-green-600 mt-1">GHS {(adminStats.totalProfit || 0).toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">System Cost</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">GHS {(adminStats.totalCost || 0).toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{adminStats.totalOrders || 0} Orders</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {recentOrders.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">No orders yet</div>
            ) : (
              recentOrders.map((order: Order) => (
                <div key={order.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.bundleName}</p>
                      <p className="text-xs text-gray-500 mt-1">{order.phoneNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">GHS {order.price.toFixed(2)}</p>
                      <p className={`text-xs mt-1 ${order.status === 'SUCCESS' ? 'text-green-600' :
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
              recentTransactions.map((transaction: Transaction) => (
                <div key={transaction.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{transaction.description}</p>
                    </div>
                    <p className={`text-sm font-semibold ml-4 ${transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
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
