package com.ecommerce.project.payload;

import com.ecommerce.project.model.Provinces;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@AllArgsConstructor
@Getter
@Setter
public class ProvincesDTO {
    private Integer id;
    @JsonProperty("full_name")
    private String fullName;
    private List<WardsDTO> wards;

    public ProvincesDTO(Provinces provinces) {
        this.id = provinces.getId();
        this.fullName = provinces.getFull_name();
        this.wards = provinces.getWarsList().stream().map((ward) -> {
            WardsDTO wardsDTO = new WardsDTO();
            wardsDTO.setId(ward.getId());
            wardsDTO.setName(ward.getName());
            return wardsDTO;
        }).toList();
    }
}
