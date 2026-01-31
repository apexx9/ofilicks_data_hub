import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PaymentForm } from './PaymentForm';
import { Wallet as WalletIcon, CreditCard } from 'lucide-react';

export function WalletCard() {
  const { wallet, refreshWallet } = useAuth();
  const [showFundModal, setShowFundModal] = useState(false);

  return (
    <>
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <WalletIcon className="w-5 h-5" />
          <span className="text-sm font-medium opacity-90">Wallet Balance</span>
        </div>
        
        <div className="mb-6">
          <div className="text-3xl font-bold">
            GHS {wallet?.balance.toFixed(2) || '0.00'}
          </div>
        </div>

        <button
          onClick={() => setShowFundModal(true)}
          className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded font-medium hover:bg-blue-50 transition-colors"
        >
          <CreditCard className="w-4 h-4" />
          Add Funds
        </button>
      </div>

      {showFundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Add Funds to Wallet</h2>
              <button
                onClick={() => setShowFundModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <PaymentForm 
              onSuccess={() => {
                setShowFundModal(false);
                refreshWallet();
              }}
              onCancel={() => setShowFundModal(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
