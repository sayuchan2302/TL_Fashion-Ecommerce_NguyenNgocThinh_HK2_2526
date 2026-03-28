package vn.edu.hcmuaf.fit.fashionstore.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequest {
    private String name;
    private String slug;
    private String description;
    private UUID categoryId;
    private BigDecimal basePrice;
    private BigDecimal salePrice;
    private String material;
    private String fit;
    private String gender;
    private String status;
    private String sku;
    private Integer stockQuantity;
    private String imageUrl;
}
