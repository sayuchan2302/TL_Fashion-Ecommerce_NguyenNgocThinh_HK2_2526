package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class MoMoReturnVerifyResponse {
    private String status;
    private String orderCode;
    private BigDecimal amount;
    private String resultCode;
    private boolean orderPaid;
    private String message;
}

