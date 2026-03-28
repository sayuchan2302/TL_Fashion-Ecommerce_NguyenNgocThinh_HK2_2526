package vn.edu.hcmuaf.fit.fashionstore.Seeder;

import java.util.ArrayList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmuaf.fit.fashionstore.entity.Address;
import vn.edu.hcmuaf.fit.fashionstore.entity.Cart;
import vn.edu.hcmuaf.fit.fashionstore.entity.Category;
import vn.edu.hcmuaf.fit.fashionstore.entity.ContentPage;
import vn.edu.hcmuaf.fit.fashionstore.entity.Order;
import vn.edu.hcmuaf.fit.fashionstore.entity.OrderItem;
import vn.edu.hcmuaf.fit.fashionstore.entity.Product;
import vn.edu.hcmuaf.fit.fashionstore.entity.ProductImage;
import vn.edu.hcmuaf.fit.fashionstore.entity.ProductVariant;
import vn.edu.hcmuaf.fit.fashionstore.entity.ReturnRequest;
import vn.edu.hcmuaf.fit.fashionstore.entity.Store;
import vn.edu.hcmuaf.fit.fashionstore.entity.User;
import vn.edu.hcmuaf.fit.fashionstore.entity.Voucher;
import vn.edu.hcmuaf.fit.fashionstore.repository.AddressRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.CartRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.CategoryRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.ContentPageRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.OrderRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.ProductRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.ProductVariantRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.ReturnRequestRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.StoreRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.UserRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.VoucherRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.math.BigDecimal;

