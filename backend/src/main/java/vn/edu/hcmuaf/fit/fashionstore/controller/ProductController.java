package vn.edu.hcmuaf.fit.fashionstore.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.edu.hcmuaf.fit.fashionstore.dto.request.ProductRequest;
import vn.edu.hcmuaf.fit.fashionstore.entity.Product;
import vn.edu.hcmuaf.fit.fashionstore.security.AuthContext;
import vn.edu.hcmuaf.fit.fashionstore.security.AuthContext.UserContext;
import vn.edu.hcmuaf.fit.fashionstore.service.ProductService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;
    private final AuthContext authContext;

    public ProductController(ProductService productService, AuthContext authContext) {
        this.productService = productService;
        this.authContext = authContext;
    }

    // ─── Public Endpoints ──────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<Product>> getAll() {
        return ResponseEntity.ok(productService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(productService.findById(id));
    }

    @GetMapping("/slug/{slug}")
    public ResponseEntity<Product> getBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(productService.findBySlug(slug));
    }

    // ─── Store-scoped Public Endpoints ─────────────────────────────────────────

    @GetMapping("/store/{storeId}")
    public ResponseEntity<Page<Product>> getByStore(
            @PathVariable UUID storeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(productService.findActiveByStoreId(storeId, pageable));
    }

    // ─── Vendor Endpoints (Requires VENDOR or SUPER_ADMIN role) ────────────────

    /**
     * List products for current vendor's store
     */
    @GetMapping("/my-store")
    @PreAuthorize("hasAnyRole('VENDOR', 'SUPER_ADMIN')")
    public ResponseEntity<Page<Product>> getMyStoreProducts(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UserContext ctx = authContext.requireVendor(authHeader);
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(productService.findByStoreId(ctx.getStoreId(), pageable));
    }

    /**
     * Create product for vendor's store
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('VENDOR', 'SUPER_ADMIN')")
    public ResponseEntity<Product> create(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody ProductRequest request) {
        UserContext ctx = authContext.requireVendor(authHeader);
        UUID storeId = authContext.resolveStoreId(ctx, null);
        return ResponseEntity.ok(productService.createForStore(request, storeId));
    }

    /**
     * Update product - vendors can only update their own products
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('VENDOR', 'SUPER_ADMIN')")
    public ResponseEntity<Product> update(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id,
            @RequestBody ProductRequest request) {
        UserContext ctx = authContext.fromAuthHeader(authHeader);
        
        if (ctx.isAdmin()) {
            // Admin can update any product
            return ResponseEntity.ok(productService.update(id, request));
        } else {
            // Vendor can only update own products
            return ResponseEntity.ok(productService.updateForStore(id, ctx.getStoreId(), request));
        }
    }

    /**
     * Patch product - vendors can only patch their own products
     */
    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('VENDOR', 'SUPER_ADMIN')")
    public ResponseEntity<Product> patch(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id,
            @RequestBody ProductRequest request) {
        return update(authHeader, id, request); // Same logic as PUT
    }

    /**
     * Delete product - vendors can only delete their own products
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('VENDOR', 'SUPER_ADMIN')")
    public ResponseEntity<Void> delete(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable UUID id) {
        UserContext ctx = authContext.fromAuthHeader(authHeader);
        
        if (ctx.isAdmin()) {
            // Admin can delete any product
            productService.delete(id);
        } else {
            // Vendor can only delete own products
            productService.deleteForStore(id, ctx.getStoreId());
        }
        
        return ResponseEntity.noContent().build();
    }

    // ─── Admin Endpoints ───────────────────────────────────────────────────────

    /**
     * Get product count for a specific store (admin dashboard)
     */
    @GetMapping("/admin/store/{storeId}/count")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Long> getStoreProductCount(@PathVariable UUID storeId) {
        return ResponseEntity.ok(productService.countByStoreId(storeId));
    }
}
