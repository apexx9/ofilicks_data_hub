import { useAuth } from '@/contexts/AuthContext';
import { WalletCard } from './WalletCard';
import { Package, TrendingUp, Users, Activity, ShoppingCart, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, Order, Transaction } from '@/lib/api';
import { motion } from 'motion/react';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

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
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto space-y-6 p-1"
    >
      {/* Header Section */}
      <motion.div variants={item} className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{user?.name}</span>
          </h1>
          <p className="text-gray-500 font-medium mt-1 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${user?.role === 'ADMIN' ? 'bg-red-500' : 'bg-green-500'}`} />
            {roleLabels[user?.role || 'USER']} Dashboard
          </p>
        </div>
      </motion.div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">

        {/* Main Wallet Card - Spans 2 cols */}
        <motion.div variants={item} className="md:col-span-2 lg:col-span-2">
          <WalletCard />
        </motion.div>

        {/* Quick Stats - Spans 1 col each */}
        <motion.div variants={item} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Package className="w-24 h-24 text-blue-600 -mr-4 -mt-4 transform rotate-12" />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-gray-500">Total Orders</span>
          </div>
          <div>
            <div className="text-3xl font-black text-gray-900">{stats.totalOrders}</div>
            <div className="text-xs font-medium text-blue-600 mt-1 flex items-center gap-1">
              All time purchases
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-24 h-24 text-purple-600 -mr-4 -mt-4 transform rotate-12" />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-gray-500">Total Spend</span>
          </div>
          <div>
            <div className="text-3xl font-black text-gray-900">₵{stats.totalSpent.toFixed(2)}</div>
            <div className="text-xs font-medium text-purple-600 mt-1">Lifetime value</div>
          </div>
        </motion.div>

        {/* Admin Section - Full Width if Admin */}
        {user?.role === 'ADMIN' && (
          <motion.div variants={item} className="col-span-1 md:col-span-3 lg:col-span-4 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -mr-16 -mt-16"></div>

            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                <Activity className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-lg font-bold">Admin Insights</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Provider Liquidity</p>
                <p className="text-2xl font-black text-white">₵{(adminStats.providerBalance || 0).toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Net Profit</p>
                <p className="text-2xl font-black text-green-400">+₵{(adminStats.totalProfit || 0).toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">System Cost</p>
                <p className="text-2xl font-black text-white">₵{(adminStats.totalCost || 0).toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Volume</p>
                <p className="text-2xl font-black text-white">{adminStats.totalOrders || 0} Orders</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Recent Orders - Spans 2 cols */}
        <motion.div variants={item} className="md:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex justify-between items-center">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-gray-400" />
              Recent Orders
            </h2>
          </div>
          <div className="flex-1 overflow-auto max-h-[300px]">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
                <Package className="w-8 h-8 opacity-20" />
                <p className="text-sm font-medium">No orders found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentOrders.map((order) => (
                  <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${order.status === 'SUCCESS' ? 'bg-green-100 text-green-600' :
                          order.status === 'FAILED' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                        }`}>
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{order.bundleName}</p>
                        <p className="text-xs text-gray-500">{order.phoneNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">₵{order.price.toFixed(2)}</p>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${order.status === 'SUCCESS' ? 'bg-green-50 text-green-600' :
                          order.status === 'FAILED' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'
                        }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Transactions - Spans remaining cols */}
        <motion.div variants={item} className="md:col-span-1 lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex justify-between items-center">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              Wallet Activity
            </h2>
          </div>
          <div className="flex-1 overflow-auto max-h-[300px]">
            {recentTransactions.length === 0 ? (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
                <Activity className="w-8 h-8 opacity-20" />
                <p className="text-sm font-medium">No activity yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'CREDIT' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                        }`}>
                        {tx.type === 'CREDIT' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-700 truncate max-w-[150px]">{tx.description}</p>
                        <p className="text-[10px] text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`font-bold text-sm ${tx.type === 'CREDIT' ? 'text-blue-600' : 'text-gray-900'}`}>
                      {tx.type === 'CREDIT' ? '+' : '-'}₵{tx.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
