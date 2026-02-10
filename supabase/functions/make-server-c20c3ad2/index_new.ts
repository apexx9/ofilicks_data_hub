import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as auth from "./auth.ts";
import * as wallet from "./wallet.ts";
import * as bundles from "./bundles.ts";
import * as orders from "./orders.ts";

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
  // Handle CORS preflight requests first
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const { pathname } = new URL(req.url);

  // Health check - completely public, no auth checks
  if (pathname === "/health") {
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  try {
    // Auth endpoints
    if (pathname === "/auth/signup" && req.method === "POST") {
      const { email, password, name, role } = await req.json();
      if (!email || !password || !name) {
        return json({ error: "Missing required fields" }, 400);
      }

      const result = await auth.signup(email, password, name, role ?? "USER");
      return json({ success: true, user: result.user });
    }

    if (pathname === "/auth/signin" && req.method === "POST") {
      const { email, password } = await req.json();
      if (!email || !password) {
        return json({ error: "Missing credentials" }, 400);
      }

      const result = await auth.signin(email, password);
      return json({ success: true, accessToken: result.accessToken });
    }

    if (pathname === "/auth/me" && req.method === "GET") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await auth.getCurrentUser(token);
      return json({ success: true, user });
    }

    // Wallet endpoints
    if (pathname === "/wallet/balance" && req.method === "GET") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await auth.getCurrentUser(token);
      const walletData = await wallet.getWallet(user.id);
      return json({ success: true, wallet: walletData });
    }

    if (pathname === "/wallet/add-funds" && req.method === "POST") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await auth.getCurrentUser(token);
      const { amount, description, reference } = await req.json();

      if (!amount || amount <= 0) {
        return json({ error: "Invalid amount" }, 400);
      }

      const result = await wallet.addFunds(user.id, amount, description, reference);
      return json({ success: true, result });
    }

    if (pathname === "/wallet/transactions" && req.method === "GET") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await auth.getCurrentUser(token);
      const transactions = await wallet.getUserTransactions(user.id);
      return json({ success: true, transactions });
    }

    // Bundle endpoints
    if (pathname === "/bundles" && req.method === "GET") {
      const bundlesData = await bundles.getEnabledBundles();
      return json({ success: true, bundles: bundlesData });
    }

    if (pathname === "/bundles/network" && req.method === "GET") {
      const url = new URL(req.url);
      const network = url.searchParams.get("network");

      if (!network) {
        return json({ error: "Network parameter required" }, 400);
      }

      const bundlesData = await bundles.getBundlesByNetwork(network as any);
      return json({ success: true, bundles: bundlesData });
    }

    // Order endpoints
    if (pathname === "/orders/create" && req.method === "POST") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await auth.getCurrentUser(token);
      const { bundleId, phoneNumber } = await req.json();

      if (!bundleId || !phoneNumber) {
        return json({ error: "Missing required fields" }, 400);
      }

      const order = await orders.createOrder(user.id, user.role, bundleId, phoneNumber);
      return json({ success: true, order });
    }

    if (pathname === "/orders" && req.method === "GET") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await auth.getCurrentUser(token);
      const userOrders = await orders.getUserOrders(user.id);
      return json({ success: true, orders: userOrders });
    }

    // Admin endpoints
    if (pathname === "/admin/users" && req.method === "GET") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await auth.getCurrentUser(token);
      if (user.role !== "ADMIN") {
        return json({ error: "Admin access required" }, 403);
      }

      const users = await auth.getAllUsers();
      return json({ success: true, users });
    }

    if (pathname === "/admin/orders" && req.method === "GET") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await auth.getCurrentUser(token);
      if (user.role !== "ADMIN") {
        return json({ error: "Admin access required" }, 403);
      }

      const allOrders = await orders.getAllOrders();
      return json({ success: true, orders: allOrders });
    }

    if (pathname === "/admin/bundles" && req.method === "GET") {
      const token = req.headers.get("authorization")?.split(" ")[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const user = await auth.getCurrentUser(token);
      if (user.role !== "ADMIN") {
        return json({ error: "Admin access required" }, 403);
      }

      const allBundles = await bundles.getAllBundles();
      return json({ success: true, bundles: allBundles });
    }

    // Seed endpoint (for development)
    if (pathname === "/seed" && req.method === "POST") {
      // Note: In production, this should be protected by admin auth
      // For now, we'll allow it for development
      await seedDatabase();
      return json({ success: true });
    }

    // 404 for unknown endpoints
    return json({ error: "Not found" }, 404);

  } catch (err) {
    console.error("Edge Function error:", err);
    return json({ error: err.message }, 500);
  }
});

// Seed function for development
async function seedDatabase() {
  try {
    console.log("Starting database seed...");

    // Create admin user if it doesn't exist
    try {
      await auth.signup("admin@ofilicks.com", "admin123", "System Admin", "ADMIN");
      console.log("✓ Admin user created");
    } catch (error) {
      console.log("Admin user may already exist");
    }

    console.log("✓ Database seed completed successfully!");
    console.log("Sample login credentials:");
    console.log("Admin: admin@ofilicks.com / admin123");

  } catch (error) {
    console.error("Seed error:", error);
  }
}
