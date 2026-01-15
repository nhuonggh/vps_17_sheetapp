-- RUN THIS IN SUPABASE SQL EDITOR
-- Or via: psql -h [host] -U postgres -d postgres -f payos_migration.sql

-- ==========================================
-- Check if columns already exist before adding
-- ==========================================

DO $$ 
BEGIN
    -- Add payment_link_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'payment_link_id'
    ) THEN
        ALTER TABLE orders ADD COLUMN payment_link_id TEXT;
    END IF;

    -- Add payment_url if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'payment_url'
    ) THEN
        ALTER TABLE orders ADD COLUMN payment_url TEXT;
    END IF;

    -- Add payment_expires_at if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'payment_expires_at'
    ) THEN
        ALTER TABLE orders ADD COLUMN payment_expires_at TIMESTAMP;
    END IF;

    -- Add paid_at if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'paid_at'
    ) THEN
        ALTER TABLE orders ADD COLUMN paid_at TIMESTAMP;
    END IF;

    -- Add transaction_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'transaction_id'
    ) THEN
        ALTER TABLE orders ADD COLUMN transaction_id TEXT;
    END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_orders_payment_link_id ON orders(payment_link_id);
CREATE INDEX IF NOT EXISTS idx_orders_transaction_id ON orders(transaction_id);

-- ==========================================
-- Create transactions table
-- ==========================================

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  
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
-- Row Level Security (RLS) Policies
-- ==========================================

-- Enable RLS on transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Service role can manage transactions" ON transactions;

-- Policy: Users can view their own transactions
-- NOTE: This assumes auth.users table and authenticated users
-- If you don't have auth yet, you can skip this or modify
CREATE POLICY "Users can view own transactions"
ON transactions FOR SELECT
USING (true); -- Temporarily allow all, change later when auth is implemented

-- Policy: Service role can manage transactions
CREATE POLICY "Service role can manage transactions"
ON transactions FOR ALL
USING (true); -- Temporarily allow all for service role

-- ==========================================
-- Verification Queries
-- ==========================================

-- Check if orders table has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name LIKE 'payment_%' OR column_name IN ('paid_at', 'transaction_id')
ORDER BY column_name;

-- Check if transactions table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'transactions';

-- Count existing records (should be 0 for new table)
SELECT COUNT(*) as transaction_count FROM transactions;

COMMENT ON TABLE transactions IS 'Payment transaction history from PayOS webhooks';
COMMENT ON COLUMN orders.payment_link_id IS 'PayOS payment link ID';
COMMENT ON COLUMN orders.payment_url IS 'PayOS checkout URL';
COMMENT ON COLUMN orders.paid_at IS 'Timestamp when payment was confirmed';
