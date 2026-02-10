import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import type { UserRole } from "./auth.ts";

const client = () => createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
);

export type Network = "MTN" | "AIRTELTIGO_ISHARE" | "AIRTELTIGO_BIGTIME" | "TELECEL";

export interface BundlePricing {
  USER: number;
  AGENT: number;
  DEALER: number;
  ADMIN: number;
}

export interface Bundle {
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

// Create new bundle (admin only)
export async function createBundle(bundleData: Omit<Bundle, "id" | "createdAt" | "updatedAt">): Promise<Bundle> {
  const supabase = client();

  const { data, error } = await supabase
    .from("bundles")
    .insert({
      network: bundleData.network,
      name: bundleData.name,
      volume: bundleData.volume,
      validity: bundleData.validity,
      pricing: bundleData.pricing,
      cost_price: bundleData.costPrice,
      enabled: bundleData.enabled,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create bundle: ${error.message}`);
  }

  return {
    id: data.id,
    network: data.network,
    name: data.name,
    volume: data.volume,
    validity: data.validity,
    pricing: data.pricing,
    costPrice: parseFloat(data.cost_price),
    enabled: data.enabled,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// Update bundle (admin only)
export async function updateBundle(id: string, updates: Partial<Omit<Bundle, "id" | "createdAt">>): Promise<Bundle> {
  const supabase = client();

  const { data, error } = await supabase
    .from("bundles")
    .update({
      ...updates,
      cost_price: updates.costPrice,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // Not found
      throw new Error("Bundle not found");
    }
    throw new Error(`Failed to update bundle: ${error.message}`);
  }

  return {
    id: data.id,
    network: data.network,
    name: data.name,
    volume: data.volume,
    validity: data.validity,
    pricing: data.pricing,
    costPrice: parseFloat(data.cost_price),
    enabled: data.enabled,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// Delete bundle (admin only)
export async function deleteBundle(id: string): Promise<void> {
  const supabase = client();

  const { error } = await supabase
    .from("bundles")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete bundle: ${error.message}`);
  }
}

// Get all bundles (including disabled ones for admin)
export async function getAllBundles(): Promise<Bundle[]> {
  const supabase = client();

  const { data, error } = await supabase
    .from("bundles")
    .select("*")
    .order("network", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to get bundles: ${error.message}`);
  }

  return (data || []).map(bundle => ({
    id: bundle.id,
    network: bundle.network,
    name: bundle.name,
    volume: bundle.volume,
    validity: bundle.validity,
    pricing: bundle.pricing,
    costPrice: parseFloat(bundle.cost_price),
    enabled: bundle.enabled,
    createdAt: bundle.created_at,
    updatedAt: bundle.updated_at,
  }));
}

// Get enabled bundles only (for public API)
export async function getEnabledBundles(): Promise<Bundle[]> {
  const supabase = client();

  const { data, error } = await supabase
    .from("bundles")
    .select("*")
    .eq("enabled", true)
    .order("network", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to get enabled bundles: ${error.message}`);
  }

  return (data || []).map(bundle => ({
    id: bundle.id,
    network: bundle.network,
    name: bundle.name,
    volume: bundle.volume,
    validity: bundle.validity,
    pricing: bundle.pricing,
    costPrice: parseFloat(bundle.cost_price),
    enabled: bundle.enabled,
    createdAt: bundle.created_at,
    updatedAt: bundle.updated_at,
  }));
}

// Get bundles by network
export async function getBundlesByNetwork(network: Network): Promise<Bundle[]> {
  const supabase = client();

  const { data, error } = await supabase
    .from("bundles")
    .select("*")
    .eq("network", network)
    .eq("enabled", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to get bundles by network: ${error.message}`);
  }

  return (data || []).map(bundle => ({
    id: bundle.id,
    network: bundle.network,
    name: bundle.name,
    volume: bundle.volume,
    validity: bundle.validity,
    pricing: bundle.pricing,
    costPrice: parseFloat(bundle.cost_price),
    enabled: bundle.enabled,
    createdAt: bundle.created_at,
    updatedAt: bundle.updated_at,
  }));
}

// Get bundle by ID
export async function getBundleById(bundleId: string): Promise<Bundle | null> {
  const supabase = client();

  const { data, error } = await supabase
    .from("bundles")
    .select("*")
    .eq("id", bundleId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // Not found
      return null;
    }
    throw new Error(`Failed to get bundle: ${error.message}`);
  }

  return {
    id: data.id,
    network: data.network,
    name: data.name,
    volume: data.volume,
    validity: data.validity,
    pricing: data.pricing,
    costPrice: parseFloat(data.cost_price),
    enabled: data.enabled,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// Get price for user role
export function getPriceForRole(bundle: Bundle, userRole: UserRole): number {
  return bundle.pricing[userRole] || bundle.pricing.USER;
}
