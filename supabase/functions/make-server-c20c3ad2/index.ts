import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import {
  initializePaystackPayment,
  processPaymentSuccess,
  verifyPaystackPayment,
  updatePaymentStatus,
  handlePaymentWebhook,
  getUserPayments,
  getAllPayments,
  verifyWebhookSignature
} from "./payments.ts";
import * as wallet from "./wallet.ts";

// Import Deno types
/// <reference lib="deno.ns" /> /// <reference lib="deno.unstable" />

// ============ KV STORE ============
const client = () => createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
);

const set = async (key: string, value: any): Promise<void> => {
  const supabase = client()
  const { error } = await supabase.from("kv_store_c20c3ad2").upsert({ key, value });
  if (error) throw new Error(error.message);
};

const get = async (key: string): Promise<any> => {
  const supabase = client()
  const { data, error } = await supabase.from("kv_store_c20c3ad2").select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value;
};

const getByPrefix = async (prefix: string): Promise<any[]> => {
  const supabase = client()
  const { data, error } = await supabase.from("kv_store_c20c3ad2").select("key, value").like("key", prefix + "%");
  if (error) throw new Error(error.message);
  return data?.map((d) => d.value) ?? [];
};

// Add del function for deleting KV entries
const del = async (key: string): Promise<void> => {
  const supabase = client();
  const { error } = await supabase.from("kv_store_c20c3ad2").delete().eq("key", key);
  if (error) throw new Error(error.message);
};

// Wallet functions handled by wallet.ts

// Simulate data purchase (replace with actual API call)
const simulateDataPurchase = async (order: any): Promise<boolean> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simulate 95% success rate
  const success = Math.random() > 0.05;

  console.log(`Processing order ${order.id} via provider: ${success ? 'SUCCESS' : 'FAILED'}`);

  return success;
};

// Get user by ID function from auth.ts
const getUserById = async (userId: string) => {
  const userData = await get(`user:${userId}`);
  return userData as User | null;
};

// Bundle functions from bundles.ts
type Network = "MTN" | "AIRTELTIGO_ISHARE" | "AIRTELTIGO_BIGTIME" | "TELECEL";

interface BundlePricing {
  USER: number;
  AGENT: number;
  DEALER: number;
}

interface Bundle {
  id: string;
  network: Network;
  name: string;
  volume: string;
  validity: string;
  pricing: BundlePricing;
  costPrice: number;
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Create bundle (admin only)
const createBundle = async (bundle: Omit<Bundle, "id" | "createdAt">) => {
  const id = crypto.randomUUID();

  const newBundle: Bundle = {
    ...bundle,
    id,
    createdAt: new Date().toISOString()
  };

  await set(`bundle:${id}`, newBundle);

  return newBundle;
};

// Get all bundles
const getAllBundles = async () => {
  const bundles = await getByPrefix("bundle:");
  return bundles as Bundle[];
};

// Get enabled bundles only
const getEnabledBundles = async () => {
  const allBundles = await getAllBundles();
  return allBundles.filter(b => b.enabled);
};

// Get bundles by network
const getBundlesByNetwork = async (network: Network) => {
  const allBundles = await getEnabledBundles();
  return allBundles.filter(b => b.network === network);
};

// Get bundle by ID
const getBundleById = async (id: string) => {
  const bundle = await get(`bundle:${id}`);
  return bundle as Bundle | null;
};

// Get price for user role
const getPriceForRole = (bundle: Bundle, role: UserRole): number => {
  if (role === "ADMIN") {
    return bundle.pricing.USER; // Admin pays user price
  }
  return bundle.pricing[role];
};

// Order functions from orders.ts
type OrderStatus = "PENDING" | "SUCCESS" | "FAILED";

interface Order {
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

interface ApiProvider {
  id: string;
  name: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Create API provider (admin only)
const createProvider = async (name: string, priority: number) => {
  const id = crypto.randomUUID();

  const provider: ApiProvider = {
    id,
    name,
    priority,
    isActive: false,
    createdAt: new Date().toISOString()
  };

  await set(`provider:${id}`, provider);

  return provider;
};

// Update provider (admin only)
const updateProvider = async (id: string, updates: Partial<Omit<ApiProvider, "id" | "createdAt">>) => {
  const provider = await get(`provider:${id}`);

  if (!provider) {
    throw new Error("Provider not found");
  }

  const updatedProvider = {
    ...provider,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  await set(`provider:${id}`, updatedProvider);

  return updatedProvider as ApiProvider;
};

// Set active provider (admin only)
const setActiveProvider = async (id: string) => {
  // Deactivate all providers
  const allProviders = await getAllProviders();

  for (const provider of allProviders) {
    if ((provider as any).isActive) {
      await updateProvider((provider as any).id, { isActive: false });
    }
  }

  // Activate selected provider
  return await updateProvider(id, { isActive: true });
};

// Get all providers
const getAllProviders = async (): Promise<ApiProvider[]> => {
  const providers = await getByPrefix("provider:");
  return (providers as ApiProvider[]).sort((a, b) => (a as any).priority - (b as any).priority);
};

// Get active provider
const getActiveProvider = async (): Promise<ApiProvider | null> => {
  const providers = await getAllProviders();
  return providers.find(p => p.isActive) || null;
};

// ============ AUTH ============
const supabaseAdmin = () => createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

const supabaseClient = () => createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_ANON_KEY")
);

export type UserRole = "USER" | "AGENT" | "DEALER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

const signup = async (email: string, password: string, name: string, role: UserRole = "USER") => {
  const supabase = supabaseAdmin();

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name }
  });

