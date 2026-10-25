package com.ecommerce.project.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Entity
@Table(name = "provinces")
@Getter
@Setter
public class Provinces {
    @Id
    private Integer id;
    private String name;
    private String name_slug;
    private String full_name;
    private String type;

    @OneToMany(mappedBy = "provinces", fetch = FetchType.EAGER)
    private List<Wards> warsList;
}
