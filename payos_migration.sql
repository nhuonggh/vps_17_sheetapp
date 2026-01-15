-- ==========================================
-- PayOS Payment Integration - Database Schema Updates
-- ==========================================

-- 1. Update orders table to support PayOS payment links
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_link_id TEXT,
ADD COLUMN IF NOT EXISTS payment_url TEXT,
ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- Add index for payment_link_id lookups
CREATE INDEX IF NOT EXISTS idx_orders_payment_link_id ON orders(payment_link_id);

-- Add index for transaction_id lookups
CREATE INDEX IF NOT EXISTS idx_orders_transaction_id ON orders(transaction_id);

-- ==========================================
-- 2. Create transactions table for payment history
-- ==========================================

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES orders(order_id),
  
  -- PayOS data
  transaction_id TEXT UNIQUE NOT NULL,
  payment_link_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'VND',
  status TEXT NOT NULL, -- success, cancelled, pending
  
  -- Payment method info
  payment_method TEXT, -- QR, CARD, WALLET, BANK_TRANSFER
  bank_code TEXT,
  account_number TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,
  
  -- Raw webhook data (for debugging)
  webhook_data JSONB
);

-- Indexes for transactions table
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- ==========================================
-- 3. Update order status values
-- ==========================================

-- Status flow: pending -> paid -> completed
-- pending: Order created, waiting for payment
-- paid: Payment confirmed by PayOS webhook
-- cancelled: Payment cancelled or expired
-- completed: Order fulfilled by admin

-- ==========================================
-- 4. Row Level Security (RLS) Policies
-- ==========================================

-- Enable RLS on transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own transactions
CREATE POLICY IF NOT EXISTS "Users can view own transactions"
ON transactions FOR SELECT
USING (
  order_id IN (
    SELECT order_id FROM orders 
    WHERE user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Policy: Only admins can insert/update/delete transactions
-- (In production, this should be restricted to service role only)
CREATE POLICY IF NOT EXISTS "Service role can manage transactions"
ON transactions FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- ==========================================
-- 5. Helpful queries for testing
-- ==========================================

-- View all pending orders
-- SELECT order_id, user_email, total_amount, created_at 
-- FROM orders 
-- WHERE status = 'pending' 
-- ORDER BY created_at DESC;

-- View payment history with order details
-- SELECT 
--   t.transaction_id,
--   t.amount,
--   t.status,
--   t.paid_at,
--   o.order_id,
--   o.user_email,
--   o.user_name
-- FROM transactions t
-- JOIN orders o ON t.order_id = o.order_id
-- ORDER BY t.created_at DESC;

-- Check for stuck pending orders (older than 24h)
-- SELECT order_id, created_at, payment_expires_at
-- FROM orders
-- WHERE status = 'pending'
-- AND created_at < NOW() - INTERVAL '24 hours';
