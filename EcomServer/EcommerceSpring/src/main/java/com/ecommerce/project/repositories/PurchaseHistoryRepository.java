package com.ecommerce.project.repositories;

import com.ecommerce.project.model.PurchaseHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PurchaseHistoryRepository extends JpaRepository<PurchaseHistory, Long> {

    List<PurchaseHistory> findByUserUserId(Integer userId);

    List<PurchaseHistory> findByUserUserIdOrderByPurchaseDateDesc(Integer userId);

    @Query("SELECT ph FROM PurchaseHistory ph " +
            "JOIN FETCH ph.product p " +
            "LEFT JOIN FETCH p.category " +
            "WHERE ph.user.userId = :userId " +
            "ORDER BY ph.purchaseDate DESC")
    List<PurchaseHistory> findByUserIdWithProduct(@Param("userId") Integer userId);
    List<PurchaseHistory> findByOrderId(String orderId);
    boolean existsByProduct_ProductId(Long productId);
}
