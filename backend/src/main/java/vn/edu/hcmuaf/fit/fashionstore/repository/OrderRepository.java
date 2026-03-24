package vn.edu.hcmuaf.fit.fashionstore.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.edu.hcmuaf.fit.fashionstore.entity.Order;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {

    List<Order> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<Order> findByUserIdAndSubOrderIdIsNullOrderByCreatedAtDesc(UUID userId);

    Page<Order> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    @Query("SELECT o FROM Order o LEFT JOIN FETCH o.items WHERE o.id = :id")
    Optional<Order> findByIdWithItems(UUID id);

    Optional<Order> findByUserIdAndId(UUID userId, UUID id);

    // ─── Multi-vendor: Store-scoped queries ────────────────────────────────────

    /**
     * Find all orders for a specific store (vendor)
     */
    Page<Order> findByStoreIdOrderByCreatedAtDesc(UUID storeId, Pageable pageable);

    /**
     * Find orders by store with status filter
     */
    Page<Order> findByStoreIdAndStatusOrderByCreatedAtDesc(UUID storeId, Order.OrderStatus status, Pageable pageable);

    /**
     * Find order by ID only if it belongs to the specified store (ownership check)
     */
    Optional<Order> findByIdAndStoreId(UUID id, UUID storeId);

    /**
     * Find order by ID with items, scoped to store
     */
    @Query("SELECT o FROM Order o LEFT JOIN FETCH o.items WHERE o.id = :id AND o.storeId = :storeId")
    Optional<Order> findByIdWithItemsAndStoreId(@Param("id") UUID id, @Param("storeId") UUID storeId);

    /**
     * Find sub-orders for a parent order
     */
    List<Order> findBySubOrderIdOrderByCreatedAtDesc(UUID parentOrderId);

    /**
     * Count orders by store (for vendor dashboard)
     */
    long countByStoreId(UUID storeId);

    /**
     * Count orders by store and status
     */
    long countByStoreIdAndStatus(UUID storeId, Order.OrderStatus status);

    /**
     * Calculate total revenue for a store
     */
    @Query("SELECT COALESCE(SUM(o.total), 0) FROM Order o WHERE o.storeId = :storeId AND o.status = 'DELIVERED'")
    Double calculateRevenueByStoreId(@Param("storeId") UUID storeId);

    /**
     * Calculate total vendor payout for a store
     */
    @Query("SELECT COALESCE(SUM(o.vendorPayout), 0) FROM Order o WHERE o.storeId = :storeId AND o.status = 'DELIVERED'")
    Double calculatePayoutByStoreId(@Param("storeId") UUID storeId);

    /**
     * Calculate total commission collected for a store
     */
    @Query("SELECT COALESCE(SUM(o.commissionFee), 0) FROM Order o WHERE o.storeId = :storeId AND o.status = 'DELIVERED'")
    Double calculateCommissionByStoreId(@Param("storeId") UUID storeId);
}
