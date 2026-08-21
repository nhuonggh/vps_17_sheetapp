-- ==============================================
-- Add SePay payment code column to orders
-- ==============================================
-- Purpose: support SePay Webhook + VietQR as an alternate payment channel
-- (PAYMENT_PROVIDER=sepay). Mirrors payos_order_code — a short numeric code embedded in
-- the VietQR transfer content so the SePay webhook can match an incoming bank transfer
-- back to an order without relying on order_id's long random suffix.
-- Date: 2026-08-21
-- ==============================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS sepay_payment_code TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_sepay_payment_code
  ON orders(sepay_payment_code)
  WHERE sepay_payment_code IS NOT NULL;
