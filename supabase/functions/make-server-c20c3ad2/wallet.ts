import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const client = () => createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
);

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  balance: number;
  description: string;
  reference?: string;
  orderId?: string;
  createdAt: string;
}

// Get wallet balance from database
export async function getWallet(userId: string): Promise<Wallet> {
  const supabase = client();

  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    throw new Error(`Failed to get wallet: ${error.message}`);
  }

  if (!data) {
    throw new Error("Wallet not found");
  }

  return {
    id: data.id,
    userId: data.user_id,
    balance: parseFloat(data.balance),
    version: data.version,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// Add funds to wallet using atomic database function
export async function addFunds(
  userId: string,
  amount: number,
  description: string = "Wallet funding",
  reference?: string,
  expectedVersion?: number
) {
  if (amount <= 0) {
    throw new Error("Amount must be positive");
  }

  const supabase = client();

  // Use the atomic database function
  const { data, error } = await supabase.rpc("update_wallet_balance", {
    p_user_id: userId,
    p_amount: amount,
    p_description: description,
    p_reference: reference,
    p_expected_version: expectedVersion,
  });

  if (error) {
    throw new Error(`Failed to add funds: ${error.message}`);
  }

  return data;
}

// Deduct funds from wallet using atomic database function
export async function deductFunds(
  userId: string,
  amount: number,
  description: string,
  reference?: string,
  expectedVersion?: number
) {
  if (amount <= 0) {
    throw new Error("Amount must be positive");
  }

  const supabase = client();

  // Use the atomic database function (negative amount for deduction)
  const { data, error } = await supabase.rpc("update_wallet_balance", {
    p_user_id: userId,
    p_amount: -amount,
    p_description: description,
    p_reference: reference,
    p_expected_version: expectedVersion,
  });

  if (error) {
    throw new Error(`Failed to deduct funds: ${error.message}`);
  }

  return data;
}

// Get user transactions from database
export async function getUserTransactions(userId: string, limit: number = 50): Promise<Transaction[]> {
  const supabase = client();

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get transactions: ${error.message}`);
  }

  return (data || []).map(tx => ({
    id: tx.id,
    userId: tx.user_id,
    walletId: tx.wallet_id,
    type: tx.type,
    amount: parseFloat(tx.amount),
    balance: parseFloat(tx.balance),
    description: tx.description,
    reference: tx.reference,
    orderId: tx.order_id,
    createdAt: tx.created_at,
  }));
}

// Get transaction history
export async function getTransactions(userId: string): Promise<Transaction[]> {
  const allTransactions = await kv.getByPrefix("transaction:");

  // Filter transactions for this user and sort by date
  const userTransactions = (allTransactions as Transaction[])
    .filter(t => t.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return userTransactions;
}

// Get all transactions (admin only)
export async function getAllTransactions(): Promise<Transaction[]> {
  const allTransactions = await kv.getByPrefix("transaction:");

  return (allTransactions as Transaction[])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
// Reset wallet (for testing/cleanup)
export async function resetWallet(userId: string) {
  const wallet = await getWallet(userId);
  const updatedWallet = {
    ...wallet,
    balance: 0,
    updatedAt: new Date().toISOString()
  };

  await kv.set(`wallet:${userId}`, updatedWallet);

  // Delete all transactions for this user
  const allTransactions = await kv.getByPrefix("transaction:");
  for (const t of allTransactions as Transaction[]) {
    if (t.userId === userId) {
      // Find the key for this transaction to delete it
      // Since we don't have a direct key-finding by value, we'd need to search or have id in key
      // The key is transaction:${t.id}
      await kv.del(`transaction:${t.id}`);
    }
  }

  // Delete all payments for this user
  const allPayments = await kv.getByPrefix("payment:");
  for (const p of allPayments as any[]) {
    if (p.userId === userId) {
      await kv.del(`payment:${p.id}`);
      await kv.del(`payment_ref:${p.reference}`);
    }
  }

  return updatedWallet;
}