  if (authError) {
    throw new Error(`Failed to create user: ${authError.message}`);
  }

  const userId = authData.user.id;

  const user: User = {
    id: userId,
    email,
    name,
    role,
    createdAt: new Date().toISOString()
  };

  await set(`user:${userId}`, user);
  await set(`wallet:${userId}`, {
    userId,
    balance: 0,
    createdAt: new Date().toISOString()
  });

  return { user, userId };
};

const signin = async (email: string, password: string) => {
  const supabase = supabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw new Error(`Failed to sign in: ${error.message}`);
  }

  return {
    accessToken: data.session.access_token,
    user: data.user
  };
};

const getCurrentUser = async (accessToken: string) => {
  const supabase = supabaseAdmin();

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  const userData = await get(`user:${user.id}`);

  if (!userData) {
    throw new Error("User data not found");
  }

  return userData as User;
};

const getAllUsers = async () => {
  const users = await getByPrefix("user:");
  return users as User[];
};

// ============ SEED ============
const seedDatabase = async () => {
  try {
    console.log("Starting database seed...");

    // Create admin user
    try {
      await signup("admin@ofilicks.com", "admin123", "System Admin", "ADMIN");
      console.log("✓ Admin user created");
    } catch (error) {
      console.log("Admin user may already exist");
    }

    // Create sample users
    const sampleUsers = [
      { email: "user@example.com", password: "user123", name: "John Doe", role: "USER" as const },
      { email: "agent@example.com", password: "agent123", name: "Jane Agent", role: "AGENT" as const },
      { email: "dealer@example.com", password: "dealer123", name: "Mike Dealer", role: "DEALER" as const },
    ];

    for (const userData of sampleUsers) {
      try {
        await signup(userData.email, userData.password, userData.name, userData.role);
        console.log(`✓ ${userData.role} user created: ${userData.email}`);
      } catch (error) {
        console.log(`${userData.role} user may already exist`);
      }
    }

    // Create sample bundles
    const sampleBundles = [
      // MTN Bundles
      {
        network: "MTN" as const,
        name: "MTN 1GB Daily",
        volume: "1GB",
        validity: "1 day",
        pricing: { USER: 2.50, AGENT: 2.20, DEALER: 2.00 },
        costPrice: 1.80,
        enabled: true,
      },
      {
        network: "MTN" as const,
        name: "MTN 5GB Weekly",
        volume: "5GB",
        validity: "7 days",
        pricing: { USER: 10.00, AGENT: 9.00, DEALER: 8.50 },
        costPrice: 7.50,
        enabled: true,
      },
      {
        network: "MTN" as const,
        name: "MTN 10GB Monthly",
        volume: "10GB",
        validity: "30 days",
        pricing: { USER: 20.00, AGENT: 18.00, DEALER: 17.00 },
        costPrice: 15.00,
        enabled: true,
      },
      // AirtelTigo iShare
      {
        network: "AIRTELTIGO_ISHARE" as const,
        name: "AT iShare 1GB",
        volume: "1GB",
        validity: "1 day",
        pricing: { USER: 2.00, AGENT: 1.80, DEALER: 1.60 },
        costPrice: 1.40,
        enabled: true,
      },
      {
        network: "AIRTELTIGO_ISHARE" as const,
        name: "AT iShare 3GB",
        volume: "3GB",
        validity: "3 days",
        pricing: { USER: 5.00, AGENT: 4.50, DEALER: 4.20 },
        costPrice: 3.80,
        enabled: true,
      },
      // AirtelTigo BigTime
      {
        network: "AIRTELTIGO_BIGTIME" as const,
        name: "AT BigTime 5GB",
        volume: "5GB",
        validity: "7 days",
        pricing: { USER: 9.50, AGENT: 8.50, DEALER: 8.00 },
        costPrice: 7.00,
        enabled: true,
      },
      {
        network: "AIRTELTIGO_BIGTIME" as const,
        name: "AT BigTime 10GB",
        volume: "10GB",
        validity: "30 days",
        pricing: { USER: 18.00, AGENT: 16.50, DEALER: 15.50 },
        costPrice: 14.00,
        enabled: true,
      },
      // Telecel
      {
        network: "TELECEL" as const,
        name: "Telecel 1GB Daily",
        volume: "1GB",
        validity: "1 day",
        pricing: { USER: 2.30, AGENT: 2.00, DEALER: 1.80 },
        costPrice: 1.60,
        enabled: true,
      },
      {
        network: "TELECEL" as const,
        name: "Telecel 6GB Weekly",
        volume: "6GB",
        validity: "7 days",
        pricing: { USER: 11.00, AGENT: 10.00, DEALER: 9.50 },
        costPrice: 8.50,
        enabled: true,
      },
      {
        network: "TELECEL" as const,
        name: "Telecel 15GB Monthly",
        volume: "15GB",
        validity: "30 days",
        pricing: { USER: 25.00, AGENT: 23.00, DEALER: 21.50 },
        costPrice: 19.00,
        enabled: true,
      },
    ];

    for (const bundleData of sampleBundles) {
      try {
        await createBundle(bundleData);
        console.log(`✓ Bundle created: ${bundleData.name}`);
      } catch (error) {
        console.log(`Bundle may already exist: ${bundleData.name}`);
      }
    }

    // Create sample API providers
    const sampleProviders = [
      { name: "Primary API", priority: 1 },
      { name: "Backup API", priority: 2 },
    ];

    for (const providerData of sampleProviders) {
      try {
        const provider = await createProvider(providerData.name, providerData.priority);

        // Set the first provider as active
        if (providerData.priority === 1) {
          await setActiveProvider(provider.id);
        }

        console.log(`✓ Provider created: ${providerData.name}`);
      } catch (error) {
        console.log(`Provider may already exist: ${providerData.name}`);
      }
    }

    console.log("\n✓ Database seed completed successfully!");
    console.log("\nSample login credentials:");
    console.log("Admin: admin@ofilicks.com / admin123");
    console.log("User: user@example.com / user123");
    console.log("Agent: agent@example.com / agent123");
    console.log("Dealer: dealer@example.com / dealer123");

  } catch (error) {
    console.error("Seed error:", error);
  }
};

