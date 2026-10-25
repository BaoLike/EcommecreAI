package com.ecommerce.project.controller;

import com.ecommerce.project.Utils.AuthUtil;
import com.ecommerce.project.model.Users;
import com.ecommerce.project.payload.OrderHistoryDTO;
import com.ecommerce.project.service.OrderService;
import com.ecommerce.project.service.OrderServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/order-history")
@RequiredArgsConstructor
public class OrderHistoryController {
    @Autowired
    AuthUtil authUtil;

    @Autowired
    private final OrderService orderHistoryService;

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<OrderHistoryDTO>> getOrderHistory(@PathVariable Integer userId) {
        List<OrderHistoryDTO> orders = orderHistoryService.getOrderHistoryByUserId(userId);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/my-orders")
    public ResponseEntity<List<OrderHistoryDTO>> getMyOrderHistory(Authentication authentication) {
        Users user = authUtil.loggedInUser();
        List<OrderHistoryDTO> orders = orderHistoryService.getOrderHistoryByUser(user);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<OrderHistoryDTO> getOrderDetail(@PathVariable Long orderId) {
        OrderHistoryDTO order = orderHistoryService.getOrderDetail(orderId, authUtil.loggedInUser());
        if (order == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(order);
    }

    @PutMapping("/{orderId}/cancel")
    public ResponseEntity<ApiResponse> cancelOrder(@PathVariable Long orderId) {
        boolean success = orderHistoryService.cancelOrder(orderId, authUtil.loggedInUser());
        if (success) {
            return ResponseEntity.ok(new ApiResponse(true, "Hủy đơn hàng thành công", null));
        }
        return ResponseEntity.badRequest().body(
                new ApiResponse(false, "Không thể hủy đơn hàng này. Đơn hàng đã được xử lý hoặc giao hàng.", null)
        );
    }

    @GetMapping("/user/{userId}/status/{status}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<OrderHistoryDTO>> getOrdersByStatus(
            @PathVariable Integer userId,
            @PathVariable String status) {
        List<OrderHistoryDTO> orders = orderHistoryService.getOrdersByStatus(userId, status);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/user/{userId}/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity< OrderServiceImpl.OrderSummary> getOrderSummary(@PathVariable Integer userId) {
        OrderServiceImpl.OrderSummary summary = orderHistoryService.getOrderSummary(userId);
        return ResponseEntity.ok(summary);
    }
    @lombok.Data
    @lombok.AllArgsConstructor
    static class ApiResponse {
        private boolean success;
        private String message;
        private Object data;
    }

    @lombok.Data
    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    static class OrderSummary {
        private Long totalOrders;
        private Double totalAmount;
        private Long pendingOrders;
        private Long successOrders;
    }
}
