package vn.edu.hcmuaf.fit.fashionstore.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmuaf.fit.fashionstore.dto.request.OrderRequest;
import vn.edu.hcmuaf.fit.fashionstore.entity.Order;
import vn.edu.hcmuaf.fit.fashionstore.security.AuthContext;
import vn.edu.hcmuaf.fit.fashionstore.security.AuthContext.UserContext;
import vn.edu.hcmuaf.fit.fashionstore.service.OrderService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;
    private final AuthContext authContext;

    public OrderController(OrderService orderService, AuthContext authContext) {
        this.orderService = orderService;
        this.authContext = authContext;
    }

    // ─── Customer Endpoints ────────────────────────────────────────────────────

    /**
     * Get current user's orders
     */
    @GetMapping
    public ResponseEntity<List<Order>> getOrders(@RequestHeader("Authorization") String authHeader) {
        UserContext ctx = authContext.fromAuthHeader(authHeader);
        return ResponseEntity.ok(orderService.findByUserId(ctx.getUserId()));
    }

    /**
     * Get order by ID - validates user ownership
     * FIX: Now actually uses userId for ownership validation
     */
    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrderById(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id) {
        UserContext ctx = authContext.fromAuthHeader(authHeader);
        
        // Admin can view any order, customers can only view their own
        if (ctx.isAdmin()) {
            return ResponseEntity.ok(orderService.findById(id));
        }
        return ResponseEntity.ok(orderService.findByIdForUser(id, ctx.getUserId()));
    }

    /**
     * Create order for current user
     */
    @PostMapping
    public ResponseEntity<Order> create(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody OrderRequest request) {
        UserContext ctx = authContext.fromAuthHeader(authHeader);
        return ResponseEntity.ok(orderService.create(ctx.getUserId(), request));
    }

    /**
     * Cancel order - validates user ownership
     */
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<Order> cancel(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id,
            @RequestBody CancelRequest request) {
        UserContext ctx = authContext.fromAuthHeader(authHeader);
        return ResponseEntity.ok(orderService.cancel(id, ctx.getUserId(), request.getReason()));
    }

    /**
     * Track order - validates user ownership
     */
    @GetMapping("/{id}/track")
    public ResponseEntity<Order> track(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id) {
        UserContext ctx = authContext.fromAuthHeader(authHeader);
        return ResponseEntity.ok(orderService.getTrackingInfo(id, ctx.getUserId()));
    }

    // ─── Vendor Endpoints ──────────────────────────────────────────────────────

    /**
     * Get orders for vendor's store
     */
    @GetMapping("/my-store")
    @PreAuthorize("hasAnyRole('VENDOR', 'SUPER_ADMIN')")
    public ResponseEntity<Page<Order>> getMyStoreOrders(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) {
        UserContext ctx = authContext.requireVendor(authHeader);
        Pageable pageable = PageRequest.of(page, size);
        
        if (status != null && !status.isEmpty()) {
            Order.OrderStatus orderStatus = Order.OrderStatus.valueOf(status.toUpperCase());
            return ResponseEntity.ok(orderService.findByStoreIdAndStatus(ctx.getStoreId(), orderStatus, pageable));
        }
        
        return ResponseEntity.ok(orderService.findByStoreId(ctx.getStoreId(), pageable));
    }

    /**
     * Get specific order for vendor's store
     */
    @GetMapping("/my-store/{id}")
    @PreAuthorize("hasAnyRole('VENDOR', 'SUPER_ADMIN')")
    public ResponseEntity<Order> getMyStoreOrderById(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id) {
        UserContext ctx = authContext.requireVendor(authHeader);
        return ResponseEntity.ok(orderService.findByIdForStore(id, ctx.getStoreId()));
    }

    /**
     * Update order status - vendor can only update their own store's orders
     */
    @PatchMapping("/my-store/{id}/status")
    @PreAuthorize("hasAnyRole('VENDOR', 'SUPER_ADMIN')")
    public ResponseEntity<Order> updateStoreOrderStatus(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id,
            @RequestBody StatusUpdateRequest request) {
        UserContext ctx = authContext.requireVendor(authHeader);
        Order.OrderStatus status = Order.OrderStatus.valueOf(request.getStatus().toUpperCase());
        return ResponseEntity.ok(orderService.updateStatusForStore(id, ctx.getStoreId(), status));
    }

    /**
     * Update tracking number for vendor's order
     */
    @PatchMapping("/my-store/{id}/tracking")
    @PreAuthorize("hasAnyRole('VENDOR', 'SUPER_ADMIN')")
    public ResponseEntity<Order> updateStoreOrderTracking(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id,
            @RequestBody TrackingUpdateRequest request) {
        UserContext ctx = authContext.requireVendor(authHeader);
        return ResponseEntity.ok(orderService.updateTrackingForStore(id, ctx.getStoreId(), request.getTrackingNumber()));
    }

    /**
     * Get store order statistics (dashboard)
     */
    @GetMapping("/my-store/stats")
    @PreAuthorize("hasAnyRole('VENDOR', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> getMyStoreStats(
            @RequestHeader("Authorization") String authHeader) {
        UserContext ctx = authContext.requireVendor(authHeader);
        UUID storeId = ctx.getStoreId();
        
        return ResponseEntity.ok(Map.of(
                "totalOrders", orderService.countByStoreId(storeId),
                "pendingOrders", orderService.countByStoreIdAndStatus(storeId, Order.OrderStatus.PENDING),
                "processingOrders", orderService.countByStoreIdAndStatus(storeId, Order.OrderStatus.PROCESSING),
                "deliveredOrders", orderService.countByStoreIdAndStatus(storeId, Order.OrderStatus.DELIVERED),
                "totalRevenue", orderService.calculateRevenueByStoreId(storeId),
                "totalPayout", orderService.calculatePayoutByStoreId(storeId)
        ));
    }

    // ─── Admin Endpoints ───────────────────────────────────────────────────────

    /**
     * Get all orders (admin only)
     */
    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<Order>> getAllOrders() {
        return ResponseEntity.ok(orderService.findAll());
    }

    /**
     * Update any order status (admin only)
     */
    @PatchMapping("/admin/{id}/status")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Order> updateOrderStatus(
            @PathVariable UUID id,
            @RequestBody StatusUpdateRequest request) {
        Order.OrderStatus status = Order.OrderStatus.valueOf(request.getStatus().toUpperCase());
        return ResponseEntity.ok(orderService.updateStatus(id, status));
    }

    // ─── Request DTOs ──────────────────────────────────────────────────────────

    public static class CancelRequest {
        private String reason;

        public String getReason() {
            return reason;
        }

        public void setReason(String reason) {
            this.reason = reason;
        }
    }

    public static class StatusUpdateRequest {
        private String status;

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }
    }

    public static class TrackingUpdateRequest {
        private String trackingNumber;

        public String getTrackingNumber() {
            return trackingNumber;
        }

        public void setTrackingNumber(String trackingNumber) {
            this.trackingNumber = trackingNumber;
        }
    }
}
