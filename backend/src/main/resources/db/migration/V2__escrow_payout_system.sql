-- ============================================================
-- Escrow & Payout System: Database Migration Script
-- Run this BEFORE starting the application.
-- ============================================================

-- 1. Add new columns to vendor_wallets (with defaults for existing data)
ALTER TABLE vendor_wallets
    ADD COLUMN IF NOT EXISTS available_balance DECIMAL(19, 4) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS frozen_balance DECIMAL(19, 4) NOT NULL DEFAULT 0;

-- 2. Migrate existing balance -> available_balance (for backward compatibility)
UPDATE vendor_wallets
SET available_balance = balance
WHERE available_balance = 0 AND balance > 0;

-- 3. Drop old balance column AFTER confirming migration
-- NOTE: Uncomment ONLY after verifying all data migrated correctly
-- ALTER TABLE vendor_wallets DROP COLUMN IF EXISTS balance;

-- 4. Create payout_requests table
CREATE TABLE IF NOT EXISTS payout_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL,
    amount          DECIMAL(19, 4) NOT NULL,
    bank_account_name VARCHAR(255) NOT NULL,
    bank_account_number VARCHAR(50) NOT NULL,
    bank_name       VARCHAR(255) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    admin_note      TEXT,
    processed_by    UUID,
    processed_at    TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payout_store FOREIGN KEY (store_id) REFERENCES stores(id)
);

-- 5. Indexes for payout_requests
CREATE INDEX IF NOT EXISTS idx_payout_store ON payout_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_payout_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_created ON payout_requests(created_at);

-- 6. Verify indexes exist on orders table for analytics performance
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_store_created ON orders(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status_store ON orders(status, store_id, created_at);

-- 7. Verify wallet_transactions has new types (no schema change needed, ENUM is STRING)
-- Just confirm the column type is VARCHAR:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'wallet_transactions' AND column_name = 'type';

-- ============================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================

-- Check vendor_wallets structure
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'vendor_wallets'
ORDER BY ordinal_position;

-- Check payout_requests exists
SELECT COUNT(*) AS payout_request_count FROM payout_requests;

-- Check indexes on orders
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'orders'
  AND indexname LIKE 'idx_orders%'
ORDER BY indexname;

-- Check indexes on payout_requests
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'payout_requests'
ORDER BY indexname;

-- Verify no money is "lost": total = available + frozen for all wallets
SELECT id, store_id,
       available_balance,
       frozen_balance,
       (available_balance + frozen_balance) AS total,
       CASE WHEN (available_balance + frozen_balance) < 0 THEN 'ERROR: NEGATIVE' ELSE 'OK' END AS integrity_check
FROM vendor_wallets
WHERE (available_balance + frozen_balance) < 0;
