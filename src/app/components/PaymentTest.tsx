import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { initializePayment } from '../../lib/payments';
import { airtimeService, DEFAULT_PROVIDERS } from '../../lib/airtime';
import { TransactionSafety } from '../../lib/refund';
import { CreditCard, Phone, Wallet, TrendingUp } from 'lucide-react';

export function PaymentTest() {
  const { user, wallet, refreshWallet } = useAuth();
  const [testAmount, setTestAmount] = useState('10');
  const [testPhone, setTestPhone] = useState('0241234567');
  const [testNetwork, setTestNetwork] = useState<'MTN' | 'TELECEL' | 'AIRTELTIGO'>('MTN');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Initialize airtime providers
  DEFAULT_PROVIDERS.forEach(provider => {
    airtimeService.addProvider(provider);
  });

  const handleTestPayment = async () => {
    if (!user?.email) {
      setResult({ type: 'error', message: 'User not authenticated' });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const amount = parseFloat(testAmount);
      
      // Validate inputs
      const amountValidation = TransactionSafety.validateAmount(amount);
      if (!amountValidation.valid) {
        throw new Error(amountValidation.error);
      }

      const phoneValidation = TransactionSafety.validatePhoneNumber(testPhone);
      if (!phoneValidation.valid) {
        throw new Error(phoneValidation.error);
      }

      // Initialize payment
      const payment = await initializePayment(
        user.id,
        user.email,
        amount,
        testPhone,
        testNetwork
      );

      setResult({
        type: 'success',
        message: `Payment initialized successfully! Reference: ${payment.reference.substring(0, 10)}...`
      });

      // In a real scenario, this would redirect to Paystack
      console.log('Payment URL:', payment.authorizationUrl);
      
    } catch (error: any) {
      setResult({
        type: 'error',
        message: error.message || 'Payment initialization failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestAirtime = async () => {
    if (!wallet || wallet.balance < parseFloat(testAmount)) {
      setResult({ type: 'error', message: 'Insufficient wallet balance' });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      // Simulate airtime purchase with transaction safety
      const result = await TransactionSafety.withTransactionLock(
        `airtime_${user?.id}_${Date.now()}`,
        async () => {
          // In real implementation, this would:
          // 1. Deduct from wallet
          // 2. Call airtime provider API
          // 3. Handle success/failure
          
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // 90% success rate
          const success = Math.random() > 0.1;
          
          if (success) {
            return {
              success: true,
              message: `Successfully sent GHS ${testAmount} airtime to ${testPhone}`,
              reference: TransactionSafety.generateReference('airtime')
            };
          } else {
            throw new Error('Airtime provider temporarily unavailable');
          }
        }
      );

      setResult({
        type: 'success',
        message: result.message
      });

      // Refresh wallet to show updated balance
      await refreshWallet();
      
    } catch (error: any) {
      setResult({
        type: 'error',
        message: error.message || 'Airtime purchase failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestValidation = () => {
    const validations = [
      { name: 'Amount Validation', result: TransactionSafety.validateAmount(parseFloat(testAmount)) },
      { name: 'Phone Validation', result: TransactionSafety.validatePhoneNumber(testPhone) }
    ];

    const failedValidations = validations.filter(v => !v.result.valid);
    
    if (failedValidations.length > 0) {
      setResult({
        type: 'error',
        message: failedValidations.map(v => `${v.name}: ${v.result.error}`).join(', ')
      });
    } else {
      setResult({
        type: 'success',
        message: 'All validations passed!'
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment System Test Dashboard</h1>
        <p className="text-gray-600">Test the complete payment and airtime flow</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wallet Info */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 text-white">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5" />
            <span className="text-sm font-medium opacity-90">Current Balance</span>
          </div>
          <div className="text-3xl font-bold">
            GHS {wallet?.balance.toFixed(2) || '0.00'}
          </div>
          <button
            onClick={() => refreshWallet()}
            className="mt-4 text-sm bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded transition-colors"
          >
            Refresh Balance
          </button>
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Parameters</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount (GHS)</label>
              <input
                type="number"
                step="0.01"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="10.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0241234567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Network</label>
              <div className="grid grid-cols-3 gap-2">
                {(['MTN', 'TELECEL', 'AIRTELTIGO'] as const).map((net) => (
                  <button
                    key={net}
                    type="button"
                    onClick={() => setTestNetwork(net)}
                    className={`py-2 px-3 border rounded font-medium text-sm transition-colors ${
                      testNetwork === net
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {net}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Actions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleTestPayment}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <CreditCard className="w-5 h-5" />
            Test Payment
          </button>

          <button
            onClick={handleTestAirtime}
            disabled={isLoading || !wallet || wallet.balance < parseFloat(testAmount)}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Phone className="w-5 h-5" />
            Test Airtime
          </button>

          <button
            onClick={handleTestValidation}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-3 rounded font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            <TrendingUp className="w-5 h-5" />
            Test Validation
          </button>
        </div>
      </div>

      {/* Test Results */}
      {result && (
        <div className={`mt-6 p-4 rounded-lg border ${
          result.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-700' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <p className="font-medium">{result.message}</p>
        </div>
      )}

      {/* System Info */}
      <div className="bg-gray-50 rounded-lg p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Payment Providers</h3>
            <ul className="text-gray-600 space-y-1">
              <li>• Paystack (Mobile Money)</li>
              <li>• MTN MoMo</li>
              <li>• Telecel Cash</li>
              <li>• AirtelTigo Money</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Airtime Providers</h3>
            <ul className="text-gray-600 space-y-1">
              <li>• Hubtel (Primary)</li>
              <li>• VTPass (Backup)</li>
              <li>• Automatic failover</li>
              <li>• Margin tracking</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}