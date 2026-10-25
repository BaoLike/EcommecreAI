package com.ecommerce.project.service;

import com.ecommerce.project.model.Order;
import com.ecommerce.project.model.OrderItem;
import com.ecommerce.project.model.Users;
import com.ecommerce.project.payload.OrderDTO;
import com.ecommerce.project.payload.OrderHistoryDTO;
import com.ecommerce.project.payload.AdminOrderDTO;
import com.ecommerce.project.payload.PaymentRequestDTO;
import jakarta.transaction.Transactional;

import java.util.List;
import java.time.LocalDateTime;

public interface OrderService {
    @Transactional
    public Order createOrder(PaymentRequestDTO paymentRequest);

    Order findByVnpayTxnRef(String vnpayTxnRef);

    public Order updateOrderSuccess(String vnpayTxnRef, String transactionNo, String bankCode, String payDate);

    void updateOrderFailed(String vnpayTxnRef, String responseCode, String transactionNo);

    public List<OrderHistoryDTO> getOrderHistoryByUserId(Integer userId);

    public List<OrderHistoryDTO> getOrderHistoryByUser(Users user);

    public OrderHistoryDTO getOrderDetail(Long orderId, Users user);

    public boolean cancelOrder(Long orderId, Users user);

    public List<OrderHistoryDTO> getOrdersByStatus(Integer userId, String status);

    public OrderServiceImpl.OrderSummary getOrderSummary(Integer userId);

    void expirePendingOrdersOlderThan(LocalDateTime cutoff);

    List<AdminOrderDTO> getLatestOrdersForAdmin();

    boolean updateAdminOrderStatus(Long orderId, String status);
}
