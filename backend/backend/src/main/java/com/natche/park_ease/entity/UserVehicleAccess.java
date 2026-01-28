package com.natche.park_ease.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.natche.park_ease.enums.UserVehicleAccessRole;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_vehicle_access")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserVehicleAccess {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonBackReference
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    @JsonManagedReference
    private Vehicle vehicle;

    @Enumerated(EnumType.STRING)
    private UserVehicleAccessRole role;

    private Boolean isEnabled = true;
    
    private Boolean isPrimary = false; // As discussed in previous chats
}