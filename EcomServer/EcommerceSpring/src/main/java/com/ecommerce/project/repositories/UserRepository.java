package com.ecommerce.project.repositories;

import com.ecommerce.project.model.Users;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


import java.util.Optional;
import com.ecommerce.project.model.AppRole;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface UserRepository extends JpaRepository<Users, Integer> {
    Optional<Users> findByUsername(String username);

    boolean existsByUsername(@NotBlank @Size(min = 3, max = 20) String username);

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByEmail(@NotBlank @Size(max = 50) @Email String email);

    boolean existsByEmailIgnoreCase(String email);

    @Query("SELECT COUNT(DISTINCT u) FROM Users u JOIN u.roles r WHERE r.roleName = :role")
    long countUsersWithRole(@Param("role") AppRole role);

}
