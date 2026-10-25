package com.ecommerce.project.service;

import com.ecommerce.project.payload.ProvincesDTO;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public interface LocationService {
    public List<ProvincesDTO> getAllLocaltion();
}
