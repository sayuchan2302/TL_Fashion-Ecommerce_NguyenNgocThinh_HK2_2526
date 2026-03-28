package vn.edu.hcmuaf.fit.fashionstore.service;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.edu.hcmuaf.fit.fashionstore.dto.request.VoucherRequest;
import vn.edu.hcmuaf.fit.fashionstore.dto.request.VoucherStatusUpdateRequest;
import vn.edu.hcmuaf.fit.fashionstore.dto.response.VoucherListResponse;
import vn.edu.hcmuaf.fit.fashionstore.dto.response.VoucherResponse;
import java.math.BigDecimal;
import vn.edu.hcmuaf.fit.fashionstore.entity.Voucher;
import vn.edu.hcmuaf.fit.fashionstore.repository.VoucherRepository;

import java.time.LocalDate;
import java.util.Locale;
import java.util.UUID;

@Service
public class VoucherService {

    private final VoucherRepository voucherRepository;

    public VoucherService(VoucherRepository voucherRepository) {
        this.voucherRepository = voucherRepository;
    }

    @Transactional(readOnly = true)
    public VoucherListResponse list(UUID storeId, Voucher.VoucherStatus status, String keyword, Pageable pageable) {
        String normalizedKeyword = normalizeKeyword(keyword);
        Page<Voucher> page = voucherRepository.searchByStore(storeId, status, normalizedKeyword, pageable);

        return VoucherListResponse.builder()
                .items(page.map(this::toResponse).getContent())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .page(pageable.getPageNumber() + 1)
                .pageSize(pageable.getPageSize())
                .totalUsage(voucherRepository.sumUsedCountByStoreId(storeId))
                .counts(VoucherListResponse.Counts.builder()
                        .all(voucherRepository.countByStoreId(storeId))
                        .running(voucherRepository.countByStoreIdAndStatus(storeId, Voucher.VoucherStatus.RUNNING))
                        .paused(voucherRepository.countByStoreIdAndStatus(storeId, Voucher.VoucherStatus.PAUSED))
                        .draft(voucherRepository.countByStoreIdAndStatus(storeId, Voucher.VoucherStatus.DRAFT))
                        .build())
                .build();
    }

    @Transactional(readOnly = true)
    public VoucherResponse get(UUID storeId, UUID voucherId) {
        Voucher voucher = getOwnedVoucher(storeId, voucherId);
        return toResponse(voucher);
    }

    @Transactional
    public VoucherResponse create(UUID storeId, VoucherRequest request, String actor) {
        validateRequest(request);
        String normalizedCode = normalizeCode(request.getCode());

        Voucher voucher = Voucher.builder()
                .storeId(storeId)
                .name(request.getName().trim())
                .code(normalizedCode)
                .description(normalizeDescription(request.getDescription()))
                .discountType(request.getDiscountType())
                .discountValue(request.getDiscountValue())
                .minOrderValue(safeMinOrder(request.getMinOrderValue()))
                .totalIssued(request.getTotalIssued())
                .usedCount(0)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .status(request.getStatus() == null ? Voucher.VoucherStatus.DRAFT : request.getStatus())
                .updatedBy(actor)
                .build();

        try {
            Voucher saved = voucherRepository.save(voucher);
            return toResponse(saved);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Voucher code already exists in this store");
        }
    }

