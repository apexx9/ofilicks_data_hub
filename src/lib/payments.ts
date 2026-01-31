import axios from 'axios';
import { projectId } from '../../utils/supabase/info';

// Paystack configuration
// Paystack configuration (Public key only for frontend)
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_your_key_here';

// Edge Function Base URL
const EDGE_FUNCTION_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c20c3ad2`;

// Payment transaction statuses
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface PaymentTransaction {
  id: string;
  userId: string;
  reference: string;
  amount: number; // in Ghana pesewas (1 GHS = 100 pesewas)
  status: PaymentStatus;
  paymentMethod: 'MOBILE_MONEY' | 'CARD' | 'BANK_TRANSFER';
  network?: 'MTN' | 'TELECEL' | 'AIRTELTIGO'; // for mobile money
  phoneNumber?: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  errorMessage?: string;
  refundReference?: string;
}

// Paystack response types
interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: string;
    reference: string;
    amount: number;
    currency: string;
    metadata: {
      userId: string;
      custom_fields: any[];
    };
    customer: {
      email: string;
      phone: string;
    };
  };
}

// Initialize payment with Paystack
export async function initializePayment(
  userId: string,
  email: string,
  amount: number, // in GHS
  phoneNumber: string,
  network: 'MTN' | 'TELECEL' | 'AIRTELTIGO' | 'AIRTELTIGO_ISHARE' | 'AIRTELTIGO_BIGTIME'
): Promise<{
  reference: string;
  authorizationUrl: string;
}> {
  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}/payments/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      },
      body: JSON.stringify({
        amount,
        phoneNumber,
        network,
        callbackUrl: `${window.location.origin}/payment/callback`
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to initialize payment');
    }

    return {
      reference: result.reference,
      authorizationUrl: result.authorizationUrl
    };
  } catch (error: any) {
    console.error('Payment initialization error:', error);
    throw new Error(error.message || 'Payment initialization failed');
  }
}

// Verify payment with Paystack
export async function verifyPayment(reference: string): Promise<any> {
  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      },
      body: JSON.stringify({ reference })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to verify payment');
    }

    return result.data;
  } catch (error: any) {
    console.error('Payment verification error:', error);
    throw new Error(error.message || 'Payment verification failed');
  }
}

// Process successful payment and fund wallet
export async function processSuccessfulPayment(
  reference: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Verify payment with Paystack
    const paymentData = await verifyPayment(reference);

    // Check if payment was successful
    if (paymentData.status !== 'success') {
      throw new Error('Payment not successful');
    }

    // Convert amount from pesewas to GHS
    const amountInGHS = paymentData.amount / 100;

    // Call your backend to credit wallet
    const response = await fetch(`${EDGE_FUNCTION_URL}/wallet/fund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      },
      body: JSON.stringify({
        userId,
        amount: amountInGHS,
        reference
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to credit wallet');
    }

    return {
      success: true,
      message: `Successfully added GHS ${amountInGHS.toFixed(2)} to your wallet`
    };
  } catch (error: any) {
    console.error('Payment processing error:', error);
    throw new Error(error.message || 'Payment processing failed');
  }
}

// Helper function to extract network from email (you might want to handle this differently)
function getNetworkFromEmail(email: string): 'MTN' | 'TELECEL' | 'AIRTELTIGO' {
  const emailLower = email.toLowerCase();
  if (emailLower.includes('mtn')) return 'MTN';
  if (emailLower.includes('telecel')) return 'TELECEL';
  return 'AIRTELTIGO'; // default
}

// Handle payment webhook (server-side)
export async function handlePaystackWebhook(payload: any, signature: string): Promise<void> {
  // Verify webhook signature (implement based on Paystack docs)
  // const isValid = verifyWebhookSignature(payload, signature, WEBHOOK_SECRET);
  // if (!isValid) throw new Error('Invalid webhook signature');

  const event = payload.event;
  const data = payload.data;

  switch (event) {
    case 'charge.success':
      // Payment successful - credit wallet
      await creditWalletFromWebhook(data);
      break;
    case 'charge.failed':
      // Payment failed - log for review
      await handleFailedPayment(data);
      break;
    case 'refund.success':
      // Refund processed - update records
      await handleRefundSuccess(data);
      break;
  }
}

// Server-side function to credit wallet from webhook
async function creditWalletFromWebhook(data: any): Promise<void> {
  // This would be implemented in your Supabase function
  // Extract userId from metadata
  const userId = data.metadata?.userId;
  if (!userId) {
    console.error('No userId in payment metadata');
    return;
  }

  const amount = data.amount / 100; // Convert from pesewas to GHS

  // Call your wallet service to credit the amount
  // await walletService.credit(userId, amount, `Payment reference: ${data.reference}`);
  console.log(`Crediting ${amount} GHS to user ${userId} for reference ${data.reference}`);
}

// Handle failed payments
async function handleFailedPayment(data: any): Promise<void> {
  console.log('Payment failed:', data);
  // Log for admin review, send notifications, etc.
}

// Handle successful refunds
async function handleRefundSuccess(data: any): Promise<void> {
  console.log('Refund successful:', data);
  // Update transaction records to show refunded status
}