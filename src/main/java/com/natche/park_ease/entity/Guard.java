package com.natche.park_ease.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "guards")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Guard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long guardId;

    // Link to the User Login/Profile
    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    // Link to the Area they work at
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "area_id", nullable = false)
    private ParkingArea parkingArea;
    
    
}