package com.ecommerce.project.payload;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderHistoryDTO {
    private Long orderId;
    private String orderCode;
    private LocalDateTime orderDate;
    private String orderStatus;
    private String orderStatusLabel;
    private Integer totalProducts;
    private Double totalAmount;
    private String paymentMethod;
    private String paymentStatus;
    private List<OrderItemDTO> items;
    private AddressDTO shippingAddress;
    private String vnpayTxnRef;
    private String vnpayTransactionNo;
    private List<OrderItemDTO> orderItems;
}
