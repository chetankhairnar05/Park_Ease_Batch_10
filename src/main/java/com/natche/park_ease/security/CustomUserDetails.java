package com.natche.park_ease.security;

import com.natche.park_ease.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

public class CustomUserDetails implements UserDetails {

    private final User user; // Composition: We hold the entity inside

    public CustomUserDetails(User user) {
        this.user = user;
    }

    // --- Bridge Methods ---

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Convert your Enum (DRIVER, ADMIN) to a Spring Authority
        return Collections.singleton(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
    }

    @Override
    public String getPassword() {
        return user.getPassword();
    }

    @Override
    public String getUsername() {
        return user.getEmail(); // Or use phone, whichever is your primary login
    }


    @Override
    public boolean isAccountNonLocked() {
        // CRITICAL: If you blocked them due to debt, Spring Security blocks login here!
        return !user.getIsBlocked(); 
    }

    @Override
    public boolean isEnabled() {
        return user.getIsEnabled();
    }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }
    
    // Helper to get the actual ID if needed in Controllers
    public Long getUserId() {
        return user.getUserId();
    }
}