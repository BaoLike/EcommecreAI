package com.ecommerce.project.controller;

import com.ecommerce.project.Utils.AuthUtil;
import com.ecommerce.project.exceptions.APIException;
import com.ecommerce.project.model.Users;
import com.ecommerce.project.payload.UserProfileDTO;
import com.ecommerce.project.payload.UserProfileUpdateDTO;
import com.ecommerce.project.repositories.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Locale;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {
    private final AuthUtil authUtil;
    private final UserRepository userRepository;

    public ProfileController(AuthUtil authUtil, UserRepository userRepository) {
        this.authUtil = authUtil;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<UserProfileDTO> getMyProfile() {
        return ResponseEntity.ok(toDTO(authUtil.loggedInUser()));
    }

    @PutMapping
    public ResponseEntity<UserProfileDTO> updateMyProfile(@Valid @RequestBody UserProfileUpdateDTO request) {
        Users user = authUtil.loggedInUser();
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
            if (!email.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmailIgnoreCase(email)) {
                throw new APIException("Email is already in use.");
            }
            user.setEmail(email);
        }
        if (request.getPhone() != null) user.setPhone(request.getPhone().trim());
        if (request.getGender() != null) user.setSex(request.getGender().trim());
        return ResponseEntity.ok(toDTO(userRepository.save(user)));
    }

    private UserProfileDTO toDTO(Users user) {
        return new UserProfileDTO(user.getUserId(), user.getUsername(), user.getEmail(), user.getPhone(), user.getSex());
    }
}
