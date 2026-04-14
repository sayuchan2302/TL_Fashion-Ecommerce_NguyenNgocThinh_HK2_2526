package vn.edu.hcmuaf.fit.marketplace.config;

import com.microsoft.bot.builder.ConversationState;
import com.microsoft.bot.builder.MemoryStorage;
import com.microsoft.bot.builder.Storage;
import com.microsoft.bot.connector.authentication.AppCredentials;
import com.microsoft.bot.connector.authentication.AuthenticationConfiguration;
import com.microsoft.bot.connector.authentication.ClaimsValidator;
import com.microsoft.bot.integration.BotFrameworkHttpAdapter;
import jakarta.annotation.Nonnull;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.Assert;
import org.springframework.util.StringUtils;

import java.util.Properties;
import java.util.concurrent.CompletableFuture;

@Configuration
@EnableConfigurationProperties(AzureBotProperties.class)
public class BotConfig {

    @Bean
    public com.microsoft.bot.integration.Configuration botSdkConfiguration(AzureBotProperties properties) {
        Assert.isTrue(
                "SingleTenant".equalsIgnoreCase(properties.getMicrosoftAppType()),
                "azure-bot.microsoft-app-type must be SingleTenant"
        );

        Properties data = new Properties();
        data.setProperty("MicrosoftAppId", properties.getMicrosoftAppId().trim());
        data.setProperty("MicrosoftAppPassword", properties.getMicrosoftAppPassword().trim());
        data.setProperty("MicrosoftAppTenantId", properties.getMicrosoftAppTenantId().trim());
        data.setProperty("MicrosoftAppType", "SingleTenant");

        return new MapBotConfiguration(data);
    }

    @Bean
    public AuthenticationConfiguration botAuthenticationConfiguration(AzureBotProperties properties) {
        Assert.isTrue(
                "SingleTenant".equalsIgnoreCase(properties.getMicrosoftAppType()),
                "azure-bot.microsoft-app-type must be SingleTenant"
        );

        AuthenticationConfiguration configuration = new AuthenticationConfiguration();
        final String expectedTenantId = properties.getMicrosoftAppTenantId().trim();
        configuration.setClaimsValidator(new ClaimsValidator() {
            @Override
            public CompletableFuture<Void> validateClaims(java.util.Map<String, String> claims) {
                String tokenTenant = claims.get("tid");
                if (!StringUtils.hasText(tokenTenant) || !expectedTenantId.equalsIgnoreCase(tokenTenant)) {
                    return CompletableFuture.failedFuture(new SecurityException("Invalid tenant for bot token"));
                }
                return CompletableFuture.completedFuture(null);
            }
        });

        return configuration;
    }

    @Bean
    public BotFrameworkHttpAdapter botFrameworkHttpAdapter(
            com.microsoft.bot.integration.Configuration botSdkConfiguration,
            AuthenticationConfiguration botAuthenticationConfiguration
    ) {
        final String channelAuthTenant = botSdkConfiguration.getProperty("MicrosoftAppTenantId");
        return new BotFrameworkHttpAdapter(botSdkConfiguration, botAuthenticationConfiguration) {
            @Override
            protected CompletableFuture<AppCredentials> buildAppCredentials(String appId, String oAuthScope) {
                return super.buildAppCredentials(appId, oAuthScope)
                        .thenApply(credentials -> {
                            // Force outbound token acquisition against configured tenant for SingleTenant bots.
                            credentials.setChannelAuthTenant(channelAuthTenant);
                            return credentials;
                        });
            }
        };
    }

    @Bean
    public Storage botStorage() {
        return new MemoryStorage();
    }

    @Bean
    public ConversationState conversationState(Storage botStorage) {
        return new ConversationState(botStorage);
    }

    private static final class MapBotConfiguration implements com.microsoft.bot.integration.Configuration {
        private final Properties properties;

        private MapBotConfiguration(Properties properties) {
            this.properties = properties;
        }

        @Override
        public String getProperty(@Nonnull String key) {
            return properties.getProperty(key);
        }

        @Override
        public Properties getProperties() {
            return properties;
        }

        @Override
        public String[] getProperties(String key) {
            String value = properties.getProperty(key);
            return value == null ? null : value.split(",");
        }
    }
}
