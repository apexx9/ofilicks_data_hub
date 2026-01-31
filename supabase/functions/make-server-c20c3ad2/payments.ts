import * as kv from "./kv_store.ts";
import * as wallet from "./wallet.ts";

export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";

export interface PaymentTransaction {
  id: string;
  userId: string;
  reference: string;
  amount: number;
  status: PaymentStatus;
  paymentMethod: "MOBILE_MONEY" | "CARD" | "BANK_TRANSFER";
  network?: "MTN" | "TELECEL" | "AIRTELTIGO";
  phoneNumber?: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  errorMessage?: string;
  refundReference?: string;
}

// Create payment transaction record
export async function createPaymentTransaction(
  userId: string,
  reference: string,
  amount: number,
  paymentMethod: "MOBILE_MONEY" | "CARD" | "BANK_TRANSFER",
  network?: "MTN" | "TELECEL" | "AIRTELTIGO",
  phoneNumber?: string
): Promise<PaymentTransaction> {
  const payment: PaymentTransaction = {
    id: crypto.randomUUID(),
    userId,
    reference,
    amount,
    status: "PENDING",
    paymentMethod,
    network,
    phoneNumber,
    description: `Wallet funding via ${paymentMethod}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await kv.set(`payment:${payment.id}`, payment);
  await kv.set(`payment_ref:${reference}`, payment.id);

  return payment;
}

// Update payment status
export async function updatePaymentStatus(
  reference: string,
  status: PaymentStatus,
  errorMessage?: string
): Promise<PaymentTransaction | null> {
  const paymentId = await kv.get(`payment_ref:${reference}`);
  if (!paymentId) {
    console.error(`Payment not found for reference: ${reference}`);
    return null;
  }

  const payment = await kv.get(`payment:${paymentId}`);
  if (!payment) {
    console.error(`Payment record not found: ${paymentId}`);
    return null;
  }

  const updatedPayment = {
    ...payment,
    status,
    updatedAt: new Date().toISOString(),
    completedAt: status !== "PENDING" ? new Date().toISOString() : undefined,
    errorMessage: errorMessage || undefined
  };

  await kv.set(`payment:${paymentId}`, updatedPayment);

  return updatedPayment as PaymentTransaction;
}

// Process successful payment and credit wallet
export async function processPaymentSuccess(
  reference: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Get payment first
    const paymentId = await kv.get(`payment_ref:${reference}`);
    if (!paymentId) throw new Error("Payment reference not found");
    const payment = await kv.get(`payment:${paymentId}`);
    if (!payment) throw new Error("Payment record not found");

    // If status is already SUCCESS, don't credit again
    if (payment.status === "SUCCESS") {
      return { success: true, message: "Payment already processed" };
    }

    // 4. Verify with Paystack
    const paystackData = await verifyPaystackPayment(reference);
    if (paystackData.status !== "success") {
      throw new Error(`Paystack verification failed: ${paystackData.gateway_response}`);
    }

    // 5. Verify amount (Paystack is in pesewas, we store in GHS)
    const paystackAmountGHS = paystackData.amount / 100;
    if (Math.abs(paystackAmountGHS - payment.amount) > 0.01) {
      throw new Error("Amount mismatch between Paystack and our records");
    }

    // 6. Update payment status to SUCCESS
    const updatedPayment = await updatePaymentStatus(reference, "SUCCESS");
    if (!updatedPayment) {
      throw new Error("Failed to update payment status");
    }

    // 7. Credit wallet
    await wallet.addFunds(
      userId,
      payment.amount,
      `Wallet funding via Paystack (${reference})`
    );

    console.log(`Successfully credited ${payment.amount} GHS to user ${userId}`);

    return {
      success: true,
      message: `Successfully added GHS ${payment.amount.toFixed(2)} to your wallet`
    };
  } catch (error) {
    console.error("Payment processing error:", error);

    // Update payment status to failed
    await updatePaymentStatus(
      reference,
      "FAILED",
      error.message || "Payment processing failed"
    );

    throw error;
  }
}

// Handle payment webhook
export async function handlePaymentWebhook(payload: any): Promise<void> {
  try {
    const event = payload.event;
    const data = payload.data;

    console.log(`Processing webhook event: ${event}`);

    switch (event) {
      case "charge.success":
        await handleSuccessfulCharge(data);
        break;
      case "charge.failed":
        await handleFailedCharge(data);
        break;
      case "refund.success":
        await handleRefundSuccess(data);
        break;
      default:
        console.log(`Unhandled webhook event: ${event}`);
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
    throw error;
  }
}

// Handle successful charge
async function handleSuccessfulCharge(data: any): Promise<void> {
  const reference = data.reference;
  const userId = data.metadata?.userId;

  if (!userId) {
    console.error("No userId in payment metadata");
    return;
  }

  const amount = data.amount / 100; // Convert from pesewas to GHS

  console.log(`Processing successful payment: ${reference} for user ${userId}, amount: ${amount} GHS`);

  // Process the payment
  await processPaymentSuccess(reference, userId);
}

// Handle failed charge
async function handleFailedCharge(data: any): Promise<void> {
  const reference = data.reference;
  console.log(`Payment failed: ${reference}`);

  await updatePaymentStatus(
    reference,
    "FAILED",
    data.gateway_response || "Payment failed"
  );
}

// Handle refund success
async function handleRefundSuccess(data: any): Promise<void> {
  const reference = data.reference;
  console.log(`Refund successful: ${reference}`);

  await updatePaymentStatus(
    reference,
    "REFUNDED",
    "Payment refunded"
  );
}

// Get user payment history
export async function getUserPayments(userId: string): Promise<PaymentTransaction[]> {
  const allPayments = await kv.getByPrefix("payment:");

  return (allPayments as PaymentTransaction[])
    .filter(p => p.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Get all payments (admin only)
export async function getAllPayments(): Promise<PaymentTransaction[]> {
  const allPayments = await kv.getByPrefix("payment:");

  return (allPayments as PaymentTransaction[])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Paystack API configuration
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") || "";
const PAYSTACK_BASE_URL = "https://api.paystack.co";

// Initialize Paystack payment
export async function initializePaystackPayment(
  userId: string,
  email: string,
  amount: number, // in GHS
  phoneNumber: string,
  network: "MTN" | "TELECEL" | "AIRTELTIGO",
  callbackUrl?: string
): Promise<{ reference: string; authorizationUrl: string }> {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured in environment variables");
  }
  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100), // Convert to pesewas
        currency: "GHS",
        channels: ["mobile_money"],
        mobile_money: {
          phone: phoneNumber,
          provider: network.toLowerCase()
        },
        metadata: {
          userId,
          payment_type: "wallet_funding"
        },
        callback_url: callbackUrl
      })
    });

    const body = await response.json();
    if (!body.status) {
      throw new Error(body.message || "Failed to initialize Paystack payment");
    }

    // Create a pending transaction record
    await createPaymentTransaction(
      userId,
      body.data.reference,
      amount,
      "MOBILE_MONEY",
      network,
      phoneNumber
    );

    return {
      reference: body.data.reference,
      authorizationUrl: body.data.authorization_url
    };
  } catch (error) {
    console.error("Paystack initialization error:", error);
    throw error;
  }
}

// Verify Paystack payment
export async function verifyPaystackPayment(reference: string): Promise<any> {
  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json"
      }
    });

    const body = await response.json();
    if (!body.status) {
      throw new Error(body.message || "Failed to verify Paystack payment");
    }

    return body.data;
  } catch (error) {
    console.error("Paystack verification error:", error);
    throw error;
  }
}

// Verify webhook signature
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) return false;

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );

    const data = encoder.encode(payload);
    const signatureUint8Array = await crypto.subtle.sign("HMAC", key, data);

    // Convert signature to hex string
    const hashArray = Array.from(new Uint8Array(signatureUint8Array));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex === signature;
  } catch (error) {
    console.error("Webhook signature verification error:", error);
    return false;
  }
}