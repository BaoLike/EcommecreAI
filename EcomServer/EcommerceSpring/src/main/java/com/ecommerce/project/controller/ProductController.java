package com.ecommerce.project.controller;

import com.ecommerce.project.config.AppConstants;
import com.ecommerce.project.payload.ProductDTO;
import com.ecommerce.project.payload.ProductResponse;
import com.ecommerce.project.service.ProductService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.validation.annotation.Validated;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api")
@Validated
public class ProductController {

    @Autowired
    ProductService productService;

    @GetMapping("/public/recommendations")
    public ResponseEntity<List<ProductDTO>> getRecommendProducts() {
        return ResponseEntity.ok(productService.getTopDisCountProduct());
    }

    @PostMapping(value = "/admin/categories/{categoryId}/product", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProductDTO> addProduct(@Valid @RequestPart ProductDTO productDTO,
                                                 @PathVariable Long categoryId,
                                                 @RequestParam(value = "image", required = false) MultipartFile image) throws IOException {
        ProductDTO savedProductDTO = productService.addProduct(categoryId, productDTO, image);
        return new ResponseEntity<>(savedProductDTO, HttpStatus.CREATED);
    }

    @GetMapping("/public/products")
    public ResponseEntity<ProductResponse> getAllProducts(
            @RequestParam(name = "keyword",  required = false) @Size(max = 200) String keyword,
            @RequestParam(name = "category", required = false) @Size(max = 100) String category,
            @RequestParam(name = "brand", required = false) @Size(max = 100) String brand,
            @RequestParam(name = "minPrice", required = false) @DecimalMin("0.0") @DecimalMax("1000000000000.0") Double minPrice,
            @RequestParam(name = "maxPrice", required = false) @DecimalMin("0.0") @DecimalMax("1000000000000.0") Double maxPrice,
            @RequestParam(name = "inStock", required = false) Boolean inStock,
            @RequestParam(name = "pageNumber", defaultValue = AppConstants.PAGE_NUMBER, required = false) @Min(0) Integer pageNumber,
            @RequestParam(name = "pageSize", defaultValue = AppConstants.PAGE_SIZE, required = false) @Min(1) @Max(100) Integer pageSize,
            @RequestParam(name = "sortBy", defaultValue = AppConstants.SORT_PRODUCTS_BY, required = false) @Pattern(regexp = "productId|productName|price|specialPrice|discount|quantity|sku|brand") String sortBy,
            @RequestParam(name = "sortOrder", defaultValue = AppConstants.SORT_DIR, required = false) @Pattern(regexp = "(?i)asc|desc") String sortOrder
    ){
        if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "minPrice must not exceed maxPrice");
        }
        ProductResponse productResponse = productService.getAllProducts(
                pageNumber, pageSize, sortBy, sortOrder, keyword, category, brand, minPrice, maxPrice, inStock);
        return new ResponseEntity<>(productResponse,HttpStatus.OK);
    }

    @GetMapping("/public/categories/{categoryId}/products")
    public ResponseEntity<ProductResponse> getProductsByCategory(@PathVariable Long categoryId,
                                                                 @RequestParam(name = "pageNumber", defaultValue = AppConstants.PAGE_NUMBER, required = false) @Min(0) Integer pageNumber,
                                                                 @RequestParam(name = "pageSize", defaultValue = AppConstants.PAGE_SIZE, required = false) @Min(1) @Max(100) Integer pageSize,
                                                                 @RequestParam(name = "sortBy", defaultValue = AppConstants.SORT_PRODUCTS_BY, required = false) @Pattern(regexp = "productId|productName|price|specialPrice|discount|quantity|sku|brand") String sortBy,
                                                                 @RequestParam(name = "sortOrder", defaultValue = AppConstants.SORT_DIR, required = false) @Pattern(regexp = "(?i)asc|desc") String sortOrder){
        ProductResponse productResponse = productService.searchByCategory(categoryId, pageNumber, pageSize, sortBy, sortOrder);
        return new ResponseEntity<>(productResponse, HttpStatus.OK);
    }

    @GetMapping("/public/products/keyword/{keyword}")
    public ResponseEntity<ProductResponse> getProductsByKeyword(@PathVariable @Size(max = 200) String keyword,
                                                                @RequestParam(name = "pageNumber", defaultValue = AppConstants.PAGE_NUMBER, required = false) @Min(0) Integer pageNumber,
                                                                @RequestParam(name = "pageSize", defaultValue = AppConstants.PAGE_SIZE, required = false) @Min(1) @Max(100) Integer pageSize,
                                                                @RequestParam(name = "sortBy", defaultValue = AppConstants.SORT_PRODUCTS_BY, required = false) @Pattern(regexp = "productId|productName|price|specialPrice|discount|quantity|sku|brand") String sortBy,
                                                                @RequestParam(name = "sortOrder", defaultValue = AppConstants.SORT_DIR, required = false) @Pattern(regexp = "(?i)asc|desc") String sortOrder){
        ProductResponse productResponse = productService.searchProductByKeyword(keyword, pageNumber, pageSize, sortBy, sortOrder);
        return new ResponseEntity<>(productResponse, HttpStatus.FOUND);
    }

    @PutMapping(value = "/admin/products/{productId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProductDTO> updateProduct(@Valid @RequestPart ProductDTO productDTO,
                                                    @PathVariable Long productId,
                                                    @RequestParam(value = "image", required = false) MultipartFile image) throws IOException {
        ProductDTO updatedProductDTO = productService.updateProduct(productId, productDTO, image);
        return new ResponseEntity<>(updatedProductDTO, HttpStatus.OK);
    }

    @DeleteMapping("/admin/products/{productId}")
    public ResponseEntity<ProductDTO> deleteProduct(@PathVariable Long productId){
        ProductDTO deletedProduct = productService.deleteProduct(productId);
        return new ResponseEntity<>(deletedProduct, HttpStatus.OK);
    }

    @PutMapping("/admin/products/{productId}/image")
    public ResponseEntity<ProductDTO> updateProductImage(@PathVariable Long productId,
                                                         @RequestParam("image")MultipartFile image) throws IOException {
        ProductDTO updatedProduct = productService.updateProductImage(productId, image);
        return new ResponseEntity<>(updatedProduct, HttpStatus.OK);
    }
}
