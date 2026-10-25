package com.ecommerce.project.service;

import com.ecommerce.project.payload.CartDTO;

import java.util.List;

public interface CartService {
    CartDTO addProductToCard(Long productId, Integer quantity);

    List<CartDTO> getAllCard();


    CartDTO getUserCard(String emailId, Long cartId);

    CartDTO updateProductQuantityInCart(Long productId,  Integer quantity);

    String deleteProductFromCart(Long cartId, Long productId);

    String deleteProductFromCartForCurrentUser(Long cartId, Long productId);

    void updateProductInCarts(Long cartId, Long productId);
}
