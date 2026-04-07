-- Backward-compatible fix: ensure wallet transaction type check includes RETURN_REFUND_DEBIT,
-- and remove legacy order-level uniqueness that blocks multiple return refund debits per order.

ALTER TABLE wallet_transactions
    DROP CONSTRAINT IF EXISTS uq_wallet_tx_order_type;

ALTER TABLE wallet_transactions
    DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

ALTER TABLE wallet_transactions
    ADD CONSTRAINT wallet_transactions_type_check
    CHECK (
        type IN (
            'CREDIT',
            'DEBIT',
            'WITHDRAWAL',
            'ESCROW_CREDIT',
            'ESCROW_RELEASE',
            'PAYOUT_DEBIT',
            'REFUND_DEBIT',
            'RETURN_REFUND_DEBIT'
        )
    );
