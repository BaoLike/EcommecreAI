package com.ecommerce.project.repositories;


import com.ecommerce.project.model.CartItem;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;


@Repository
public interface CartItemRepository extends CrudRepository<CartItem, Long> {
    @Query("SELECT ci FROM CartItem  ci WHERE ci.cart.cartId = ?1 AND ci.product.productId = ?2")
    CartItem findCardItemByProductIdAndCardId(Long productId, Long cartId);

    @Modifying
    @Transactional
    @Query("DELETE FROM CartItem ci WHERE ci.cart.cartId = ?1 AND ci.product.productId = ?2")
    void deleteCartItemByProductIdAndCartId(Long cartId, Long productId);
}
