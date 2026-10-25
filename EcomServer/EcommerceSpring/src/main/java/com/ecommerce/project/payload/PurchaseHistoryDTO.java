package com.ecommerce.project.payload;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseHistoryDTO {
    private Long id;
    private Long productId;
    private String productName;
    private String image;
    private String description;
    private String categoryName;
    private Integer quantity;
    private Double price;
    private Double discount;
    private Double specialPrice;
    private Double totalPrice;
    private LocalDateTime purchaseDate;
    private String orderId;
}