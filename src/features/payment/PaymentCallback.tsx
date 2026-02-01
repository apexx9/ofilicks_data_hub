import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { processSuccessfulPayment } from '@/lib/payments';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export function PaymentCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshWallet } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handlePaymentCallback = async () => {
      try {
        // Get reference from URL query params
        const urlParams = new URLSearchParams(location.search);
        const reference = urlParams.get('reference');
        const trxref = urlParams.get('trxref');

        const paymentReference = reference || trxref;

        if (!paymentReference) {
          setStatus('failed');
          setMessage('No payment reference found');
          return;
        }

        if (!user?.id) {
          setStatus('failed');
          setMessage('User not authenticated');
          return;
        }

        // Process the successful payment
        const result = await processSuccessfulPayment(paymentReference, user.id);

        setStatus('success');
        setMessage(result.message);

        // Refresh wallet balance
        await refreshWallet();

        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);

      } catch (error: any) {
        console.error('Payment callback error:', error);
        setStatus('failed');
        setMessage(error.message || 'Payment processing failed');

        // Redirect to dashboard after 5 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 5000);
      }
    };

    handlePaymentCallback();
  }, [location, user, navigate, refreshWallet]);

  const renderContent = () => {
    switch (status) {
      case 'processing':
        return (
          <div className="text-center">
            <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Payment</h2>
            <p className="text-gray-600">Please wait while we verify your payment...</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          </div>
        );

      case 'failed':
        return (
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Failed</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        {renderContent()}
      </div>
    </div>
  );
}