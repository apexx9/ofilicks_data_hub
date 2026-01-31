import { projectId, publicAnonKey } from '../../utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c20c3ad2`;

export type UserRole = "USER" | "AGENT" | "DEALER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

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
  reference?: string; // Payment reference or order ID
  createdAt: string;
}

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
  volume: string;
  validity: string;
  pricing: BundlePricing;
  costPrice: number;
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
}

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
  costPrice: number;
  profit: number;
  status: OrderStatus;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface ApiProvider {
  id: string;
  name: string;
  type: "DATA4UGH" | "GODLYDATA" | "SIMULATED";
  priority: number;
  isActive: boolean;
  apiKey?: string;
  costPrice?: number; // Cost price for data/airtime
  sellingPrice?: number; // Selling price to customers
  margin?: number; // Profit margin percentage
  createdAt: string;
  updatedAt?: string;
}

class ApiClient {
  private getHeaders(includeAuth: boolean = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } else {
      headers['Authorization'] = `Bearer ${publicAnonKey}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth: boolean = false
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = this.getHeaders(requireAuth);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Auth
  async signup(email: string, password: string, name: string, role: UserRole = "USER") {
    return this.request<{ success: boolean; user: User }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, role }),
    });
  }

  async signin(email: string, password: string) {
    return this.request<{ success: boolean; accessToken: string }>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getCurrentUser() {
    return this.request<{ success: boolean; user: User }>('/auth/me', {}, true);
  }

  // Wallet
  async getWallet() {
    return this.request<{ success: boolean; wallet: Wallet }>('/wallet', {}, true);
  }

  async addFunds(amount: number) {
    return this.request<{ success: boolean; wallet: Wallet; transaction: Transaction }>(
      '/wallet/fund',
      {
        method: 'POST',
        body: JSON.stringify({ amount }),
      },
      true
    );
  }

  async getTransactions() {
    return this.request<{ success: boolean; transactions: Transaction[] }>(
      '/transactions',
      {},
      true
    );
  }

  // Bundles
  async getBundles() {
    return this.request<{ success: boolean; bundles: Bundle[] }>('/bundles');
  }

  async getBundlesByNetwork(network: Network) {
    return this.request<{ success: boolean; bundles: Bundle[] }>(`/bundles/${network}`);
  }

  // Orders
  async createOrder(bundleId: string, phoneNumber: string) {
    return this.request<{ success: boolean; order: Order }>(
      '/orders',
      {
        method: 'POST',
        body: JSON.stringify({ bundleId, phoneNumber }),
      },
      true
    );
  }

  async getOrders() {
    return this.request<{ success: boolean; orders: Order[] }>('/orders', {}, true);
  }

  // Admin - Bundles
  async getAllBundles() {
    return this.request<{ success: boolean; bundles: Bundle[] }>(
      '/admin/bundles',
      {},
      true
    );
  }

  async createBundle(bundle: Omit<Bundle, 'id' | 'createdAt'>) {
    return this.request<{ success: boolean; bundle: Bundle }>(
      '/admin/bundles',
      {
        method: 'POST',
        body: JSON.stringify(bundle),
      },
      true
    );
  }

  async updateBundle(id: string, updates: Partial<Omit<Bundle, 'id' | 'createdAt'>>) {
    return this.request<{ success: boolean; bundle: Bundle }>(
      `/admin/bundles/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      },
      true
    );
  }

  async deleteBundle(id: string) {
    return this.request<{ success: boolean }>(`/admin/bundles/${id}`, {
      method: 'DELETE',
    }, true);
  }

  async resetBundles() {
    return this.request<{ success: boolean; message: string }>(
      '/admin/reset-bundles',
      {
        method: 'POST',
      },
      true
    );
  }

  // Admin - Users
  async getAllUsers() {
    return this.request<{ success: boolean; users: User[] }>(
      '/admin/users',
      {},
      true
    );
  }

  async updateUserRole(userId: string, role: UserRole) {
    return this.request<{ success: boolean; user: User }>(
      `/admin/users/${userId}/role`,
      {
        method: 'PUT',
        body: JSON.stringify({ role }),
      },
      true
    );
  }

  // Admin - Orders
  async getAllOrders() {
    return this.request<{ success: boolean; orders: Order[] }>(
      '/admin/orders',
      {},
      true
    );
  }

  // Admin - Transactions
  async getAllTransactions() {
    return this.request<{ success: boolean; transactions: Transaction[] }>(
      '/admin/transactions',
      {},
      true
    );
  }

  // Admin - Providers
  async getAllProviders() {
    return this.request<{ success: boolean; providers: ApiProvider[] }>(
      '/admin/providers',
      {},
      true
    );
  }

  async createProvider(name: string, type: string, priority: number, apiKey?: string): Promise<{ success: boolean; provider: ApiProvider }> {
    const response = await fetch(`${API_BASE_URL}/admin/providers`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify({ name, type, priority, apiKey }),
    });
    if (!response.ok) throw new Error('Failed to create provider');
    return response.json();
  }

  async updateProvider(id: string, updates: Partial<Omit<ApiProvider, 'id' | 'createdAt'>>) {
    return this.request<{ success: boolean; provider: ApiProvider }>(
      `/admin/providers/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      },
      true
    );
  }

  async setActiveProvider(id: string) {
    return this.request<{ success: boolean; provider: ApiProvider }>(
      `/admin/providers/${id}/activate`,
      {
        method: 'POST',
      },
      true
    );
  }

  // Admin - Revenue
  async getRevenue() {
    return this.request<{
      success: boolean;
      stats: {
        totalOrders: number;
        totalVolume: number;
        totalCost: number;
        totalProfit: number;
        providerBalance: number;
      }
    }>('/admin/revenue', {}, true);
  }

  async withdraw(amount: number, recipientCode: string) {
    return this.request<{
      success: boolean;
      message: string;
      withdrawal: any;
    }>('/admin/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount, recipientCode }),
    }, true);
  }
}

export const api = new ApiClient();
