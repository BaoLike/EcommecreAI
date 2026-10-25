package com.ecommerce.project.repositories;

import com.ecommerce.project.model.Provinces;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProvincesRepository extends JpaRepository<Provinces, Integer> {
}
