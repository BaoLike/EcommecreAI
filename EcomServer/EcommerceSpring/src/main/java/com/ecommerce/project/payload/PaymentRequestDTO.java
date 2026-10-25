package com.ecommerce.project.payload;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRequestDTO {
    // Set by the server after reading current prices from the product table.
    private long amount;
    @NotNull
    @Positive
    private Long addressId;
    @NotEmpty
    @Valid
    private List<OrderItemRequestDTO> items;
    private String orderInfo;
    private String orderType;
    private String bankCode;
    private String language;
    private String billingMobile;
    private String billingEmail;
    private String billingFullname;
    private String billAddress;
    private String billCity;
    private String billCountry;
    private String billState;

    private String invMobile;
    private String invEmail;
    private String invCustomer;
    private String invCompany;
    private String invTaxcode;
    private String invType;
}
