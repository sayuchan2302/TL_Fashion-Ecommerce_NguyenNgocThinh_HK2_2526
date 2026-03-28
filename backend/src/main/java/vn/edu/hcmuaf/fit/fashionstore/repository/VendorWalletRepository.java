package vn.edu.hcmuaf.fit.fashionstore.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.hcmuaf.fit.fashionstore.entity.VendorWallet;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface VendorWalletRepository extends JpaRepository<VendorWallet, UUID> {
    Optional<VendorWallet> findByStoreId(UUID storeId);
}
