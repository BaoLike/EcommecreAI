package com.ecommerce.project.payload;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class ProductDTO {
    private Long productId;

    @NotBlank
    @Size(max = 200)
    private String productName;

    @Size(max = 64)
    private String sku;

    @Size(max = 100)
    private String brand;

    @Size(max = 150)
    private String model;

    @PositiveOrZero
    private Integer warrantyMonths;

    private Map<String, Object> specifications;

    private boolean demoData;

    private String image;

    @NotBlank
    @Size(max = 10000)
    private String description;

    @PositiveOrZero
    private Integer quantity;

    @DecimalMin("0.0")
    private double price;

    @DecimalMin("0.0")
    @DecimalMax("100.0")
    private double discount;

    @DecimalMin("0.0")
    private double specialPrice;
}
