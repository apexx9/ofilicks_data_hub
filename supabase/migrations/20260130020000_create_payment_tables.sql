-- Create proper payment tables for production use

-- Payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('MOBILE_MONEY', 'CARD', 'BANK_TRANSFER')),
  network TEXT CHECK (network IN ('MTN', 'TELECEL', 'AIRTELTIGO')),
  phone_number TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  refund_reference TEXT
);

-- Payment providers configuration table
CREATE TABLE IF NOT EXISTS payment_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('PAYSTACK', 'HUBTEL', 'VTPASS', 'INTERNAL')),
  is_active BOOLEAN DEFAULT true,
  config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON payment_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at);

-- Enable Row Level Security
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_providers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own payments" 
  ON payment_transactions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments" 
  ON payment_transactions FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM kv_store_c20c3ad2 
    WHERE key = 'user:' || auth.uid() 
    AND (value->>'role') = 'ADMIN'
  ));

CREATE POLICY "Admins can manage providers" 
  ON payment_providers FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM kv_store_c20c3ad2 
    WHERE key = 'user:' || auth.uid() 
    AND (value->>'role') = 'ADMIN'
  ));

-- Insert default payment providers
INSERT INTO payment_providers (name, provider_type, config) VALUES
  ('Paystack', 'PAYSTACK', '{"public_key": "pk_test_", "secret_key": "sk_test_"}'),
  ('Hubtel', 'HUBTEL', '{"client_id": "", "client_secret": ""}'),
  ('VTPass', 'VTPASS', '{"username": "", "password": "", "api_key": ""}')
ON CONFLICT (name) DO NOTHING;