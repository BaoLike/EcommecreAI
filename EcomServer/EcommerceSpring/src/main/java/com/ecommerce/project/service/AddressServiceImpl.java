package com.ecommerce.project.service;

import com.ecommerce.project.exceptions.ResourceNotFoundException;
import com.ecommerce.project.model.Address;
import com.ecommerce.project.model.Provinces;
import com.ecommerce.project.model.Users;
import com.ecommerce.project.payload.AddressDTO;
import com.ecommerce.project.payload.ProvincesDTO;
import com.ecommerce.project.payload.WardsDTO;
import com.ecommerce.project.repositories.AddressRepository;
import com.ecommerce.project.repositories.ProvincesRepository;
import com.ecommerce.project.repositories.UserRepository;
import com.ecommerce.project.repositories.OrderRepository;
import com.ecommerce.project.exceptions.APIException;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class AddressServiceImpl implements AddressService {
    @Autowired
    private AddressRepository addressRepository;

    @Autowired
    private ModelMapper modelMapper;

    @Autowired
    UserRepository userRepository;

    @Autowired
    OrderRepository orderRepository;

    @Autowired
    ProvincesRepository  provincesRepository;

    @Override
    public AddressDTO createAddress(AddressDTO addressDTO, Users user) {
        Address address = modelMapper.map(addressDTO, Address.class);
        address.setUser(user);
        List<Address> addressesList = user.getAddresses();
        addressesList.add(address);
        user.setAddresses(addressesList);
        Address savedAddress = addressRepository.save(address);
        userRepository.save(user);
        return modelMapper.map(savedAddress, AddressDTO.class);
    }

    @Override
    public List<ProvincesDTO> getAddresses() {
        List<Provinces> addresses = provincesRepository.findAll();
        return addresses.stream()
                .map(address -> {
                    ProvincesDTO newProvince =  new ProvincesDTO(address);
                    return newProvince;
                })
                .toList();
    }

    @Override
    public AddressDTO getAddressesById(Long addressId, Users user) {
        Address address = findOwnedAddress(addressId, user);
        return modelMapper.map(address, AddressDTO.class);
    }

    @Override
    public List<AddressDTO> getUserAddresses(Users user) {
        List<Address> addresses = addressRepository.findByUserUserId(user.getUserId());
        return addresses.stream()
                .map(address -> modelMapper.map(address, AddressDTO.class))
                .toList();
    }

    @Override
    public Address getOwnedAddress(Long addressId, Users user) {
        return findOwnedAddress(addressId, user);
    }

    @Override
    public AddressDTO updateAddress(Long addressId, AddressDTO addressDTO, Users user) {
        Address addressFromDatabase = findOwnedAddress(addressId, user);
        if (orderRepository.existsByAddress_AddressId(addressId)) {
            throw new APIException("This address is linked to an order and cannot be edited. Add a new address for future orders.");
        }

        addressFromDatabase.setCity(addressDTO.getCity());
        addressFromDatabase.setStreet(addressDTO.getStreet());
        addressFromDatabase.setBuildingName(addressDTO.getBuildingName());
        addressFromDatabase.setWard(addressDTO.getWard());
        addressFromDatabase.setReceiverName(addressDTO.getReceiverName());
        addressFromDatabase.setPhoneNumberReceiver(addressDTO.getPhoneNumberReceiver());

        Address updatedAddress = addressRepository.save(addressFromDatabase);

        Users addressOwner = addressFromDatabase.getUser();
        addressOwner.getAddresses().removeIf(address -> address.getAddressId().equals(addressId));
        addressOwner.getAddresses().add(updatedAddress);
        userRepository.save(addressOwner);

        return modelMapper.map(updatedAddress, AddressDTO.class);
    }

    @Override
    public String deleteAddress(Long addressId, Users user) {
        Address addressFromDatabase = findOwnedAddress(addressId, user);
        if (orderRepository.existsByAddress_AddressId(addressId)) {
            throw new APIException("This address is linked to an order and cannot be deleted.");
        }

        Users addressOwner = addressFromDatabase.getUser();
        addressOwner.getAddresses().removeIf(address -> address.getAddressId().equals(addressId));
        userRepository.save(addressOwner);

        addressRepository.delete(addressFromDatabase);

        return "Address deleted successfully with addressId: " + addressId;
    }

    private Address findOwnedAddress(Long addressId, Users user) {
        Address address = addressRepository.findById(addressId)
                .orElseThrow(() -> new ResourceNotFoundException("Address", "addressId", addressId));
        if (address.getUser() == null || user == null ||
                !address.getUser().getUserId().equals(user.getUserId())) {
            throw new ResourceNotFoundException("Address", "addressId", addressId);
        }
        return address;
    }
}
