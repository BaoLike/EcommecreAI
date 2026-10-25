package com.ecommerce.project.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class PendingOrderExpirationJob {
    private final OrderService orderService;

    @Value("${orders.reservation-minutes:20}")
    private long reservationMinutes;

    public PendingOrderExpirationJob(OrderService orderService) {
        this.orderService = orderService;
    }

    @Scheduled(fixedDelayString = "${orders.expiration-scan-ms:60000}")
    public void expireOldOrders() {
        orderService.expirePendingOrdersOlderThan(LocalDateTime.now().minusMinutes(reservationMinutes));
    }
}
