package vn.edu.hcmuaf.fit.fashionstore.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmuaf.fit.fashionstore.dto.request.ProductRequest;
import vn.edu.hcmuaf.fit.fashionstore.entity.Category;
import vn.edu.hcmuaf.fit.fashionstore.entity.Product;
import vn.edu.hcmuaf.fit.fashionstore.entity.Product.Gender;
import vn.edu.hcmuaf.fit.fashionstore.entity.Product.ProductStatus;
import vn.edu.hcmuaf.fit.fashionstore.exception.ForbiddenException;
import vn.edu.hcmuaf.fit.fashionstore.exception.ResourceNotFoundException;
import vn.edu.hcmuaf.fit.fashionstore.repository.CategoryRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.ProductRepository;

import java.util.List;
import java.util.UUID;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    public ProductService(ProductRepository productRepository, CategoryRepository categoryRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
    }

    // ─── Public Methods (No tenant filtering) ──────────────────────────────────

    public List<Product> findAll() {
        return productRepository.findAllPublicProducts();
    }

    public Product findById(UUID id) {
        return productRepository.findPublicById(id)
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

    /**
     * Get product count for a store (dashboard metric)
     */
    public long countByStoreId(UUID storeId) {
        return productRepository.countByStoreId(storeId);
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
        Product product = Product.builder()
                .name(request.getName())
                .slug(request.getSlug())
                .storeId(storeId)  // Set store ownership
                .description(request.getDescription())
                .basePrice(request.getBasePrice())
                .salePrice(request.getSalePrice())
                .material(request.getMaterial())
                .fit(request.getFit())
                .status(ProductStatus.ACTIVE)
                .build();

        if (request.getGender() != null) {
            product.setGender(Gender.valueOf(request.getGender().toUpperCase()));
        }

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
            product.setCategory(category);
        }

        return productRepository.save(product);
    }

    // ─── Update (With ownership validation) ────────────────────────────────────

    /**
     * Legacy update - no ownership check (admin only)
     */
    @Transactional
    public Product update(UUID id, ProductRequest request) {
        Product product = findById(id);
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

    private Product applyUpdates(Product product, ProductRequest request) {
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
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
            product.setCategory(category);
        }

        return productRepository.save(product);
    }

    // ─── Delete (With ownership validation) ────────────────────────────────────

    /**
     * Legacy delete - no ownership check (admin only)
     */
    @Transactional
    public void delete(UUID id) {
        Product product = findById(id);
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
}
