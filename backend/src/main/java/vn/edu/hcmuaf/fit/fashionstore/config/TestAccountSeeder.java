package vn.edu.hcmuaf.fit.fashionstore.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmuaf.fit.fashionstore.entity.Cart;
import vn.edu.hcmuaf.fit.fashionstore.entity.Store;
import vn.edu.hcmuaf.fit.fashionstore.entity.User;
import vn.edu.hcmuaf.fit.fashionstore.repository.StoreRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Component
@Order(20)
@RequiredArgsConstructor
public class TestAccountSeeder implements CommandLineRunner {

    private static final String TEST_PASSWORD = "Test@123";

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        User customer = ensureUser(
                "customer@test.local",
                "Test Customer",
                "0900000001",
                User.Role.CUSTOMER,
                null
        );

        User admin = ensureUser(
                "admin@test.local",
                "Test Admin",
                "0900000003",
                User.Role.SUPER_ADMIN,
                null
        );

        User vendor = ensureUser(
                "vendor@test.local",
                "Test Vendor",
                "0900000002",
                User.Role.VENDOR,
                null
        );

        Store vendorStore = ensureApprovedVendorStore(vendor);

        customer.setStoreId(null);
        admin.setStoreId(null);
        vendor.setStoreId(vendorStore.getId());

        userRepository.save(customer);
        userRepository.save(admin);
        userRepository.save(vendor);

        log.info("Seeded test accounts: customer@test.local, vendor@test.local, admin@test.local with password {}", TEST_PASSWORD);
    }

    private User ensureUser(String email, String name, String phone, User.Role role, UUID storeId) {
        User user = userRepository.findByEmail(email)
                .orElseGet(() -> User.builder().email(email).build());

        user.setName(name);
        user.setPhone(phone);
        user.setRole(role);
        user.setStoreId(storeId);
        user.setIsActive(true);

        if (user.getPassword() == null || !passwordEncoder.matches(TEST_PASSWORD, user.getPassword())) {
            user.setPassword(passwordEncoder.encode(TEST_PASSWORD));
        }

        if (user.getCart() == null) {
            Cart cart = Cart.builder()
                    .user(user)
                    .build();
            user.setCart(cart);
        }

        return userRepository.save(user);
    }

    private Store ensureApprovedVendorStore(User vendor) {
        Store store = storeRepository.findByOwnerId(vendor.getId())
                .orElseGet(() -> storeRepository.findBySlug("test-vendor-store")
                        .orElseGet(Store::new));

        store.setOwner(vendor);
        store.setName("Test Vendor Store");
        store.setSlug("test-vendor-store");
        store.setDescription("Seeded store for marketplace vendor QA flows.");
        store.setContactEmail(vendor.getEmail());
        store.setPhone(vendor.getPhone());
        store.setAddress("123 Fashion Street, Ho Chi Minh City");
        store.setCommissionRate(5.0);
        store.setStatus(Store.StoreStatus.ACTIVE);
        store.setApprovalStatus(Store.ApprovalStatus.APPROVED);
        store.setApprovedAt(LocalDateTime.now());
        store.setApprovedBy("system-seed");
        store.setRejectionReason(null);

        return storeRepository.save(store);
    }
}
