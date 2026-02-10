-- Create bundles and data packages tables
-- Migration: 20260210000002_create_bundles_and_packages.sql

-- Bundles table (replaces KV store bundle data)
CREATE TABLE IF NOT EXISTS bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network TEXT NOT NULL CHECK (network IN ('MTN', 'AIRTELTIGO_ISHARE', 'AIRTELTIGO_BIGTIME', 'TELECEL')),
  name TEXT NOT NULL,
  volume TEXT NOT NULL,
  validity TEXT NOT NULL,
  pricing JSONB NOT NULL CHECK (
    jsonb_typeof(pricing) = 'object' AND
    pricing ? 'USER' AND pricing ? 'AGENT' AND pricing ? 'DEALER' AND
    (pricing->>'USER')::DECIMAL > 0 AND
    (pricing->>'AGENT')::DECIMAL > 0 AND
    (pricing->>'DEALER')::DECIMAL > 0
  ),
  cost_price DECIMAL(10,2) NOT NULL CHECK (cost_price > 0),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(network, name, volume) -- Prevent duplicate bundles
);

-- API Providers table (replaces KV store provider data)
CREATE TABLE IF NOT EXISTS api_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT false,
  config JSONB, -- API credentials and settings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bundles_network ON bundles(network);
CREATE INDEX IF NOT EXISTS idx_bundles_enabled ON bundles(enabled);
CREATE INDEX IF NOT EXISTS idx_api_providers_active ON api_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_api_providers_priority ON api_providers(priority);

-- Enable Row Level Security
ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_providers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bundles (public read for enabled bundles)
CREATE POLICY "Anyone can view enabled bundles"
  ON bundles FOR SELECT
  USING (enabled = true);

CREATE POLICY "Admins can manage bundles"
  ON bundles FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'ADMIN'
  ));

-- RLS Policies for api_providers
CREATE POLICY "Admins can manage api providers"
  ON api_providers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'ADMIN'
  ));

-- Insert default bundles
INSERT INTO bundles (network, name, volume, validity, pricing, cost_price, enabled) VALUES
  -- MTN Bundles
  ('MTN', 'MTN 1GB Daily', '1GB', '1 day', '{"USER": 2.50, "AGENT": 2.20, "DEALER": 2.00}', 1.80, true),
  ('MTN', 'MTN 5GB Weekly', '5GB', '7 days', '{"USER": 10.00, "AGENT": 9.00, "DEALER": 8.50}', 7.50, true),
  ('MTN', 'MTN 10GB Monthly', '10GB', '30 days', '{"USER": 20.00, "AGENT": 18.00, "DEALER": 17.00}', 15.00, true),

  -- AirtelTigo iShare
  ('AIRTELTIGO_ISHARE', 'AT iShare 1GB', '1GB', '1 day', '{"USER": 2.00, "AGENT": 1.80, "DEALER": 1.60}', 1.40, true),
  ('AIRTELTIGO_ISHARE', 'AT iShare 3GB', '3GB', '3 days', '{"USER": 5.00, "AGENT": 4.50, "DEALER": 4.20}', 3.50, true),

  -- AirtelTigo BigTime
  ('AIRTELTIGO_BIGTIME', 'AT BigTime 5GB', '5GB', '7 days', '{"USER": 9.50, "AGENT": 8.50, "DEALER": 8.00}', 6.50, true),
  ('AIRTELTIGO_BIGTIME', 'AT BigTime 10GB', '10GB', '30 days', '{"USER": 18.00, "AGENT": 16.50, "DEALER": 15.50}', 12.50, true),

  -- Telecel
  ('TELECEL', 'Telecel 1GB Daily', '1GB', '1 day', '{"USER": 2.30, "AGENT": 2.00, "DEALER": 1.80}', 1.60, true),
  ('TELECEL', 'Telecel 6GB Weekly', '6GB', '7 days', '{"USER": 11.00, "AGENT": 10.00, "DEALER": 9.50}', 8.00, true),
  ('TELECEL', 'Telecel 15GB Monthly', '15GB', '30 days', '{"USER": 25.00, "AGENT": 23.00, "DEALER": 21.50}', 18.00, true)
ON CONFLICT (network, name, volume) DO NOTHING;

-- Insert default API providers
INSERT INTO api_providers (name, priority, is_active, config) VALUES
  ('Primary API Provider', 1, false, '{"base_url": "", "api_key": "", "username": "", "password": ""}'),
  ('Backup API Provider', 2, false, '{"base_url": "", "api_key": "", "username": "", "password": ""}')
ON CONFLICT (name) DO NOTHING;
