package vn.edu.hcmuaf.fit.fashionstore.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.edu.hcmuaf.fit.fashionstore.dto.request.ProductRequest;
import vn.edu.hcmuaf.fit.fashionstore.dto.response.VendorProductPageResponse;
import vn.edu.hcmuaf.fit.fashionstore.dto.response.VendorProductSummaryResponse;
import vn.edu.hcmuaf.fit.fashionstore.entity.Category;
import vn.edu.hcmuaf.fit.fashionstore.entity.Product;
import vn.edu.hcmuaf.fit.fashionstore.entity.ProductImage;
import vn.edu.hcmuaf.fit.fashionstore.entity.ProductVariant;
import vn.edu.hcmuaf.fit.fashionstore.entity.Product.Gender;
import vn.edu.hcmuaf.fit.fashionstore.entity.Product.ProductStatus;
import vn.edu.hcmuaf.fit.fashionstore.entity.Store;
import vn.edu.hcmuaf.fit.fashionstore.exception.ForbiddenException;
import vn.edu.hcmuaf.fit.fashionstore.exception.ResourceNotFoundException;
import vn.edu.hcmuaf.fit.fashionstore.repository.CategoryRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.ProductRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.ProductVariantRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.StoreRepository;

import java.util.ArrayList;
import java.util.List;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductVariantRepository productVariantRepository;
    private final StoreRepository storeRepository;

    private static final int LOW_STOCK_THRESHOLD = 10;

    public enum InventoryState {
        LOW,
        OUT
    }

    public ProductService(
            ProductRepository productRepository,
            CategoryRepository categoryRepository,
            ProductVariantRepository productVariantRepository,
            StoreRepository storeRepository
    ) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.productVariantRepository = productVariantRepository;
        this.storeRepository = storeRepository;
    }

    // ─── Public Methods (No tenant filtering) ──────────────────────────────────

    public List<Product> findAll() {
        return productRepository.findAllPublicProducts();
    }

    public Product findById(UUID id) {
        return productRepository.findPublicById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
    }

    public Product findByIdIncludingInactive(UUID id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
    }

    public Product findBySlug(String slug) {
        return productRepository.findPublicBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
    }

    // ─── Vendor-scoped Methods (Multi-tenant) ──────────────────────────────────

    /**
     * Find all products for a specific store (vendor's view)
     */
    public Page<Product> findByStoreId(UUID storeId, Pageable pageable) {
        return productRepository.findByStoreId(storeId, pageable);
    }

    /**
     * Find active products for a store (public storefront)
     */
    public Page<Product> findActiveByStoreId(UUID storeId, Pageable pageable) {
        return productRepository.findActiveByStoreId(storeId, pageable);
    }

    /**
     * Find active products by store identifier (UUID or slug)
     */
    public Page<Product> findActiveByStoreIdentifier(String identifier, Pageable pageable) {
        try {
            UUID storeId = UUID.fromString(identifier);
            return productRepository.findActiveByStoreId(storeId, pageable);
        } catch (IllegalArgumentException ex) {
            Store store = storeRepository.findBySlug(identifier)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Store not found"));
            return productRepository.findActiveByStoreId(store.getId(), pageable);
        }
    }

    /**
     * Find product by ID with ownership check (for vendor operations)
     */
    public Product findByIdAndStoreId(UUID id, UUID storeId) {
        return productRepository.findByIdAndStoreId(id, storeId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found or access denied"));
    }

    /**
     * Search products within a store
     */
    public Page<Product> searchByStoreId(UUID storeId, String keyword, Pageable pageable) {
        return productRepository.searchProductsByStore(storeId, keyword, pageable);
    }

    @Transactional(readOnly = true)
    public VendorProductPageResponse getVendorProductPage(
            UUID storeId,
            ProductStatus status,
            String keyword,
            UUID categoryId,
            InventoryState inventoryState,
            Pageable pageable
    ) {
        Page<Product> page = productRepository.searchVendorProducts(
                storeId,
                status,
                normalizeKeyword(keyword),
                categoryId,
                inventoryState == null ? null : inventoryState.name(),
                LOW_STOCK_THRESHOLD,
                pageable
        );

        return VendorProductPageResponse.builder()
                .content(page.getContent().stream().map(this::toVendorProductSummaryResponse).toList())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .number(page.getNumber())
                .size(page.getSize())
                .statusCounts(buildVendorStatusCounts(storeId))
                .build();
    }

    /**
     * Get product count for a store (dashboard metric)
     */
    public long countByStoreId(UUID storeId) {
        return productRepository.countByStoreId(storeId);
    }

    private VendorProductPageResponse.StatusCounts buildVendorStatusCounts(UUID storeId) {
        return VendorProductPageResponse.StatusCounts.builder()
                .all(productRepository.countByStoreIdExcludingArchived(storeId))
                .active(productRepository.countByStoreIdAndStatus(storeId, ProductStatus.ACTIVE))
                .draft(
                        productRepository.countByStoreIdAndStatus(storeId, ProductStatus.DRAFT)
                                + productRepository.countByStoreIdAndStatus(storeId, ProductStatus.INACTIVE)
                )
                .outOfStock(productRepository.countOutOfStockByStoreId(storeId))
                .lowStock(productRepository.countLowStockByStoreId(storeId, LOW_STOCK_THRESHOLD))
                .build();
    }

    // ─── Create (Vendor must provide storeId) ──────────────────────────────────

    @Transactional
    public Product create(ProductRequest request) {
        // Legacy: no storeId - platform product
        return createForStore(request, null);
    }

    /**
     * Create product for a specific store (vendor operation)
     */
    @Transactional
    public Product createForStore(ProductRequest request, UUID storeId) {
        ProductStatus status = parseStatus(request.getStatus()).orElse(ProductStatus.DRAFT);
        validateBasicRequest(request);

        if (request.getName() == null || request.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product name is required");
        }

        if (request.getSku() == null || request.getSku().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "SKU is required");
        }

        if (request.getCategoryId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category is required");
        }

        if (request.getImageUrl() == null || request.getImageUrl().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image URL is required");
        }

        BigDecimal effectivePrice = request.getSalePrice() != null && request.getSalePrice().compareTo(BigDecimal.ZERO) > 0
                ? request.getSalePrice()
                : (request.getBasePrice() == null ? BigDecimal.ZERO : request.getBasePrice());
        if (effectivePrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Price must be greater than 0");
        }

        Product product = Product.builder()
                .name(request.getName())
                .slug(request.getSlug())
                .storeId(storeId)  // Set store ownership
                .description(request.getDescription())
                .basePrice(request.getBasePrice())
                .salePrice(request.getSalePrice())
                .material(request.getMaterial())
                .fit(request.getFit())
                .status(status)
                .build();

        if (request.getGender() != null) {
            product.setGender(Gender.valueOf(request.getGender().toUpperCase()));
        }

        Category category = resolveLeafCategoryOrThrow(request.getCategoryId());
        product.setCategory(category);

        syncPrimaryImage(product, request.getImageUrl());
        syncPrimaryVariant(product, request.getSku(), request.getStockQuantity());
        validatePublishRules(product, status);
        validateSlugUniquenessForCreate(product.getSlug());
        validateSkuUniqueness(product, request.getSku(), null);

        return productRepository.save(product);
    }

    @Transactional
    public VendorProductSummaryResponse createVendorProduct(ProductRequest request, UUID storeId) {
        Product created = createForStore(request, storeId);
        return toVendorProductSummaryResponse(created);
    }

    // ─── Update (With ownership validation) ────────────────────────────────────

    /**
     * Legacy update - no ownership check (admin only)
     */
    @Transactional
    public Product update(UUID id, ProductRequest request) {
        Product product = findByIdIncludingInactive(id);
        return applyUpdates(product, request);
    }

    /**
     * Update product with ownership validation (vendor operation)
     * @throws ForbiddenException if vendor doesn't own the product
     */
    @Transactional
    public Product updateForStore(UUID id, UUID storeId, ProductRequest request) {
        Product product = productRepository.findByIdAndStoreId(id, storeId)
                .orElseThrow(() -> new ForbiddenException("Product not found or you don't have permission to edit it"));
        
        return applyUpdates(product, request);
    }

    @Transactional
    public VendorProductSummaryResponse updateVendorProduct(UUID id, UUID storeId, ProductRequest request) {
        Product updated = updateForStore(id, storeId, request);
        return toVendorProductSummaryResponse(updated);
    }

    @Transactional
    public VendorProductSummaryResponse updateProductSummary(UUID id, ProductRequest request) {
        Product updated = update(id, request);
        return toVendorProductSummaryResponse(updated);
    }

    private Product applyUpdates(Product product, ProductRequest request) {
        validateBasicRequest(request);
        if (request.getName() != null) product.setName(request.getName());
        if (request.getSlug() != null) product.setSlug(request.getSlug());
        if (request.getDescription() != null) product.setDescription(request.getDescription());
        if (request.getBasePrice() != null) product.setBasePrice(request.getBasePrice());
        if (request.getSalePrice() != null) product.setSalePrice(request.getSalePrice());
        if (request.getMaterial() != null) product.setMaterial(request.getMaterial());
        if (request.getFit() != null) product.setFit(request.getFit());
        if (request.getGender() != null) {
            product.setGender(Gender.valueOf(request.getGender().toUpperCase()));
        }
        parseStatus(request.getStatus()).ifPresent(product::setStatus);
        if (request.getCategoryId() != null) {
            Category category = resolveLeafCategoryOrThrow(request.getCategoryId());
            product.setCategory(category);
        }
        syncPrimaryImage(product, request.getImageUrl());
        syncPrimaryVariant(product, request.getSku(), request.getStockQuantity());
        validatePublishRules(product, product.getStatus());
        validateSlugUniquenessForUpdate(product.getSlug(), product.getId());
        validateSkuUniqueness(product, request.getSku(), product.getId());

        return productRepository.save(product);
    }

    private Optional<ProductStatus> parseStatus(String rawStatus) {
        if (rawStatus == null || rawStatus.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(ProductStatus.valueOf(rawStatus.trim().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported product status: " + rawStatus);
        }
    }

    private void syncPrimaryImage(Product product, String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return;
        }

        List<ProductImage> images = ensureImageList(product);

        ProductImage image = images.stream()
                .filter(existing -> Boolean.TRUE.equals(existing.getIsPrimary()))
                .findFirst()
                .orElseGet(() -> images.stream().findFirst().orElse(null));

        if (image == null) {
            ProductImage newImage = ProductImage.builder()
                    .product(product)
                    .url(imageUrl.trim())
                    .alt(product.getName())
                    .sortOrder(0)
                    .isPrimary(true)
                    .build();
            images.add(newImage);
            return;
        }

        image.setUrl(imageUrl.trim());
        if (image.getAlt() == null || image.getAlt().isBlank()) {
            image.setAlt(product.getName());
        }
        if (image.getSortOrder() == null) {
            image.setSortOrder(0);
        }
        if (image.getIsPrimary() == null) {
            image.setIsPrimary(true);
        }
    }

    private void syncPrimaryVariant(Product product, String sku, Integer stockQuantity) {
        if ((sku == null || sku.isBlank()) && stockQuantity == null) {
            return;
        }

        List<ProductVariant> variants = ensureVariantList(product);

        ProductVariant variant = variants.stream()
                .filter(existing -> Boolean.TRUE.equals(existing.getIsActive()))
                .findFirst()
                .orElseGet(() -> variants.stream().findFirst().orElse(null));

        if (variant == null) {
            String fallbackSku = sku != null && !sku.isBlank()
                    ? sku.trim().toUpperCase(Locale.ROOT)
                    : "SKU-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
            ProductVariant newVariant = ProductVariant.builder()
                    .product(product)
                    .sku(fallbackSku)
                    .color("Default")
                    .size("Default")
                    .stockQuantity(Math.max(0, stockQuantity == null ? 0 : stockQuantity))
                    .priceAdjustment(BigDecimal.ZERO)
                    .isActive(true)
                    .build();
            variants.add(newVariant);
            return;
        }

        if (sku != null && !sku.isBlank()) {
            variant.setSku(sku.trim().toUpperCase(Locale.ROOT));
        }
        if (stockQuantity != null) {
            variant.setStockQuantity(Math.max(0, stockQuantity));
        }
        if (variant.getColor() == null || variant.getColor().isBlank()) {
            variant.setColor("Default");
        }
        if (variant.getSize() == null || variant.getSize().isBlank()) {
            variant.setSize("Default");
        }
        if (variant.getPriceAdjustment() == null) {
            variant.setPriceAdjustment(BigDecimal.ZERO);
        }
        if (variant.getIsActive() == null) {
            variant.setIsActive(true);
        }
    }

    // ─── Delete (With ownership validation) ────────────────────────────────────

    /**
     * Legacy delete - no ownership check (admin only)
     */
    @Transactional
    public void delete(UUID id) {
        Product product = findByIdIncludingInactive(id);
        product.setStatus(ProductStatus.INACTIVE);
        productRepository.save(product);
    }

    /**
     * Delete product with ownership validation (vendor operation)
     * @throws ForbiddenException if vendor doesn't own the product
     */
    @Transactional
    public void deleteForStore(UUID id, UUID storeId) {
        Product product = productRepository.findByIdAndStoreId(id, storeId)
                .orElseThrow(() -> new ForbiddenException("Product not found or you don't have permission to delete it"));
        
        product.setStatus(ProductStatus.INACTIVE);
        productRepository.save(product);
    }

    public VendorProductSummaryResponse toVendorProductSummaryResponse(Product product) {
        List<ProductVariant> variants = ensureVariantList(product);
        List<ProductImage> images = ensureImageList(product);

        String primarySku = variants.stream()
                .filter(variant -> Boolean.TRUE.equals(variant.getIsActive()))
                .map(ProductVariant::getSku)
                .filter(sku -> sku != null && !sku.isBlank())
                .findFirst()
                .orElse("");

        Integer totalStock = variants.stream()
                .filter(variant -> Boolean.TRUE.equals(variant.getIsActive()))
                .map(ProductVariant::getStockQuantity)
                .filter(quantity -> quantity != null && quantity > 0)
                .reduce(0, Integer::sum);

        String primaryImage = images.stream()
                .sorted((left, right) -> Boolean.compare(Boolean.TRUE.equals(right.getIsPrimary()), Boolean.TRUE.equals(left.getIsPrimary())))
                .map(ProductImage::getUrl)
                .filter(url -> url != null && !url.isBlank())
                .findFirst()
                .orElse(null);

        return VendorProductSummaryResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .slug(product.getSlug())
                .description(product.getDescription())
                .status(product.getStatus() == null ? null : product.getStatus().name())
                .visible(product.getStatus() == ProductStatus.ACTIVE)
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .basePrice(product.getBasePrice())
                .salePrice(product.getSalePrice())
                .effectivePrice(product.getEffectivePrice())
                .totalStock(totalStock)
                .primarySku(primarySku)
                .primaryImage(primaryImage)
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }

    private void validateBasicRequest(ProductRequest request) {
        if (request.getBasePrice() != null && request.getBasePrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Base price must be greater than or equal to 0");
        }

        if (request.getSalePrice() != null && request.getSalePrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sale price must be greater than or equal to 0");
        }

        if (request.getStockQuantity() != null && request.getStockQuantity() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Stock quantity must be greater than or equal to 0");
        }
    }

    private void validatePublishRules(Product product, ProductStatus status) {
        if (status != ProductStatus.ACTIVE) {
            return;
        }

        if (product.getName() == null || product.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product name is required before publishing");
        }

        if (product.getCategory() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category is required before publishing");
        }

        if (categoryRepository.existsByParentId(product.getCategory().getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please choose a leaf category before publishing");
        }

        BigDecimal effectivePrice = product.getEffectivePrice();
        if (effectivePrice == null || effectivePrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Price must be greater than 0 before publishing");
        }

        boolean hasPrimaryImage = ensureImageList(product).stream()
                .map(ProductImage::getUrl)
                .anyMatch(url -> url != null && !url.isBlank());
        if (!hasPrimaryImage) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Primary image is required before publishing");
        }

        boolean hasSku = ensureVariantList(product).stream()
                .filter(variant -> Boolean.TRUE.equals(variant.getIsActive()))
                .map(ProductVariant::getSku)
                .anyMatch(sku -> sku != null && !sku.isBlank());
        if (!hasSku) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "SKU is required before publishing");
        }
    }

    private void validateSlugUniquenessForCreate(String slug) {
        if (slug == null || slug.isBlank()) {
            return;
        }

        if (productRepository.existsBySlugIgnoreCase(slug.trim())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Slug already exists");
        }
    }

    private void validateSlugUniquenessForUpdate(String slug, UUID productId) {
        if (slug == null || slug.isBlank()) {
            return;
        }

        if (productRepository.existsBySlugIgnoreCaseAndIdNot(slug.trim(), productId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Slug already exists");
        }
    }

    private void validateSkuUniqueness(Product product, String skuFromRequest, UUID productId) {
        String requestedSku = skuFromRequest == null ? null : skuFromRequest.trim();
        if (requestedSku == null || requestedSku.isEmpty()) {
            requestedSku = ensureVariantList(product).stream()
                    .map(ProductVariant::getSku)
                    .filter(sku -> sku != null && !sku.isBlank())
                    .findFirst()
                    .orElse(null);
        }

        if (requestedSku == null || requestedSku.isBlank()) {
            return;
        }

        UUID effectiveProductId = productId != null ? productId : product.getId();
        if (effectiveProductId == null) {
            productVariantRepository.findBySku(requestedSku.toUpperCase(Locale.ROOT))
                    .ifPresent(variant -> {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "SKU already exists in marketplace");
                    });
            return;
        }

        productVariantRepository.findConflictingSku(requestedSku, effectiveProductId)
                .ifPresent(variant -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "SKU already exists in marketplace");
                });
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null) {
            return null;
        }

        String normalized = keyword.trim().toLowerCase(Locale.ROOT);
        return normalized.isEmpty() ? null : normalized;
    }

    private Category resolveLeafCategoryOrThrow(UUID categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        if (categoryRepository.existsByParentId(category.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please choose a leaf category");
        }

        return category;
    }

    private List<ProductImage> ensureImageList(Product product) {
        if (product.getImages() == null) {
            product.setImages(new ArrayList<>());
        }
        return product.getImages();
    }

    private List<ProductVariant> ensureVariantList(Product product) {
        if (product.getVariants() == null) {
            product.setVariants(new ArrayList<>());
        }
        return product.getVariants();
    }
}
