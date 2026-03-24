package vn.edu.hcmuaf.fit.fashionstore.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "stores")
public class Store extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(unique = true)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String logo;

    private String banner;

    @Column(name = "contact_email")
    private String contactEmail;

    private String phone;

    private String address;

    @Column(name = "commission_rate")
    private Double commissionRate = 5.0;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private StoreStatus status = StoreStatus.INACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private ApprovalStatus approvalStatus = ApprovalStatus.PENDING;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "approved_by")
    private String approvedBy;

    @Column(name = "total_sales")
    private Double totalSales = 0.0;

    @Column(name = "total_orders")
    private Integer totalOrders = 0;

    private Double rating = 0.0;

    public enum StoreStatus {
        ACTIVE, INACTIVE, SUSPENDED
    }

    public enum ApprovalStatus {
        PENDING, APPROVED, REJECTED
    }
}
