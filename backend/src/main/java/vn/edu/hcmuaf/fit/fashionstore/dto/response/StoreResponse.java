package vn.edu.hcmuaf.fit.fashionstore.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoreResponse {

    private UUID id;

    private UUID ownerId;

    private String ownerName;

    private String ownerEmail;

    private String name;

    private String slug;

    private String description;

    private String logo;

    private String banner;

    private String contactEmail;

    private String phone;

    private String address;

    private Double commissionRate;

    private String status;

    private String approvalStatus;

    private String rejectionReason;

    private LocalDateTime approvedAt;

    private String approvedBy;

    private Double totalSales;

    private Integer totalOrders;

    private Double rating;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
