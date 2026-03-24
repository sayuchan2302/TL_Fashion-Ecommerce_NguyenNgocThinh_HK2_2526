package vn.edu.hcmuaf.fit.fashionstore.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmuaf.fit.fashionstore.dto.request.OrderRequest;
import vn.edu.hcmuaf.fit.fashionstore.entity.*;
import vn.edu.hcmuaf.fit.fashionstore.exception.ForbiddenException;
import vn.edu.hcmuaf.fit.fashionstore.exception.ResourceNotFoundException;
import vn.edu.hcmuaf.fit.fashionstore.repository.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final AddressRepository addressRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;

    public OrderService(OrderRepository orderRepository, UserRepository userRepository,
                        AddressRepository addressRepository, ProductRepository productRepository,
                        ProductVariantRepository productVariantRepository) {
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.addressRepository = addressRepository;
        this.productRepository = productRepository;
        this.productVariantRepository = productVariantRepository;
    }

    // Default commission rate (5%)
    private static final double DEFAULT_COMMISSION_RATE = 0.05;
    private static final double DEFAULT_SHIPPING_FEE = 30000.0;
    private static final double FREE_SHIPPING_THRESHOLD = 500000.0;

    private record PreparedOrderItem(
            Product product,
            ProductVariant variant,
            Integer quantity,
            Double unitPrice,
            Double totalPrice,
            UUID storeId,
            String productName,
            String variantName,
            String productImage
    ) {}

    private record StoreOrderGroup(
            UUID storeId,
            List<PreparedOrderItem> items,
            double subtotal
    ) {}

    // ─── Customer Methods ──────────────────────────────────────────────────────

    public List<Order> findByUserId(UUID userId) {
        return orderRepository.findByUserIdAndSubOrderIdIsNullOrderByCreatedAtDesc(userId);
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

    /**
     * Find order by ID with store ownership validation (for vendors)
     */
    public Order findByIdForStore(UUID orderId, UUID storeId) {
        return orderRepository.findByIdAndStoreId(orderId, storeId)
                .orElseThrow(() -> new ForbiddenException("Order not found or you don't have access to it"));
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

    /**
     * Calculate total revenue for a store
     */
    public Double calculateRevenueByStoreId(UUID storeId) {
        return orderRepository.calculateRevenueByStoreId(storeId);
    }

    /**
     * Calculate total payout for a store
     */
    public Double calculatePayoutByStoreId(UUID storeId) {
        return orderRepository.calculatePayoutByStoreId(storeId);
    }

    // ─── Admin Methods ─────────────────────────────────────────────────────────

    public List<Order> findAll() {
        return orderRepository.findAll();
    }

    // ─── Create Order ──────────────────────────────────────────────────────────

    @Transactional
    public Order create(UUID userId, OrderRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Address address = addressRepository.findById(request.getAddressId())
                .orElseThrow(() -> new ResourceNotFoundException("Address not found"));

        if (!address.getUser().getId().equals(userId)) {
            throw new ForbiddenException("You don't have access to this address");
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new ResourceNotFoundException("Order must contain at least one item");
        }

        Order.PaymentMethod paymentMethod = Order.PaymentMethod.valueOf(request.getPaymentMethod().toUpperCase());
        List<PreparedOrderItem> preparedItems = prepareOrderItems(request.getItems());
        Map<UUID, StoreOrderGroup> groupedByStore = groupItemsByStore(preparedItems);

        if (groupedByStore.size() <= 1) {
            StoreOrderGroup onlyGroup = groupedByStore.values().stream().findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Order must contain at least one valid store item"));
            return createStoreScopedOrder(user, address, request, paymentMethod, onlyGroup, null);
        }

        return createParentOrderWithSubOrders(user, address, request, paymentMethod, preparedItems, groupedByStore);
    }

    // ─── Cancel Order ──────────────────────────────────────────────────────────

    @Transactional
    public Order cancel(UUID orderId, UUID userId, String reason) {
        Order order = findByIdForUser(orderId, userId);

        if (order.getStatus() != Order.OrderStatus.PENDING) {
            throw new IllegalStateException("Can only cancel pending orders");
        }

        order.setStatus(Order.OrderStatus.CANCELLED);
        order.setNote((order.getNote() != null ? order.getNote() : "") + "\nCancellation reason: " + reason);
        Order savedOrder = orderRepository.save(order);

        if (savedOrder.getSubOrderId() == null && savedOrder.getStoreId() == null) {
            cascadeCancelToSubOrders(savedOrder, reason);
            return syncParentOrderStatus(savedOrder.getId());
        }

        if (savedOrder.getSubOrderId() != null) {
            syncParentOrderStatus(savedOrder.getSubOrderId());
        }

        return savedOrder;
    }

    // ─── Tracking ──────────────────────────────────────────────────────────────

    public Order getTrackingInfo(UUID orderId, UUID userId) {
        return findByIdForUser(orderId, userId);
    }

    // ─── Update Status ─────────────────────────────────────────────────────────

    /**
     * Update order status (admin only - no ownership check)
     */
    @Transactional
    public Order updateStatus(UUID orderId, Order.OrderStatus status) {
        Order order = findById(orderId);
        return applyStatusUpdate(order, status);
    }

    /**
     * Update order status with store ownership validation (vendor operation)
     */
    @Transactional
    public Order updateStatusForStore(UUID orderId, UUID storeId, Order.OrderStatus status) {
        Order order = findByIdForStore(orderId, storeId);
        return applyStatusUpdate(order, status);
    }

    private Order applyStatusUpdate(Order order, Order.OrderStatus status) {
        order.setStatus(status);

        if (status == Order.OrderStatus.DELIVERED) {
            order.setPaidAt(LocalDateTime.now());
            order.setPaymentStatus(Order.PaymentStatus.PAID);
        }

        Order savedOrder = orderRepository.save(order);

        if (savedOrder.getSubOrderId() != null) {
            syncParentOrderStatus(savedOrder.getSubOrderId());
        }

        return savedOrder;
    }

    // ─── Update Tracking ───────────────────────────────────────────────────────

    /**
     * Update tracking number with store ownership validation (vendor operation)
     */
    @Transactional
    public Order updateTrackingForStore(UUID orderId, UUID storeId, String trackingNumber) {
        Order order = findByIdForStore(orderId, storeId);
        order.setTrackingNumber(trackingNumber);
        return orderRepository.save(order);
    }

    private List<PreparedOrderItem> prepareOrderItems(List<OrderRequest.OrderItemRequest> items) {
        List<PreparedOrderItem> preparedItems = new ArrayList<>();

        for (OrderRequest.OrderItemRequest itemReq : items) {
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
                throw new ForbiddenException("Quantity must be greater than 0");
            }

            Double unitPrice = itemReq.getUnitPrice() != null ? itemReq.getUnitPrice() : resolveUnitPrice(product, variant);
            Double totalPrice = unitPrice * itemReq.getQuantity();

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
            double subtotal = entry.getValue().stream().mapToDouble(PreparedOrderItem::totalPrice).sum();
            result.put(entry.getKey(), new StoreOrderGroup(entry.getKey(), entry.getValue(), subtotal));
        }
        return result;
    }

    private Order createParentOrderWithSubOrders(
            User user,
            Address address,
            OrderRequest request,
            Order.PaymentMethod paymentMethod,
            List<PreparedOrderItem> preparedItems,
            Map<UUID, StoreOrderGroup> groupedByStore
    ) {
        double subtotal = preparedItems.stream().mapToDouble(PreparedOrderItem::totalPrice).sum();
        double shippingFee = groupedByStore.values().stream().mapToDouble(this::calculateShippingFee).sum();
        double commissionFee = groupedByStore.values().stream().mapToDouble(this::calculateCommissionFee).sum();
        double vendorPayout = subtotal - commissionFee;

        Order parentOrder = Order.builder()
                .user(user)
                .shippingAddress(address)
                .status(Order.OrderStatus.PENDING)
                .paymentMethod(paymentMethod)
                .paymentStatus(Order.PaymentStatus.UNPAID)
                .subtotal(subtotal)
                .shippingFee(shippingFee)
                .discount(0.0)
                .couponCode(request.getCouponCode())
                .note(buildParentOrderNote(request.getNote(), groupedByStore.size()))
                .commissionFee(commissionFee)
                .vendorPayout(vendorPayout)
                .build();
        parentOrder.calculateTotal();
        Order savedParent = orderRepository.save(parentOrder);

        for (PreparedOrderItem item : preparedItems) {
            savedParent.getItems().add(buildOrderItem(savedParent, item));
        }
        Order persistedParent = orderRepository.save(savedParent);

        for (StoreOrderGroup group : groupedByStore.values()) {
            createStoreScopedOrder(user, address, request, paymentMethod, group, persistedParent.getId());
        }

        return persistedParent;
    }

    private Order createStoreScopedOrder(
            User user,
            Address address,
            OrderRequest request,
            Order.PaymentMethod paymentMethod,
            StoreOrderGroup group,
            UUID parentOrderId
    ) {
        double shippingFee = calculateShippingFee(group);
        double commissionFee = calculateCommissionFee(group);
        double vendorPayout = group.subtotal() - commissionFee;

        Order order = Order.builder()
                .user(user)
                .shippingAddress(address)
                .status(Order.OrderStatus.PENDING)
                .paymentMethod(paymentMethod)
                .paymentStatus(Order.PaymentStatus.UNPAID)
                .subtotal(group.subtotal())
                .shippingFee(shippingFee)
                .discount(0.0)
                .couponCode(request.getCouponCode())
                .note(request.getNote())
                .storeId(group.storeId())
                .subOrderId(parentOrderId)
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

    private double calculateShippingFee(StoreOrderGroup group) {
        return group.subtotal() >= FREE_SHIPPING_THRESHOLD ? 0.0 : DEFAULT_SHIPPING_FEE;
    }

    private double calculateCommissionFee(StoreOrderGroup group) {
        return group.subtotal() * DEFAULT_COMMISSION_RATE;
    }

    private Double resolveUnitPrice(Product product, ProductVariant variant) {
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
        List<Order> subOrders = orderRepository.findBySubOrderIdOrderByCreatedAtDesc(parentOrder.getId());
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
        List<Order> subOrders = orderRepository.findBySubOrderIdOrderByCreatedAtDesc(parentOrderId);
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
}
