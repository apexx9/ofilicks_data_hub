import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.ts";

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

// Sign up a new user
export async function signup(email: string, password: string, name: string, role: UserRole = "USER") {
  const supabase = supabaseAdmin();
  
  // Create the auth user
  // Automatically confirm the user's email since an email server hasn't been configured.
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

  // Store user details in KV store
  const user: User = {
    id: userId,
    email,
    name,
    role,
    createdAt: new Date().toISOString()
  };

  await kv.set(`user:${userId}`, user);

  // Initialize wallet with 0 balance
  await kv.set(`wallet:${userId}`, {
    userId,
    balance: 0,
    createdAt: new Date().toISOString()
  });

  return { user, userId };
}

// Sign in
export async function signin(email: string, password: string) {
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
}

// Get current user from access token
export async function getCurrentUser(accessToken: string) {
  const supabase = supabaseAdmin();
  
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error || !user) {
    throw new Error("Unauthorized");
  }

  // Get user details from KV store
  const userData = await kv.get(`user:${user.id}`);
  
  if (!userData) {
    throw new Error("User data not found");
  }

  return userData as User;
}

// Get user by ID
export async function getUserById(userId: string) {
  const userData = await kv.get(`user:${userId}`);
  return userData as User | null;
}

// Update user role (admin only)
export async function updateUserRole(userId: string, role: UserRole) {
  const userData = await kv.get(`user:${userId}`);
  
  if (!userData) {
    throw new Error("User not found");
  }

  const updatedUser = { ...userData, role };
  await kv.set(`user:${userId}`, updatedUser);
  
  return updatedUser;
}

// Get all users (admin only)
export async function getAllUsers() {
  const users = await kv.getByPrefix("user:");
  return users as User[];
}
