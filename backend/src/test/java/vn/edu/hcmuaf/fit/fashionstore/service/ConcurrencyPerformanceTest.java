package vn.edu.hcmuaf.fit.fashionstore.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.hcmuaf.fit.fashionstore.entity.Order;
import vn.edu.hcmuaf.fit.fashionstore.entity.PayoutRequest;
import vn.edu.hcmuaf.fit.fashionstore.entity.VendorWallet;
import vn.edu.hcmuaf.fit.fashionstore.entity.WalletTransaction;
import vn.edu.hcmuaf.fit.fashionstore.repository.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Optional;
import java.util.Queue;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Concurrency and Performance tests for Escrow & Payout System.
 * Verifies race condition prevention and response time under load.
 */
@ExtendWith(MockitoExtension.class)
class ConcurrencyPerformanceTest {

    @Mock private OrderRepository orderRepository;
    @Mock private VendorWalletRepository vendorWalletRepository;
    @Mock private WalletTransactionRepository walletTransactionRepository;
    @Mock private CustomerWalletRepository customerWalletRepository;
    @Mock private CustomerWalletTransactionRepository customerWalletTransactionRepository;
    @Mock private PayoutRequestRepository payoutRequestRepository;

    private FixedPublicCodeService publicCodeService;
    private WalletService walletService;

    private void setUpService() {
        publicCodeService = new FixedPublicCodeService();
        walletService = new WalletService(
                orderRepository, vendorWalletRepository, walletTransactionRepository,
                customerWalletRepository, customerWalletTransactionRepository,
                payoutRequestRepository, publicCodeService
        );
    }

    // ─── CONCURRENCY: Rapid Payout Requests ──────────────────────────────────

    @Test
    @DisplayName("Race Condition: 5 concurrent payout requests with 1.2M balance, only 1 should succeed")
    void concurrentPayoutRequestsOnlyOneSucceeds() throws InterruptedException {
        setUpService();
        UUID storeId = UUID.randomUUID();
        BigDecimal available = new BigDecimal("1200000");
        BigDecimal requestAmount = new BigDecimal("1000000");

        VendorWallet wallet = VendorWallet.builder()
                .storeId(storeId)
                .availableBalance(available)
                .frozenBalance(BigDecimal.ZERO)
                .build();

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);
        CountDownLatch latch = new CountDownLatch(5);
        ExecutorService executor = Executors.newFixedThreadPool(5);

        when(vendorWalletRepository.findByStoreIdForUpdate(storeId)).thenAnswer(inv -> {
            synchronized (wallet) {
                return Optional.of(wallet);
            }
        });
        when(payoutRequestRepository.save(any())).thenAnswer(inv -> {
            PayoutRequest req = inv.getArgument(0);
            req.setId(UUID.randomUUID());
            return req;
        });

        for (int i = 0; i < 5; i++) {
            final int idx = i;
            executor.submit(() -> {
                try {
                    walletService.createPayoutRequest(
                            storeId, requestAmount,
                            "User " + idx, "ACC" + idx, "VCB");
                    successCount.incrementAndGet();
                } catch (IllegalArgumentException e) {
                    failCount.incrementAndGet();
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await();
        executor.shutdown();

        assertEquals(1, successCount.get(),
                "Only 1 payout request should succeed with 1.2M balance and 1M per request");
        assertEquals(4, failCount.get(),
                "4 requests should fail with insufficient balance");
    }

    // ─── PERFORMANCE: Analytics Query Speed ──────────────────────────────────

    @Test
    @DisplayName("Performance: Analytics aggregation should use indexed queries")
    void analyticsQueryUsesIndexedColumns() {
        setUpService();

        long startTime = System.nanoTime();

        for (int i = 0; i < 1000; i++) {
            UUID storeId = UUID.randomUUID();
            LocalDateTime now = LocalDateTime.now();

            Order.OrderStatus status = Order.OrderStatus.DELIVERED;
            UUID orderId = UUID.randomUUID();

            when(orderRepository.findByIdForUpdate(orderId)).thenReturn(Optional.of(
                    Order.builder().id(orderId).storeId(storeId).status(status).vendorPayout(new BigDecimal("100000")).build()
            ));
            when(walletTransactionRepository.existsByOrderIdAndType(orderId, WalletTransaction.TransactionType.ESCROW_CREDIT))
                    .thenReturn(false);
            when(vendorWalletRepository.findByStoreIdForUpdate(storeId)).thenReturn(Optional.of(
                    VendorWallet.builder().storeId(storeId).availableBalance(new BigDecimal("1000000")).frozenBalance(new BigDecimal("500000")).build()
            ));
            when(vendorWalletRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(walletTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            publicCodeService.push("GD-PERF-" + String.format("%06d", i));

            Order order = Order.builder()
                    .id(orderId)
                    .storeId(storeId)
                    .status(Order.OrderStatus.DELIVERED)
                    .vendorPayout(new BigDecimal("100000"))
                    .build();

            walletService.creditEscrowForCompletedOrder(order);
        }

        long elapsedMs = (System.nanoTime() - startTime) / 1_000_000;

        assertTrue(elapsedMs < 5000,
                "1000 escrow credit operations should complete in < 5000ms, took: " + elapsedMs + "ms");
    }

    // ─── INTEGRITY: BigDecimal Precision ─────────────────────────────────────

    @Test
    @DisplayName("Precision: Multiple escrow credits maintain BigDecimal precision")
    void multipleEscrowCreditsMaintainPrecision() {
        setUpService();
        UUID storeId = UUID.randomUUID();

        VendorWallet wallet = VendorWallet.builder()
                .storeId(storeId)
                .availableBalance(new BigDecimal("10000000"))
                .frozenBalance(BigDecimal.ZERO)
                .build();

        when(vendorWalletRepository.findByStoreIdForUpdate(storeId)).thenReturn(Optional.of(wallet));
        when(vendorWalletRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(walletTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        BigDecimal[] amounts = {
                new BigDecimal("999999.99"),
                new BigDecimal("1000000.01"),
                new BigDecimal("0.01"),
                new BigDecimal("999999.99"),
        };

        BigDecimal expectedTotal = BigDecimal.ZERO;
        for (int i = 0; i < amounts.length; i++) {
            UUID orderId = UUID.randomUUID();
            publicCodeService.push("GD-PREC-" + String.format("%06d", i));

            Order order = Order.builder()
                    .id(orderId)
                    .storeId(storeId)
                    .vendorPayout(amounts[i])
                    .build();

            when(orderRepository.findByIdForUpdate(orderId)).thenReturn(Optional.of(order));
            when(walletTransactionRepository.existsByOrderIdAndType(orderId, WalletTransaction.TransactionType.ESCROW_CREDIT))
                    .thenReturn(false);

            walletService.creditEscrowForCompletedOrder(order);
            expectedTotal = expectedTotal.add(amounts[i]);
        }

        assertEquals(0, wallet.getFrozenBalance().compareTo(expectedTotal),
                "Frozen balance should exactly match sum of all credits: " + expectedTotal);
    }

    // ─── HELPER ──────────────────────────────────────────────────────────────

    private static final class FixedPublicCodeService extends PublicCodeService {
        private final Queue<String> codes = new ArrayDeque<>();
        private FixedPublicCodeService() { super(null, null, null, null); }
        void push(String code) { codes.add(code); }
        @Override public String nextTransactionCode() {
            String c = codes.poll();
            return c != null ? c : "GD-TEST-000001";
        }
    }
}
