package com.ecommerce.project.payload;

import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class CartDTO {
    private Long cartId;
    private Double price = 0.0;
    private List<ProductDTO> products = new ArrayList<>();
}
