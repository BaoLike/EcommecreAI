package com.ecommerce.project.controller;

import com.ecommerce.project.model.AppRole;
import com.ecommerce.project.payload.AdminDashboardDTO;
import com.ecommerce.project.payload.AdminOrderDTO;
import com.ecommerce.project.repositories.OrderRepository;
import com.ecommerce.project.repositories.ProductRepository;
import com.ecommerce.project.repositories.UserRepository;
import com.ecommerce.project.service.OrderService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final OrderService orderService;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public AdminController(
            OrderService orderService,
            OrderRepository orderRepository,
            ProductRepository productRepository,
            UserRepository userRepository) {
        this.orderService = orderService;
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<AdminDashboardDTO> getDashboard() {
        Double revenue = orderRepository.getTotalPaidAmount();
        AdminDashboardDTO stats = new AdminDashboardDTO(
                orderRepository.count(),
                productRepository.count(),
                revenue == null ? 0.0 : revenue,
                userRepository.countUsersWithRole(AppRole.ROLE_USER));
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/orders")
    public ResponseEntity<List<AdminOrderDTO>> getOrders() {
        return ResponseEntity.ok(orderService.getLatestOrdersForAdmin());
    }

    @PatchMapping("/orders/{orderId}/status")
    public ResponseEntity<?> updateOrderStatus(
            @PathVariable Long orderId,
            @Valid @RequestBody OrderStatusRequest request) {
        boolean updated = orderService.updateAdminOrderStatus(orderId, request.getStatus());
        if (!updated) {
            return ResponseEntity.badRequest().body("Invalid order status transition.");
        }
        return ResponseEntity.noContent().build();
    }

    @Data
    public static class OrderStatusRequest {
        @NotBlank
        private String status;
    }
}
