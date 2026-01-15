-- ==========================================
-- FIXED: PayOS Payment Integration - Database Schema Updates
-- ==========================================

-- BƯỚC 1: Check schema hiện tại của bảng orders
-- Chạy query này TRƯỚC để xem structure:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders';

-- ⬆️ Chạy query trên, xem kết quả, rồi tiếp tục bên dưới

-- ==========================================
-- BƯỚC 2: Update orders table
-- ==========================================

-- Nếu bảng orders chưa có, tạo mới:
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_phone TEXT,
  items JSONB NOT NULL,
  total_amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  
  -- PayOS fields
  payment_qr TEXT,
  payment_link_id TEXT,
  payment_url TEXT,
  payment_expires_at TIMESTAMP,
  paid_at TIMESTAMP,
  transaction_id TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Nếu bảng orders ĐÃ TỒN TẠI, chỉ thêm columns mới:
-- (Chạy từng dòng một, bỏ qua nếu column đã có)

ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_link_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- Nếu order_id chưa có constraint UNIQUE
ALTER TABLE orders ADD CONSTRAINT orders_order_id_key UNIQUE (order_id);

-- Add indexes for orders table
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_link_id ON orders(payment_link_id);
CREATE INDEX IF NOT EXISTS idx_orders_transaction_id ON orders(transaction_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ==========================================
-- BƯỚC 3: Create transactions table
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

-- Add foreign key constraint AFTER both tables exist
ALTER TABLE transactions 
  DROP CONSTRAINT IF EXISTS transactions_order_id_fkey;

ALTER TABLE transactions 
  ADD CONSTRAINT transactions_order_id_fkey 
  FOREIGN KEY (order_id) 
  REFERENCES orders(order_id) 
  ON DELETE CASCADE;

-- Indexes for transactions table
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- ==========================================
-- BƯỚC 4: Row Level Security (RLS) Policies
-- ==========================================

-- Enable RLS on transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions"
ON transactions FOR SELECT
USING (
  order_id IN (
    SELECT order_id FROM orders 
    WHERE user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Policy: Service role can manage transactions
DROP POLICY IF EXISTS "Service role can manage transactions" ON transactions;
CREATE POLICY "Service role can manage transactions"
ON transactions FOR ALL
USING (true); -- Service role bypasses RLS anyway

-- ==========================================
-- BƯỚC 5: Verification queries
-- ==========================================

-- Check orders table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name IN ('order_id', 'payment_link_id', 'payment_url');

-- Check transactions table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'transactions';

-- Check indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('orders', 'transactions')
ORDER BY tablename, indexname;
