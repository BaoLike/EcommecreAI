package com.ecommerce.project.service;

import com.ecommerce.project.Utils.AuthUtil;
import com.ecommerce.project.exceptions.APIException;
import com.ecommerce.project.exceptions.ResourceNotFoundException;
import com.ecommerce.project.model.Cart;
import com.ecommerce.project.model.CartItem;
import com.ecommerce.project.model.Product;
import com.ecommerce.project.payload.CartDTO;
import com.ecommerce.project.payload.ProductDTO;
import com.ecommerce.project.repositories.CartItemRepository;
import com.ecommerce.project.repositories.CartRepository;
import com.ecommerce.project.repositories.ProductRepository;
import jakarta.transaction.Transactional;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Stream;


@Service
public class CartServiceImpl implements CartService {
    @Autowired
    private CartRepository cartRepository;
    @Autowired
    private AuthUtil authUtils;
    @Autowired
    private ProductRepository productRepository;
    @Autowired
    CartItemRepository cartItemRepository;
    @Autowired
    private ModelMapper modelMapper;

    @Override
    @Transactional
    public CartDTO addProductToCard(Long productId, Integer quantity) {
        if (quantity == null || quantity < 1) {
            throw new APIException("Cart quantity must be at least one.");
        }
        Cart cart = createCard();
        Product product = productRepository.findById(productId).orElseThrow(() -> new ResourceNotFoundException("Producr", "id", productId));
        CartItem cartItem = cartItemRepository.findCardItemByProductIdAndCardId(cart.getCartId(), productId);
        if(cartItem != null){
            throw new APIException("Product " + product.getProductName() + " already exists in the card");
        }
        if(product.getQuantity() == null || product.getQuantity() < quantity){
            throw new APIException("Insufficient stock for product " + product.getProductName() + ".");
        }

        if(product.getQuantity() == 0){
            throw new APIException("Product " + product.getProductName() + " has no products");
        }

        CartItem newCartItem = new CartItem();
        newCartItem.setProduct(product);
        newCartItem.setQuantity(quantity);
        newCartItem.setCart(cart);
        newCartItem.setProductPrice(finalPrice(product));
        newCartItem.setDiscount(product.getDiscount());

        List<CartItem> cartItems = cart.getCartItems();
        cartItems.add(newCartItem);
        cart.setPrice((cart.getPrice() == null ? 0 : cart.getPrice()) +
                (newCartItem.getProductPrice() * newCartItem.getQuantity()));
        CartDTO cartDTO = modelMapper.map(cart, CartDTO.class);
        List<ProductDTO> productDTOS = cartItems.stream().map(item -> {
            ProductDTO productDTO = modelMapper.map(item.getProduct(), ProductDTO.class);
            productDTO.setQuantity(item.getQuantity());
            return productDTO;
        }).toList();
        cartDTO.setProducts(productDTOS);
        cartItemRepository.save(newCartItem);
        cartRepository.save(cart);
        return cartDTO;
    }

    @Override
    public List<CartDTO> getAllCard() {
        List<Cart> carts = cartRepository.findAll();
        if(carts.size() == 0){
            throw new APIException("No cards exist");
        }
        List<CartDTO> listCartDTO = carts.stream().map(item ->{
            CartDTO cartDTO = modelMapper.map(item, CartDTO.class);
            List<ProductDTO> productDTOList = item.getCartItems().stream().map(cartItem ->
                    modelMapper.map(cartItem.getProduct(), ProductDTO.class)).toList();
            cartDTO.setProducts(productDTOList);
            return cartDTO;
        }).toList();
        return listCartDTO;
    }

    @Override
    public String deleteProductFromCartForCurrentUser(Long cartId, Long productId) {
        Cart ownedCart = cartRepository.findCartByEmailAndCartId(authUtils.loggedInEmail(), cartId);
        if (ownedCart == null) {
            throw new ResourceNotFoundException("Cart", "cartId", cartId);
        }
        return deleteProductFromCart(cartId, productId);
    }

    @Override
    public CartDTO getUserCard(String emailId, Long cartId) {
        Cart cart = cartRepository.findCartByEmailAndCartId(emailId, cartId);
        if (cart == null && cartId == null) {
            cart = createCard();
        }
        if(cart == null){
            throw new ResourceNotFoundException("Cart", "CartId", cartId);
        }
        CartDTO cartDTO = modelMapper.map(cart, CartDTO.class);
        List<ProductDTO> productDTOList = cart.getCartItems().stream().map(item -> {
            ProductDTO productDTO = modelMapper.map(item.getProduct(), ProductDTO.class);
            productDTO.setQuantity(item.getQuantity());
            return productDTO;
        }).toList();
        cartDTO.setProducts(productDTOList);
        return cartDTO;
    }

