import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { initializePayment } from '../../lib/payments';
import { CreditCard, Phone, Loader } from 'lucide-react';

interface PaymentFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PaymentForm({ onSuccess, onCancel }: PaymentFormProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('10');
  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState<'MTN' | 'TELECEL' | 'AIRTELTIGO'>('MTN');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = async () => {
    if (!user?.email) {
      setError('User not authenticated');
      return;
    }

    if (!phone) {
      setError('Phone number is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const payment = await initializePayment(
        user.id,
        user.email,
        parseFloat(amount),
        phone,
        network
      );

      // Redirect to Paystack
      window.location.href = payment.authorizationUrl;
      
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Payment initialization failed');
    } finally {
      setIsLoading(false);
    }
  };

  const validateAmount = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 1 || num > 1000) {
      return 'Amount must be between GHS 1 and GHS 1000';
    }
    return '';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md w-full">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Fund Wallet</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (GHS)
          </label>
          <input
            type="number"
            step="0.01"
            min="1"
            max="1000"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              const error = validateAmount(e.target.value);
              if (error) setError(error);
              else setError('');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="10.00"
          />
          {validateAmount(amount) && (
            <p className="text-sm text-red-600 mt-1">{validateAmount(amount)}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0241234567"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Network
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['MTN', 'TELECEL', 'AIRTELTIGO'] as const).map((net) => (
              <button
                key={net}
                type="button"
                onClick={() => setNetwork(net)}
                className={`py-2 px-3 border rounded font-medium text-sm transition-colors ${
                  network === net
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {net}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handlePayment}
            disabled={isLoading || !!validateAmount(amount) || !phone}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Pay Now
              </>
            )}
          </button>
          
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Secure payment processing powered by Paystack. 
          Your funds will be added to your wallet immediately after successful payment.
        </p>
      </div>
    </div>
  );
}