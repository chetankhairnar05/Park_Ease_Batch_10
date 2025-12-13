/*
admin can create area owner and other admins , we have already created admin namesd super admin in the seeder who is going to create other admins and area owners
*/

package com.natche.park_ease.controller;

import com.natche.park_ease.dto.StaffRegisterRequest;
import com.natche.park_ease.dto.response.UserProfileDto;
import com.natche.park_ease.entity.User;
import com.natche.park_ease.enums.UserRole;
import com.natche.park_ease.repository.UserRepository;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
// import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
// Ensure only ADMINs can access this entire controller
// (Assuming you enabled @EnableMethodSecurity in config, or set it in SecurityFilterChain)
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // Endpoint to create Guards or other Admins
    // @PostMapping("/create-staff")
    // @PreAuthorize("hasRole('ADMIN')")
    // public ResponseEntity<?> createStaff(@RequestBody StaffRegisterRequest request) {
    //     // Validate Role (Prevent creating random roles if you have others)
    //     if (request.getRole() != UserRole.ADMIN && request.getRole() != UserRole.AREA_OWNER) {
    //         return ResponseEntity.badRequest().body("Invalid Role. Only ADMIN or AREA_OWNER allowed here.");
    //     }

    //     Optional<User> existingUserOpt = userRepository.findByEmailOrPhone(request.getEmail(), request.getPhone());
    //     User owner;

    //     if (existingUserOpt.isPresent()) {
    //         // --- EXISTING USER LOGIC ---
    //         owner = existingUserOpt.get();
            
    //         // Validation: Can only recruit DRIVERS
    //         if (owner.getRole() == UserRole.ADMIN || owner.getRole() == UserRole.AREA_OWNER ) {
    //             // throw new RuntimeException("User is already a area owner or Admin.");
    //             return ResponseEntity.badRequest().body("Requested user is already a area owner or Admin.");
    //         }
    //         //guard and driver can promote to area owner
    //         // Promote to GUARD
    //         owner.setRole(UserRole.AREA_OWNER);
    //         // We do NOT update password for existing users, they keep their own.

    //     } else {
    //         // --- NEW USER LOGIC ---
    //          owner= User.builder()
    //                 .name(request.getName())
    //                 .email(request.getEmail())
    //                 .phone(request.getPhone())
    //                 .password(passwordEncoder.encode(request.getPassword()))
    //                 .role(request.getRole()).isBlocked(false)
    //                 .isEnabled(true)
    //                 .build();
    //     }
    //     userRepository.save(owner);

    //     return ResponseEntity.ok("Staff member created successfully: " + request.getRole());
    // }
    @PostMapping("/create-staff")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createStaff(@RequestBody StaffRegisterRequest request) {

        // 1. Validate Role (Prevent creating random roles if you have others)
        if (request.getRole() != UserRole.ADMIN && request.getRole() != UserRole.AREA_OWNER) {
            return ResponseEntity.badRequest().body("Invalid Role. Only ADMIN or AREA_OWNER allowed here.");
        }

        // 2. SMART SEARCH LOGIC (Handle Nulls & Flexible Input)
        String searchEmail = (request.getEmail() != null && !request.getEmail().trim().isEmpty()) 
                             ? request.getEmail().trim() : null;
        String searchPhone = (request.getPhone() != null && !request.getPhone().trim().isEmpty()) 
                             ? request.getPhone().trim() : null;

        // Must have at least one identifier
        if (searchEmail == null && searchPhone == null) {
            return ResponseEntity.badRequest().body("At least one identifier (Email or Phone) is required to create staff.");
        }

        Optional<User> existingUserOpt = Optional.empty();

        // Perform Search based on available fields
        if (searchEmail != null && searchPhone != null) {
            existingUserOpt = userRepository.findByEmailOrPhone(searchEmail, searchPhone);
        } else if (searchEmail != null) {
            existingUserOpt = userRepository.findByEmail(searchEmail);
        } else {
            existingUserOpt = userRepository.findByPhone(searchPhone);
        }

        User staffUser;

        if (existingUserOpt.isPresent()) {
            // --- EXISTING USER LOGIC (PROMOTION) ---
            staffUser = existingUserOpt.get();
            
            // Validation: Can only recruit DRIVERS or GUARDS (depending on logic, usually just promote up)
            // Prevent demoting an existing Admin/Owner effectively by checking if they already hold a high role
            if (staffUser.getRole() == UserRole.ADMIN || staffUser.getRole() == UserRole.AREA_OWNER ) {
                return ResponseEntity.badRequest().body("Requested user is already an Area Owner or Admin.");
            }
            
            // Promote to requested role
            staffUser.setRole(request.getRole()); 
            // Existing password/details remain unchanged

        } else {
            // --- NEW USER LOGIC (CREATION) ---
            
            // Validate Minimal Requirements for NEW user
            if (request.getName() == null || request.getName().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Name is required for new staff.");
            }
            if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Password is required for new staff.");
            }

            staffUser = User.builder()
                    .name(request.getName())
                    .email(searchEmail) // Might be null
                    .phone(searchPhone) // Might be null
                    .password(passwordEncoder.encode(request.getPassword()))
                    .role(request.getRole())
                    .isBlocked(false)
                    .isEnabled(true)
                    .build();
        }
        
        userRepository.save(staffUser);

        return ResponseEntity.ok("Staff member created successfully: " + request.getRole());
    }
    // @GetMapping("/get-all-staff/")
    // @PreAuthorize("hasRole('ADMIN')")
    // public ResponseEntity<?> getAllStaff() {
    //     return ResponseEntity.ok(userRepository.findByRoleIn(UserRole.ADMIN, UserRole.AREA_OWNER));
    // }

     @GetMapping("/get-all-staff/")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserProfileDto>> getAllStaff() {
        // Fetch entities
        List<User> staff = userRepository.findByRoleIn(UserRole.ADMIN, UserRole.AREA_OWNER);
        
        // Convert to DTOs to avoid 500 Error (Hibernate Lazy Loading Crash)
        List<UserProfileDto> dtos = staff.stream()
                .map(UserProfileDto::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }
    
}

// DTO for this request
