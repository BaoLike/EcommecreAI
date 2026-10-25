package com.ecommerce.project.service;

import com.ecommerce.project.model.Users;
import com.ecommerce.project.model.Address;
import com.ecommerce.project.payload.AddressDTO;
import com.ecommerce.project.payload.ProvincesDTO;

import java.util.List;

public interface AddressService {
    AddressDTO createAddress(AddressDTO addressDTO, Users user);

    List<ProvincesDTO> getAddresses();

    AddressDTO getAddressesById(Long addressId, Users user);

    List<AddressDTO> getUserAddresses(Users user);

    Address getOwnedAddress(Long addressId, Users user);

    AddressDTO updateAddress(Long addressId, AddressDTO addressDTO, Users user);

    String deleteAddress(Long addressId, Users user);
}
