-- =============================================
-- ADD PAYOS ORDERCODE AND PAYER INFORMATION
-- =============================================
-- Run this in Supabase SQL Editor

-- Step 1: Add orderCode to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payos_order_code bigint;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_payos_order_code 
ON orders(payos_order_code);

-- Step 2: Add payer information to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS payos_order_code bigint,
ADD COLUMN IF NOT EXISTS payer_bank_id text,
ADD COLUMN IF NOT EXISTS payer_bank_name text,
ADD COLUMN IF NOT EXISTS payer_account_number text,
ADD COLUMN IF NOT EXISTS payer_account_name text,
ADD COLUMN IF NOT EXISTS payment_datetime timestamptz;

-- Index for orderCode
CREATE INDEX IF NOT EXISTS idx_transactions_payos_order_code 
ON transactions(payos_order_code);

-- Step 3: Verify new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'payos_order_code';

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN ('payos_order_code', 'payer_bank_id', 'payer_bank_name', 
                     'payer_account_number', 'payer_account_name', 'payment_datetime')
ORDER BY column_name;
