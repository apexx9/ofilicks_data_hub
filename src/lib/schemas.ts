import { z } from 'zod';

// User roles
export const UserRole = z.enum(['USER', 'AGENT', 'DEALER', 'ADMIN']);
export type UserRole = z.infer<typeof UserRole>;

// User schema
export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: UserRole,
  createdAt: z.string(),
});
export type User = z.infer<typeof UserSchema>;

// Wallet schema
export const WalletSchema = z.object({
  id: z.string(),
  userId: z.string(),
  balance: z.number().min(0),
  updatedAt: z.string(),
});
export type Wallet = z.infer<typeof WalletSchema>;

// Transaction types
export const TransactionType = z.enum(['CREDIT', 'DEBIT']);
export type TransactionType = z.infer<typeof TransactionType>;

// Transaction schema
export const TransactionSchema = z.object({
  id: z.string(),
  walletId: z.string(),
  userId: z.string(),
  type: TransactionType,
  amount: z.number(),
  description: z.string(),
  balanceAfter: z.number(),
  createdAt: z.string(),
});
export type Transaction = z.infer<typeof TransactionSchema>;

// Network types
export const Network = z.enum(['MTN', 'AT_ISHARE', 'AT_BIGTIME', 'TELECEL']);
export type Network = z.infer<typeof Network>;

// Role-based pricing
export const RolePricingSchema = z.object({
  USER: z.number(),
  AGENT: z.number(),
  DEALER: z.number(),
});
export type RolePricing = z.infer<typeof RolePricingSchema>;

// Data bundle schema
export const DataBundleSchema = z.object({
  id: z.string(),
  network: Network,
  name: z.string(),
  dataAmount: z.string(), // e.g., "1GB", "5GB"
  validity: z.string(), // e.g., "30 days"
  pricing: RolePricingSchema,
  enabled: z.boolean(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DataBundle = z.infer<typeof DataBundleSchema>;

// Purchase status
export const PurchaseStatus = z.enum(['PENDING', 'COMPLETED', 'FAILED']);
export type PurchaseStatus = z.infer<typeof PurchaseStatus>;

// Purchase schema
export const PurchaseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  bundleId: z.string(),
  phoneNumber: z.string(),
  amount: z.number(),
  network: Network,
  status: PurchaseStatus,
  bundleName: z.string(),
  dataAmount: z.string(),
  createdAt: z.string(),
  completedAt: z.string().optional(),
  failureReason: z.string().optional(),
});
export type Purchase = z.infer<typeof PurchaseSchema>;

// API Provider schema
export const APIProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  isActive: z.boolean(),
  priority: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type APIProvider = z.infer<typeof APIProviderSchema>;

// Form validation schemas
export const SignupFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type SignupForm = z.infer<typeof SignupFormSchema>;

export const LoginFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginForm = z.infer<typeof LoginFormSchema>;

export const FundWalletFormSchema = z.object({
  amount: z.number().min(1, 'Amount must be at least 1'),
});
export type FundWalletForm = z.infer<typeof FundWalletFormSchema>;

export const PurchaseDataFormSchema = z.object({
  bundleId: z.string().min(1, 'Please select a bundle'),
  phoneNumber: z.string()
    .regex(/^0[0-9]{9}$/, 'Phone number must be 10 digits starting with 0'),
});
export type PurchaseDataForm = z.infer<typeof PurchaseDataFormSchema>;

export const CreateBundleFormSchema = z.object({
  network: Network,
  name: z.string().min(1, 'Name is required'),
  dataAmount: z.string().min(1, 'Data amount is required'),
  validity: z.string().min(1, 'Validity is required'),
  userPrice: z.number().min(0, 'User price must be positive'),
  agentPrice: z.number().min(0, 'Agent price must be positive'),
  dealerPrice: z.number().min(0, 'Dealer price must be positive'),
  description: z.string().optional(),
});
export type CreateBundleForm = z.infer<typeof CreateBundleFormSchema>;