    @Transactional
    public VoucherResponse update(UUID storeId, UUID voucherId, VoucherRequest request, String actor) {
        validateRequest(request);
        Voucher voucher = getOwnedVoucher(storeId, voucherId);
        String normalizedCode = normalizeCode(request.getCode());

        if (request.getTotalIssued() < safeUsedCount(voucher.getUsedCount())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Total issued cannot be less than used count");
        }

        voucher.setName(request.getName().trim());
        voucher.setCode(normalizedCode);
        voucher.setDescription(normalizeDescription(request.getDescription()));
        voucher.setDiscountType(request.getDiscountType());
        voucher.setDiscountValue(request.getDiscountValue());
        voucher.setMinOrderValue(safeMinOrder(request.getMinOrderValue()));
        voucher.setTotalIssued(request.getTotalIssued());
        voucher.setStartDate(request.getStartDate());
        voucher.setEndDate(request.getEndDate());
        if (request.getStatus() != null) {
            voucher.setStatus(request.getStatus());
        }
        voucher.setUpdatedBy(actor);

        try {
            Voucher saved = voucherRepository.save(voucher);
            return toResponse(saved);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Voucher code already exists in this store");
        }
    }

    @Transactional
    public VoucherResponse updateStatus(UUID storeId, UUID voucherId, VoucherStatusUpdateRequest request, String actor) {
        Voucher voucher = getOwnedVoucher(storeId, voucherId);
        voucher.setStatus(request.getStatus());
        voucher.setUpdatedBy(actor);
        Voucher saved = voucherRepository.save(voucher);
        return toResponse(saved);
    }

    @Transactional
    public void delete(UUID storeId, UUID voucherId) {
        Voucher voucher = getOwnedVoucher(storeId, voucherId);
        voucherRepository.delete(voucher);
    }

    private Voucher getOwnedVoucher(UUID storeId, UUID voucherId) {
        return voucherRepository.findByIdAndStoreId(voucherId, storeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Voucher not found"));
    }

    private void validateRequest(VoucherRequest request) {
        if (request.getStartDate() != null && request.getEndDate() != null
                && request.getEndDate().isBefore(request.getStartDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End date must be after start date");
        }

        if (request.getDiscountType() == Voucher.DiscountType.PERCENT && request.getDiscountValue().compareTo(new BigDecimal("100")) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Percent discount cannot exceed 100");
        }
    }

    private String normalizeCode(String rawCode) {
        String normalized = rawCode == null ? "" : rawCode.replaceAll("\\s+", "").toUpperCase(Locale.ROOT);
        if (normalized.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Voucher code is required");
        }
        return normalized;
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null) {
            return null;
        }
        String normalized = keyword.trim().toLowerCase(Locale.ROOT);
        return normalized.isEmpty() ? null : normalized;
    }

    private String normalizeDescription(String description) {
        if (description == null) {
            return null;
        }
        String normalized = description.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private BigDecimal safeMinOrder(BigDecimal minOrderValue) {
        return minOrderValue == null ? BigDecimal.ZERO : minOrderValue.max(BigDecimal.ZERO);
    }

    private int safeUsedCount(Integer usedCount) {
        return usedCount == null ? 0 : usedCount;
    }

    private VoucherResponse toResponse(Voucher voucher) {
        Voucher.VoucherStatus displayStatus = resolveDisplayStatus(voucher);
        return VoucherResponse.builder()
                .id(voucher.getId())
                .name(voucher.getName())
                .code(voucher.getCode())
                .description(voucher.getDescription())
                .discountType(voucher.getDiscountType())
                .discountValue(voucher.getDiscountValue())
                .minOrderValue(voucher.getMinOrderValue())
                .totalIssued(voucher.getTotalIssued())
                .usedCount(voucher.getUsedCount())
                .status(displayStatus)
                .startDate(voucher.getStartDate())
                .endDate(voucher.getEndDate())
                .createdAt(voucher.getCreatedAt())
                .updatedAt(voucher.getUpdatedAt())
                .build();
    }

    private Voucher.VoucherStatus resolveDisplayStatus(Voucher voucher) {
        if (voucher.getStatus() != Voucher.VoucherStatus.RUNNING) {
            return voucher.getStatus();
        }

        LocalDate today = LocalDate.now();
        if (voucher.getEndDate() != null && voucher.getEndDate().isBefore(today)) {
            return Voucher.VoucherStatus.PAUSED;
        }
        return Voucher.VoucherStatus.RUNNING;
    }
}
