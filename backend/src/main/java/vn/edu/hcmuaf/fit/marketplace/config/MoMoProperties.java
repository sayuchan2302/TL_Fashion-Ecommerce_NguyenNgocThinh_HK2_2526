package vn.edu.hcmuaf.fit.marketplace.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "momo")
public class MoMoProperties {

    private String partnerCode;
    private String accessKey;
    private String secretKey;
    private String createUrl = "https://test-payment.momo.vn/v2/gateway/api/create";
    private String queryUrl = "https://test-payment.momo.vn/v2/gateway/api/query";
    private String returnUrl;
    private String ipnUrl;
    private String requestType = "captureWallet";
    private String lang = "en";
    private boolean autoCapture = true;

    public boolean isConfiguredForCreate() {
        return hasText(partnerCode)
                && hasText(accessKey)
                && hasText(secretKey)
                && hasText(createUrl)
                && hasText(returnUrl);
    }

    public boolean isConfiguredForQuery() {
        return hasText(partnerCode)
                && hasText(accessKey)
                && hasText(secretKey)
                && hasText(queryUrl);
    }

    public String resolveIpnUrl() {
        return hasText(ipnUrl) ? ipnUrl.trim() : null;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}

