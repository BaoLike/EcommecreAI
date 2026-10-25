package com.ecommerce.project.payload;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminOrderDTO {
    private Long id;
    private String customerName;
    private String email;
    private double total;
    private String status;
    private LocalDateTime orderDate;
    private int items;
    private boolean demoData;
}
