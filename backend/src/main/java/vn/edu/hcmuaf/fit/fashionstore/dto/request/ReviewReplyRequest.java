package vn.edu.hcmuaf.fit.fashionstore.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReviewReplyRequest {
    @NotBlank(message = "Reply content cannot be empty")
    private String reply;
}
