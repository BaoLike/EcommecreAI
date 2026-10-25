package com.ecommerce.project.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long paymentId;

    @Column(name = "payment_method")
    private String paymentMethod; // VNPAY, COD, etc.

    @Column(name = "payment_status")
    private String paymentStatus; // PENDING, SUCCESS, FAILED

    @Column(name = "amount")
    private Double amount;

    @Column(name = "transaction_no")
    private String transactionNo;

    @Column(name = "bank_code")
    private String bankCode;

    @Column(name = "payment_date")
    private LocalDateTime paymentDate;

    @Column(name = "response_code")
    private String responseCode;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean demoData = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (paymentStatus == null) {
            paymentStatus = "PENDING";
        }
    }
}
