package vn.edu.hcmuaf.fit.fashionstore.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "orders")
public class Order extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "address_id", nullable = false)
    private Address shippingAddress;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private OrderStatus status = OrderStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 50)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", length = 50)
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;

    @Column(name = "subtotal", nullable = false)
    private Double subtotal;

    @Column(name = "shipping_fee")
    private Double shippingFee = 0.0;

    @Column(name = "discount")
    private Double discount = 0.0;

    @Column(name = "total", nullable = false)
    private Double total;

    @Column(name = "coupon_code")
    private String couponCode;

    @Column(name = "tracking_number")
    private String trackingNumber;

    @Column(name = "store_id")
    private UUID storeId;

    @Column(name = "sub_order_id")
    private UUID subOrderId;

    @Column(name = "commission_fee")
    private Double commissionFee = 0.0;

    @Column(name = "vendor_payout")
    private Double vendorPayout = 0.0;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    public enum OrderStatus {
        PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED
    }

    public enum PaymentMethod {
        COD, VNPAY, ZALOPAY, MOMO, BANK_TRANSFER
    }

    public enum PaymentStatus {
        UNPAID, PAID, REFUND_PENDING, REFUNDED, FAILED
    }

    public void calculateTotal() {
        this.total = subtotal + (shippingFee != null ? shippingFee : 0) - (discount != null ? discount : 0);
    }
}