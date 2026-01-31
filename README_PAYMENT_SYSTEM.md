# Ofilicks Data Hub Payment System

## 🎯 System Overview

This is a complete payment and airtime/data distribution system built for Ghana, featuring:

- **Mobile Money Integration** via Paystack (MTN, Vodafone, AirtelTigo)
- **Wallet Management** with secure transaction tracking
- **Airtime/Data APIs** integration (Hubtel, VTPass)
- **Admin Dashboard** for provider management and pricing
- **Automatic Refunds** for failed transactions
- **Transaction Safety** mechanisms to prevent double-spending

## 🏗️ Architecture

```
Frontend (React + TypeScript)
    ↓
API Layer (Supabase Edge Functions)
    ↓
Payment Processing (Paystack)
    ↓
Wallet System (KV Store)
    ↓
Airtime Providers (Hubtel/VTPass)
```

## 🔧 Key Components

### 1. Payment System (`src/lib/payments.ts`)
- Paystack Mobile Money integration
- Payment initialization and verification
- Webhook handling for payment confirmation
- Secure transaction processing

### 2. Wallet System (`supabase/functions/make-server-c20c3ad2/wallet.ts`)
- User wallet balance management
- Transaction history tracking
- Atomic fund operations
- Balance verification

### 3. Airtime Integration (`src/lib/airtime.ts`)
- Hubtel API integration
- VTPass API integration
- Provider switching capability
- Cost/Selling price management
- Automatic provider selection

### 4. Refund System (`src/lib/refund.ts`)
- Automatic refund processing
- Manual refund by admin
- Refund eligibility checking
- Transaction safety mechanisms

### 5. Admin Dashboard (`src/app/components/admin/AdminProvidersEnhanced.tsx`)
- Provider management
- Pricing configuration
- Margin calculation
- Priority settings

## 🚀 Setup Instructions

### 1. Environment Variables

Create `.env.local` file:

```env
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_key_here
VITE_PAYSTACK_SECRET_KEY=sk_test_your_key_here
VITE_HUBTEL_CLIENT_ID=your_hubtel_client_id
VITE_HUBTEL_CLIENT_SECRET=your_hubtel_client_secret
VITE_VTPASS_API_KEY=your_vtpass_api_key
VITE_VTPASS_EMAIL=your_vtpass_email
```

### 2. Paystack Configuration

1. Sign up at [Paystack](https://paystack.com)
2. Get your test/live API keys
3. Configure webhook URL: `https://your-domain.com/api/webhook/paystack`
4. Set webhook secret in Supabase environment variables

### 3. Airtime Provider Setup

#### Hubtel Setup:
1. Register at [Hubtel Developer Portal](https://developers.hubtel.com)
2. Get Client ID and Client Secret
3. Configure Mobile Money and Airtime APIs

#### VTPass Setup:
1. Register at [VTPass](https://www.vtpass.com)
2. Get API Key and Email
3. Fund your VTPass wallet

### 4. Supabase Configuration

1. Set up Supabase project
2. Add environment variables:
   - `PAYSTACK_WEBHOOK_SECRET`
   - `HUBTEL_CLIENT_ID`
   - `HUBTEL_CLIENT_SECRET`
   - `VTPASS_API_KEY`
   - `VTPASS_EMAIL`

## 💰 Payment Flow

### User Funding Wallet:
1. User clicks "Add Funds via MoMo"
2. Selects network (MTN/Vodafone/AirtelTigo)
3. Enters amount and phone number
4. Redirected to Paystack payment page
5. Completes Mobile Money payment
6. Webhook confirms payment
7. Wallet automatically credited

### Airtime/Data Purchase:
1. User selects bundle from available options
2. System checks wallet balance
3. Deducts amount from wallet
4. Calls active airtime provider API
5. If successful: delivers airtime/data
6. If failed: automatically refunds wallet

## 🛡️ Security Features

### Transaction Safety:
- **Atomic Operations**: Prevents partial transactions
- **Double-Spend Protection**: Lock mechanisms for concurrent operations
- **Input Validation**: Phone number and amount validation
- **Secure References**: Unique transaction IDs

### Refund Protection:
- **Automatic Refunds**: Failed purchases are refunded immediately
- **Refund Limits**: Configurable maximum refund amounts
- **Eligibility Checking**: Validates refund conditions
- **Audit Trail**: Complete refund history

## 📊 Admin Features

### Provider Management:
- Add/remove API providers
- Set priority levels
- Configure cost/selling prices
- Enable/disable providers
- View profit margins

### Transaction Monitoring:
- View all payments
- Track refund history
- Monitor provider performance
- Analyze profit margins

### Pricing Control:
- Set different prices for user roles
- Configure margins per provider
- Bulk price updates
- Real-time margin calculation

## 🧪 Testing

### Sandbox Testing:
1. Use Paystack test keys
2. Test with sandbox phone numbers
3. Verify webhook handling
4. Test refund scenarios

### Test Scenarios:
- ✅ Successful payment and wallet funding
- ✅ Failed payment handling
- ✅ Successful airtime purchase
- ✅ Failed airtime purchase with refund
- ✅ Concurrent transaction handling
- ✅ Insufficient balance scenarios
- ✅ Invalid phone number handling

## 🚨 Error Handling

### Payment Errors:
- Network timeouts
- Insufficient funds
- Invalid phone numbers
- Payment gateway issues

### Airtime Errors:
- Provider API downtime
- Invalid phone numbers
- Network coverage issues
- Balance deduction failures

### System Errors:
- Database connection issues
- Concurrent modification conflicts
- Validation failures
- Authentication errors

## 📈 Monitoring & Analytics

### Key Metrics:
- Payment success rate
- Airtime delivery success rate
- Average transaction value
- Refund frequency
- Provider performance
- Profit margins

### Logging:
- All transactions logged
- Error conditions recorded
- Performance metrics tracked
- Audit trails maintained

## 🔮 Future Enhancements

### Planned Features:
- [ ] Multi-currency support
- [ ] Advanced analytics dashboard
- [ ] SMS notifications
- [ ] Email receipts
- [ ] Bulk airtime distribution
- [ ] API rate limiting
- [ ] Advanced fraud detection
- [ ] Multi-provider load balancing

## 🆘 Support

For issues and questions:
1. Check the console logs for error details
2. Verify environment variables are set correctly
3. Test with sandbox credentials first
4. Contact support with transaction references

## 📝 License

This payment system is part of the Ofilicks Data Hub project.