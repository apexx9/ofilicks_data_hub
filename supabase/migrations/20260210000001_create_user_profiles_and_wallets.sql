-- Create proper user profiles and wallets tables to replace KV store
-- Migration: 20260210000001_create_user_profiles_and_wallets.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table (replaces KV store user data)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('USER', 'AGENT', 'DEALER', 'ADMIN')) DEFAULT 'USER',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallets table (replaces KV store wallet data)
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  version INTEGER NOT NULL DEFAULT 1, -- For optimistic locking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id) -- One wallet per user
);

-- Transactions table (replaces KV store transaction data)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  balance DECIMAL(10,2) NOT NULL CHECK (balance >= 0),
  description TEXT NOT NULL,
  reference TEXT, -- Payment reference or order ID
  order_id UUID, -- Will reference orders table
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'ADMIN'
  ));

-- RLS Policies for wallets
CREATE POLICY "Users can view their own wallet"
  ON wallets FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own wallet"
  ON wallets FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all wallets"
  ON wallets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'ADMIN'
  ));

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all transactions"
  ON transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'ADMIN'
  ));

-- Function to automatically create wallet and profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.user_profiles (id, email, name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', ''), 'USER');

  -- Create wallet
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0.00);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile and wallet
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function for atomic wallet balance updates with optimistic locking
CREATE OR REPLACE FUNCTION update_wallet_balance(
  p_user_id UUID,
  p_amount DECIMAL,
  p_description TEXT,
  p_reference TEXT DEFAULT NULL,
  p_expected_version INTEGER DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_new_balance DECIMAL;
  v_new_version INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Get wallet with row lock
  SELECT * INTO v_wallet
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;

  -- Check optimistic lock if version provided
  IF p_expected_version IS NOT NULL AND v_wallet.version != p_expected_version THEN
    RAISE EXCEPTION 'Concurrent modification detected. Please retry.';
  END IF;

  -- Calculate new balance
  v_new_balance := v_wallet.balance + p_amount;
  v_new_version := v_wallet.version + 1;

  -- Validate balance doesn't go negative
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  -- Update wallet
  UPDATE wallets
  SET balance = v_new_balance,
      version = v_new_version,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Create transaction record
  INSERT INTO transactions (user_id, wallet_id, type, amount, balance, description, reference)
  VALUES (
    p_user_id,
    v_wallet.id,
    CASE WHEN p_amount > 0 THEN 'CREDIT' ELSE 'DEBIT' END,
    ABS(p_amount),
    v_new_balance,
    p_description,
    p_reference
  )
  RETURNING id INTO v_transaction_id;

  -- Return result
  RETURN json_build_object(
    'success', true,
    'wallet_id', v_wallet.id,
    'new_balance', v_new_balance,
    'transaction_id', v_transaction_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
