package vn.edu.hcmuaf.fit.fashionstore.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.edu.hcmuaf.fit.fashionstore.security.AuthContext.UserContext;
import vn.edu.hcmuaf.fit.fashionstore.dto.request.OrderRequest;
import vn.edu.hcmuaf.fit.fashionstore.dto.response.VendorOrderDetailResponse;
import vn.edu.hcmuaf.fit.fashionstore.dto.response.VendorOrderPageResponse;
import vn.edu.hcmuaf.fit.fashionstore.dto.response.VendorOrderSummaryResponse;
import vn.edu.hcmuaf.fit.fashionstore.dto.response.AdminOrderResponse;
import vn.edu.hcmuaf.fit.fashionstore.entity.*;
import vn.edu.hcmuaf.fit.fashionstore.exception.ForbiddenException;
import vn.edu.hcmuaf.fit.fashionstore.exception.ResourceNotFoundException;
import vn.edu.hcmuaf.fit.fashionstore.repository.*;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.UUID;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final AddressRepository addressRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final WalletService walletService;
    private final StoreRepository storeRepository;
    private final CouponRepository couponRepository;

    public OrderService(OrderRepository orderRepository, UserRepository userRepository,
                        AddressRepository addressRepository, ProductRepository productRepository,
                        ProductVariantRepository productVariantRepository, WalletService walletService,
                        StoreRepository storeRepository, CouponRepository couponRepository) {
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.addressRepository = addressRepository;
        this.productRepository = productRepository;
        this.productVariantRepository = productVariantRepository;
        this.walletService = walletService;
        this.storeRepository = storeRepository;
        this.couponRepository = couponRepository;
    }

    // Default commission rate (5%)
    private static final BigDecimal DEFAULT_COMMISSION_RATE = new BigDecimal("0.05");
    private static final BigDecimal DEFAULT_SHIPPING_FEE = new BigDecimal("30000.0");
    private static final BigDecimal FREE_SHIPPING_THRESHOLD = new BigDecimal("500000.0");
    private static final LocalDateTime DEFAULT_FILTER_FROM = LocalDateTime.of(1970, 1, 1, 0, 0);
    private static final LocalDateTime DEFAULT_FILTER_TO = LocalDateTime.of(2999, 12, 31, 23, 59, 59);
    private static final EnumSet<Order.OrderStatus> TRACKING_UPDATABLE_STATUSES =
            EnumSet.of(Order.OrderStatus.PROCESSING, Order.OrderStatus.SHIPPED);

    private record PreparedOrderItem(
            Product product,
            ProductVariant variant,
            Integer quantity,
            BigDecimal unitPrice,
            BigDecimal totalPrice,
            UUID storeId,
            String productName,
            String variantName,
            String productImage
    ) {}

    private record StoreOrderGroup(
            UUID storeId,
            List<PreparedOrderItem> items,
            BigDecimal subtotal
    ) {}

    // ─── Customer Methods ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AdminOrderResponse> findByUserId(UUID userId) {
        return orderRepository.findByUserIdAndParentOrderIsNullOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toAdminOrderResponse)
                .toList();
    }

    public Order findById(UUID id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
    }

    /**
     * Find order by ID with user ownership validation
     */
    public Order findByIdForUser(UUID orderId, UUID userId) {
        Order order = findById(orderId);
        if (!order.getUser().getId().equals(userId)) {
            throw new ForbiddenException("You don't have access to this order");
        }
        return order;
    }

    @Transactional(readOnly = true)
    public AdminOrderResponse getAdminOrderById(UUID id) {
        return toAdminOrderResponse(findById(id));
    }

    @Transactional(readOnly = true)
    public AdminOrderResponse getCustomerOrderById(UUID orderId, UUID userId) {
        return toAdminOrderResponse(findByIdForUser(orderId, userId));
    }

    // ─── Vendor Methods (Multi-tenant) ─────────────────────────────────────────

    /**
     * Find all orders for a specific store (vendor's view)
     */
    public Page<Order> findByStoreId(UUID storeId, Pageable pageable) {
        return orderRepository.findByStoreIdOrderByCreatedAtDesc(storeId, pageable);
    }

    /**
     * Find orders by store with status filter
     */
    public Page<Order> findByStoreIdAndStatus(UUID storeId, Order.OrderStatus status, Pageable pageable) {
        return orderRepository.findByStoreIdAndStatusOrderByCreatedAtDesc(storeId, status, pageable);
    }

    public Page<Order> findByStoreIdFiltered(
            UUID storeId,
            Order.OrderStatus status,
            String keyword,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            Pageable pageable
    ) {
        String normalizedKeyword = normalizeKeyword(keyword);
        LocalDateTime effectiveFrom = fromDate != null ? fromDate : DEFAULT_FILTER_FROM;
        LocalDateTime effectiveTo = toDate != null ? toDate : DEFAULT_FILTER_TO;

        if (!effectiveTo.isAfter(effectiveFrom)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "date_to must be greater than date_from");
        }

        return orderRepository.searchByStore(storeId, status, normalizedKeyword, effectiveFrom, effectiveTo, pageable);
    }

    /**
     * Find order by ID with store ownership validation (for vendors)
     */
    public Order findByIdForStore(UUID orderId, UUID storeId) {
        return orderRepository.findByIdAndStoreId(orderId, storeId)
                .orElseThrow(() -> new ForbiddenException("Order not found or you don't have access to it"));
    }

    @Transactional(readOnly = true)
    public VendorOrderPageResponse getVendorOrderPage(
            UUID storeId,
            Order.OrderStatus status,
            String keyword,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            Pageable pageable
    ) {
        Page<Order> page = findByStoreIdFiltered(storeId, status, keyword, fromDate, toDate, pageable);
        return VendorOrderPageResponse.builder()
                .content(page.getContent().stream().map(this::toVendorOrderSummaryResponse).toList())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .number(page.getNumber())
                .size(page.getSize())
                .statusCounts(buildVendorStatusCounts(storeId))
                .build();
    }

    @Transactional(readOnly = true)
    public VendorOrderDetailResponse getVendorOrderDetail(UUID orderId, UUID storeId) {
        return toVendorOrderDetailResponse(findByIdForStore(orderId, storeId));
    }

    /**
     * Get order count for a store
     */
    public long countByStoreId(UUID storeId) {
        return orderRepository.countByStoreId(storeId);
    }

    /**
     * Get order count by status for a store
     */
    public long countByStoreIdAndStatus(UUID storeId, Order.OrderStatus status) {
        return orderRepository.countByStoreIdAndStatus(storeId, status);
    }

    private VendorOrderPageResponse.StatusCounts buildVendorStatusCounts(UUID storeId) {
        return VendorOrderPageResponse.StatusCounts.builder()
                .all(countByStoreId(storeId))
                .pending(countByStoreIdAndStatus(storeId, Order.OrderStatus.PENDING))
                .confirmed(countByStoreIdAndStatus(storeId, Order.OrderStatus.CONFIRMED))
                .processing(countByStoreIdAndStatus(storeId, Order.OrderStatus.PROCESSING))
                .shipped(countByStoreIdAndStatus(storeId, Order.OrderStatus.SHIPPED))
                .delivered(countByStoreIdAndStatus(storeId, Order.OrderStatus.DELIVERED))
                .cancelled(countByStoreIdAndStatus(storeId, Order.OrderStatus.CANCELLED))
                .build();
    }

    /**
     * Calculate total revenue for a store
     */
    public BigDecimal calculateRevenueByStoreId(UUID storeId) {
        return orderRepository.calculateRevenueByStoreId(storeId);
    }

    /**
     * Calculate total payout for a store
     */
    public BigDecimal calculatePayoutByStoreId(UUID storeId) {
        return orderRepository.calculatePayoutByStoreId(storeId);
    }

    // ─── Admin Methods ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AdminOrderResponse> findAllAdminOrders() {
        return orderRepository.findAll().stream()
                .map(this::toAdminOrderResponse)
                .toList();
    }

    private AdminOrderResponse toAdminOrderResponse(Order order) {
        String storeName = order.getStoreId() != null 
            ? storeRepository.findById(order.getStoreId()).map(Store::getName).orElse("Unknown Store")
            : "Platform";

        return AdminOrderResponse.builder()
                .id(order.getId())
                .storeName(storeName)
                .status(order.getStatus())
                .paymentMethod(order.getPaymentMethod())
                .paymentStatus(order.getPaymentStatus())
                .subtotal(order.getSubtotal())
                .shippingFee(order.getShippingFee())
                .discount(order.getDiscount())
                .total(order.getTotal())
                .commissionFee(order.getCommissionFee())
                .vendorPayout(order.getVendorPayout())
                .trackingNumber(order.getTrackingNumber())
                .carrier(order.getShippingCarrier())
                .note(order.getNote())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .customer(order.getUser() != null ? AdminOrderResponse.CustomerInfo.builder()
                        .name(order.getUser().getName())
                        .email(order.getUser().getEmail())
                        .phone(order.getUser().getPhone())
                        .build() : null)
                .shippingAddress(order.getShippingAddress() != null ? AdminOrderResponse.AddressInfo.builder()
                        .fullName(order.getShippingAddress().getFullName())
                        .phone(order.getShippingAddress().getPhone())
                        .address(order.getShippingAddress().getDetail())
                        .ward(order.getShippingAddress().getWard())
                        .district(order.getShippingAddress().getDistrict())
                        .city(order.getShippingAddress().getProvince())
                        .build() : null)
                .items(order.getItems() == null ? List.of() : order.getItems().stream().map(item -> AdminOrderResponse.ItemInfo.builder()
                        .id(item.getId())
                        .name(item.getProductName())
                        .sku(item.getVariant() != null && item.getVariant().getSku() != null ? item.getVariant().getSku() : (item.getId() != null ? item.getId().toString() : ""))
                        .variant(item.getVariantName())
                        .price(item.getUnitPrice())
                        .quantity(item.getQuantity())
                        .image(item.getProductImage())
                        .build()).toList())
                .build();
    }

    // ─── Create Order ──────────────────────────────────────────────────────────

    @Transactional
    public AdminOrderResponse create(UUID userId, OrderRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order request is required");
        }
        if (request.getAddressId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Address is required");
        }
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order must contain at least one item");
        }
        if (request.getPaymentMethod() == null || request.getPaymentMethod().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment method is required");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Address address = addressRepository.findById(request.getAddressId())
                .orElseThrow(() -> new ResourceNotFoundException("Address not found"));

        if (!address.getUser().getId().equals(userId)) {
            throw new ForbiddenException("You don't have access to this address");
        }

        Order.PaymentMethod paymentMethod;
        try {
            paymentMethod = Order.PaymentMethod.valueOf(request.getPaymentMethod().trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported payment method: " + request.getPaymentMethod());
        }
        List<PreparedOrderItem> preparedItems = prepareOrderItems(request.getItems());
        Map<UUID, StoreOrderGroup> groupedByStore = groupItemsByStore(preparedItems);

        Coupon coupon = null;
        if (request.getCouponCode() != null && !request.getCouponCode().isBlank()) {
            coupon = couponRepository.findByCode(request.getCouponCode())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid coupon code"));
            if (!coupon.isValid()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Coupon is expired or fully used");
            }
        }

        if (groupedByStore.size() <= 1) {
            StoreOrderGroup onlyGroup = groupedByStore.values().stream().findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Order must contain at least one valid store item"));
            
            Order created = createStoreScopedOrder(user, address, request, paymentMethod, onlyGroup, null, coupon, BigDecimal.ZERO);
            if (coupon != null) {
                coupon.setUsedCount(coupon.getUsedCount() + 1);
                couponRepository.save(coupon);
            }
            return toAdminOrderResponse(created);
        }

        Order parent = createParentOrderWithSubOrders(user, address, request, paymentMethod, preparedItems, groupedByStore, coupon);
        if (coupon != null) {
            coupon.setUsedCount(coupon.getUsedCount() + 1);
            couponRepository.save(coupon);
        }
        return toAdminOrderResponse(parent);
    }

    // ─── Cancel Order ──────────────────────────────────────────────────────────

    @Transactional
    public AdminOrderResponse cancel(UUID orderId, UUID userId, String reason) {
        Order order = findByIdForUser(orderId, userId);

        if (order.getStatus() != Order.OrderStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Can only cancel pending orders");
        }

        order.setStatus(Order.OrderStatus.CANCELLED);
        order.setNote((order.getNote() != null ? order.getNote() : "") + "\nCancellation reason: " + reason);
        Order savedOrder = orderRepository.save(order);

        if (savedOrder.isParentOrder()) {
            cascadeCancelToSubOrders(savedOrder, reason);
            return toAdminOrderResponse(syncParentOrderStatus(savedOrder.getId()));
        }

        if (savedOrder.isSubOrder()) {
            syncParentOrderStatus(savedOrder.getParentOrder().getId());
        }

        return toAdminOrderResponse(savedOrder);
    }

    // ─── Tracking ──────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public AdminOrderResponse getTrackingInfo(UUID orderId, UUID userId) {
        Order order = findByIdForUser(orderId, userId);
        return toAdminOrderResponse(order);
    }

    // ─── Update Status ─────────────────────────────────────────────────────────

    /**
     * Update order status (admin only - no ownership check)
     */
    @Transactional
    public Order updateStatus(UUID orderId, Order.OrderStatus status) {
        Order order = findById(orderId);
        return applyStatusUpdate(order, status, null, null, null, false);
    }

    /**
     * Update order status with store ownership validation (vendor operation)
     */
    @Transactional
    public Order updateStatusForStore(
            UUID orderId,
            UUID storeId,
            Order.OrderStatus status,
            String trackingNumber,
            String carrier,
            String reason
    ) {
        Order order = findByIdForStore(orderId, storeId);
        return applyStatusUpdate(order, status, trackingNumber, carrier, reason, true);
    }

    @Transactional
    public VendorOrderDetailResponse updateVendorOrderStatus(
            UUID orderId,
            UUID storeId,
            Order.OrderStatus status,
            String trackingNumber,
            String carrier,
            String reason
    ) {
        Order updated = updateStatusForStore(orderId, storeId, status, trackingNumber, carrier, reason);
        return toVendorOrderDetailResponse(updated);
    }

    private Order applyStatusUpdate(
            Order order,
            Order.OrderStatus status,
            String trackingNumber,
            String carrier,
            String reason,
            boolean enforceVendorRules
    ) {
        validateStatusTransition(order.getStatus(), status, enforceVendorRules);

        if (status == Order.OrderStatus.SHIPPED) {
            String normalizedTracking = "ADMIN_FORCE_SHIPPED";
            String normalizedCarrier = "SYSTEM_SYNC";
            
            if (enforceVendorRules) {
                normalizedTracking = resolveRequiredField(
                        trackingNumber,
                        order.getTrackingNumber(),
                        "Tracking number is required before shipping"
                );
                normalizedCarrier = resolveRequiredField(
                        carrier,
                        order.getShippingCarrier(),
                        "Carrier is required before shipping"
                );
            } else if (trackingNumber != null && !trackingNumber.isBlank()) {
                normalizedTracking = trackingNumber.trim();
                normalizedCarrier = carrier != null && !carrier.isBlank() ? carrier.trim() : "ADMIN_SYNC";
            }
            order.setTrackingNumber(normalizedTracking);
            order.setShippingCarrier(normalizedCarrier);
        }

        if (status == Order.OrderStatus.CANCELLED) {
            String normalizedReason = normalizeOptionalText(reason);
            if (enforceVendorRules && normalizedReason.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cancellation reason is required");
            }
            if (!normalizedReason.isEmpty()) {
                String currentNote = order.getNote() == null ? "" : order.getNote().trim();
                String cancelNote = "Cancellation reason: " + normalizedReason;
                order.setNote(currentNote.isEmpty() ? cancelNote : currentNote + "\n" + cancelNote);
            }
        }

        order.setStatus(status);

        if (status == Order.OrderStatus.DELIVERED) {
            if (enforceVendorRules) {
                ensureTrackingDataReady(order);
            }
            order.setPaidAt(LocalDateTime.now());
            order.setPaymentStatus(Order.PaymentStatus.PAID);
        }

        Order savedOrder = orderRepository.save(order);

        if (savedOrder.isParentOrder()) {
            cascadeStatusToSubOrders(savedOrder, status, trackingNumber, carrier, reason);
        }

        if (status == Order.OrderStatus.DELIVERED && savedOrder.isSubOrder()) {
            walletService.creditVendorForOrder(savedOrder);
        }

        if (savedOrder.isSubOrder()) {
            syncParentOrderStatus(savedOrder.getParentOrder().getId());
        }

        return savedOrder;
    }

    private void cascadeStatusToSubOrders(Order parentOrder, Order.OrderStatus status, String trackingNumber, String carrier, String reason) {
        if (status == Order.OrderStatus.CANCELLED) return; // Handled separately by cascadeCancelToSubOrders

        List<Order> subOrders = orderRepository.findByParentOrderOrderByCreatedAtDesc(parentOrder);
        for (Order subOrder : subOrders) {
            if (subOrder.getStatus() == status) continue;

            String subTracking = trackingNumber == null ? "ADMIN_FORCE_" + status.name() : trackingNumber;
            String subCarrier = carrier == null ? "SYSTEM_SYNC" : carrier;
            
            // Recurse without enforcing vendor rules (since Admin forced it)
            applyStatusUpdate(subOrder, status, subTracking, subCarrier, reason, false);
        }
    }

    private void validateStatusTransition(Order.OrderStatus current, Order.OrderStatus next, boolean enforceVendorRules) {
        if (current == next) {
            return;
        }
        if (!enforceVendorRules) {
            return; // Admins can bypass strict state sequence
        }

        boolean allowed = switch (current) {
            case PENDING -> next == Order.OrderStatus.CONFIRMED || next == Order.OrderStatus.CANCELLED;
            case CONFIRMED -> next == Order.OrderStatus.PROCESSING || next == Order.OrderStatus.CANCELLED;
            case PROCESSING -> next == Order.OrderStatus.SHIPPED || next == Order.OrderStatus.CANCELLED;
            case SHIPPED -> next == Order.OrderStatus.DELIVERED;
            case DELIVERED, CANCELLED -> false;
        };

        if (!allowed) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    String.format("Invalid status transition: %s -> %s", current, next)
            );
        }
    }

    private String normalizeRequiredText(String value, String message) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return normalized;
    }

    private String normalizeOptionalText(String value) {
        return value == null ? "" : value.trim();
    }

    private String resolveRequiredField(String providedValue, String fallbackValue, String message) {
        String normalizedProvided = normalizeOptionalText(providedValue);
        if (!normalizedProvided.isEmpty()) {
            return normalizedProvided;
        }
        return normalizeRequiredText(fallbackValue, message);
    }

    private void ensureTrackingDataReady(Order order) {
        normalizeRequiredText(order.getTrackingNumber(), "Tracking number is required before marking as delivered");
        normalizeRequiredText(order.getShippingCarrier(), "Carrier is required before marking as delivered");
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null) {
            return null;
        }

        String normalized = keyword.trim().toLowerCase(Locale.ROOT);
        return normalized.isEmpty() ? null : normalized;
    }

    // ─── Update Tracking ───────────────────────────────────────────────────────

    /**
     * Update tracking number with store ownership validation (vendor operation)
     */
    @Transactional
    public Order updateTrackingForStore(UUID orderId, UUID storeId, String trackingNumber) {
        Order order = findByIdForStore(orderId, storeId);
        if (!TRACKING_UPDATABLE_STATUSES.contains(order.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Tracking can only be updated when order is PROCESSING or SHIPPED"
            );
        }
        order.setTrackingNumber(normalizeRequiredText(trackingNumber, "Tracking number is required"));
        return orderRepository.save(order);
    }

    @Transactional
    public VendorOrderDetailResponse updateVendorOrderTracking(UUID orderId, UUID storeId, String trackingNumber) {
        return toVendorOrderDetailResponse(updateTrackingForStore(orderId, storeId, trackingNumber));
    }

    private VendorOrderSummaryResponse toVendorOrderSummaryResponse(Order order) {
        return VendorOrderSummaryResponse.builder()
                .id(order.getId())
                .status(safeEnumName(order.getStatus()))
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .total(order.getTotal())
                .commissionFee(order.getCommissionFee())
                .vendorPayout(order.getVendorPayout())
                .itemCount(order.getItems() == null ? 0 : order.getItems().size())
                .customer(VendorOrderSummaryResponse.Customer.builder()
                        .name(order.getUser() != null ? order.getUser().getName() : null)
                        .email(order.getUser() != null ? order.getUser().getEmail() : null)
                        .phone(order.getUser() != null ? order.getUser().getPhone() : null)
                        .build())
                .trackingNumber(order.getTrackingNumber())
                .shippingCarrier(order.getShippingCarrier())
                .build();
    }

    private VendorOrderDetailResponse toVendorOrderDetailResponse(Order order) {
        return VendorOrderDetailResponse.builder()
                .id(order.getId())
                .status(safeEnumName(order.getStatus()))
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .subtotal(order.getSubtotal())
                .shippingFee(order.getShippingFee())
                .discount(order.getDiscount())
                .total(order.getTotal())
                .paymentMethod(safeEnumName(order.getPaymentMethod()))
                .paymentStatus(safeEnumName(order.getPaymentStatus()))
                .note(order.getNote())
                .trackingNumber(order.getTrackingNumber())
                .shippingCarrier(order.getShippingCarrier())
                .commissionFee(order.getCommissionFee())
                .vendorPayout(order.getVendorPayout())
                .customer(VendorOrderSummaryResponse.Customer.builder()
                        .name(order.getUser() != null ? order.getUser().getName() : null)
                        .email(order.getUser() != null ? order.getUser().getEmail() : null)
                        .phone(order.getUser() != null ? order.getUser().getPhone() : null)
                        .build())
                .shippingAddress(VendorOrderDetailResponse.ShippingAddress.builder()
                        .fullName(order.getShippingAddress() != null ? order.getShippingAddress().getFullName() : null)
                        .phone(order.getShippingAddress() != null ? order.getShippingAddress().getPhone() : null)
                        .address(order.getShippingAddress() != null ? order.getShippingAddress().getDetail() : null)
                        .ward(order.getShippingAddress() != null ? order.getShippingAddress().getWard() : null)
                        .district(order.getShippingAddress() != null ? order.getShippingAddress().getDistrict() : null)
                        .city(order.getShippingAddress() != null ? order.getShippingAddress().getProvince() : null)
                        .build())
                .items((order.getItems() == null ? List.<OrderItem>of() : order.getItems()).stream()
                        .map(item -> VendorOrderDetailResponse.Item.builder()
                                .id(item.getId())
                                .name(item.getProductName())
                                .sku(item.getVariant() != null && item.getVariant().getSku() != null
                                        ? item.getVariant().getSku()
                                        : (item.getId() != null ? item.getId().toString() : ""))
                                .variant(item.getVariantName())
                                .quantity(item.getQuantity())
                                .unitPrice(item.getUnitPrice())
                                .totalPrice(item.getTotalPrice())
                                .image(item.getProductImage())
                                .build())
                        .toList())
                .build();
    }

    private List<PreparedOrderItem> prepareOrderItems(List<OrderRequest.OrderItemRequest> items) {
        List<PreparedOrderItem> preparedItems = new ArrayList<>();

        for (OrderRequest.OrderItemRequest itemReq : items) {
            if (itemReq == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order item is required");
            }
            if (itemReq.getProductId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product ID is required");
            }
            Product product = productRepository.findPublicById(itemReq.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

            if (product.getStoreId() == null) {
                throw new ForbiddenException("Marketplace checkout only supports vendor-owned products");
            }

            ProductVariant variant = null;
            if (itemReq.getVariantId() != null) {
                variant = productVariantRepository.findById(itemReq.getVariantId())
                        .filter(found -> found.getProduct().getId().equals(product.getId()))
                        .filter(found -> Boolean.TRUE.equals(found.getIsActive()))
                        .orElseThrow(() -> new ResourceNotFoundException("Product variant not found"));
            }

            if (itemReq.getQuantity() == null || itemReq.getQuantity() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be greater than 0");
            }

            BigDecimal unitPrice = itemReq.getUnitPrice() != null ? itemReq.getUnitPrice() : resolveUnitPrice(product, variant);
            BigDecimal totalPrice = unitPrice.multiply(BigDecimal.valueOf(itemReq.getQuantity()));

            preparedItems.add(new PreparedOrderItem(
                    product,
                    variant,
                    itemReq.getQuantity(),
                    unitPrice,
                    totalPrice,
                    product.getStoreId(),
                    product.getName(),
                    buildVariantName(variant),
                    resolvePrimaryImage(product)
            ));
        }

        return preparedItems;
    }

    private Map<UUID, StoreOrderGroup> groupItemsByStore(List<PreparedOrderItem> preparedItems) {
        Map<UUID, List<PreparedOrderItem>> grouped = new LinkedHashMap<>();

        for (PreparedOrderItem item : preparedItems) {
            grouped.computeIfAbsent(item.storeId(), ignored -> new ArrayList<>()).add(item);
        }

        Map<UUID, StoreOrderGroup> result = new LinkedHashMap<>();
        for (Map.Entry<UUID, List<PreparedOrderItem>> entry : grouped.entrySet()) {
            BigDecimal subtotal = entry.getValue().stream().map(PreparedOrderItem::totalPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
            result.put(entry.getKey(), new StoreOrderGroup(entry.getKey(), entry.getValue(), subtotal));
        }
        return result;
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    private Order createParentOrderWithSubOrders(
            User user,
            Address address,
            OrderRequest request,
            Order.PaymentMethod paymentMethod,
            List<PreparedOrderItem> preparedItems,
            Map<UUID, StoreOrderGroup> groupedByStore,
            Coupon coupon
    ) {
        BigDecimal subtotal = preparedItems.stream().map(PreparedOrderItem::totalPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal shippingFee = groupedByStore.values().stream().map(this::calculateShippingFee).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal commissionFee = groupedByStore.values().stream().map(this::calculateCommissionFee).reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal discount = coupon != null ? BigDecimal.valueOf(coupon.calculateDiscount(subtotal.doubleValue())) : BigDecimal.ZERO;
        BigDecimal vendorPayout = subtotal.add(shippingFee).subtract(commissionFee).subtract(discount);

        Order parentOrder = Order.builder()
                .user(user)
                .shippingAddress(address)
                .status(Order.OrderStatus.PENDING)
                .paymentMethod(paymentMethod)
                .paymentStatus(Order.PaymentStatus.UNPAID)
                .subtotal(subtotal)
                .shippingFee(shippingFee)
                .discount(discount)
                .couponCode(request.getCouponCode())
                .note(buildParentOrderNote(request.getNote(), groupedByStore.size()))
                .commissionFee(commissionFee)
                .vendorPayout(vendorPayout)
                .build();
        parentOrder.calculateTotal();

        Order persistedParent = orderRepository.save(parentOrder);

        for (PreparedOrderItem item : preparedItems) {
            persistedParent.getItems().add(buildOrderItem(persistedParent, item));
        }
        persistedParent = orderRepository.save(persistedParent);

        for (StoreOrderGroup group : groupedByStore.values()) {
            // Calculate proportional discount for this specific vendor
            BigDecimal storeDiscount = BigDecimal.ZERO;
            if (discount.compareTo(BigDecimal.ZERO) > 0 && subtotal.compareTo(BigDecimal.ZERO) > 0) {
                storeDiscount = discount.multiply(group.subtotal()).divide(subtotal, 2, java.math.RoundingMode.HALF_UP);
            }
            createStoreScopedOrder(user, address, request, paymentMethod, group, persistedParent, coupon, storeDiscount);
        }

        return persistedParent;
    }

    private Order createStoreScopedOrder(
            User user,
            Address address,
            OrderRequest request,
            Order.PaymentMethod paymentMethod,
            StoreOrderGroup group,
            Order parentOrder,
            Coupon coupon,
            BigDecimal preCalculatedDiscount
    ) {
        BigDecimal shippingFee = calculateShippingFee(group);
        BigDecimal commissionFee = calculateCommissionFee(group);
        
        BigDecimal discount = preCalculatedDiscount;
        if (parentOrder == null && coupon != null) {
            // For single-vendor orders, calculate discount strictly on their subtotal
            discount = BigDecimal.valueOf(coupon.calculateDiscount(group.subtotal().doubleValue()));
        }
        
        BigDecimal vendorPayout = group.subtotal().add(shippingFee).subtract(commissionFee).subtract(discount);

        Order order = Order.builder()
                .user(user)
                .shippingAddress(address)
                .status(Order.OrderStatus.PENDING)
                .paymentMethod(paymentMethod)
                .paymentStatus(Order.PaymentStatus.UNPAID)
                .subtotal(group.subtotal())
                .shippingFee(shippingFee)
                .discount(discount)
                .couponCode(request.getCouponCode())
                .note(request.getNote())
                .storeId(group.storeId())
                .parentOrder(parentOrder)
                .commissionFee(commissionFee)
                .vendorPayout(vendorPayout)
                .build();
        order.calculateTotal();

        Order savedOrder = orderRepository.save(order);
        for (PreparedOrderItem item : group.items()) {
            savedOrder.getItems().add(buildOrderItem(savedOrder, item));
        }
        return orderRepository.save(savedOrder);
    }

    private OrderItem buildOrderItem(Order order, PreparedOrderItem item) {
        return OrderItem.builder()
                .order(order)
                .product(item.product())
                .variant(item.variant())
                .productName(item.productName())
                .variantName(item.variantName())
                .productImage(item.productImage())
                .quantity(item.quantity())
                .unitPrice(item.unitPrice())
                .totalPrice(item.totalPrice())
                .storeId(item.storeId())
                .build();
    }

    private BigDecimal calculateShippingFee(StoreOrderGroup group) {
        return group.subtotal().compareTo(FREE_SHIPPING_THRESHOLD) >= 0 ? BigDecimal.ZERO : DEFAULT_SHIPPING_FEE;
    }

    private BigDecimal calculateCommissionFee(StoreOrderGroup group) {
        return group.subtotal().multiply(DEFAULT_COMMISSION_RATE);
    }

    private BigDecimal resolveUnitPrice(Product product, ProductVariant variant) {
        if (variant != null) {
            return variant.getPrice();
        }
        return product.getEffectivePrice();
    }

    private String resolvePrimaryImage(Product product) {
        if (product.getImages() == null || product.getImages().isEmpty()) {
            return null;
        }
        return product.getImages().stream()
                .sorted((left, right) -> Boolean.compare(Boolean.TRUE.equals(right.getIsPrimary()), Boolean.TRUE.equals(left.getIsPrimary())))
                .map(ProductImage::getUrl)
                .findFirst()
                .orElse(null);
    }

    private String buildVariantName(ProductVariant variant) {
        if (variant == null) {
            return null;
        }
        String color = variant.getColor() != null ? variant.getColor() : "";
        String size = variant.getSize() != null ? variant.getSize() : "";
        if (!color.isBlank() && !size.isBlank()) {
            return color + " / " + size;
        }
        if (!color.isBlank()) {
            return color;
        }
        return size.isBlank() ? null : size;
    }

    private String buildParentOrderNote(String originalNote, int vendorCount) {
        String splitNote = "Marketplace order split into " + vendorCount + " vendor sub-orders.";
        if (originalNote == null || originalNote.isBlank()) {
            return splitNote;
        }
        return originalNote + "\n" + splitNote;
    }

    private void cascadeCancelToSubOrders(Order parentOrder, String reason) {
        List<Order> subOrders = orderRepository.findByParentOrderOrderByCreatedAtDesc(parentOrder);
        for (Order subOrder : subOrders) {
            if (subOrder.getStatus() == Order.OrderStatus.PENDING) {
                subOrder.setStatus(Order.OrderStatus.CANCELLED);
                subOrder.setNote((subOrder.getNote() != null ? subOrder.getNote() : "") + "\nCancellation reason: " + reason);
                orderRepository.save(subOrder);
            }
        }
    }

    private Order syncParentOrderStatus(UUID parentOrderId) {
        Order parentOrder = findById(parentOrderId);
        List<Order> subOrders = orderRepository.findByParentOrderIdOrderByCreatedAtDesc(parentOrderId);
        if (subOrders.isEmpty()) {
            return parentOrder;
        }

        Order.OrderStatus aggregateStatus = deriveParentStatus(subOrders);
        parentOrder.setStatus(aggregateStatus);

        boolean allDelivered = subOrders.stream().allMatch(subOrder -> subOrder.getStatus() == Order.OrderStatus.DELIVERED);
        boolean allCancelled = subOrders.stream().allMatch(subOrder -> subOrder.getStatus() == Order.OrderStatus.CANCELLED);

        if (allDelivered) {
            parentOrder.setPaymentStatus(Order.PaymentStatus.PAID);
            if (parentOrder.getPaidAt() == null) {
                parentOrder.setPaidAt(LocalDateTime.now());
            }
        } else if (allCancelled) {
            parentOrder.setPaymentStatus(Order.PaymentStatus.FAILED);
        }

        return orderRepository.save(parentOrder);
    }

    private Order.OrderStatus deriveParentStatus(List<Order> subOrders) {
        boolean allCancelled = subOrders.stream().allMatch(subOrder -> subOrder.getStatus() == Order.OrderStatus.CANCELLED);
        if (allCancelled) {
            return Order.OrderStatus.CANCELLED;
        }

        boolean allDelivered = subOrders.stream()
                .filter(subOrder -> subOrder.getStatus() != Order.OrderStatus.CANCELLED)
                .allMatch(subOrder -> subOrder.getStatus() == Order.OrderStatus.DELIVERED);
        if (allDelivered) {
            return Order.OrderStatus.DELIVERED;
        }

        if (subOrders.stream().anyMatch(subOrder -> subOrder.getStatus() == Order.OrderStatus.SHIPPED
                || subOrder.getStatus() == Order.OrderStatus.DELIVERED)) {
            return Order.OrderStatus.SHIPPED;
        }

        if (subOrders.stream().anyMatch(subOrder -> subOrder.getStatus() == Order.OrderStatus.PROCESSING)) {
            return Order.OrderStatus.PROCESSING;
        }

        if (subOrders.stream().anyMatch(subOrder -> subOrder.getStatus() == Order.OrderStatus.CONFIRMED)) {
            return Order.OrderStatus.CONFIRMED;
        }

        return Order.OrderStatus.PENDING;
    }

    private String safeEnumName(Enum<?> value) {
        return value == null ? null : value.name();
    }
}