@Component
@ConditionalOnProperty(prefix = "app.seed", name = "enabled", havingValue = "true", matchIfMissing = true)
public class MarketplaceSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MarketplaceSeeder.class);
    private static final String TEST_PASSWORD = "Test@123";

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final CartRepository cartRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final AddressRepository addressRepository;
    private final OrderRepository orderRepository;
    private final ReturnRequestRepository returnRequestRepository;
    private final VoucherRepository voucherRepository;
    private final ContentPageRepository contentPageRepository;
    private final PasswordEncoder passwordEncoder;

    public MarketplaceSeeder(
            UserRepository userRepository,
            StoreRepository storeRepository,
            CartRepository cartRepository,
            CategoryRepository categoryRepository,
            ProductRepository productRepository,
            ProductVariantRepository productVariantRepository,
            AddressRepository addressRepository,
            OrderRepository orderRepository,
            ReturnRequestRepository returnRequestRepository,
            VoucherRepository voucherRepository,
            ContentPageRepository contentPageRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.storeRepository = storeRepository;
        this.cartRepository = cartRepository;
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
        this.productVariantRepository = productVariantRepository;
        this.addressRepository = addressRepository;
        this.orderRepository = orderRepository;
        this.returnRequestRepository = returnRequestRepository;
        this.voucherRepository = voucherRepository;
        this.contentPageRepository = contentPageRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        log.info("Dang khoi tao du lieu mau...");
        User customer = upsertUser("customer@test.local", "Khach hang mau", "0900000001", User.Role.CUSTOMER, null);
        User vendor = upsertUser("vendor@test.local", "Nha ban hang mau", "0900000002", User.Role.VENDOR, null);
        User admin = upsertUser("admin@test.local", "Quan tri vien", "0900000003", User.Role.SUPER_ADMIN, null);

        ensureCart(customer);

        Store vendorStore = upsertVendorStore(vendor);
        if (!Objects.equals(vendor.getStoreId(), vendorStore.getId())) {
            vendor.setStoreId(vendorStore.getId());
            userRepository.save(vendor);
        }
        if (customer.getStoreId() != null) {
            customer.setStoreId(null);
            userRepository.save(customer);
        }
        if (admin.getStoreId() != null) {
            admin.setStoreId(null);
            userRepository.save(admin);
        }

        Category men = upsertCategory("Thoi trang nam", "thoi-trang-nam", "Danh muc cho san pham nam.", null, 1);
        Category women = upsertCategory("Thoi trang nu", "thoi-trang-nu", "Danh muc cho san pham nu.", null, 2);
        Category tshirt = upsertCategory("Ao thun", "ao-thun", "Ao thun co ban va nang cao.", men, 10);
        Category jeans = upsertCategory("Quan jeans", "quan-jeans", "Quan jeans nam nu.", men, 20);
        Category dress = upsertCategory("Dam vay", "dam-vay", "Dam vay cho nu.", women, 10);
        upsertCategory("Phu kien", "phu-kien", "Phu kien thoi trang.", null, 3);

        Product tshirtProduct = upsertProduct(
                "Ao thun cotton basic",
                "ao-thun-cotton-basic",
                vendorStore.getId(),
                tshirt,
                new BigDecimal("199000"),
                new BigDecimal("159000"),
                Product.Gender.UNISEX,
                Product.ProductStatus.ACTIVE,
                true,
                "Cotton 2 chieu",
                "Regular fit",
                "Mau ao thun basic ban chay."
        );
        ensurePrimaryImage(tshirtProduct, "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab", "Ao thun basic");
        ProductVariant tshirtM = upsertVariant(tshirtProduct, "TEE-BASIC-BLACK-M", "Den", "M", 120, new BigDecimal("0"), true);
        upsertVariant(tshirtProduct, "TEE-BASIC-WHITE-L", "Trang", "L", 80, new BigDecimal("10000"), true);

        Product jeansProduct = upsertProduct(
                "Quan jeans slim fit",
                "quan-jeans-slim-fit",
                vendorStore.getId(),
                jeans,
                new BigDecimal("399000"),
                new BigDecimal("329000"),
                Product.Gender.MALE,
                Product.ProductStatus.ACTIVE,
                false,
                "Denim co gian",
                "Slim fit",
                "Mau quan jeans slim fit cho shop vendor."
        );
        ensurePrimaryImage(jeansProduct, "https://images.unsplash.com/photo-1542272604-787c3835535d", "Quan jeans slim fit");
        ProductVariant jeans32 = upsertVariant(jeansProduct, "JEAN-SLIM-BLUE-32", "Xanh", "32", 45, new BigDecimal("0"), true);
        upsertVariant(jeansProduct, "JEAN-SLIM-BLUE-34", "Xanh", "34", 22, new BigDecimal("0"), true);

        Product dressProduct = upsertProduct(
                "Dam midi du tiec",
                "dam-midi-du-tiec",
                vendorStore.getId(),
                dress,
                new BigDecimal("499000"),
                new BigDecimal("449000"),
                Product.Gender.FEMALE,
                Product.ProductStatus.DRAFT,
                false,
                "Linen cao cap",
                "Slim fit",
                "Mau dam dang soan va chua mo ban."
        );
        ensurePrimaryImage(dressProduct, "https://images.unsplash.com/photo-1496747611176-843222e1e57c", "Dam midi du tiec");
        upsertVariant(dressProduct, "DRESS-MIDI-BEIGE-S", "Be", "S", 18, new BigDecimal("0"), true);

        Address customerAddress = ensureDefaultAddress(customer);

        Order deliveredOrder = upsertOrder(
                customer,
                customerAddress,
                vendorStore.getId(),
                Order.OrderStatus.DELIVERED,
                Order.PaymentMethod.BANK_TRANSFER,
                Order.PaymentStatus.PAID,
                "SEED_ORDER_DELIVERED",
                "GHN000123456",
                "GHN",
                new BigDecimal("20000"),
                new BigDecimal("15000")
        );
        OrderItem deliveredItem = ensureOrderItem(
                deliveredOrder,
                tshirtProduct,
                tshirtM,
                2,
                new BigDecimal("159000"),
                "Ao thun cotton basic",
                "Den / M",
                "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab",
                vendorStore.getId()
        );

        Order processingOrder = upsertOrder(
                customer,
                customerAddress,
                vendorStore.getId(),
                Order.OrderStatus.PROCESSING,
                Order.PaymentMethod.COD,
                Order.PaymentStatus.UNPAID,
                "SEED_ORDER_PROCESSING",
                null,
                null,
                new BigDecimal("25000"),
                new BigDecimal("0")
        );
        ensureOrderItem(
                processingOrder,
                jeansProduct,
                jeans32,
                1,
                new BigDecimal("329000"),
                "Quan jeans slim fit",
                "Xanh / 32",
                "https://images.unsplash.com/photo-1542272604-787c3835535d",
                vendorStore.getId()
        );

        upsertReturnRequest(deliveredOrder, customer, deliveredItem);

        upsertVoucher(vendorStore.getId(), "WELCOME10", "Voucher chao mung", Voucher.DiscountType.PERCENT, new BigDecimal("10"), new BigDecimal("299000"), 500, 120, Voucher.VoucherStatus.RUNNING);
        upsertVoucher(vendorStore.getId(), "FREESHIP50", "Voucher giam truc tiep", Voucher.DiscountType.FIXED, new BigDecimal("50000"), new BigDecimal("599000"), 250, 64, Voucher.VoucherStatus.PAUSED);

        upsertContent(
                ContentPage.ContentType.FAQ,
                "Thoi gian xu ly don hang",
                "Don hang thuong duoc xu ly trong 24 gio lam viec.",
                1
        );
        upsertContent(
                ContentPage.ContentType.POLICY,
                "Chinh sach doi tra",
                "Khach hang co the yeu cau doi tra trong 7 ngay ke tu khi nhan hang.",
                1
        );

        log.info("Da seed du lieu mau marketplace thanh cong (customer/vendor/admin + store/category/product/order/voucher/content).");
    }

    private User upsertUser(String email, String name, String phone, User.Role role, UUID storeId) {
        User user = userRepository.findByEmail(email).orElseGet(User::new);
        user.setEmail(email);
        user.setName(name);
        user.setPhone(phone);
        user.setRole(role);
        user.setStoreId(storeId);
        user.setIsActive(true);
        if (user.getPassword() == null || !passwordEncoder.matches(TEST_PASSWORD, user.getPassword())) {
            user.setPassword(passwordEncoder.encode(TEST_PASSWORD));
        }
        return userRepository.save(user);
    }

    private void ensureCart(User user) {
        cartRepository.findByUserId(user.getId()).ifPresentOrElse(existing -> {
            if (existing.getUser() == null) {
                existing.setUser(user);
                cartRepository.save(existing);
            }
        }, () -> {
            Cart cart = new Cart();
            cart.setUser(user);
            cart.setTotalAmount(new BigDecimal("0"));
            cartRepository.save(cart);
        });
    }

    private Store upsertVendorStore(User owner) {
        Store store = storeRepository.findByOwnerId(owner.getId())
                .or(() -> storeRepository.findBySlug("test-vendor-store"))
                .orElseGet(Store::new);

        store.setOwner(owner);
        store.setName("Test Vendor Store");
        store.setSlug("test-vendor-store");
        store.setDescription("Gian hang mau phuc vu kiem thu luong vendor.");
        store.setLogo("https://images.unsplash.com/photo-1521572163474-6864f9cf17ab");
        store.setBanner("https://images.unsplash.com/photo-1441986300917-64674bd600d8");
        store.setContactEmail(owner.getEmail());
        store.setPhone(owner.getPhone());
        store.setAddress("123 Nguyen Hue, Quan 1, TP.HCM");
        store.setBankName("Vietcombank");
        store.setBankAccountNumber("1234567890");
        store.setBankAccountHolder("NGUYEN VAN A");
        store.setBankVerified(true);
        store.setNotifyNewOrder(true);
        store.setNotifyOrderStatusChange(true);
        store.setNotifyLowStock(true);
        store.setNotifyPayoutComplete(true);
        store.setNotifyPromotions(false);
        store.setShipGhn(true);
        store.setShipGhtk(true);
        store.setShipExpress(false);
        store.setWarehouseAddress("123 Nguyen Hue, Quan 1, TP.HCM");
        store.setWarehouseContact("Nguyen Van A");
        store.setWarehousePhone("0901234567");
        store.setCommissionRate(new BigDecimal("5"));
        store.setStatus(Store.StoreStatus.ACTIVE);
        store.setApprovalStatus(Store.ApprovalStatus.APPROVED);
        store.setApprovedAt(LocalDateTime.now().minusDays(7));
        store.setApprovedBy("seed-system");
        store.setRejectionReason(null);
        store.setTotalSales(new BigDecimal("3400000"));
        store.setTotalOrders(24);
        store.setRating(4.7);

        return storeRepository.save(store);
    }

    private Category upsertCategory(String name, String slug, String description, Category parent, int sortOrder) {
        Category category = categoryRepository.findBySlug(slug).orElseGet(Category::new);
        category.setName(name);
        category.setSlug(slug);
        category.setDescription(description);
        category.setParent(parent);
        category.setSortOrder(sortOrder);
        if (category.getImage() == null || category.getImage().isBlank()) {
            category.setImage("https://images.unsplash.com/photo-1441986300917-64674bd600d8");
        }
        return categoryRepository.save(category);
    }

    private Product upsertProduct(
            String name,
            String slug,
            UUID storeId,
            Category category,
            BigDecimal basePrice,
            BigDecimal salePrice,
            Product.Gender gender,
            Product.ProductStatus status,
            boolean featured,
            String material,
            String fit,
            String description
    ) {
        Product product = productRepository.findBySlug(slug).orElseGet(Product::new);
        product.setName(name);
        product.setSlug(slug);
        product.setStoreId(storeId);
        product.setCategory(category);
        product.setBasePrice(basePrice);
        product.setSalePrice(salePrice);
        product.setGender(gender);
        product.setStatus(status);
        product.setIsFeatured(featured);
        product.setMaterial(material);
        product.setFit(fit);
        product.setDescription(description);
        return productRepository.save(product);
    }

    private void ensurePrimaryImage(Product product, String url, String alt) {
        if (product.getImages() == null) {
            product.setImages(new ArrayList<>());
        }

        ProductImage image = product.getImages().stream()
                .filter(img -> Boolean.TRUE.equals(img.getIsPrimary()))
                .findFirst()
                .orElseGet(() -> {
                    ProductImage newImage = new ProductImage();
                    product.getImages().add(newImage);
                    return newImage;
                });

        image.setProduct(product);
        image.setUrl(url);
        image.setAlt(alt);
        image.setSortOrder(0);
        image.setIsPrimary(true);
        productRepository.save(product);
    }

    private ProductVariant upsertVariant(
            Product product,
            String sku,
            String color,
            String size,
            int stockQuantity,
            BigDecimal priceAdjustment,
            boolean isActive
    ) {
        ProductVariant variant = productVariantRepository.findBySku(sku).orElseGet(ProductVariant::new);
        variant.setProduct(product);
        variant.setSku(sku);
        variant.setColor(color);
        variant.setSize(size);
        variant.setStockQuantity(stockQuantity);
        variant.setPriceAdjustment(priceAdjustment);
        variant.setIsActive(isActive);
        return productVariantRepository.save(variant);
    }

    private Address ensureDefaultAddress(User customer) {
        return addressRepository.findByUserIdOrderByIsDefaultDesc(customer.getId()).stream()
                .filter(address -> "SEED_DEFAULT_ADDRESS".equals(address.getLabel()))
                .findFirst()
                .map(address -> updateAddress(address, customer))
                .orElseGet(() -> {
                    Address address = new Address();
                    return addressRepository.save(updateAddress(address, customer));
                });
    }

    private Address updateAddress(Address address, User customer) {
        address.setUser(customer);
        address.setFullName("Khach hang mau");
        address.setPhone("0900000001");
        address.setProvince("TP.HCM");
        address.setDistrict("Quan 1");
        address.setWard("Ben Nghe");
        address.setDetail("123 Le Loi");
        address.setIsDefault(true);
        address.setLabel("SEED_DEFAULT_ADDRESS");
        return address;
    }

    private Order upsertOrder(
            User user,
            Address shippingAddress,
            UUID storeId,
            Order.OrderStatus status,
            Order.PaymentMethod paymentMethod,
            Order.PaymentStatus paymentStatus,
            String seedTag,
            String trackingNumber,
            String shippingCarrier,
            BigDecimal shippingFee,
            BigDecimal discount
    ) {
        Order order = orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .filter(existing -> seedTag.equals(existing.getNote()))
                .findFirst()
                .orElseGet(Order::new);

        order.setUser(user);
        order.setShippingAddress(shippingAddress);
        order.setStoreId(storeId);
        order.setStatus(status);
        order.setPaymentMethod(paymentMethod);
        order.setPaymentStatus(paymentStatus);
        order.setShippingFee(shippingFee);
        order.setDiscount(discount);
        order.setTrackingNumber(trackingNumber);
        order.setShippingCarrier(shippingCarrier);
        order.setParentOrder(null);
        order.setNote(seedTag);
        if (status == Order.OrderStatus.DELIVERED && order.getPaidAt() == null) {
            order.setPaidAt(LocalDateTime.now().minusDays(2));
        }
        if (order.getSubtotal() == null) {
            order.setSubtotal(new BigDecimal("0"));
        }
        order.calculateTotal();
        if (order.getCommissionFee() == null) {
            order.setCommissionFee(new BigDecimal("0"));
        }
        if (order.getVendorPayout() == null) {
            order.setVendorPayout(order.getTotal());
        }
        return orderRepository.save(order);
    }

    private OrderItem ensureOrderItem(
            Order order,
            Product product,
            ProductVariant variant,
            int quantity,
            BigDecimal unitPrice,
            String productName,
            String variantName,
            String image,
            UUID storeId
    ) {
        if (order.getItems() == null) {
            order.setItems(new ArrayList<>());
        }

        OrderItem item = order.getItems().stream()
                .filter(existing -> existing.getProduct() != null && existing.getProduct().getId().equals(product.getId()))
                .findFirst()
                .orElseGet(() -> {
                    OrderItem newItem = new OrderItem();
                    order.getItems().add(newItem);
                    return newItem;
                });

        item.setOrder(order);
        item.setProduct(product);
        item.setVariant(variant);
        item.setProductName(productName);
        item.setVariantName(variantName);
        item.setProductImage(image);
        item.setQuantity(quantity);
        item.setUnitPrice(unitPrice);
        item.setTotalPrice(unitPrice.multiply(BigDecimal.valueOf(quantity)));
        item.setStoreId(storeId);

        BigDecimal subtotal = order.getItems().stream()
                .map(OrderItem::getTotalPrice)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        order.setSubtotal(subtotal);
        order.calculateTotal();
        BigDecimal commission = order.getTotal().multiply(new BigDecimal("0.05"));
        order.setCommissionFee(commission);
        order.setVendorPayout(order.getTotal().subtract(commission));
        orderRepository.save(order);
        return item;
    }

    private void upsertReturnRequest(Order order, User user, OrderItem orderItem) {
        ReturnRequest request = returnRequestRepository.findAll().stream()
                .filter(existing -> "SEED_RETURN_PENDING".equals(existing.getNote()))
                .findFirst()
                .orElseGet(ReturnRequest::new);

        request.setOrder(order);
        request.setUser(user);
        request.setReason(ReturnRequest.ReturnReason.DEFECT);
        request.setResolution(ReturnRequest.ReturnResolution.REFUND);
        request.setStatus(ReturnRequest.ReturnStatus.PENDING);
        request.setNote("SEED_RETURN_PENDING");
        request.setAdminNote("Yeu cau doi tra mau cho trang quan tri.");
        request.setUpdatedBy("seed-system");
        request.setItems(new ArrayList<>(List.of(
                new ReturnRequest.ReturnItemSnapshot(
                        orderItem.getId(),
                        orderItem.getProductName(),
                        orderItem.getVariantName(),
                        orderItem.getProductImage(),
                        1,
                        orderItem.getUnitPrice()
                )
        )));
        returnRequestRepository.save(request);
    }

    private void upsertVoucher(
            UUID storeId,
            String code,
            String name,
            Voucher.DiscountType discountType,
            BigDecimal discountValue,
            BigDecimal minOrderValue,
            int totalIssued,
            int usedCount,
            Voucher.VoucherStatus status
    ) {
        Voucher voucher = voucherRepository.findByStoreIdAndCode(storeId, code).orElseGet(Voucher::new);
        voucher.setStoreId(storeId);
        voucher.setCode(code);
        voucher.setName(name);
        voucher.setDescription("Voucher du lieu mau phuc vu kiem thu.");
        voucher.setDiscountType(discountType);
        voucher.setDiscountValue(discountValue);
        voucher.setMinOrderValue(minOrderValue);
        voucher.setTotalIssued(totalIssued);
        voucher.setUsedCount(usedCount);
        voucher.setStartDate(LocalDate.now().minusDays(2));
        voucher.setEndDate(LocalDate.now().plusDays(20));
        voucher.setStatus(status);
        voucher.setUpdatedBy("seed-system");
        voucherRepository.save(voucher);
    }

    private void upsertContent(ContentPage.ContentType type, String title, String body, int displayOrder) {
        ContentPage content = contentPageRepository.findByTypeOrderByDisplayOrderAscUpdatedAtDesc(type).stream()
                .filter(page -> title.equalsIgnoreCase(page.getTitle()))
                .min(Comparator.comparing(ContentPage::getUpdatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .orElseGet(ContentPage::new);
        content.setType(type);
        content.setTitle(title);
        content.setBody(body);
        content.setDisplayOrder(displayOrder);
        content.setUpdatedBy("seed-system");
        contentPageRepository.save(content);
    }
}
