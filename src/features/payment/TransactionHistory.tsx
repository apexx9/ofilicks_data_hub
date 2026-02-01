import { useState, useEffect } from 'react';
import { api, Transaction } from '@/lib/api';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

export function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const { transactions: data } = await api.getTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h2>
        <div className="text-center py-8 text-gray-500">Loading...</div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h2>
        <div className="text-center py-8 text-gray-500">No transactions yet</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
      </div>

      <div className="divide-y divide-gray-200">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 ${transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                {transaction.type === 'CREDIT' ? (
                  <ArrowDownCircle className="w-5 h-5" />
                ) : (
                  <ArrowUpCircle className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {transaction.description}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDate(transaction.createdAt)}
                </p>
              </div>

              <div className="text-right">
                <p className={`text-sm font-semibold ${
                  transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'CREDIT' ? '+' : '-'}GHS {transaction.amount.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Balance: GHS {transaction.balance.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
