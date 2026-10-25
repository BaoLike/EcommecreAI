package com.ecommerce.project.controller;

import com.ecommerce.project.payload.PaymentRequestDTO;
import com.ecommerce.project.service.OrderService;
import com.ecommerce.project.service.VNPayService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import com.ecommerce.project.model.Order;

@RestController
@RequestMapping("/api/payment")
@Slf4j
public class VNPayController {

    @Value("${frontEnd.url}")
    private String frontEndUrl;

    @Autowired
    private VNPayService vnPayService;

    @Autowired
    private OrderService orderService;

    @PostMapping("/create-payment")
    public ResponseEntity<?> createPayment(
            @Valid @RequestBody PaymentRequestDTO paymentRequest,
            HttpServletRequest request) {
        try {
            vnPayService.ensureConfigured();
            Order order = orderService.createOrder(paymentRequest);
            paymentRequest.setAmount(Math.round(order.getTotalAmount()));
            paymentRequest.setOrderInfo("Order " + order.getOrderId());
            paymentRequest.setOrderType("other");
            paymentRequest.setBillingEmail(order.getEmail());
            paymentRequest.setInvEmail(order.getEmail());
            if (order.getAddress() != null) {
                String fullName = order.getAddress().getReceiverName();
                String address = String.join(", ",
                        order.getAddress().getBuildingName(),
                        order.getAddress().getStreet(),
                        order.getAddress().getWard());
                paymentRequest.setBillingFullname(fullName);
                paymentRequest.setBillingMobile(order.getAddress().getPhoneNumberReceiver());
                paymentRequest.setBillAddress(address);
                paymentRequest.setBillCity(order.getAddress().getCity());
                paymentRequest.setBillCountry("VN");
                paymentRequest.setInvCustomer(fullName);
                paymentRequest.setInvMobile(order.getAddress().getPhoneNumberReceiver());
            }

            String vnpayTxnRef = order.getVnpayTxnRef();
            String paymentUrl = vnPayService.createPayment(paymentRequest, vnpayTxnRef, request);

            return ResponseEntity.ok(Map.of(
                    "code", "00",
                    "message", "success",
                    "paymentUrl", paymentUrl,
                    "orderId", order.getOrderId(),
                    "vnpayTxnRef", vnpayTxnRef
            ));

        } catch (Exception e) {
            log.error("Error creating payment: ", e);
            return ResponseEntity.status(500).body(Map.of(
                    "code", "99",
                    "message", "Unable to start payment. Please try again later."
            ));
        }
    }

    @GetMapping("/vnpay-ipn")
    public ResponseEntity<Map<String, String>> vnpayIPN(@RequestParam Map<String, String> vnpParams) {
        try {
            Map<String, String> fields = new HashMap<>(vnpParams);
            String vnpSecureHash = fields.remove("vnp_SecureHash");
            fields.remove("vnp_SecureHashType");

            String calculatedHash = vnPayService.hashAllFields(fields);

            if (!constantTimeEquals(calculatedHash, vnpSecureHash)) {
                log.error("Invalid signature from VNPay");
                return ResponseEntity.ok(Map.of(
                        "RspCode", "97",
                        "Message", "Invalid signature"
                ));
            }

            String vnpayTxnRef = vnpParams.get("vnp_TxnRef");
            long vnpAmount = Long.parseLong(vnpParams.get("vnp_Amount")) / 100;
            String transactionNo = vnpParams.get("vnp_TransactionNo");
            String bankCode = vnpParams.get("vnp_BankCode");
            String responseCode = vnpParams.get("vnp_ResponseCode");
            String transactionStatus = vnpParams.get("vnp_TransactionStatus");
            String payDate = vnpParams.get("vnp_PayDate");

            Order order = orderService.findByVnpayTxnRef(vnpayTxnRef);

            if (order == null) {
                log.error("Order not found: {}", vnpayTxnRef);
                return ResponseEntity.ok(Map.of(
                        "RspCode", "01",
                        "Message", "Order not found"
                ));
            }

            if (order.getTotalAmount() == null || Math.round(order.getTotalAmount()) != vnpAmount) {
                log.error("Invalid amount. Expected: {}, Received: {}", order.getTotalAmount(), vnpAmount);
                return ResponseEntity.ok(Map.of(
                        "RspCode", "04",
                        "Message", "Invalid amount"
                ));
            }

            boolean lateSuccessfulPayment = ("EXPIRED".equals(order.getOrderStatus()) ||
                    "CANCELLED".equals(order.getOrderStatus())) &&
                    "00".equals(responseCode) && "00".equals(transactionStatus);
            if (!"PENDING".equals(order.getOrderStatus()) && !lateSuccessfulPayment) {
                log.info("Order already confirmed: {}", vnpayTxnRef);
                return ResponseEntity.ok(Map.of(
                        "RspCode", "02",
                        "Message", "Order already confirmed"
                ));
            }

            if ("00".equals(responseCode) && "00".equals(transactionStatus)) {
                orderService.updateOrderSuccess(vnpayTxnRef, transactionNo, bankCode, payDate);
                log.info("Payment success for order: {}", vnpayTxnRef);
            } else {
                orderService.updateOrderFailed(vnpayTxnRef, responseCode, transactionNo);
                log.info("Payment failed for order: {}. Error: {}", vnpayTxnRef, responseCode);
            }

            return ResponseEntity.ok(Map.of(
                    "RspCode", "00",
                    "Message", "Confirm Success"
            ));

        } catch (Exception e) {
            log.error("Error processing IPN: ", e);
            return ResponseEntity.ok(Map.of(
                    "RspCode", "99",
                    "Message", "Unknown error"
            ));
        }
    }

