package vn.edu.hcmuaf.fit.fashionstore.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@Order(20)
@ConditionalOnProperty(
        prefix = "app.migration.wallet-idempotency",
        name = "enabled",
        havingValue = "true",
        matchIfMissing = true
)
@RequiredArgsConstructor
public class WalletIdempotencySchemaMigration implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    @Transactional
    public void run(String... args) {
        if (!tableExists("public.wallet_transactions") || !tableExists("public.customer_wallet_transactions")) {
            log.warn("Skip wallet idempotency migration because wallet tables are not available yet.");
            return;
        }

        int duplicateVendorTxCount = countDuplicateVendorTransactions();
        if (duplicateVendorTxCount > 0) {
            throw new IllegalStateException(
                    "Cannot apply uq_wallet_tx_order_type because duplicate vendor wallet transactions already exist. " +
                            "Please clean duplicate (order_id, type) rows first."
            );
        }

        int duplicateCustomerTxCount = countDuplicateCustomerRefundTransactions();
        if (duplicateCustomerTxCount > 0) {
            throw new IllegalStateException(
                    "Cannot apply uq_customer_wallet_tx_return_type because duplicate customer refund transactions already exist. " +
                            "Please clean duplicate (return_request_id, type) rows first."
            );
        }

        ensureConstraint(
                "uq_wallet_tx_order_type",
                "ALTER TABLE wallet_transactions ADD CONSTRAINT uq_wallet_tx_order_type UNIQUE (order_id, type)"
        );
        ensureConstraint(
                "uq_customer_wallet_tx_return_type",
                "ALTER TABLE customer_wallet_transactions ADD CONSTRAINT uq_customer_wallet_tx_return_type UNIQUE (return_request_id, type)"
        );
        ensureWalletTransactionTypeCheckConstraint();

        log.info("Wallet constraints are ensured: uq_wallet_tx_order_type, uq_customer_wallet_tx_return_type, wallet_transactions_type_check");
    }

    private boolean tableExists(String qualifiedTableName) {
        Boolean exists = jdbcTemplate.queryForObject(
                "SELECT to_regclass(?) IS NOT NULL",
                Boolean.class,
                qualifiedTableName
        );
        return Boolean.TRUE.equals(exists);
    }

    private int countDuplicateVendorTransactions() {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM (
                    SELECT order_id, type
                    FROM wallet_transactions
                    WHERE order_id IS NOT NULL
                    GROUP BY order_id, type
                    HAVING COUNT(*) > 1
                ) dup
                """, Integer.class);
        return count == null ? 0 : count;
    }

    private int countDuplicateCustomerRefundTransactions() {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM (
                    SELECT return_request_id, type
                    FROM customer_wallet_transactions
                    WHERE return_request_id IS NOT NULL
                    GROUP BY return_request_id, type
                    HAVING COUNT(*) > 1
                ) dup
                """, Integer.class);
        return count == null ? 0 : count;
    }

    private void ensureConstraint(String constraintName, String ddl) {
        Boolean exists = jdbcTemplate.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = ?
                )
                """, Boolean.class, constraintName);
        if (Boolean.TRUE.equals(exists)) {
            return;
        }
        jdbcTemplate.execute(ddl);
    }

    private void ensureWalletTransactionTypeCheckConstraint() {
        jdbcTemplate.execute("ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check");
        jdbcTemplate.execute("""
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
                )
                """);
    }
}
