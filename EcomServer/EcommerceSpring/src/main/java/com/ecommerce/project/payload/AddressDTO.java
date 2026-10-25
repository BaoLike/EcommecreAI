package com.ecommerce.project.payload;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.fasterxml.jackson.annotation.JsonProperty;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddressDTO {
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long addressId;

    @NotBlank
    @Size(max = 200)
    private String street;

    @NotBlank
    @Size(max = 100)
    private String buildingName;

    @NotBlank
    @Size(max = 100)
    private String city;

    @NotBlank
    @Size(max = 100)
    private String ward;

    @NotBlank
    @Size(max = 120)
    private String receiverName;

    @NotBlank
    @Size(max = 20)
    private String phoneNumberReceiver;

}
