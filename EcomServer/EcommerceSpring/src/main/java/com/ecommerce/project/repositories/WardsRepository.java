package com.ecommerce.project.repositories;

import com.ecommerce.project.model.Wards;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WardsRepository extends JpaRepository<Wards, Integer> {
}
