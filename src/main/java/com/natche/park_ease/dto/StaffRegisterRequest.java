package com.natche.park_ease.dto;

import com.natche.park_ease.enums.UserRole;

public class StaffRegisterRequest {
    private String name;
    private String email;
    private String phone;
    private String password;
    private UserRole role; // Enum input

    // Getters
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getPassword() { return password; }
    public UserRole getRole() { return role; }
}
