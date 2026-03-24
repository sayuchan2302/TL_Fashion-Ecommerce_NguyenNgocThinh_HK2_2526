package vn.edu.hcmuaf.fit.fashionstore.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.hcmuaf.fit.fashionstore.entity.Store;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StoreRepository extends JpaRepository<Store, UUID> {

    Optional<Store> findByOwnerId(UUID ownerId);

    Optional<Store> findBySlug(String slug);

    Optional<Store> findByIdAndApprovalStatusAndStatus(
            UUID id,
            Store.ApprovalStatus approvalStatus,
            Store.StoreStatus status
    );

    Optional<Store> findBySlugAndApprovalStatusAndStatus(
            String slug,
            Store.ApprovalStatus approvalStatus,
            Store.StoreStatus status
    );

    boolean existsByName(String name);

    boolean existsBySlug(String slug);

    List<Store> findByApprovalStatus(Store.ApprovalStatus status);

    List<Store> findByStatus(Store.StoreStatus status);

    List<Store> findByApprovalStatusAndStatus(Store.ApprovalStatus approvalStatus, Store.StoreStatus status);
}
