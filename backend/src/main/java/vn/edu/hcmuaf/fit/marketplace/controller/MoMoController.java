package vn.edu.hcmuaf.fit.marketplace.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hcmuaf.fit.marketplace.dto.response.MoMoCreatePayUrlResponse;
import vn.edu.hcmuaf.fit.marketplace.dto.response.MoMoReturnVerifyResponse;
import vn.edu.hcmuaf.fit.marketplace.entity.Order;
import vn.edu.hcmuaf.fit.marketplace.security.AuthContext;
import vn.edu.hcmuaf.fit.marketplace.service.MoMoService;
import vn.edu.hcmuaf.fit.marketplace.service.OrderService;

import java.util.Map;

@RestController
@RequestMapping("/api/payments/momo")
public class MoMoController {

    private final AuthContext authContext;
    private final OrderService orderService;
    private final MoMoService moMoService;

    public MoMoController(AuthContext authContext, OrderService orderService, MoMoService moMoService) {
        this.authContext = authContext;
        this.orderService = orderService;
        this.moMoService = moMoService;
    }

    @PostMapping("/orders/{orderCode}/pay-url")
    public ResponseEntity<MoMoCreatePayUrlResponse> createPayUrl(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable String orderCode,
            HttpServletRequest request
    ) {
        AuthContext.UserContext user = authContext.fromAuthHeader(authHeader);
        Order order = orderService.findByCodeForUser(orderCode, user.getUserId());
        String clientIp = resolveClientIp(request);
        return ResponseEntity.ok(moMoService.createPaymentUrl(order, clientIp));
    }

    @GetMapping("/return/verify")
    public ResponseEntity<MoMoReturnVerifyResponse> verifyReturn(@RequestParam Map<String, String> queryParams) {
        return ResponseEntity.ok(moMoService.verifyReturn(queryParams));
    }

    @PostMapping("/ipn")
    public ResponseEntity<MoMoService.MoMoIpnResponse> ipn(@RequestBody(required = false) Map<String, Object> payload) {
        return ResponseEntity.ok(moMoService.processIpn(payload == null ? Map.of() : payload));
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}

