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

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "return_requests")
public class ReturnRequest extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ReturnReason reason;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ReturnResolution resolution;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ReturnStatus status = ReturnStatus.PENDING;

    @ElementCollection
    @CollectionTable(name = "return_item_images", joinColumns = @JoinColumn(name = "return_request_id"))
    @Column(name = "image_url")
    private List<String> images = new ArrayList<>();

    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    public enum ReturnReason {
        SIZE, DEFECT, CHANGE, OTHER
    }

    public enum ReturnResolution {
        EXCHANGE, REFUND
    }

    public enum ReturnStatus {
        PENDING, APPROVED, REJECTED, COMPLETED
    }
}
