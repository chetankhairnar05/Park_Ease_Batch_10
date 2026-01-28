package com.natche.park_ease.controller;

import com.natche.park_ease.dto.response.UserProfileDto;
import com.natche.park_ease.dto.response.UserVehicleAccessDto;

//user can change location and view profile details like wallet balance and role, all the vehicles he owns etc.

import com.natche.park_ease.entity.User;
import com.natche.park_ease.entity.UserVehicleAccess;
import com.natche.park_ease.repository.UserRepository;
import com.natche.park_ease.repository.UserVehicleAccessRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private UserVehicleAccessRepository userVehicleAccessRepository;

    @PutMapping("/location")
    public ResponseEntity<?> updateLocation(@RequestBody Map<String, String> location, Principal principal) {
        User user = userRepository.findByEmailOrPhone(principal.getName(), principal.getName()).orElseThrow();
        user.setLatitude(location.get("latitude"));
        user.setLongitude(location.get("longitude"));
        userRepository.save(user);
        return ResponseEntity.ok("Location updated");
    }
    
    

    @GetMapping("/profile")
    public ResponseEntity<UserProfileDto> getProfile(Principal principal) {
        // 1. Fetch Entity
        User user = userRepository.findByEmailOrPhone(principal.getName(), principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // 2. Convert to DTO (This avoids the recursion/lazy loading crash)
        UserProfileDto response = UserProfileDto.fromEntity(user);
        
        // 3. Return DTO
        return ResponseEntity.ok(response);
    }
    

     @GetMapping("/vehicles")
    public ResponseEntity<List<UserVehicleAccessDto>> getUserVehicles(Principal principal) {
        User user = userRepository.findByEmailOrPhone(principal.getName(), principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        List<UserVehicleAccess> accessList = userVehicleAccessRepository.findByUser_UserId(user.getUserId());
        
        // Convert Entity List -> DTO List
        List<UserVehicleAccessDto> dtos = accessList.stream()
                .map(UserVehicleAccessDto::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos); 
    }
    
}