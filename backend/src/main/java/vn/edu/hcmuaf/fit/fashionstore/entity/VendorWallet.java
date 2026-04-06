package vn.edu.hcmuaf.fit.fashionstore.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "vendor_wallets")
public class VendorWallet extends BaseEntity {

    @Column(name = "store_id", nullable = false, unique = true)
    private UUID storeId;

    @Column(name = "available_balance", nullable = false)
    @Builder.Default
    private BigDecimal availableBalance = BigDecimal.ZERO;

    @Column(name = "frozen_balance", nullable = false)
    @Builder.Default
    private BigDecimal frozenBalance = BigDecimal.ZERO;

    /**
     * Backward-compatibility with legacy schema where vendor_wallets.balance is NOT NULL.
     * Keep this column synchronized with the new escrow model to avoid insert/update failures
     * on environments that have not dropped the old column yet.
     */
    @Column(name = "balance", nullable = false)
    @Builder.Default
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    public BigDecimal getTotalBalance() {
        return availableBalance.add(frozenBalance);
    }

    @PrePersist
    @PreUpdate
    protected void syncLegacyBalance() {
        if (availableBalance == null) availableBalance = BigDecimal.ZERO;
        if (frozenBalance == null) frozenBalance = BigDecimal.ZERO;
        balance = availableBalance.add(frozenBalance);
    }
}
