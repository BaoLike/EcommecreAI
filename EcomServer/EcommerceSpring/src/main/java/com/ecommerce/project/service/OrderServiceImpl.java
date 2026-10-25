package com.ecommerce.project.service;

import com.ecommerce.project.Utils.AuthUtil;
import com.ecommerce.project.exceptions.APIException;
import com.ecommerce.project.exceptions.ResourceNotFoundException;
import com.ecommerce.project.model.*;
import com.ecommerce.project.payload.*;
import com.ecommerce.project.repositories.*;
import com.ecommerce.project.payload.OrderItemRequestDTO;
import org.modelmapper.ModelMapper;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
public class OrderServiceImpl implements OrderService {

    @Autowired
    AuthUtil authUtil;

    @Autowired
    ModelMapper modelMapper;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private PurchaseHistoryRepository purchaseHistoryRepository;

    @Autowired
    private AddressService addressService;

    @Transactional
    public Order createOrder(PaymentRequestDTO paymentRequest) {
        Users user = authUtil.loggedInUser();
        Address ownedAddress = addressService.getOwnedAddress(paymentRequest.getAddressId(), user);
        if (paymentRequest.getItems() == null || paymentRequest.getItems().isEmpty()) {
            throw new APIException("At least one product is required to create an order.");
        }

        Set<Long> requestedProductIds = new HashSet<>();
        Order order = new Order();
        order.setUser(user);
        order.setVnpayTxnRef(generateVnpayTxnRef());
        order.setEmail(user.getEmail());
        order.setOrderStatus("PENDING");
        order.setPaymentMethod("VNPAY");
        order.setInventoryReserved(true);
        order.setOrderDate(LocalDate.now());
        order.setAddress(ownedAddress);

        BigDecimal total = BigDecimal.ZERO;
        List<OrderItem> orderItem = new java.util.ArrayList<>();
        for (OrderItemRequestDTO requestedItem : paymentRequest.getItems()) {
            if (!requestedProductIds.add(requestedItem.getProductId())) {
                throw new APIException("A product may only appear once in an order.");
            }
            Product product = productRepository.findByIdForUpdate(requestedItem.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product", "productId", requestedItem.getProductId()));
            int requestedQuantity = requestedItem.getQuantity();
            if (product.getQuantity() == null || requestedQuantity > product.getQuantity()) {
                throw new APIException("Insufficient stock for product " + product.getProductName() + ".");
            }

            double unitPrice = product.getSpecialPrice() > 0
                    ? product.getSpecialPrice()
                    : product.getPrice() * (1 - product.getDiscount() / 100.0);
            BigDecimal lineTotal = BigDecimal.valueOf(unitPrice)
                    .multiply(BigDecimal.valueOf(requestedQuantity));
            total = total.add(lineTotal);

            product.setQuantity(product.getQuantity() - requestedQuantity);
            productRepository.save(product);

            OrderItem orderItemChild = new OrderItem();
            orderItemChild.setProduct(product);
            orderItemChild.setQuantity(requestedQuantity);
            orderItemChild.setDiscount(product.getDiscount());
            orderItemChild.setOrderedProductPrice(unitPrice);
            orderItem.add(orderItemChild);
        }

        long amount = total.setScale(0, RoundingMode.HALF_UP).longValueExact();
        if (amount <= 0) {
            throw new APIException("The calculated order total must be greater than zero.");
        }
        paymentRequest.setAmount(amount);
        order.setTotalAmount((double) amount);
        order.setOrderItems(orderItem);
        for (OrderItem item : orderItem) {
            item.setOrder(order);
        }

        Payment payment = new Payment();
        payment.setPaymentMethod("VNPAY");
        payment.setPaymentStatus("PENDING");
        payment.setAmount((double) amount);
        order.setPayment(paymentRepository.save(payment));

        return orderRepository.save(order);
    }

    public Order findByVnpayTxnRef(String vnpayTxnRef) {
        return orderRepository.findByVnpayTxnRef(vnpayTxnRef).orElse(null);
    }

    @Transactional
    public Order updateOrderSuccess(String vnpayTxnRef, String transactionNo, String bankCode, String payDate) {
        Order order = orderRepository.findByVnpayTxnRefForUpdate(vnpayTxnRef).orElse(null);

        if (order != null && ("PENDING".equals(order.getOrderStatus()) || "EXPIRED".equals(order.getOrderStatus()) ||
                "CANCELLED".equals(order.getOrderStatus()))) {
            boolean arrivedAfterReservationExpiry = "EXPIRED".equals(order.getOrderStatus()) ||
                    "CANCELLED".equals(order.getOrderStatus());
            order.setOrderStatus(arrivedAfterReservationExpiry ? "REVIEW_REQUIRED" : "SUCCESS");
            order.setInventoryReserved(false);
            order.setVnpayTransactionNo(transactionNo);
            order.setVnpayBankCode(bankCode);
            order.setVnpayPayDate(payDate);
            order.setVnpayResponseCode("00");
            if (order.getPayment() != null) {
                Payment payment = order.getPayment();
                payment.setPaymentStatus("SUCCESS");
                payment.setTransactionNo(transactionNo);
                payment.setBankCode(bankCode);
                payment.setPaymentDate(LocalDateTime.now());
            }

            recordPurchaseHistory(order);

            orderRepository.save(order);
            log.info("Order {} payment recorded. TransactionNo: {}, inventoryReviewRequired: {}",
                    vnpayTxnRef, transactionNo, arrivedAfterReservationExpiry);
        }

        return order;
    }
    @Transactional
    public void updateOrderFailed(String vnpayTxnRef, String responseCode, String transactionNo) {
        Order order = orderRepository.findByVnpayTxnRefForUpdate(vnpayTxnRef).orElse(null);

        if (order != null && "PENDING".equals(order.getOrderStatus())) {
            order.setOrderStatus("FAILED");
            restoreReservedInventory(order);
            order.setVnpayResponseCode(responseCode);
            order.setVnpayTransactionNo(transactionNo);
            if (order.getPayment() != null) {
                Payment payment = order.getPayment();
                payment.setPaymentStatus("FAILED");
                payment.setResponseCode(responseCode);
                payment.setTransactionNo(transactionNo);
            }

            orderRepository.save(order);
            log.info("Order {} failed. ErrorCode: {}", vnpayTxnRef, responseCode);
        }
    }

    private String generateVnpayTxnRef() {
        return java.util.UUID.randomUUID().toString().replace("-", "");
    }

    public List<Order> getOrdersByEmail(String email) {
        return orderRepository.findByEmail(email);
    }
    public Order getOrderById(Long orderId) {
        return orderRepository.findById(orderId).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<OrderHistoryDTO> getOrderHistoryByUserId(Integer userId) {
        List<Order> orders = orderRepository.findByUserUserIdOrderByOrderDateDesc(userId);
        return orders.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<OrderHistoryDTO> getOrderHistoryByUser(Users user) {
        List<Order> orders = orderRepository.findByUserIdWithDetails(user.getUserId());
        return orders.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public OrderHistoryDTO getOrderDetail(Long orderId, Users user) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "orderId", orderId));
        if (order.getUser() == null || user == null ||
                !order.getUser().getUserId().equals(user.getUserId())) {
            throw new ResourceNotFoundException("Order", "orderId", orderId);
        }
        return convertToDTO(order);
    }

    @Transactional
    public boolean cancelOrder(Long orderId, Users user) {
        Order order = orderRepository.findByIdForUpdate(orderId).orElse(null);
        if (order != null && order.getUser() != null && user != null &&
                order.getUser().getUserId().equals(user.getUserId()) &&
                "PENDING".equals(order.getOrderStatus())) {
            order.setOrderStatus("CANCELLED");
            if (order.getPayment() != null) {
                order.getPayment().setPaymentStatus("CANCELLED");
            }
            restoreReservedInventory(order);
            orderRepository.save(order);
            return true;
        }
        return false;
    }

    @Transactional
    public void expirePendingOrdersOlderThan(LocalDateTime cutoff) {
        List<Order> pendingOrders = orderRepository.findByOrderStatusAndCreatedAtBeforeForUpdate("PENDING", cutoff);
        for (Order order : pendingOrders) {
            if (!"PENDING".equals(order.getOrderStatus())) {
                continue;
            }
            order.setOrderStatus("EXPIRED");
            if (order.getPayment() != null) {
                order.getPayment().setPaymentStatus("EXPIRED");
            }
            restoreReservedInventory(order);
            orderRepository.save(order);
        }
    }

    private void restoreReservedInventory(Order order) {
        if (!order.isInventoryReserved() || order.getOrderItems() == null) {
            return;
        }
        for (OrderItem item : order.getOrderItems()) {
            Product product = productRepository.findByIdForUpdate(item.getProduct().getProductId())
                    .orElse(null);
            if (product != null) {
                product.setQuantity((product.getQuantity() == null ? 0 : product.getQuantity()) + item.getQuantity());
                productRepository.save(product);
            }
        }
        order.setInventoryReserved(false);
    }

    @Transactional(readOnly = true)
    public List<OrderHistoryDTO> getOrdersByStatus(Integer userId, String status) {
        List<Order> orders = orderRepository.findByUserUserIdAndOrderStatus(userId, status.toUpperCase());
        return orders.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public OrderSummary getOrderSummary(Integer userId) {
        Long totalOrders = orderRepository.countByUserUserId(userId);
        Double totalAmount = orderRepository.getTotalAmountByUserId(userId);
        Long pendingOrders = orderRepository.countByUserUserIdAndOrderStatus(userId, "PENDING");
        Long successOrders = orderRepository.countByUserUserIdAndOrderStatus(userId, "SUCCESS");

        return new OrderSummary(
                totalOrders != null ? totalOrders : 0L,
                totalAmount != null ? totalAmount : 0.0,
                pendingOrders != null ? pendingOrders : 0L,
                successOrders != null ? successOrders : 0L
        );
    }

    @Transactional(readOnly = true)
    public List<AdminOrderDTO> getLatestOrdersForAdmin() {
        return orderRepository.findAll(org.springframework.data.domain.PageRequest.of(
                        0, 100, org.springframework.data.domain.Sort.by("orderDate").descending()))
                .getContent()
                .stream()
                .map(order -> new AdminOrderDTO(
                        order.getOrderId(),
                        order.getUser() == null ? "Unknown" : order.getUser().getUsername(),
                        order.getEmail(),
                        order.getTotalAmount() == null ? 0.0 : order.getTotalAmount(),
                        toAdminStatus(order.getOrderStatus()),
                        order.getOrderDate() == null ? null : order.getOrderDate().atStartOfDay(),
                        order.getOrderItems() == null ? 0 : order.getOrderItems().stream()
                                .mapToInt(item -> item.getQuantity() == null ? 0 : item.getQuantity()).sum(),
                        order.isDemoData()))
                .toList();
    }

    @Transactional
    public boolean updateAdminOrderStatus(Long orderId, String requestedStatus) {
        Order order = orderRepository.findByIdForUpdate(orderId).orElse(null);
        if (order == null || requestedStatus == null) {
            return false;
        }

        String target = requestedStatus.trim().toUpperCase();
        String current = order.getOrderStatus();
        boolean allowedTransition = switch (target) {
            case "CANCELLED" -> "PENDING".equals(current);
            case "PROCESSING" -> "SUCCESS".equals(current) || "REVIEW_REQUIRED".equals(current);
            case "SHIPPING" -> "PROCESSING".equals(current);
            case "DELIVERED" -> "SHIPPING".equals(current);
            default -> false;
        };
        if (!allowedTransition) {
            return false;
        }

        if ("PROCESSING".equals(target) && "REVIEW_REQUIRED".equals(current) && !reserveStockForReviewOrder(order)) {
            return false;
        }
        order.setOrderStatus(target);
        if ("CANCELLED".equals(target)) {
            if (order.getPayment() != null) {
                order.getPayment().setPaymentStatus("CANCELLED");
            }
            restoreReservedInventory(order);
        }
        orderRepository.save(order);
        return true;
    }

    private String toAdminStatus(String status) {
        return switch (status == null ? "" : status) {
            case "PENDING" -> "pending";
            case "SUCCESS", "PROCESSING" -> "processing";
            case "SHIPPING" -> "shipped";
            case "DELIVERED" -> "delivered";
            case "CANCELLED", "FAILED", "EXPIRED" -> "cancelled";
            case "REVIEW_REQUIRED" -> "review_required";
            default -> "pending";
        };
    }

    private void recordPurchaseHistory(Order order) {
        if (order.getOrderItems() == null || order.getOrderItems().isEmpty() ||
                !purchaseHistoryRepository.findByOrderId(order.getVnpayTxnRef()).isEmpty()) {
            return;
        }
        for (OrderItem item : order.getOrderItems()) {
            Product product = item.getProduct();
            PurchaseHistory history = new PurchaseHistory();
            history.setUser(order.getUser());
            history.setProduct(product);
            history.setQuantity(item.getQuantity());
            history.setPrice(product.getPrice());
            history.setDiscount(item.getDiscount());
            history.setSpecialPrice(item.getOrderedProductPrice());
            history.setPurchaseDate(LocalDateTime.now());
            history.setOrderId(order.getVnpayTxnRef());
            history.setDemoData(order.isDemoData());
            purchaseHistoryRepository.save(history);
        }
    }

    private boolean reserveStockForReviewOrder(Order order) {
        List<Product> lockedProducts = new java.util.ArrayList<>();
        for (OrderItem item : order.getOrderItems()) {
            Product product = productRepository.findByIdForUpdate(item.getProduct().getProductId()).orElse(null);
            if (product == null || product.getQuantity() == null || product.getQuantity() < item.getQuantity()) {
                return false;
            }
            lockedProducts.add(product);
        }
        for (int index = 0; index < order.getOrderItems().size(); index++) {
            OrderItem item = order.getOrderItems().get(index);
            Product product = lockedProducts.get(index);
            product.setQuantity(product.getQuantity() - item.getQuantity());
            productRepository.save(product);
        }
        return true;
    }

    @lombok.Data
    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    public static class OrderSummary {
        private Long totalOrders;
        private Double totalAmount;
        private Long pendingOrders;
        private Long successOrders;
    }

    private OrderHistoryDTO convertToDTO(Order order) {
        OrderHistoryDTO dto = new OrderHistoryDTO();

        dto.setOrderId(order.getOrderId());
        dto.setOrderCode(order.getVnpayTxnRef());
        dto.setOrderDate(order.getOrderDate().atStartOfDay());
        dto.setOrderStatus(order.getOrderStatus());
        dto.setOrderStatusLabel(getStatusLabel(order.getOrderStatus()));
        dto.setTotalAmount(order.getTotalAmount());
        dto.setPaymentMethod(order.getPaymentMethod());
        dto.setPaymentStatus(order.getPayment() == null ? null : order.getPayment().getPaymentStatus());
        dto.setVnpayTxnRef(order.getVnpayTxnRef());
        dto.setVnpayTransactionNo(order.getVnpayTransactionNo());

        if (order.getOrderItems() != null) {
            dto.setTotalProducts(order.getOrderItems().size());
            List<OrderItemDTO> items = order.getOrderItems().stream()
                    .map(this::convertItemToDTO)
                    .collect(Collectors.toList());
            dto.setItems(items);
        }

        // Convert Address
        if (order.getAddress() != null) {
            dto.setShippingAddress(convertAddressToDTO(order.getAddress()));
        }

        return dto;
    }

    private OrderItemDTO convertItemToDTO(OrderItem item) {
        OrderItemDTO dto = new OrderItemDTO();
        dto.setOrderItemId(item.getOrderItemId());
        dto.setDiscount(item.getDiscount());
        dto.setQuantity(item.getQuantity());
        dto.setOrderedProductPrice(item.getOrderedProductPrice());
        ProductDTO product = modelMapper.map(item.getProduct(), ProductDTO.class);
        dto.setProduct(product);
        return dto;
    }

    private AddressDTO convertAddressToDTO(Address address) {
        AddressDTO dto = new AddressDTO();
        dto.setStreet(address.getStreet());
        dto.setBuildingName(address.getBuildingName());
        dto.setCity(address.getCity());
        dto.setReceiverName(address.getReceiverName());
        dto.setPhoneNumberReceiver(address.getPhoneNumberReceiver());
        dto.setWard(address.getWard());
        return dto;
    }

    private String getStatusLabel(String status) {
        switch (status) {
            case "PENDING":
                return "Chờ xử lý";
            case "PROCESSING":
                return "Đang xử lý";
            case "SHIPPING":
                return "Đã gửi hàng";
            case "SUCCESS":
            case "DELIVERED":
                return "Đã giao hàng";
            case "CANCELLED":
                return "Đã hủy";
            case "FAILED":
                return "Thất bại";
            case "EXPIRED":
                return "Đã hết hạn";
            case "REVIEW_REQUIRED":
                return "Cần kiểm tra thanh toán";
            default:
                return status;
        }
    }
}