    @GetMapping("/vnpay-return")
    public void vnpayReturn(@RequestParam Map<String, String> allParams,
                            HttpServletResponse response) throws IOException {
        try {
            String vnpSecureHash = allParams.get("vnp_SecureHash");

            Map<String, String> fields = new HashMap<>();
            for (Map.Entry<String, String> entry : allParams.entrySet()) {
                String fieldName = entry.getKey();
                String fieldValue = entry.getValue();
                if (fieldValue != null && fieldValue.length() > 0) {
                    if (!fieldName.equals("vnp_SecureHash") &&
                            !fieldName.equals("vnp_SecureHashType")) {
                        fields.put(fieldName, fieldValue);
                    }
                }
            }

            String calculatedHash = vnPayService.hashAllFields(fields);
            String frontendUrl = frontEndUrl.replaceAll("/$", "") + "/payment";

            if (!constantTimeEquals(calculatedHash, vnpSecureHash)) {
                response.sendRedirect(frontendUrl + "?status=error&message=invalid-signature");
                return;
            }

            String responseCode = allParams.get("vnp_ResponseCode");
            String txnRef = allParams.get("vnp_TxnRef");
            long amount = Long.parseLong(allParams.get("vnp_Amount")) / 100;

            Map<String, String> returnParams = new LinkedHashMap<>();
            if ("00".equals(responseCode)) {
                returnParams.put("status", "success");
                returnParams.put("orderId", txnRef);
                returnParams.put("amount", String.valueOf(amount));
                returnParams.put("transactionNo", allParams.get("vnp_TransactionNo"));
                returnParams.put("bankCode", allParams.get("vnp_BankCode"));
                returnParams.put("payDate", allParams.get("vnp_PayDate"));
                returnParams.put("orderInfo", allParams.get("vnp_OrderInfo"));
            } else {
                returnParams.put("status", "failed");
                returnParams.put("orderId", txnRef);
                returnParams.put("responseCode", responseCode);
                returnParams.put("message", "Thanh toán thất bại");
            }

            String query = returnParams.entrySet().stream()
                    .filter(entry -> entry.getValue() != null)
                    .map(entry -> URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8) + "=" +
                            URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8))
                    .collect(java.util.stream.Collectors.joining("&"));
            response.sendRedirect(frontendUrl + "?" + query);

        } catch (Exception e) {
            log.error("Error: ", e);
            response.sendRedirect(frontEndUrl.replaceAll("/$", "") + "/payment?status=error&message=error");
        }
    }

    private String getErrorMessage(String responseCode) {
        return switch (responseCode) {
            case "07" -> "Giao dịch bị nghi ngờ gian lận";
            case "09" -> "Thẻ chưa đăng ký Internet Banking";
            case "24" -> "Khách hàng hủy giao dịch";
            case "51" -> "Tài khoản không đủ số dư";
            default -> "Giao dịch thất bại";
        };
    }

    private boolean constantTimeEquals(String expected, String actual) {
        return expected != null && actual != null &&
                java.security.MessageDigest.isEqual(
                        expected.getBytes(StandardCharsets.US_ASCII),
                        actual.getBytes(StandardCharsets.US_ASCII));
    }
}
