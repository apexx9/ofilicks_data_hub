import axios from 'axios';

// Airtime API configuration
const HUBTEL_BASE_URL = 'https://api.hubtel.com/v1';
const VTPASS_BASE_URL = 'https://www.vtpass.com/api';

interface AirtimeProvider {
  id: string;
  name: string;
  isActive: boolean;
  costPrice: number; // Cost from provider
  sellingPrice: number; // Price to customers
  margin: number; // Profit margin percentage
  apiUrl: string;
  credentials: {
    apiKey?: string;
    email?: string;
    userId?: string;
    password?: string;
  };
}

interface PurchaseRequest {
  userId: string;
  network: 'MTN' | 'TELECEL' | 'AIRTELTIGO' | 'AIRTELTIGO_ISHARE' | 'AIRTELTIGO_BIGTIME' | 'GLO';
  phoneNumber: string;
  amount: number;
  requestId: string;
}

interface PurchaseResponse {
  success: boolean;
  reference: string;
  status: 'success' | 'failed' | 'pending';
  message: string;
  costPrice?: number;
  sellingPrice?: number;
  profit?: number;
}

// Hubtel Airtime API
export class HubtelAirtime {
  private apiKey: string;
  private userId: string;
  private password: string;

  constructor(apiKey: string, userId: string, password: string) {
    this.apiKey = apiKey;
    this.userId = userId;
    this.password = password;
  }

