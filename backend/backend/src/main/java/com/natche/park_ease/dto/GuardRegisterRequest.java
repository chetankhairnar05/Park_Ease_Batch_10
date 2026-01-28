package com.natche.park_ease.dto;

import lombok.Data;

@Data
public class GuardRegisterRequest {
    private String name;
    private String email;
    private String phone;
    private String password;
    
    // New Field: Specify which area this guard belongs to
    private Long areaId; 
}