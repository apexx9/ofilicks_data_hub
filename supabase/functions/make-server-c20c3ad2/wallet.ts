import * as kv from "./kv_store.ts";

export interface Wallet {
  userId: string;
  balance: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
}

// Get wallet balance
export async function getWallet(userId: string): Promise<Wallet> {
  const wallet = await kv.get(`wallet:${userId}`);

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  return wallet as Wallet;
}

// Add funds to wallet
export async function addFunds(userId: string, amount: number, description: string = "Wallet funding") {
  if (amount <= 0) {
    throw new Error("Amount must be positive");
  }

  const wallet = await getWallet(userId);
  const newBalance = wallet.balance + amount;

  // Update wallet
  const updatedWallet = {
    ...wallet,
    balance: newBalance,
    updatedAt: new Date().toISOString()
  };

  await kv.set(`wallet:${userId}`, updatedWallet);

  // Create transaction record
  const transaction: Transaction = {
    id: crypto.randomUUID(),
    userId,
    type: "CREDIT",
    amount,
    balance: newBalance,
    description,
    createdAt: new Date().toISOString()
  };

  await kv.set(`transaction:${transaction.id}`, transaction);

  return { wallet: updatedWallet, transaction };
}

// Deduct funds from wallet
export async function deductFunds(userId: string, amount: number, description: string) {
  if (amount <= 0) {
    throw new Error("Amount must be positive");
  }

  const wallet = await getWallet(userId);

  if (wallet.balance < amount) {
    throw new Error("Insufficient balance");
  }

  const newBalance = wallet.balance - amount;

  // Update wallet
  const updatedWallet = {
    ...wallet,
    balance: newBalance,
    updatedAt: new Date().toISOString()
  };

  await kv.set(`wallet:${userId}`, updatedWallet);

  // Create transaction record
  const transaction: Transaction = {
    id: crypto.randomUUID(),
    userId,
    type: "DEBIT",
    amount,
    balance: newBalance,
    description,
    createdAt: new Date().toISOString()
  };

  await kv.set(`transaction:${transaction.id}`, transaction);

  return { wallet: updatedWallet, transaction };
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
