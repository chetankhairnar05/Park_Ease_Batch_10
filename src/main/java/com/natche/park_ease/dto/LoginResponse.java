package com.natche.park_ease.dto;

public class LoginResponse {
    private String token;
    private String username;
    
    public LoginResponse(String token, String username) {
        this.token = token;
        this.username = username;
    }
    // getters
    public String getToken() { return token; }
    public String getUsername() { return username; }
}
