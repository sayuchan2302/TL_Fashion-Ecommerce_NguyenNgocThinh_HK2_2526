-- Backward compatibility for environments where legacy vendor_wallets.balance
-- is still NOT NULL but application writes escrow columns.

ALTER TABLE vendor_wallets
    ADD COLUMN IF NOT EXISTS balance DECIMAL(19, 4);

-- Ensure existing rows have a valid legacy balance value.
UPDATE vendor_wallets
SET balance = COALESCE(available_balance, 0) + COALESCE(frozen_balance, 0)
WHERE balance IS NULL;

ALTER TABLE vendor_wallets
    ALTER COLUMN balance SET DEFAULT 0;

ALTER TABLE vendor_wallets
    ALTER COLUMN balance SET NOT NULL;

