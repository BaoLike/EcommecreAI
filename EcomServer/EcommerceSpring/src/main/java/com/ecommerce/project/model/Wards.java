package com.ecommerce.project.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name="wards")
@Getter
@Setter
public class Wards {
    @Id
    private Integer id;
    private String name;
    private String slug;
    private String type;
    private String name_with_type;
    private String path;
    private String path_with_type;

    @ManyToOne
    @JoinColumn(name = "province_id")
    @JsonIgnore
    private Provinces provinces;
}
