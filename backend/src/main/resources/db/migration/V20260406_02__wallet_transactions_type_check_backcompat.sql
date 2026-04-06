-- Align DB check constraint with current WalletTransaction.TransactionType enum.
-- Fixes runtime 500 when inserting ESCROW_CREDIT / ESCROW_RELEASE / PAYOUT_DEBIT / REFUND_DEBIT.

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
            'REFUND_DEBIT'
        )
    );

