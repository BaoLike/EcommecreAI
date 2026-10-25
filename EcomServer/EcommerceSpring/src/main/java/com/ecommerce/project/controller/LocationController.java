package com.ecommerce.project.controller;

import com.ecommerce.project.payload.ProvincesDTO;
import com.ecommerce.project.service.LocationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class LocationController {
    @Autowired
    LocationService locationService;

    @GetMapping("/public/location")
    private ResponseEntity<List<ProvincesDTO>> getAllLocaltion() {
        return ResponseEntity.ok(locationService.getAllLocaltion());
    }
}
