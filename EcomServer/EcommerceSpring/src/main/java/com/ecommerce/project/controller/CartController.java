package com.ecommerce.project.controller;

import com.ecommerce.project.Utils.AuthUtil;
import com.ecommerce.project.exceptions.APIException;
import com.ecommerce.project.model.Cart;
import com.ecommerce.project.payload.CartDTO;
import com.ecommerce.project.repositories.CartRepository;
import com.ecommerce.project.service.CartService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
@RequestMapping("/api")
public class CartController {
    @Autowired
    CartService cartService;
    @Autowired
    AuthUtil authUtil;
    @Autowired
    CartRepository cartRepository;

    @PostMapping("/cart/products/{product_id}/quantity/{quantity}")
    public ResponseEntity<CartDTO> addProductCart(@PathVariable("product_id") Long productId,
                                                  @PathVariable("quantity") Integer quantity){
        CartDTO cartDTO = cartService.addProductToCard(productId, quantity);
        return new ResponseEntity<>(cartDTO, HttpStatus.CREATED);
    }

    @GetMapping("/cards/get_all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<CartDTO>> getAllCards(){
        return ResponseEntity.ok(cartService.getAllCard());
    }

    @GetMapping("/card/user")
    public ResponseEntity<CartDTO> getUserCard(){
        String emailId = authUtil.loggedInEmail();
        Cart cart = cartRepository.findCardByEmail(emailId);
        Long cartId = cart == null ? null : cart.getCartId();
        CartDTO cartDTO = cartService.getUserCard(emailId, cartId);
        return new ResponseEntity<>(cartDTO, HttpStatus.OK);
    }

    @PostMapping("/card/products/{product_id}/quantity/{operation}")

    public ResponseEntity<CartDTO> updateCartProduct(@PathVariable("product_id") Long productId,
                                                     @PathVariable("operation") String operation){
        if (!"add".equalsIgnoreCase(operation) && !"delete".equalsIgnoreCase(operation)) {
            throw new APIException("Operation must be add or delete.");
        }
        CartDTO cartDTO = cartService.updateProductQuantityInCart(productId, operation.equalsIgnoreCase("delete")? -1:1);
        return new ResponseEntity<>(cartDTO, HttpStatus.OK);
    }

    @DeleteMapping("/carts/{cart_id}/product/{product_id}")
    public ResponseEntity<String> deleteProductFromCart(@PathVariable("cart_id") Long cartId,
                                                        @PathVariable("product_id") Long productId){
        String status = cartService.deleteProductFromCartForCurrentUser(cartId, productId);
        return new ResponseEntity<>(status, HttpStatus.OK);
    }

}