    @Transactional
    @Override
    public CartDTO updateProductQuantityInCart(Long productId, Integer quantity) {
        String emailId = authUtils.loggedInEmail();
        Cart userCart = cartRepository.findCardByEmail(emailId);
        if (userCart == null) {
            throw new ResourceNotFoundException("Cart", "email", emailId);
        }
        Long cartId = userCart.getCartId();

        Cart cart = cartRepository.findById(cartId).orElseThrow(() -> new ResourceNotFoundException("Cart", "id", cartId));
        Product product = productRepository.findById(productId).orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        if (quantity == null || (quantity != 1 && quantity != -1)) {
            throw new APIException("Cart quantity can only change by one item at a time.");
        }
        if (product.getQuantity() == null || (quantity == 1 && product.getQuantity() <= 0)) {
            throw new APIException("Product " + product.getProductName() + " has no products");
        }

        CartItem cartItem = cartItemRepository.findCardItemByProductIdAndCardId(cartId, productId);

        if (cartItem == null) {
            throw new APIException("Product " + product.getProductName() + " not available in the cart!!!");
        }

        int nextQuantity = cartItem.getQuantity() + quantity;
        if (quantity == 1 && nextQuantity > product.getQuantity()) {
            throw new APIException("Insufficient stock for product " + product.getProductName() + ".");
        }
        if (nextQuantity < 0) {
            throw new APIException("Cart quantity cannot be negative.");
        }

        cartItem.setQuantity(nextQuantity);
        cartItem.setProductPrice(finalPrice(product));
        cartItem.setDiscount(product.getDiscount());
        CartItem updatedItem = cartItemRepository.save(cartItem);
        if(updatedItem.getQuantity() == 0){
            cart.getCartItems().removeIf(item -> item.getCartItemId() != null && item.getCartItemId().equals(updatedItem.getCartItemId()));
        }
        cart.setPrice(cart.getCartItems().stream()
                .mapToDouble(item -> (item.getProductPrice() == null ? 0 : item.getProductPrice()) * item.getQuantity())
                .sum());
        cartRepository.save(cart);


        CartDTO cartDTO = modelMapper.map(cart, CartDTO.class);

        List<CartItem> cartItems = cart.getCartItems();

        Stream<ProductDTO> productStream = cartItems.stream().map(item -> {
            ProductDTO prd = modelMapper.map(item.getProduct(), ProductDTO.class);
            prd.setQuantity(item.getQuantity());
            return prd;
        });


        cartDTO.setProducts(productStream.toList());

        return cartDTO;

    }

    @Override
    public String deleteProductFromCart(Long cartId, Long productId) {
        CartItem cartItem = cartItemRepository.findCardItemByProductIdAndCardId(cartId, productId);

        if (cartItem == null) {
            throw new ResourceNotFoundException("Product", "productId", productId);
        }

        Cart cart = cartItem.getCart();
        cart.setPrice(Math.max(0, (cart.getPrice() == null ? 0 : cart.getPrice()) -
                (cartItem.getProductPrice() == null ? 0 : cartItem.getProductPrice()) * cartItem.getQuantity()));
        cartRepository.save(cart);

        cartItemRepository.deleteCartItemByProductIdAndCartId(cartId, productId);

        return "Product " + cartItem.getProduct().getProductName() + " removed from the cart !!!";
    }

    private Cart createCard() {
        Cart userCart = cartRepository.findCardByEmail(authUtils.loggedInEmail());
        if (userCart != null) {
            return userCart;
        }
        Cart newCart = new Cart();
        newCart.setPrice(0.0);
        newCart.setUser(authUtils.loggedInUser());
        cartRepository.save(newCart);
        return newCart;
    }

    @Override
    public void updateProductInCarts(Long cartId, Long productId) {
        Cart cart = cartRepository.findById(cartId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart", "cartId", cartId));

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "productId", productId));

        CartItem cartItem = cartItemRepository.findCardItemByProductIdAndCardId(cartId, productId);

        if (cartItem == null) {
            throw new APIException("Product " + product.getProductName() + " not available in the cart!!!");
        }

        double cartPrice = (cart.getPrice() == null ? 0 : cart.getPrice())
                - ((cartItem.getProductPrice() == null ? 0 : cartItem.getProductPrice()) * cartItem.getQuantity());

        cartItem.setProductPrice(finalPrice(product));

        cart.setPrice(cartPrice
                + (cartItem.getProductPrice() * cartItem.getQuantity()));

        cartRepository.save(cart);
        cartItemRepository.save(cartItem);
    }

    private double finalPrice(Product product) {
        return product.getSpecialPrice() > 0
                ? product.getSpecialPrice()
                : product.getPrice() * (1 - product.getDiscount() / 100.0);
    }
}


