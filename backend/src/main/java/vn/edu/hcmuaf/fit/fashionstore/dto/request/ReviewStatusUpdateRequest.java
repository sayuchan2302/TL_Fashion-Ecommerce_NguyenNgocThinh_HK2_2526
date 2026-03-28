package vn.edu.hcmuaf.fit.fashionstore.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import vn.edu.hcmuaf.fit.fashionstore.entity.Review;

@Data
public class ReviewStatusUpdateRequest {
    @NotNull(message = "Status cannot be null")
    private Review.ReviewStatus status;
}
