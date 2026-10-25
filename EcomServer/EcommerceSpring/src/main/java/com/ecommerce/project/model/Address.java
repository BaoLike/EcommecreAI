package com.ecommerce.project.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "address")
@Data
@NoArgsConstructor
@Getter
@Setter
public class Address {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long addressId;

    @NotBlank
    @Size(min = 5, message = "street must be at least 5 character")
    private String street;

    @NotBlank
    @Size(min = 5, message = "receiver name must be at least 5 character")
    private String receiverName;


    @NotBlank
    @Size(min = 5, message = "phone number receiver must be at least 10 character")
    private String phoneNumberReceiver;

    @NotBlank
    @Size(min = 2, message = "building name must be at least 2 character")
    private String buildingName;

    @NotBlank
    @Size(min = 5, message = "city name must be at least 5 character")
    private String city;

    @NotBlank
    @Size(min = 5, message = "ward must be at least 5 character")
    private String ward;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean demoData = false;



    @ManyToOne
    @JoinColumn(name = "user_id")
    private Users user;
}
