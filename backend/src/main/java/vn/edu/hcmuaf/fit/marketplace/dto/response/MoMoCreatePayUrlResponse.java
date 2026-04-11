package vn.edu.hcmuaf.fit.marketplace.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MoMoCreatePayUrlResponse {
    private String paymentUrl;
    private String orderCode;
    private String requestId;
    private String deeplink;
    private String qrCodeUrl;
}