  async purchaseAirtime(request: PurchaseRequest): Promise<PurchaseResponse> {
    try {
      const response = await axios.post(
        `${HUBTEL_BASE_URL}/merchantaccount/merchants/${this.userId}/sendairtime`,
        {
          recipient: request.phoneNumber,
          amount: request.amount,
          network: this.mapNetworkToHubtel(request.network)
        },
        {
          auth: {
            username: this.userId,
            password: this.password
          },
          headers: {
            'Authorization': `Basic ${btoa(`${this.userId}:${this.password}`)}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.status === 'Success') {
        return {
          success: true,
          reference: response.data.transactionId || request.requestId,
          status: 'success',
          message: 'Airtime purchase successful',
          costPrice: request.amount * 0.98, // 2% processing fee
          sellingPrice: request.amount,
          profit: request.amount * 0.02
        };
      } else {
        return {
          success: false,
          reference: request.requestId,
          status: 'failed',
          message: response.data?.message || 'Airtime purchase failed'
        };
      }
    } catch (error: any) {
      console.error('Hubtel airtime error:', error);
      return {
        success: false,
        reference: request.requestId,
        status: 'failed',
        message: error.response?.data?.message || error.message || 'Airtime purchase failed'
      };
    }
  }

  private mapNetworkToHubtel(network: string): string {
    const mapping: Record<string, string> = {
      'MTN': 'mtn',
      'TELECEL': 'vodafone',
      'AIRTELTIGO': 'airtel',
      'AIRTELTIGO_ISHARE': 'airtel',
      'AIRTELTIGO_BIGTIME': 'airtel',
      'GLO': 'glo'
    };
    return mapping[network] || 'mtn';
  }
}

// VTPass Airtime API
export class VTPassAirtime {
  private apiKey: string;
  private email: string;

  constructor(apiKey: string, email: string) {
    this.apiKey = apiKey;
    this.email = email;
  }

  async purchaseAirtime(request: PurchaseRequest): Promise<PurchaseResponse> {
    try {
      const response = await axios.post(
        `${VTPASS_BASE_URL}/pay`,
        {
          serviceID: this.mapNetworkToVTPass(request.network),
          phone: request.phoneNumber,
          amount: request.amount
        },
        {
          auth: {
            username: this.email,
            password: this.apiKey
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.code === '000') {
        return {
          success: true,
          reference: response.data.content?.transactions?.transactionId || request.requestId,
          status: 'success',
          message: 'Airtime purchase successful',
          costPrice: request.amount * 0.95, // 5% processing fee
          sellingPrice: request.amount,
          profit: request.amount * 0.05
        };
      } else {
        return {
          success: false,
          reference: request.requestId,
          status: 'failed',
          message: response.data?.response_description || 'Airtime purchase failed'
        };
      }
    } catch (error: any) {
      console.error('VTPass airtime error:', error);
      return {
        success: false,
        reference: request.requestId,
        status: 'failed',
        message: error.response?.data?.response_description || error.message || 'Airtime purchase failed'
      };
    }
  }

  private mapNetworkToVTPass(network: string): string {
    const mapping: Record<string, string> = {
      'MTN': 'mtn',
      'TELECEL': 'vod',
      'AIRTELTIGO': 'airtel',
      'AIRTELTIGO_ISHARE': 'airtel',
      'AIRTELTIGO_BIGTIME': 'airtel',
      'GLO': 'glo'
    };
    return mapping[network] || 'mtn';
  }
}

// Airtime Service Manager
export class AirtimeService {
  private providers: Map<string, { provider: HubtelAirtime | VTPassAirtime, config: AirtimeProvider }> = new Map();

  // Add provider configuration
  addProvider(config: AirtimeProvider) {
    let provider: HubtelAirtime | VTPassAirtime;

    if (config.name.toLowerCase().includes('hubtel')) {
      provider = new HubtelAirtime(
        config.credentials.apiKey || '',
        config.credentials.userId || '',
        config.credentials.password || ''
      );
    } else {
      provider = new VTPassAirtime(
        config.credentials.apiKey || '',
        config.credentials.email || ''
      );
    }

    this.providers.set(config.id, { provider, config });
  }

  // Get active provider for network
  getActiveProvider(network: string): { provider: HubtelAirtime | VTPassAirtime, config: AirtimeProvider } | null {
    // In a real implementation, you'd have logic to select the best provider
    // based on cost, reliability, etc.
    for (const [id, providerData] of this.providers) {
      if (providerData.config.isActive) {
        return providerData;
      }
    }
    return null;
  }

  // Purchase airtime with automatic provider selection
  async purchaseAirtime(request: PurchaseRequest): Promise<PurchaseResponse> {
    const providerData = this.getActiveProvider(request.network);

    if (!providerData) {
      return {
        success: false,
        reference: request.requestId,
        status: 'failed',
        message: 'No active airtime provider available'
      };
    }

    try {
      const result = await providerData.provider.purchaseAirtime(request);

      // Add pricing information
      if (result.success) {
        result.costPrice = providerData.config.costPrice;
        result.sellingPrice = providerData.config.sellingPrice;
        result.profit = (providerData.config.sellingPrice || 0) - (providerData.config.costPrice || 0);
      }

      return result;
    } catch (error: any) {
      return {
        success: false,
        reference: request.requestId,
        status: 'failed',
        message: error.message || 'Airtime purchase failed'
      };
    }
  }

  // Get all providers
  getAllProviders(): AirtimeProvider[] {
    return Array.from(this.providers.values()).map(p => p.config);
  }
}

// Initialize airtime service
export const airtimeService = new AirtimeService();

// Example provider configurations (to be loaded from environment or database)
export const DEFAULT_PROVIDERS: AirtimeProvider[] = [
  {
    id: 'hubtel-primary',
    name: 'Hubtel Primary',
    isActive: true,
    costPrice: 0,
    sellingPrice: 0,
    margin: 2,
    apiUrl: HUBTEL_BASE_URL,
    credentials: {
      userId: import.meta.env.VITE_HUBTEL_CLIENT_ID || '',
      password: import.meta.env.VITE_HUBTEL_CLIENT_SECRET || '',
      apiKey: import.meta.env.VITE_HUBTEL_CLIENT_ID || ''
    }
  },
  {
    id: 'vtpass-backup',
    name: 'VTPass Backup',
    isActive: false,
    costPrice: 0,
    sellingPrice: 0,
    margin: 5,
    apiUrl: VTPASS_BASE_URL,
    credentials: {
      email: import.meta.env.VITE_VTPASS_EMAIL || '',
      apiKey: import.meta.env.VITE_VTPASS_API_KEY || ''
    }
  }
];