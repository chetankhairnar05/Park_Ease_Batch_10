package com.natche.park_ease.dto;

public class RegisterRequest {
    private String name;
    private String email;
    private String phone;
    private String password;
    private String role;
    // getters
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getPassword() { return password; }
    public String getRole() { return role; }
}