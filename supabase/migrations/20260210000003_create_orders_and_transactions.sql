-- Create orders and transaction processing tables
-- Migration: 20260210000003_create_orders_and_transactions.sql

-- Orders table (replaces KV store order data)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  bundle_id UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL CHECK (length(phone_number) >= 10),
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED')) DEFAULT 'PENDING',
  transaction_id UUID REFERENCES transactions(id), -- Link to payment transaction
  api_provider_id UUID REFERENCES api_providers(id), -- Which API provider processed it
  external_reference TEXT, -- Reference from external API
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order logs table for tracking order processing steps
CREATE TABLE IF NOT EXISTS order_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'CREATED', 'PAYMENT_DEDUCTED', 'API_REQUEST_SENT', 'API_RESPONSE_RECEIVED', 'COMPLETED', 'FAILED', 'REFUNDED'
  details JSONB, -- Additional details about the action
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_bundle_id ON orders(bundle_id);
CREATE INDEX IF NOT EXISTS idx_orders_transaction_id ON orders(transaction_id);
CREATE INDEX IF NOT EXISTS idx_order_logs_order_id ON order_logs(order_id);

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'ADMIN'
  ));

CREATE POLICY "Admins can update order status"
  ON orders FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'ADMIN'
  ));

-- RLS Policies for order_logs
CREATE POLICY "Users can view logs for their own orders"
  ON order_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_logs.order_id AND o.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all order logs"
  ON order_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'ADMIN'
  ));

-- Function to process data bundle order with atomic transaction
CREATE OR REPLACE FUNCTION process_bundle_order(
  p_user_id UUID,
  p_bundle_id UUID,
  p_phone_number TEXT,
  p_expected_wallet_version INTEGER DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_bundle bundles%ROWTYPE;
  v_user_profile user_profiles%ROWTYPE;
  v_price DECIMAL;
  v_wallet_update_result JSON;
  v_transaction_id UUID;
  v_order_id UUID;
  v_api_provider api_providers%ROWTYPE;
BEGIN
  -- Get user profile
  SELECT * INTO v_user_profile
  FROM user_profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Get bundle
  SELECT * INTO v_bundle
  FROM bundles
  WHERE id = p_bundle_id AND enabled = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bundle not found or disabled';
  END IF;

  -- Get price for user role
  v_price := (v_bundle.pricing->>v_user_profile.role)::DECIMAL;

  IF v_price IS NULL OR v_price <= 0 THEN
    RAISE EXCEPTION 'Invalid price for bundle and user role';
  END IF;

  -- Validate phone number format (basic validation)
  IF NOT (p_phone_number ~ '^(\+233|0)[0-9]{9}$') THEN
    RAISE EXCEPTION 'Invalid phone number format';
  END IF;

  -- Get active API provider
  SELECT * INTO v_api_provider
  FROM api_providers
  WHERE is_active = true
  ORDER BY priority ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active API provider configured';
  END IF;

  -- Deduct funds from wallet (atomic operation)
  SELECT update_wallet_balance(
    p_user_id,
    -v_price,
    format('Purchase: %s - %s to %s', v_bundle.name, v_bundle.volume, p_phone_number),
    NULL,
    p_expected_wallet_version
  ) INTO v_wallet_update_result;

  -- Extract transaction ID from result
  v_transaction_id := (v_wallet_update_result->>'transaction_id')::UUID;

  -- Create order record
  INSERT INTO orders (
    user_id,
    bundle_id,
    phone_number,
    price,
    status,
    transaction_id,
    api_provider_id
  )
  VALUES (
    p_user_id,
    p_bundle_id,
    p_phone_number,
    v_price,
    'PENDING',
    v_transaction_id,
    v_api_provider.id
  )
  RETURNING id INTO v_order_id;

  -- Log order creation
  INSERT INTO order_logs (order_id, action, details)
  VALUES (v_order_id, 'CREATED', jsonb_build_object(
    'bundle_name', v_bundle.name,
    'price', v_price,
    'phone_number', p_phone_number
  ));

  -- Log payment deduction
  INSERT INTO order_logs (order_id, action, details)
  VALUES (v_order_id, 'PAYMENT_DEDUCTED', v_wallet_update_result);

  -- Update order status to processing
  UPDATE orders
  SET status = 'PROCESSING', updated_at = NOW()
  WHERE id = v_order_id;

  -- Log processing start
  INSERT INTO order_logs (order_id, action, details)
  VALUES (v_order_id, 'PROCESSING_STARTED', jsonb_build_object(
    'api_provider', v_api_provider.name
  ));

  -- Return order ID for async processing
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'transaction_id', v_transaction_id,
    'amount_deducted', v_price,
    'api_provider', v_api_provider.name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete or fail an order
CREATE OR REPLACE FUNCTION complete_bundle_order(
  p_order_id UUID,
  p_success BOOLEAN,
  p_external_reference TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_refund_result JSON;
BEGIN
  -- Get order
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status NOT IN ('PROCESSING') THEN
    RAISE EXCEPTION 'Order is not in processing state';
  END IF;

  IF p_success THEN
    -- Mark order as successful
    UPDATE orders
    SET status = 'SUCCESS',
        external_reference = p_external_reference,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Log success
    INSERT INTO order_logs (order_id, action, details)
    VALUES (p_order_id, 'COMPLETED', jsonb_build_object(
      'external_reference', p_external_reference
    ));
  ELSE
    -- Mark order as failed
    UPDATE orders
    SET status = 'FAILED',
        error_message = p_error_message,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Refund the user
    SELECT update_wallet_balance(
      v_order.user_id,
      v_order.price,
      format('Refund: Order %s failed', p_order_id),
      format('refund_%s', p_order_id)
    ) INTO v_refund_result;

    -- Log failure and refund
    INSERT INTO order_logs (order_id, action, details)
    VALUES (p_order_id, 'FAILED', jsonb_build_object(
      'error_message', p_error_message,
      'refund_transaction', v_refund_result
    ));
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', CASE WHEN p_success THEN 'SUCCESS' ELSE 'FAILED' END,
    'refunded', NOT p_success
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
