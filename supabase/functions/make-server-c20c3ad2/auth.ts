import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

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

// Sign up a new user using database
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

  // The user profile and wallet will be automatically created by the database trigger
  // from the migration we created

  return { user: { id: userId, email, name, role, createdAt: new Date().toISOString() }, userId };
}

// Sign in using Supabase Auth
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

  // Get user profile from database
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("User profile not found");
  }

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    createdAt: profile.created_at,
  } as User;
}

// Get user by ID
export async function getUserById(userId: string) {
  const supabase = supabaseAdmin();

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(`Failed to get user: ${error.message}`);
  }

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    createdAt: profile.created_at,
  } as User;
}

// Update user role (admin only)
export async function updateUserRole(userId: string, role: UserRole) {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("user_profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update user role: ${error.message}`);
  }

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role: data.role,
    createdAt: data.created_at,
  } as User;
}

// Get all users (admin only)
export async function getAllUsers() {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get users: ${error.message}`);
  }

  return data.map(profile => ({
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    createdAt: profile.created_at,
  })) as User[];
}
