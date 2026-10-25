package com.ecommerce.project.payload;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserProfileUpdateDTO {
    @Email
    @Size(max = 50)
    private String email;

    @Pattern(regexp = "^[+0-9() -]{7,20}$")
    private String phone;

    @Size(max = 10)
    private String gender;
}
