/*
admin can create area owner and other admins , we have already created admin namesd super admin in the seeder who is going to create other admins and area owners
*/

package com.natche.park_ease.controller;

import com.natche.park_ease.dto.StaffRegisterRequest;
import com.natche.park_ease.dto.response.AreaBookingLogDto;
import com.natche.park_ease.dto.response.AreaStatisticsDto;
import com.natche.park_ease.dto.response.UserProfileDto;
import com.natche.park_ease.entity.ParkingArea;
import com.natche.park_ease.entity.User;
import com.natche.park_ease.enums.UserRole;
import com.natche.park_ease.repository.ParkingAreaRepository;
import com.natche.park_ease.repository.UserRepository;
import com.natche.park_ease.service.AdminService;
import com.natche.park_ease.service.AreaOwnerService;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
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

     @Autowired
    private ParkingAreaRepository parkingAreaRepository;

    @Autowired
    private AreaOwnerService areaOwnerService; // Reuse existing service logic

     @Autowired
    private AdminService adminService; // ✅ Inject AdminService


    
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
                    .role(request.getRole()).latitude("22.73860505802358")
                .longitude("75.88164655202729")
                .walletBalance(0.0)
                    .isBlocked(false)
                    .isEnabled(true)
                    .build();
        }
        
        userRepository.save(staffUser);

        return ResponseEntity.ok("Staff member created successfully: " + request.getRole());
    }
    

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


    // 1. Get Pending Approvals
    @GetMapping("/pending-approvals")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserProfileDto>> getPendingApprovals() {
        List<User> pendingUsers = userRepository.findByIsEnabledFalse();
        
        List<UserProfileDto> dtos = pendingUsers.stream()
                .map(UserProfileDto::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    // 2. Approve User (Enable Account)
    @PutMapping("/approve/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> approveUser(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setIsEnabled(true); // Activate account
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "User " + user.getName() + " has been approved successfully."));
    }


        // 3. Get Global Area Analytics (Using AdminService)
    @GetMapping("/analytics/all-areas")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getAllAreaAnalytics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start, 
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        
        List<ParkingArea> allAreas = parkingAreaRepository.findAll();
        List<Map<String, Object>> response = new ArrayList<>();

        for (ParkingArea area : allAreas) {
            // ✅ Use AdminService (No ownership check required)
            AreaStatisticsDto stats = adminService.getAreaStatistics(area.getAreaId(), start, end);
            
            Map<String, Object> row = new HashMap<>();
            row.put("areaId", area.getAreaId());
            row.put("name", area.getName());
            row.put("owner", area.getAreaOwner().getName());
            row.put("totalEarnings", stats.getTotalEarnings());
            row.put("activeBookings", stats.getActiveBookings());
            row.put("totalBookings", stats.getTotalBookings());
            row.put("completed", stats.getCompletedBookings());
            row.put("cancelled", stats.getCancelledBookings());
            
            // Calculate Avg Duration
            long total = stats.getTotalBookings() > 0 ? stats.getTotalBookings() : 1;
            row.put("avgDuration", (stats.getTotalReservationHours() + stats.getTotalParkingHours()) / total);
            
            response.add(row);
        }
        return ResponseEntity.ok(response);
    }
    
    // 4. Get Chart Data (Using AdminService)
    @GetMapping("/analytics/area/{areaId}/charts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAreaCharts(
            @PathVariable Long areaId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start, 
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        
        // ✅ Use AdminService
        return ResponseEntity.ok(adminService.getAnalyticsCharts(areaId, start, end));
    }
}

// DTO for this request
