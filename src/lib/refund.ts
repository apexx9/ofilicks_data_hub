import axios from 'axios';

interface RefundRequest {
  transactionId: string;
  userId: string;
  amount: number;
  reason: string;
  reference: string;
}

interface RefundResponse {
  success: boolean;
  refundId: string;
  status: 'pending' | 'success' | 'failed';
  message: string;
  refundedAmount?: number;
  createdAt: string;
}

// Refund service for handling failed transactions
export class RefundService {
  private paystackSecretKey: string;

  constructor(paystackSecretKey: string) {
    this.paystackSecretKey = paystackSecretKey;
  }

  // Process automatic refund for failed airtime/data purchases
  async processAutomaticRefund(request: RefundRequest): Promise<RefundResponse> {
    try {
      console.log(`Processing automatic refund for transaction ${request.transactionId}`);
      
      // In a real implementation, you would:
      // 1. Verify the transaction exists and is eligible for refund
      // 2. Check if user still has sufficient wallet balance to cover refund
      // 3. Process the refund through Paystack or add funds back to wallet
      // 4. Update transaction records
      
      // Simulate refund processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 95% success rate for refunds
      const success = Math.random() > 0.05;
      
      if (success) {
        return {
          success: true,
          refundId: `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: 'success',
          message: `Successfully refunded GHS ${request.amount.toFixed(2)}`,
          refundedAmount: request.amount,
          createdAt: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          refundId: `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: 'failed',
          message: 'Refund processing failed. Please contact support.',
          createdAt: new Date().toISOString()
        };
      }
    } catch (error: any) {
      console.error('Refund processing error:', error);
      return {
        success: false,
        refundId: `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'failed',
        message: error.message || 'Refund processing failed',
        createdAt: new Date().toISOString()
      };
    }
  }

  // Manual refund by admin
  async processManualRefund(
    transactionId: string,
    amount: number,
    reason: string,
    adminId: string
  ): Promise<RefundResponse> {
    try {
      // Validate admin permissions (would be implemented in backend)
      console.log(`Admin ${adminId} processing manual refund for ${transactionId}`);
      
      // Process refund
      const result = await this.processAutomaticRefund({
        transactionId,
        userId: 'user_id_placeholder',
        amount,
        reason,
        reference: `manual_refund_${transactionId}`
      });
      
      // Log admin action
      console.log(`Admin refund processed: ${JSON.stringify(result)}`);
      
      return result;
    } catch (error: any) {
      console.error('Manual refund error:', error);
      throw error;
    }
  }

  // Check refund eligibility
  async isRefundEligible(transactionId: string): Promise<{
    eligible: boolean;
    reason?: string;
    maxRefundAmount?: number;
  }> {
    // In a real implementation, check:
    // - Transaction age (e.g., within 24 hours)
    // - Transaction status
    // - Previous refund attempts
    // - User account status
    
    return {
      eligible: true,
      maxRefundAmount: 1000, // Example limit
      reason: 'Eligible for refund'
    };
  }

  // Get refund history for user
  async getUserRefundHistory(userId: string): Promise<RefundResponse[]> {
    // In a real implementation, fetch from database
    return [];
  }

  // Get all refunds (admin only)
  async getAllRefunds(): Promise<RefundResponse[]> {
    // In a real implementation, fetch from database
    return [];
  }
}

// Initialize refund service
export const refundService = new RefundService(
  import.meta.env.VITE_PAYSTACK_SECRET_KEY || 'sk_test_placeholder'
);

// Transaction safety utilities
export class TransactionSafety {
  // Prevent double spending with atomic operations
  static async withTransactionLock<T>(
    lockKey: string,
    operation: () => Promise<T>
  ): Promise<T> {
    // In a real implementation, you'd use Redis or database locks
    // This is a simplified version
    const lockId = `lock:${lockKey}`;
    
    try {
      // Check if lock exists
      const existingLock = localStorage.getItem(lockId);
      if (existingLock) {
        const lockTime = parseInt(existingLock);
        const now = Date.now();
        
        // If lock is less than 30 seconds old, reject
        if (now - lockTime < 30000) {
          throw new Error('Transaction in progress. Please try again.');
        }
      }
      
      // Set lock
      localStorage.setItem(lockId, Date.now().toString());
      
      // Execute operation
      const result = await operation();
      
      return result;
    } finally {
      // Release lock
      localStorage.removeItem(lockId);
    }
  }

  // Validate transaction amounts
  static validateAmount(amount: number): { valid: boolean; error?: string } {
    if (amount <= 0) {
      return { valid: false, error: 'Amount must be positive' };
    }
    
    if (amount > 10000) {
      return { valid: false, error: 'Amount exceeds maximum limit of GHS 10,000' };
    }
    
    if (!Number.isFinite(amount)) {
      return { valid: false, error: 'Invalid amount' };
    }
    
    return { valid: true };
  }

  // Validate phone number format
  static validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length !== 10) {
      return { valid: false, error: 'Phone number must be 10 digits' };
    }
    
    if (!/^0[2-5]\d{8}$/.test(cleanPhone)) {
      return { valid: false, error: 'Invalid Ghana phone number format' };
    }
    
    return { valid: true };
  }

  // Generate secure transaction reference
  static generateReference(prefix: string = 'txn'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Verify transaction integrity
  static verifyTransaction(transaction: any): { valid: boolean; error?: string } {
    // Check required fields
    const requiredFields = ['userId', 'amount', 'type'];
    for (const field of requiredFields) {
      if (!transaction[field]) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }
    
    // Validate amount
    const amountValidation = this.validateAmount(transaction.amount);
    if (!amountValidation.valid) {
      return amountValidation;
    }
    
    // Validate phone number if present
    if (transaction.phoneNumber) {
      const phoneValidation = this.validatePhoneNumber(transaction.phoneNumber);
      if (!phoneValidation.valid) {
        return phoneValidation;
      }
    }
    
    return { valid: true };
  }
}

// Example usage:
/*
const refundResult = await refundService.processAutomaticRefund({
  transactionId: 'txn_12345',
  userId: 'user_123',
  amount: 50.00,
  reason: 'Airtime purchase failed',
  reference: 'ref_12345'
});

const validation = TransactionSafety.validateAmount(25.50);
if (validation.valid) {
  // Proceed with transaction
}
*/