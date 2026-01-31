import * as kv from "./kv_store.ts";
import type { UserRole } from "./auth.ts";

export type Network = "MTN" | "AIRTELTIGO_ISHARE" | "AIRTELTIGO_BIGTIME" | "TELECEL";

export interface BundlePricing {
  USER: number;
  AGENT: number;
  DEALER: number;
}

export interface Bundle {
  id: string;
  network: Network;
  name: string;
  volume: string; // e.g., "1GB", "5GB"
  validity: string; // e.g., "1 day", "7 days", "30 days"
  pricing: BundlePricing;
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Network display labels
export const NetworkLabels: Record<Network, { name: string; tagline: string }> = {
  MTN: { name: "MTN data bundles", tagline: "Fast • Reliable" },
  AIRTELTIGO_ISHARE: { name: "AT_iShare", tagline: "Instant • Cheap" },
  AIRTELTIGO_BIGTIME: { name: "AT_BigTime", tagline: "Affordable • Quick" },
  TELECEL: { name: "Telecel data bundles", tagline: "Available • Trusted" }
};

// Create bundle (admin only)
export async function createBundle(bundle: Omit<Bundle, "id" | "createdAt">) {
  const id = crypto.randomUUID();
  
  const newBundle: Bundle = {
    ...bundle,
    id,
    createdAt: new Date().toISOString()
  };

  await kv.set(`bundle:${id}`, newBundle);
  
  return newBundle;
}

// Update bundle (admin only)
export async function updateBundle(id: string, updates: Partial<Omit<Bundle, "id" | "createdAt">>) {
  const bundle = await kv.get(`bundle:${id}`);
  
  if (!bundle) {
    throw new Error("Bundle not found");
  }

  const updatedBundle = {
    ...bundle,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  await kv.set(`bundle:${id}`, updatedBundle);
  
  return updatedBundle as Bundle;
}

// Delete bundle (admin only)
export async function deleteBundle(id: string) {
  await kv.del(`bundle:${id}`);
}

// Get all bundles
export async function getAllBundles() {
  const bundles = await kv.getByPrefix("bundle:");
  return bundles as Bundle[];
}

// Get enabled bundles only
export async function getEnabledBundles() {
  const allBundles = await getAllBundles();
  return allBundles.filter(b => b.enabled);
}

// Get bundles by network
export async function getBundlesByNetwork(network: Network) {
  const allBundles = await getEnabledBundles();
  return allBundles.filter(b => b.network === network);
}

// Get bundle by ID
export async function getBundleById(id: string) {
  const bundle = await kv.get(`bundle:${id}`);
  return bundle as Bundle | null;
}

// Get price for user role
export function getPriceForRole(bundle: Bundle, role: UserRole): number {
  if (role === "ADMIN") {
    return bundle.pricing.USER; // Admin pays user price
  }
  return bundle.pricing[role];
}
