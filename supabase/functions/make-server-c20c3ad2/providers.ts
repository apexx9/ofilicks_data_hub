
// External API Providers Integration
import * as kv from "./kv_store.ts";

export interface ProviderResponse {
    success: boolean;
    message: string;
    orderReference?: string;
    providerReference?: string;
    status: "pending" | "success" | "failed";
    walletBalance?: number;
}

export interface ProviderBalance {
    success: boolean;
    balance: number;
}

// Data4UGH (EOnB) Provider Implementation
export class Data4UghProvider {
    private apiKey: string;
    private baseUrl = "https://hub.data4ugh.com/api/v1";

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async purchaseBundle(params: {
        network: string;
        recipient: string;
        capacity: number;
        reference: string;
    }): Promise<ProviderResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/placeOrder`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    network: params.network.toLowerCase(),
                    reference: params.reference,
                    recipient: params.recipient,
                    capacity: params.capacity
                })
            });

            // Data4UGH docs say it doesn't return a body on success, which is strange.
            // But we'll handle based on status code and any potential body.
            const status = response.status;
            if (status >= 200 && status < 300) {
                return {
                    success: true,
                    message: "Order placed successfully",
                    orderReference: params.reference,
                    status: "pending" // Initial status usually pending
                };
            }

            const errorBody = await response.text();
            return {
                success: false,
                message: `API Error (${status}): ${errorBody}`,
                status: "failed"
            };
        } catch (error: any) {
            return {
                success: false,
                message: `Connection Error: ${error.message}`,
                status: "failed"
            };
        }
    }

    async checkBalance(): Promise<ProviderBalance> {
        try {
            const response = await fetch(`${this.baseUrl}/walletBalance`, {
                headers: { "Authorization": `Bearer ${this.apiKey}` }
            });

            // Based on docs, checking if it returns a balance
            const data = await response.json();
            return {
                success: true,
                balance: parseFloat(data.balance || data.data?.balance || "0")
            };
        } catch (error) {
            return { success: false, balance: 0 };
        }
    }

    async checkOrderStatus(reference: string): Promise<string> {
        try {
            const response = await fetch(`${this.baseUrl}/checkOrderStatus/${reference}`, {
                headers: { "Authorization": `Bearer ${this.apiKey}` }
            });
            const data = await response.json();
            return data.status || "pending";
        } catch {
            return "pending";
        }
    }
}

// Godlydata Provider Implementation
export class GodlydataProvider {
    private apiKey: string;
    private baseUrl = "https://devapi.godlydatagh.com/api";

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async purchaseBundle(params: {
        networkReference: string;
        recipientPhone: string;
        capacityInGb: number;
        orderReference: string;
    }): Promise<ProviderResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/v1/purchaseBundle`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(params)
            });

            const data = await response.json();

            if (data.status === "success") {
                return {
                    success: true,
                    message: data.message,
                    orderReference: data.data?.orderReference,
                    status: data.data?.orderStatus || "pending",
                    walletBalance: data.data?.walletBalance
                };
            }

            return {
                success: false,
                message: data.message || "Unknown error",
                status: "failed"
            };
        } catch (error: any) {
            return {
                success: false,
                message: `Connection Error: ${error.message}`,
                status: "failed"
            };
        }
    }

    async checkBalance(): Promise<ProviderBalance> {
        try {
            const response = await fetch(`${this.baseUrl}/v1/checkWalletBalance`, {
                headers: { "Authorization": `Bearer ${this.apiKey}` }
            });
            const data = await response.json();
            return {
                success: data.status === "success",
                balance: parseFloat(data.data?.walletBalance || "0")
            };
        } catch (error) {
            return { success: false, balance: 0 };
        }
    }

    async checkOrderStatus(ref: string): Promise<string> {
        try {
            const response = await fetch(`${this.baseUrl}/v1/checkOrderStatus/${ref}`, {
                headers: { "Authorization": `Bearer ${this.apiKey}` }
            });
            const data = await response.json();
            return data.data?.orderStatus || "pending";
        } catch {
            return "pending";
        }
    }
}
