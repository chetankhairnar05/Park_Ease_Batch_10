package com.natche.park_ease.config;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.DependsOn;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.natche.park_ease.entity.User;
import com.natche.park_ease.enums.UserRole;
import com.natche.park_ease.repository.UserRepository;

@Component
@DependsOn("entityManagerFactory") // <--- Add this annotation
public class AdminSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Check if an admin already exists to avoid duplicates
        // In a real app, you might query by Role, but checking a specific email is easier here
        String adminEmail = "admin@parkease.com";
        
        if (userRepository.findByEmail(adminEmail).isEmpty()) {
            User admin = User.builder()
                    .name("Super Admin")
                    .email(adminEmail)
                    .phone("9999999999") // Dummy phone
                    .password(passwordEncoder.encode("admin123")) // Default Password
                    .role(UserRole.ADMIN)
                    .isEnabled(true).isBlocked(false)
                    .build();

            userRepository.save(admin);
            System.out.println("✅ SUPER ADMIN CREATED: Email: admin@parkease.com | Pass: admin123");
        } else {
            System.out.println("ℹ️ Super Admin already exists.");
        }
    }
}