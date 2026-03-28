package vn.edu.hcmuaf.fit.fashionstore.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmuaf.fit.fashionstore.dto.request.StockAdjustmentRequest;
import vn.edu.hcmuaf.fit.fashionstore.dto.response.AdminProductResponse;
import vn.edu.hcmuaf.fit.fashionstore.dto.response.AdminVariantResponse;
import vn.edu.hcmuaf.fit.fashionstore.dto.response.InventoryLedgerResponse;
import vn.edu.hcmuaf.fit.fashionstore.entity.InventoryLedger;
import vn.edu.hcmuaf.fit.fashionstore.entity.Product;
import vn.edu.hcmuaf.fit.fashionstore.entity.ProductVariant;
import vn.edu.hcmuaf.fit.fashionstore.repository.InventoryLedgerRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.ProductRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.ProductVariantRepository;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminProductService {

    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final InventoryLedgerRepository ledgerRepository;

    public Page<AdminProductResponse> getAdminProducts(Pageable pageable) {
        return productRepository.findAll(pageable).map(this::toAdminProductResponse);
    }

    public AdminProductResponse getProductBySku(String sku) {
        Product p = productRepository.findBySku(sku).orElseThrow(() -> new RuntimeException("Product not found"));
        return toAdminProductResponse(p);
    }

    @Transactional
    public void adjustStock(StockAdjustmentRequest request, String actor) {
        Product product = productRepository.findBySku(request.getSku()).orElse(null);
        if (product != null) {
            int delta = request.getAfter() - request.getBefore();
            product.setStockQuantity(request.getAfter());
            productRepository.save(product);

            InventoryLedger ledger = InventoryLedger.builder()
                    .productSku(product.getSku())
                    .actor(actor)
                    .source(InventoryLedger.InventorySource.MANUAL_ADJUSTMENT)
                    .reason(request.getSuggestedReason())
                    .delta(delta)
                    .beforeStock(request.getBefore())
                    .afterStock(request.getAfter())
                    .build();
            ledgerRepository.save(ledger);
            return;
        }

        ProductVariant variant = productVariantRepository.findBySku(request.getSku())
                .orElseThrow(() -> new RuntimeException("Product or Variant not found"));

        int delta = request.getAfter() - request.getBefore();
        variant.setStockQuantity(request.getAfter());
        productVariantRepository.save(variant);

        InventoryLedger ledger = InventoryLedger.builder()
                .productSku(variant.getSku())
                .actor(actor)
                .source(InventoryLedger.InventorySource.MANUAL_ADJUSTMENT)
                .reason(request.getSuggestedReason())
                .delta(delta)
                .beforeStock(request.getBefore())
                .afterStock(request.getAfter())
                .build();
        ledgerRepository.save(ledger);
        
        // Update parent product stock as sum of variants
        Product parent = variant.getProduct();
        int totalStock = parent.getVariants().stream().mapToInt(ProductVariant::getStockQuantity).sum();
        parent.setStockQuantity(totalStock);
        productRepository.save(parent);
    }

    @Transactional
    public void updatePrice(String sku, Double price) {
        Product product = productRepository.findBySku(sku).orElse(null);
        if (product != null) {
            product.setBasePrice(java.math.BigDecimal.valueOf(price));
            productRepository.save(product);
            return;
        }

        ProductVariant variant = productVariantRepository.findBySku(sku)
                .orElseThrow(() -> new RuntimeException("Product or Variant not found"));
        // Assuming priceAdjustment is used, simplify by setting basePrice on parent for now or handle appropriately.
        // For simple update based on AdminProducts UI we'll update basePrice on parent if it's a sku match 
        // to simplify for 'admin product record'. If variant, maybe don't update from this generic updatePrice.
        // Wait! The UI calls updateProductPrice(sku, value). The 'sku' belongs to AdminProductRecord which 
        // maps to Product.sku (or ID).
        throw new RuntimeException("Cannot update price directly on variant from this endpoint");
    }

    private AdminProductResponse toAdminProductResponse(Product product) {
        List<AdminVariantResponse> matrix = product.getVariants().stream().map(v -> 
            AdminVariantResponse.builder()
                .id(v.getId().toString())
                .size(v.getSize())
                .color(v.getColor())
                .sku(v.getSku())
                .price(v.getPrice().doubleValue())
                .stock(v.getStockQuantity())
                .build()
        ).toList();

        List<InventoryLedgerResponse> ledger = ledgerRepository
                .findByProductSkuOrderByCreatedAtDesc(product.getSku() != null ? product.getSku() : product.getId().toString(), Pageable.ofSize(10))
                .stream().map(l -> InventoryLedgerResponse.builder()
                        .id(l.getId().toString())
                        .at(l.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                        .actor(l.getActor())
                        .source(l.getSource().name().toLowerCase())
                        .reason(l.getReason())
                        .delta(l.getDelta())
                        .beforeStock(l.getBeforeStock())
                        .afterStock(l.getAfterStock())
                        .build()
                ).toList();

        int totalStock = product.getVariants().isEmpty() ? product.getStockQuantity() : 
            product.getVariants().stream().mapToInt(ProductVariant::getStockQuantity).sum();

        String statusType = totalStock <= 0 ? "out" : (totalStock < 10 ? "low" : "active");
        String status = totalStock <= 0 ? "Hết hàng" : (totalStock < 10 ? "Sắp hết" : "Đang bán");

        String thumb = product.getImages().isEmpty() ? "" : product.getImages().get(0).getUrl();

        return AdminProductResponse.builder()
                .id(product.getId())
                .sku(product.getSku() != null ? product.getSku() : product.getId().toString())
                .name(product.getName())
                .category(product.getCategory() != null ? product.getCategory().getName() : "")
                .price(product.getEffectivePrice().doubleValue())
                .stock(totalStock)
                .status(status)
                .statusType(statusType)
                .variants(product.getVariants().size() + " variants")
                .thumb(thumb)
                .variantMatrix(matrix)
                .inventoryLedger(ledger)
                .version(1)
                .updatedAt(product.getUpdatedAt())
                .build();
    }
}
