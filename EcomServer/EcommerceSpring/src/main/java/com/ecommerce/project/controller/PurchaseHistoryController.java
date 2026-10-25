package com.ecommerce.project.controller;

import com.ecommerce.project.payload.PurchaseHistoryDTO;
import com.ecommerce.project.Utils.AuthUtil;
import org.springframework.security.access.prepost.PreAuthorize;
import com.ecommerce.project.service.PurchaseHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/purchases")
@RequiredArgsConstructor
public class PurchaseHistoryController {

    @Autowired
    private final PurchaseHistoryService purchaseHistoryService;

    @Autowired
    private AuthUtil authUtil;

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PurchaseHistoryDTO>> getPurchaseHistory(@PathVariable Integer userId) {
        List<PurchaseHistoryDTO> purchases = purchaseHistoryService.getPurchaseHistoryByUserId(userId);
        return ResponseEntity.ok(purchases);
    }

    @GetMapping("/user/{userId}/detailed")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<PurchaseHistoryDTO>>> getPurchaseHistoryDetailed(@PathVariable Integer userId) {
        List<PurchaseHistoryDTO> purchases = purchaseHistoryService.getPurchaseHistoryByUserId(userId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Success", purchases));
    }

    @GetMapping("/me")
    public ResponseEntity<List<PurchaseHistoryDTO>> getMyPurchaseHistory() {
        return ResponseEntity.ok(purchaseHistoryService.getPurchaseHistoryByUserId(authUtil.loggedInUserId()));
    }

    @lombok.Data
    @lombok.AllArgsConstructor
    static class ApiResponse<T> {
        private boolean success;
        private String message;
        private T data;
    }
}
