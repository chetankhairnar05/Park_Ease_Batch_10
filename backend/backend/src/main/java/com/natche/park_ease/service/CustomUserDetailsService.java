package com.natche.park_ease.service;

import com.natche.park_ease.entity.User;
import com.natche.park_ease.repository.UserRepository;
import com.natche.park_ease.security.CustomUserDetails;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        // "identifier" can be Email OR Phone (Smart Login)
        User user = userRepository.findByEmailOrPhone(identifier, identifier)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email/phone: " + identifier));

        // Wrap the entity and return
        return new CustomUserDetails(user);
    }
}