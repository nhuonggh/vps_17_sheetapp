-- ==============================================
-- Service Activations Migration
-- ==============================================
-- Purpose: Add support for service product activation tracking
-- Date: 2026-01-19
-- Author: AI Assistant
-- ==============================================

-- ==========================================
-- 1. Create service_activations table
-- ==========================================

CREATE TABLE IF NOT EXISTS service_activations (
  id BIGSERIAL PRIMARY KEY,
  
  -- Links
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  
  -- Service delivery tracking
  status TEXT NOT NULL DEFAULT 'pending',
  -- Status values: 'pending', 'in_progress', 'completed', 'cancelled'
  
  assigned_to UUID REFERENCES profiles(id), -- Admin/staff assigned to deliver service
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ, -- Scheduled delivery date/time
  started_at TIMESTAMPTZ,   -- When service work started
  completed_at TIMESTAMPTZ, -- When service was completed
  
  -- Communication
  notes TEXT, -- Internal admin notes about service delivery
  customer_notes TEXT, -- Notes from customer (requirements, preferences)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, product_id) -- Prevent duplicate activations for same user+product
);

-- Add comments for documentation
COMMENT ON TABLE service_activations IS 'Tracks service product activations and delivery status';
COMMENT ON COLUMN service_activations.status IS 'Service delivery status: pending, in_progress, completed, cancelled';
COMMENT ON COLUMN service_activations.assigned_to IS 'Staff member assigned to deliver this service';
COMMENT ON COLUMN service_activations.notes IS 'Internal notes for service delivery (admin only)';
COMMENT ON COLUMN service_activations.customer_notes IS 'Customer requirements and preferences';

-- ==========================================
-- 2. Create indexes for performance
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_service_activations_user_id 
  ON service_activations(user_id);

CREATE INDEX IF NOT EXISTS idx_service_activations_product_id 
  ON service_activations(product_id);

CREATE INDEX IF NOT EXISTS idx_service_activations_order_id 
  ON service_activations(order_id);

CREATE INDEX IF NOT EXISTS idx_service_activations_status 
  ON service_activations(status);

CREATE INDEX IF NOT EXISTS idx_service_activations_assigned_to 
  ON service_activations(assigned_to) 
  WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_activations_created_at 
  ON service_activations(created_at DESC);

-- Index for pending services (most commonly queried)
CREATE INDEX IF NOT EXISTS idx_service_activations_pending 
  ON service_activations(created_at DESC) 
  WHERE status = 'pending';

-- ==========================================
-- 3. Create service_updates table (timeline tracking)
-- ==========================================

CREATE TABLE IF NOT EXISTS service_updates (
  id BIGSERIAL PRIMARY KEY,
  service_activation_id BIGINT NOT NULL REFERENCES service_activations(id) ON DELETE CASCADE,
  
  update_type TEXT NOT NULL, 
  -- Values: 'status_change', 'note_added', 'file_uploaded', 'scheduled', 'assigned'
  
  message TEXT NOT NULL, -- Human-readable update message
  metadata JSONB, -- Extra data (old_status, new_status, file_urls, etc)
  
  created_by UUID REFERENCES profiles(id), -- Who made this update
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE service_updates IS 'Timeline of updates for service activations';
COMMENT ON COLUMN service_updates.update_type IS 'Type of update: status_change, note_added, file_uploaded, scheduled, assigned';

-- Index for timeline queries
CREATE INDEX IF NOT EXISTS idx_service_updates_activation_id 
  ON service_updates(service_activation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_updates_created_by 
  ON service_updates(created_by);

-- ==========================================
-- 4. Row Level Security (RLS) Policies
-- ==========================================

-- Enable RLS
ALTER TABLE service_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_updates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotent reruns)
DROP POLICY IF EXISTS "Users can view own service activations" ON service_activations;
DROP POLICY IF EXISTS "Service role manages service activations" ON service_activations;
DROP POLICY IF EXISTS "Admins can manage service activations" ON service_activations;
DROP POLICY IF EXISTS "Assigned staff can view service activations" ON service_activations;

DROP POLICY IF EXISTS "Users can view own service updates" ON service_updates;
DROP POLICY IF EXISTS "Service role manages service updates" ON service_updates;
DROP POLICY IF EXISTS "Admins can manage service updates" ON service_updates;

-- Service Activations Policies

-- Policy 1: Users can view their own service activations
CREATE POLICY "Users can view own service activations"
ON service_activations FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: Service role can manage all (for API/webhook)
CREATE POLICY "Service role manages service activations"
ON service_activations FOR ALL
USING (true); -- Service role bypasses RLS

-- Policy 3: Admins can manage all service activations
CREATE POLICY "Admins can manage service activations"
ON service_activations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Policy 4: Assigned staff can view their assigned services
CREATE POLICY "Assigned staff can view service activations"
ON service_activations FOR SELECT
USING (auth.uid() = assigned_to);

-- Service Updates Policies

-- Policy 1: Users can view updates for their services
CREATE POLICY "Users can view own service updates"
ON service_updates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM service_activations 
    WHERE id = service_updates.service_activation_id 
    AND user_id = auth.uid()
  )
);

-- Policy 2: Service role can manage all
CREATE POLICY "Service role manages service updates"
ON service_updates FOR ALL
USING (true);

-- Policy 3: Admins can manage all
CREATE POLICY "Admins can manage service updates"
ON service_updates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- ==========================================
-- 5. Create function to auto-update updated_at
-- ==========================================

CREATE OR REPLACE FUNCTION update_service_activations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_service_activations_updated_at ON service_activations;

CREATE TRIGGER trigger_update_service_activations_updated_at
BEFORE UPDATE ON service_activations
FOR EACH ROW
EXECUTE FUNCTION update_service_activations_updated_at();

-- ==========================================
-- 6. Verification Queries
-- ==========================================

-- Check tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name IN ('service_activations', 'service_updates')
ORDER BY table_name;

-- Check indexes created
SELECT 
  indexname,
  tablename
FROM pg_indexes
WHERE tablename IN ('service_activations', 'service_updates')
ORDER BY tablename, indexname;

-- Check RLS enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('service_activations', 'service_updates');

-- Count policies
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('service_activations', 'service_updates')
GROUP BY tablename;

-- ==========================================
-- 7. Success Message
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Service Activations Migration Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Created tables:';
  RAISE NOTICE '  - service_activations (with 9 indexes)';
  RAISE NOTICE '  - service_updates (timeline tracking)';
  RAISE NOTICE '';
  RAISE NOTICE 'Configured:';
  RAISE NOTICE '  - Row Level Security (RLS) policies';
  RAISE NOTICE '  - Auto-update trigger for updated_at';
  RAISE NOTICE '  - Foreign key constraints';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Update lib/auto-enrollment.ts';
  RAISE NOTICE '  2. Test service activation flow';
  RAISE NOTICE '  3. Update email templates';
  RAISE NOTICE '';
END $$;

-- ==========================================
-- 8. Rollback Script (if needed)
-- ==========================================

/*
-- To rollback this migration:

DROP TRIGGER IF EXISTS trigger_update_service_activations_updated_at ON service_activations;
DROP FUNCTION IF EXISTS update_service_activations_updated_at();
DROP TABLE IF EXISTS service_updates CASCADE;
DROP TABLE IF EXISTS service_activations CASCADE;

-- Note: This will delete all service activation data!
*/
