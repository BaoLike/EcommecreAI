package com.ecommerce.project.repositories;

import com.ecommerce.project.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;
import jakarta.persistence.LockModeType;

@Repository
public interface OrderRepository extends JpaRepository<Order,Long> {
    boolean existsByAddress_AddressId(Long addressId);

    Optional<Order> findByVnpayTxnRef(String vnpayTxnRef);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.vnpayTxnRef = :reference")
    Optional<Order> findByVnpayTxnRefForUpdate(@Param("reference") String reference);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.orderId = :orderId")
    Optional<Order> findByIdForUpdate(@Param("orderId") Long orderId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.orderStatus = :status AND o.createdAt < :cutoff")
    List<Order> findByOrderStatusAndCreatedAtBeforeForUpdate(@Param("status") String status,
                                                             @Param("cutoff") LocalDateTime cutoff);

    List<Order> findByEmail(String email);

    List<Order> findByOrderStatus(String orderStatus);

    List<Order> findByOrderStatusAndCreatedAtBefore(String orderStatus, LocalDateTime cutoff);

    Optional<Order> findByVnpayTransactionNo(String vnpayTransactionNo);

    List<Order> findByUserUserIdOrderByOrderDateDesc(Integer userId);

    List<Order> findByEmailOrderByOrderDateDesc(String email);

    @Query("SELECT o FROM Order o " +
            "LEFT JOIN FETCH o.orderItems oi " +
            "LEFT JOIN FETCH oi.product " +
            "LEFT JOIN FETCH o.address " +
            "WHERE o.user.userId = :userId " +
            "ORDER BY o.orderDate DESC")
    List<Order> findByUserIdWithDetails(@Param("userId") Integer userId);

    List<Order> findByUserUserIdAndOrderStatus(Integer userId, String orderStatus);
    Long countByUserUserId(Integer userId);
    Long countByUserUserIdAndOrderStatus(Integer userId, String orderStatus);
    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.user.userId = :userId " +
            "AND o.orderStatus IN ('SUCCESS', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'REVIEW_REQUIRED')")
    Double getTotalAmountByUserId(@Param("userId") Integer userId);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o " +
            "WHERE o.orderStatus IN ('SUCCESS', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'REVIEW_REQUIRED')")
    Double getTotalPaidAmount();
}
