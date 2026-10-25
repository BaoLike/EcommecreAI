package com.ecommerce.project.service;

import com.ecommerce.project.payload.ProvincesDTO;
import com.ecommerce.project.repositories.ProvincesRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LocationServiceImpl implements LocationService {
    @Autowired
    private ProvincesRepository provincesRepository;

    @Override
    public List<ProvincesDTO> getAllLocaltion() {
        return provincesRepository.findAll().stream().map(ProvincesDTO::new).toList();
    }
}
