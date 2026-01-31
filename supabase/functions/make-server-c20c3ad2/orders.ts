import * as kv from "./kv_store.ts";
import * as wallet from "./wallet.ts";
import * as bundles from "./bundles.ts";
import type { UserRole } from "./auth.ts";
import type { Network } from "./bundles.ts";

export type OrderStatus = "PENDING" | "SUCCESS" | "FAILED";

export interface Order {
  id: string;
  userId: string;
  bundleId: string;
  network: Network;
  bundleName: string;
  volume: string;
  phoneNumber: string;
  price: number;
  status: OrderStatus;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

// Create order and process purchase
export async function createOrder(
  userId: string,
  userRole: UserRole,
  bundleId: string,
  phoneNumber: string
) {
  // Get bundle
  const bundle = await bundles.getBundleById(bundleId);
  
  if (!bundle) {
    throw new Error("Bundle not found");
  }

  if (!bundle.enabled) {
    throw new Error("Bundle is currently disabled");
  }

  // Get price for user role
  const price = bundles.getPriceForRole(bundle, userRole);

  // Check wallet balance
  const userWallet = await wallet.getWallet(userId);
  
  if (userWallet.balance < price) {
    throw new Error("Insufficient wallet balance");
  }

  // Create order
  const order: Order = {
    id: crypto.randomUUID(),
    userId,
    bundleId,
    network: bundle.network,
    bundleName: bundle.name,
    volume: bundle.volume,
    phoneNumber,
    price,
    status: "PENDING",
    createdAt: new Date().toISOString()
  };

  await kv.set(`order:${order.id}`, order);

  // Deduct funds from wallet
  try {
    await wallet.deductFunds(
      userId,
      price,
      `Purchase: ${bundle.name} - ${bundle.volume} to ${phoneNumber}`
    );

    // Simulate API call to provider
    // In production, this would call the actual API
    const success = await processDataPurchase(order);

    if (success) {
      order.status = "SUCCESS";
      order.completedAt = new Date().toISOString();
    } else {
      // Refund if purchase fails
      order.status = "FAILED";
      order.errorMessage = "Purchase failed - refunding wallet";
      order.completedAt = new Date().toISOString();
      
      await wallet.addFunds(
        userId,
        price,
        `Refund: ${bundle.name} - ${bundle.volume} (order failed)`
      );
    }
  } catch (error) {
    // Refund on any error
    order.status = "FAILED";
    order.errorMessage = error.message;
    order.completedAt = new Date().toISOString();
    
    try {
      await wallet.addFunds(
        userId,
        price,
        `Refund: ${bundle.name} - ${bundle.volume} (order failed)`
      );
    } catch (refundError) {
      console.error("Failed to refund:", refundError);
    }
  }

  // Update order
  await kv.set(`order:${order.id}`, order);

  return order;
}

// Simulate data purchase (replace with actual API call)
async function processDataPurchase(order: Order): Promise<boolean> {
  // Get active API provider
  const provider = await getActiveProvider();
  
  if (!provider) {
    console.error("No active API provider configured");
    return false;
  }

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simulate 95% success rate
  const success = Math.random() > 0.05;
  
  console.log(`Processing order ${order.id} via provider ${provider.name}: ${success ? 'SUCCESS' : 'FAILED'}`);
  
  return success;
}

// Get user orders
export async function getUserOrders(userId: string): Promise<Order[]> {
  const allOrders = await kv.getByPrefix("order:");
  
  return (allOrders as Order[])
    .filter(o => o.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Get all orders (admin only)
export async function getAllOrders(): Promise<Order[]> {
  const allOrders = await kv.getByPrefix("order:");
  
  return (allOrders as Order[])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// API Provider Management
export interface ApiProvider {
  id: string;
  name: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Create API provider (admin only)
export async function createProvider(name: string, priority: number) {
  const id = crypto.randomUUID();
  
  const provider: ApiProvider = {
    id,
    name,
    priority,
    isActive: false,
    createdAt: new Date().toISOString()
  };

  await kv.set(`provider:${id}`, provider);
  
  return provider;
}

// Update provider (admin only)
export async function updateProvider(id: string, updates: Partial<Omit<ApiProvider, "id" | "createdAt">>) {
  const provider = await kv.get(`provider:${id}`);
  
  if (!provider) {
    throw new Error("Provider not found");
  }

  const updatedProvider = {
    ...provider,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  await kv.set(`provider:${id}`, updatedProvider);
  
  return updatedProvider as ApiProvider;
}

// Set active provider (admin only)
export async function setActiveProvider(id: string) {
  // Deactivate all providers
  const allProviders = await getAllProviders();
  
  for (const provider of allProviders) {
    if (provider.isActive) {
      await updateProvider(provider.id, { isActive: false });
    }
  }

  // Activate selected provider
  return await updateProvider(id, { isActive: true });
}

// Get all providers
export async function getAllProviders(): Promise<ApiProvider[]> {
  const providers = await kv.getByPrefix("provider:");
  return (providers as ApiProvider[]).sort((a, b) => a.priority - b.priority);
}

// Get active provider
export async function getActiveProvider(): Promise<ApiProvider | null> {
  const providers = await getAllProviders();
  return providers.find(p => p.isActive) || null;
}
