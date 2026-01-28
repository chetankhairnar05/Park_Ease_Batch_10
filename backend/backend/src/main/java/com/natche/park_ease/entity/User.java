package com.natche.park_ease.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.natche.park_ease.enums.UserRole;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.util.List;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data // Lombok: Getters, Setters, toString, etc.
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userId;

    @NotBlank(message = "Name is required")
    private String name;

    @Email(message = "Invalid email format")
    @Column(unique = true, nullable = false)
    @NotBlank(message = "Email is required")
    private String email;

    @Column(unique = true, nullable = false)
    @NotBlank(message = "Phone number is required")
    private String phone;

    @NotBlank
    private String password;

    // Live Location
    private String latitude;
    private String longitude;

    @Enumerated(EnumType.STRING)
    private UserRole role;

    private Double walletBalance = 0.0; // To simulate payments

    @CreationTimestamp
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<UserVehicleAccess> vehicleAccessList;

    

    

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    private Boolean isEnabled = true;
    private Boolean isBlocked = false;
    
    
    // Helper to check total debt quickly via Repository, not stored field
}

