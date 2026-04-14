package vn.edu.hcmuaf.fit.marketplace.config;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "azure-bot")
public class AzureBotProperties {

    @NotBlank
    private String microsoftAppId;

    @NotBlank
    private String microsoftAppPassword;

    @NotBlank
    private String microsoftAppTenantId;

    private String microsoftAppType = "SingleTenant";
}
