import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as wallet from "./wallet.ts";
import * as bundles from "./bundles.ts";
import type { UserRole } from "./auth.ts";
import type { Network } from "./bundles.ts";

const client = () => createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
);

export type OrderStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "REFUNDED";

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
  transactionId?: string;
  apiProviderId?: string;
  externalReference?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ApiProvider {
  id: string;
  name: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Create order and process purchase using atomic database function
export async function createOrder(
  userId: string,
  userRole: UserRole,
  bundleId: string,
  phoneNumber: string
) {
  const supabase = client();

  // Use the atomic database function for order processing
  const { data, error } = await supabase.rpc("process_bundle_order", {
    p_user_id: userId,
    p_bundle_id: bundleId,
    p_phone_number: phoneNumber,
  });

  if (error) {
    throw new Error(`Failed to create order: ${error.message}`);
  }

  // Get the created order details
  const orderId = data.order_id;
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select(`
      *,
      bundles:bundle_id (
        id,
        name,
        network,
        volume
      )
    `)
    .eq("id", orderId)
    .single();

  if (orderError) {
    throw new Error(`Failed to retrieve order: ${orderError.message}`);
  }

  // Format the order response
  const order: Order = {
    id: orderData.id,
    userId: orderData.user_id,
    bundleId: orderData.bundle_id,
    network: orderData.bundles.network,
    bundleName: orderData.bundles.name,
    volume: orderData.bundles.volume,
    phoneNumber: orderData.phone_number,
    price: parseFloat(orderData.price),
    status: orderData.status,
    transactionId: orderData.transaction_id,
    apiProviderId: orderData.api_provider_id,
    externalReference: orderData.external_reference,
    errorMessage: orderData.error_message,
    createdAt: orderData.created_at,
    completedAt: orderData.completed_at,
  };

  // Start async processing (in production, this would be a queue job)
  processOrderAsync(orderId).catch(console.error);

  return order;
}

// Process order asynchronously (simulates external API call)
async function processOrderAsync(orderId: string) {
  try {
    const supabase = client();

    // Get order details
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      console.error(`Order ${orderId} not found for processing`);
      return;
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate 90% success rate
    const success = Math.random() > 0.1;
    const externalRef = success ? `EXT_${crypto.randomUUID()}` : null;
    const errorMsg = success ? null : "External API processing failed";

    // Complete the order using the database function
    const { error: completeError } = await supabase.rpc("complete_bundle_order", {
      p_order_id: orderId,
      p_success: success,
      p_external_reference: externalRef,
      p_error_message: errorMsg,
    });

    if (completeError) {
      console.error(`Failed to complete order ${orderId}:`, completeError);
    } else {
      console.log(`Order ${orderId} ${success ? 'completed successfully' : 'failed and refunded'}`);
    }
  } catch (error) {
    console.error(`Error processing order ${orderId}:`, error);
  }
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

// Get user orders from database
export async function getUserOrders(userId: string): Promise<Order[]> {
  const supabase = client();

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      bundles:bundle_id (
        id,
        name,
        network,
        volume
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get user orders: ${error.message}`);
  }

  return (data || []).map(orderData => ({
    id: orderData.id,
    userId: orderData.user_id,
    bundleId: orderData.bundle_id,
    network: orderData.bundles.network,
    bundleName: orderData.bundles.name,
    volume: orderData.bundles.volume,
    phoneNumber: orderData.phone_number,
    price: parseFloat(orderData.price),
    status: orderData.status,
    transactionId: orderData.transaction_id,
    apiProviderId: orderData.api_provider_id,
    externalReference: orderData.external_reference,
    errorMessage: orderData.error_message,
    createdAt: orderData.created_at,
    completedAt: orderData.completed_at,
  }));
}

// Get all orders (admin only) from database
export async function getAllOrders(): Promise<Order[]> {
  const supabase = client();

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      bundles:bundle_id (
        id,
        name,
        network,
        volume
      ),
      user_profiles:user_id (
        id,
        name,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get all orders: ${error.message}`);
  }

  return (data || []).map(orderData => ({
    id: orderData.id,
    userId: orderData.user_id,
    bundleId: orderData.bundle_id,
    network: orderData.bundles.network,
    bundleName: orderData.bundles.name,
    volume: orderData.bundles.volume,
    phoneNumber: orderData.phone_number,
    price: parseFloat(orderData.price),
    status: orderData.status,
    transactionId: orderData.transaction_id,
    apiProviderId: orderData.api_provider_id,
    externalReference: orderData.external_reference,
    errorMessage: orderData.error_message,
    createdAt: orderData.created_at,
    completedAt: orderData.completed_at,
  }));
}

// Get all providers from database
export async function getAllProviders(): Promise<ApiProvider[]> {
  const supabase = client();

  const { data, error } = await supabase
    .from("api_providers")
    .select("*")
    .order("priority", { ascending: true });

  if (error) {
    throw new Error(`Failed to get providers: ${error.message}`);
  }

  return (data || []).map(provider => ({
    id: provider.id,
    name: provider.name,
    priority: provider.priority,
    isActive: provider.is_active,
    createdAt: provider.created_at,
    updatedAt: provider.updated_at,
  }));
}

// Get active provider from database
export async function getActiveProvider(): Promise<ApiProvider | null> {
  const providers = await getAllProviders();
  return providers.find(p => p.isActive) || null;
}
