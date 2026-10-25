package com.ecommerce.project.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long orderId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    private Users user;

    @Email
    @Column(nullable = false)
    private String email;

    @OneToMany(mappedBy = "order", cascade = { CascadeType.PERSIST, CascadeType.ALL })
    private List<OrderItem> orderItems = new ArrayList<>();

    private LocalDate orderDate;

    @OneToOne
    @JoinColumn(name = "payment_id")
    private Payment payment;

    private Double totalAmount;

    private String orderStatus;

    @ManyToOne
    @JoinColumn(name = "address_id")
    private Address address;

    @Column(name = "vnpay_txn_ref", unique = true)
    private String vnpayTxnRef;

    @Column(name = "vnpay_transaction_no")
    private String vnpayTransactionNo;

    @Column(name = "vnpay_bank_code")
    private String vnpayBankCode;

    @Column(name = "vnpay_response_code")
    private String vnpayResponseCode;

    @Column(name = "vnpay_pay_date")
    private String vnpayPayDate;

    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean demoData = false;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean inventoryReserved = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
        if (orderDate == null) {
            orderDate = LocalDate.now();
        }
        if (orderStatus == null) {
            orderStatus = "PENDING";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