// ============ CORS & SERVER ============
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

serve(async (req) => {
  const { pathname } = new URL(req.url);

  // Health check - public endpoint that accepts both authenticated and unauthenticated requests
  if (pathname === "/health" || pathname === "/make-server-c20c3ad2/health") {
    return new Response(JSON.stringify({ status: "ok", message: "Health check successful" }), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Content-Type": "application/json",
      },
    });
  }

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
      },
    });
  }

  try {
    if ((pathname === "/seed" || pathname === "/make-server-c20c3ad2/seed") && req.method === "POST") {
      await seedDatabase();
      return json({ success: true });
    }

    if ((pathname === "/auth/signup" || pathname === "/make-server-c20c3ad2/auth/signup") && req.method === "POST") {
      const { email, password, name, role } = await req.json();
      if (!email || !password || !name) {
        return json({ error: "Missing fields" }, 400);
      }

      const result = await signup(email, password, name, role ?? "USER");
      return json({ success: true, user: result.user });
    }

    if ((pathname === "/auth/signin" || pathname === "/make-server-c20c3ad2/auth/signin") && req.method === "POST") {
      const { email, password } = await req.json();
      if (!email || !password) {
        return json({ error: "Missing credentials" }, 400);
      }

      const result = await signin(email, password);
      return json({ success: true, accessToken: result.accessToken });
    }

    if ((pathname === "/auth/me" || pathname === "/make-server-c20c3ad2/auth/me") && req.method === "GET") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await getCurrentUser(token);
      return json({ success: true, user });
    }

    // Wallet endpoints
    if ((pathname === "/wallet" || pathname === "/make-server-c20c3ad2/wallet") && req.method === "GET") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await getCurrentUser(token);
      const userWallet = await get(`wallet:${user.id}`);

      return json({ success: true, wallet: userWallet });
    }

    // New payment endpoints
    if ((pathname === "/payments/initialize" || pathname === "/make-server-c20c3ad2/payments/initialize") && req.method === "POST") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await getCurrentUser(token);
      const { amount, phoneNumber, network, callbackUrl } = await req.json();

      if (!amount || !phoneNumber || !network) {
        return json({ error: "Missing required fields" }, 400);
      }

      const result = await initializePaystackPayment(
        user.id,
        user.email,
        amount,
        phoneNumber,
        network,
        callbackUrl
      );

      return json({ success: true, ...result });
    }

    if ((pathname === "/payments/verify" || pathname === "/make-server-c20c3ad2/payments/verify") && req.method === "POST") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const { reference } = await req.json();
      if (!reference) return json({ error: "Reference required" }, 400);

      const data = await verifyPaystackPayment(reference);
      return json({ success: true, data });
    }

    if ((pathname === "/wallet/fund" || pathname === "/make-server-c20c3ad2/wallet/fund") && req.method === "POST") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await getCurrentUser(token);
      const { amount, reference } = await req.json();

      if (!amount || amount <= 0) {
        return json({ error: "Invalid amount" }, 400);
      }

      const result = await processPaymentSuccess(reference, user.id);

      const updatedWallet = await wallet.getWallet(user.id);
      const transactions = await wallet.getTransactions(user.id);
      const latestTransaction = transactions[0];

      return json({ success: true, wallet: updatedWallet, transaction: latestTransaction });
    }

    if ((pathname === "/wallet/reset" || pathname === "/make-server-c20c3ad2/wallet/reset") && req.method === "POST") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await getCurrentUser(token);
      const updatedWallet = await wallet.resetWallet(user.id);

      return json({ success: true, wallet: updatedWallet });
    }

    // Transaction endpoints
    if ((pathname === "/transactions" || pathname === "/make-server-c20c3ad2/transactions") && req.method === "GET") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await getCurrentUser(token);
      const transactions = await getByPrefix(`transaction:`);

      const userTransactions = transactions
        .filter((t: any) => t.userId === user.id)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return json({ success: true, transactions: userTransactions });
    }

    // Bundle endpoints
    if ((pathname === "/bundles" || pathname === "/make-server-c20c3ad2/bundles") && req.method === "GET") {
      const bundles = await getByPrefix("bundle:");
      const enabledBundles = bundles.filter((b: any) => b.enabled);

      return json({ success: true, bundles: enabledBundles });
    }

    if ((pathname === "/bundles/MTN" || pathname === "/make-server-c20c3ad2/bundles/MTN") && req.method === "GET") {
      const bundles = await getByPrefix("bundle:");
      const enabledBundles = bundles.filter((b: any) => b.enabled && b.network === "MTN");

      return json({ success: true, bundles: enabledBundles });
    }

    if ((pathname === "/bundles/AIRTELTIGO_ISHARE" || pathname === "/make-server-c20c3ad2/bundles/AIRTELTIGO_ISHARE") && req.method === "GET") {
      const bundles = await getByPrefix("bundle:");
      const enabledBundles = bundles.filter((b: any) => b.enabled && b.network === "AIRTELTIGO_ISHARE");

      return json({ success: true, bundles: enabledBundles });
    }

    if ((pathname === "/bundles/AIRTELTIGO_BIGTIME" || pathname === "/make-server-c20c3ad2/bundles/AIRTELTIGO_BIGTIME") && req.method === "GET") {
      const bundles = await getByPrefix("bundle:");
      const enabledBundles = bundles.filter((b: any) => b.enabled && b.network === "AIRTELTIGO_BIGTIME");

      return json({ success: true, bundles: enabledBundles });
    }

    if ((pathname === "/bundles/TELECEL" || pathname === "/make-server-c20c3ad2/bundles/TELECEL") && req.method === "GET") {
      const bundles = await getByPrefix("bundle:");
      const enabledBundles = bundles.filter((b: any) => b.enabled && b.network === "TELECEL");

      return json({ success: true, bundles: enabledBundles });
    }

    // Order endpoints
    if ((pathname === "/orders" || pathname === "/make-server-c20c3ad2/orders") && req.method === "GET") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await getCurrentUser(token);
      const allOrders = await getByPrefix("order:");

      const userOrders = (allOrders as any[])
        .filter(o => o.userId === user.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return json({ success: true, orders: userOrders });
    }

    if ((pathname === "/orders" || pathname === "/make-server-c20c3ad2/orders") && req.method === "POST") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await getCurrentUser(token);
      const { bundleId, phoneNumber } = await req.json();

      if (!bundleId || !phoneNumber) {
        return json({ error: "Missing bundleId or phoneNumber" }, 400);
      }

      // Import order creation function here
      // Get bundle
      const bundle = await get(`bundle:${bundleId}`);

      if (!bundle) {
        return json({ error: "Bundle not found" }, 400);
      }

      if (!bundle.enabled) {
        return json({ error: "Bundle is currently disabled" }, 400);
      }

      // Get price for user role
      const price = bundle.pricing[user.role] || bundle.pricing.USER;

      // Check wallet balance
      const userWallet = await wallet.getWallet(user.id);

      if (userWallet.balance < price) {
        return json({ error: "Insufficient wallet balance" }, 400);
      }

      // Calculate profit
      const costPrice = bundle.costPrice || 0;
      const profit = price - costPrice;

      // Create order
      const orderId = crypto.randomUUID();
      const order: any = {
        id: orderId,
        userId: user.id,
        bundleId,
        network: bundle.network,
        bundleName: bundle.name,
        volume: bundle.volume,
        phoneNumber,
        price,
        costPrice,
        profit,
        status: "PENDING",
        createdAt: new Date().toISOString()
      };

      await set(`order:${order.id}`, order);

      // Deduct funds from wallet
      try {
        await wallet.deductFunds(
          user.id,
          price,
          `Purchase: ${bundle.name} - ${bundle.volume} to ${phoneNumber}`
        );

        // Simulate API call to provider
        // In production, this would call the actual API
        const success = await simulateDataPurchase(order);

        if (success) {
          order.status = "SUCCESS";
          order.completedAt = new Date().toISOString();
        } else {
          // Refund if purchase fails
          order.status = "FAILED";
          order.errorMessage = "Purchase failed - refunding wallet";
          order.completedAt = new Date().toISOString();

          await wallet.addFunds(
            user.id,
            price,
            `Refund: ${bundle.name} - ${bundle.volume} (order failed)`
          );
        }
      } catch (error) {
        // Refund on any error
        order.status = "FAILED";
        order.errorMessage = (error as Error).message;
        order.completedAt = new Date().toISOString();

        try {
          await wallet.addFunds(
            user.id,
            price,
            `Refund: ${bundle.name} - ${bundle.volume} (order failed)`
          );
        } catch (refundError) {
          console.error("Failed to refund:", refundError);
        }
      }

      // Update order
      await set(`order:${order.id}`, order);

      return json({ success: true, order });
    }

    // Admin endpoints - bundles
    if ((pathname === "/admin/bundles" || pathname === "/make-server-c20c3ad2/admin/bundles") && req.method === "GET") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await getCurrentUser(token);
      if (user.role !== "ADMIN") return json({ error: "Forbidden" }, 403);

      const bundles = await getByPrefix("bundle:");

      return json({ success: true, bundles });
    }

    if ((pathname === "/admin/bundles" || pathname === "/make-server-c20c3ad2/admin/bundles") && req.method === "POST") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await getCurrentUser(token);
      if (user.role !== "ADMIN") return json({ error: "Forbidden" }, 403);

      const bundleData = await req.json();

      const id = crypto.randomUUID();

      const newBundle: any = {
        ...bundleData,
        id,
        createdAt: new Date().toISOString()
      };

      await set(`bundle:${id}`, newBundle);

      return json({ success: true, bundle: newBundle });
    }

    if ((pathname.startsWith("/admin/bundles/") || pathname.startsWith("/make-server-c20c3ad2/admin/bundles/")) && req.method === "PUT") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await getCurrentUser(token);
      if (user.role !== "ADMIN") return json({ error: "Forbidden" }, 403);

      // Extract bundle ID from path
      const parts = pathname.split('/');
      const bundleId = parts[parts.length - 1];

      if (!bundleId) return json({ error: "Bundle ID required" }, 400);

      const updates = await req.json();
      const bundle = await get(`bundle:${bundleId}`);

      if (!bundle) return json({ error: "Bundle not found" }, 404);

      const updatedBundle = {
        ...bundle,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await set(`bundle:${bundleId}`, updatedBundle);

      return json({ success: true, bundle: updatedBundle });
    }

    if ((pathname.startsWith("/admin/bundles/") || pathname.startsWith("/make-server-c20c3ad2/admin/bundles/")) && req.method === "DELETE") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await getCurrentUser(token);
      if (user.role !== "ADMIN") return json({ error: "Forbidden" }, 403);

      // Extract bundle ID from path
      const parts = pathname.split('/');
      const bundleId = parts[parts.length - 1];

      if (!bundleId) return json({ error: "Bundle ID required" }, 400);

      await del(`bundle:${bundleId}`); // Assuming there's a del function

      return json({ success: true });
    }

    // Admin endpoints - users
    if ((pathname === "/admin/users" || pathname === "/make-server-c20c3ad2/admin/users") && req.method === "GET") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await getCurrentUser(token);
      if (user.role !== "ADMIN") return json({ error: "Forbidden" }, 403);

      const users = await getByPrefix("user:");

      return json({ success: true, users });
    }

    if ((pathname.startsWith("/admin/users/") || pathname.startsWith("/make-server-c20c3ad2/admin/users/")) && pathname.includes("/role") && req.method === "PUT") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const currentUser = await getCurrentUser(token);
      if (currentUser.role !== "ADMIN") return json({ error: "Forbidden" }, 403);

      // Extract user ID from path
      const parts = pathname.split('/');
      const userIdIndex = parts.indexOf('users') + 1;
      const userId = parts[userIdIndex];

      if (!userId) return json({ error: "User ID required" }, 400);

      const { role } = await req.json();

      if (!role || !['USER', 'AGENT', 'DEALER', 'ADMIN'].includes(role)) {
        return json({ error: "Invalid role" }, 400);
      }

      const userData = await get(`user:${userId}`);

      if (!userData) return json({ error: "User not found" }, 404);

      const updatedUser = { ...userData, role };
      await set(`user:${userId}`, updatedUser);

      return json({ success: true, user: updatedUser });
    }

    // Admin endpoints - orders
    if ((pathname === "/admin/orders" || pathname === "/make-server-c20c3ad2/admin/orders") && req.method === "GET") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await getCurrentUser(token);
      if (user.role !== "ADMIN") return json({ error: "Forbidden" }, 403);

      const allOrders = await getByPrefix("order:");

      const sortedOrders = (allOrders as any[])
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return json({ success: true, orders: sortedOrders });
    }

    // Admin endpoints - transactions
    if ((pathname === "/admin/transactions" || pathname === "/make-server-c20c3ad2/admin/transactions") && req.method === "GET") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await getCurrentUser(token);
      if (user.role !== "ADMIN") return json({ error: "Forbidden" }, 403);

      const allTransactions = await getByPrefix("transaction:");

      const sortedTransactions = (allTransactions as any[])
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return json({ success: true, transactions: sortedTransactions });
    }

    // Admin endpoints - providers
    if ((pathname === "/admin/providers" || pathname === "/make-server-c20c3ad2/admin/providers") && req.method === "GET") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await getCurrentUser(token);
      if (user.role !== "ADMIN") return json({ error: "Forbidden" }, 403);

      const providers = await getByPrefix("provider:");

      return json({ success: true, providers });
    }

    if ((pathname === "/admin/providers" || pathname === "/make-server-c20c3ad2/admin/providers") && req.method === "POST") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await getCurrentUser(token);
      if (user.role !== "ADMIN") return json({ error: "Forbidden" }, 403);

      const { name, priority } = await req.json();

      if (!name || priority === undefined) {
        return json({ error: "Name and priority required" }, 400);
      }

      const id = crypto.randomUUID();

      const provider: any = {
        id,
        name,
        priority,
        isActive: false,
        createdAt: new Date().toISOString()
      };

      await set(`provider:${id}`, provider);

      return json({ success: true, provider });
    }

    if ((pathname.startsWith("/admin/providers/") || pathname.startsWith("/make-server-c20c3ad2/admin/providers/")) && req.method === "PUT") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await getCurrentUser(token);
      if (user.role !== "ADMIN") return json({ error: "Forbidden" }, 403);

      // Extract provider ID from path
      const parts = pathname.split('/');
      const providerId = parts[parts.length - 1];

      if (!providerId) return json({ error: "Provider ID required" }, 400);

      const updates = await req.json();
      const provider = await get(`provider:${providerId}`);

      if (!provider) return json({ error: "Provider not found" }, 404);

      const updatedProvider = {
        ...provider,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await set(`provider:${providerId}`, updatedProvider);

      return json({ success: true, provider: updatedProvider });
    }

    if ((pathname.startsWith("/admin/providers/") || pathname.startsWith("/make-server-c20c3ad2/admin/providers/")) && pathname.includes("/activate") && req.method === "POST") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await getCurrentUser(token);
      if (user.role !== "ADMIN") return json({ error: "Forbidden" }, 403);

      // Extract provider ID from path
      const parts = pathname.split('/');
      const providerIdIndex = parts.indexOf('providers') + 1;
      const providerId = parts[providerIdIndex];

      if (!providerId) return json({ error: "Provider ID required" }, 400);

      // Deactivate all providers
      const allProviders = await getByPrefix("provider:");

      for (const provider of allProviders) {
        if ((provider as any).isActive) {
          await set(`provider:${(provider as any).id}`, { ...(provider as any), isActive: false });
        }
      }

      // Activate selected provider
      const updatedProvider = await set(`provider:${providerId}`, { ...(await get(`provider:${providerId}`)), isActive: true });

      return json({ success: true, provider: updatedProvider });
    }

    // ============ PAYMENT ENDPOINTS ============
    if (pathname === "/webhook/paystack" && req.method === "POST") {
      try {
        const signature = req.headers.get("x-paystack-signature");
        const payload = await req.text();
        const secret = Deno.env.get("PAYSTACK_WEBHOOK_SECRET") || "test_secret";
        if (!(await verifyWebhookSignature(payload, signature || "", secret))) {
          return json({ error: "Invalid webhook signature" }, 401);
        }
        await handlePaymentWebhook(JSON.parse(payload));
        return json({ success: true });
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }

    if (pathname === "/payments" && req.method === "GET") {
      try {
        const token = req.headers.get("authorization")?.split(" ")[1];
        if (!token) return json({ error: "Unauthorized" }, 401);
        const user = await getCurrentUser(token);
        const payments = await getUserPayments(user.id);
        return json({ success: true, payments });
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }

    if (pathname === "/admin/payments" && req.method === "GET") {
      try {
        const token = req.headers.get("authorization")?.split(" ")[1];
        if (!token) return json({ error: "Unauthorized" }, 401);
        const user = await getCurrentUser(token);
        if (user.role !== "ADMIN") return json({ error: "Forbidden" }, 403);
        const payments = await getAllPayments();
        return json({ success: true, payments });
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }

    if ((pathname === "/admin/revenue" || pathname === "/make-server-c20c3ad2/admin/revenue") && req.method === "GET") {
      try {
        const token = req.headers.get("authorization")?.split(" ")[1];
        if (!token) return json({ error: "Unauthorized" }, 401);
        const user = await getCurrentUser(token);
        if (user.role !== "ADMIN") return json({ error: "Forbidden" }, 403);

        const allOrders = await getByPrefix("order:");
        const success = allOrders.filter(o => o.status === "SUCCESS");

        return json({
          success: true,
          stats: {
            totalOrders: success.length,
            totalVolume: success.reduce((s, o) => s + (o.price || 0), 0),
            totalCost: success.reduce((s, o) => s + (o.costPrice || 0), 0),
            totalProfit: success.reduce((s, o) => s + (o.profit || 0), 0)
          }
        });
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }

    if ((pathname === "/admin/withdraw" || pathname === "/make-server-c20c3ad2/admin/withdraw") && req.method === "POST") {
      try {
        const token = req.headers.get("authorization")?.split(" ")[1];
        if (!token) return json({ error: "Unauthorized" }, 401);
        const user = await getCurrentUser(token);
        if (user.role !== "ADMIN") return json({ error: "Forbidden" }, 403);
        const { amount, recipientCode } = await req.json();
        return json({
          success: true,
          message: "Withdrawal simulated",
          withdrawal: { amount, recipientCode, status: "PENDING", createdAt: new Date().toISOString() }
        });
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }

    return json({ error: "Not found" }, 404);
  } catch (err: any) {
    console.error("Edge Function error:", err);
    return json({ error: err.message }, 500);
  }
});
