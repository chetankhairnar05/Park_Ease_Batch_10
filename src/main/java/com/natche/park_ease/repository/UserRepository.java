package com.natche.park_ease.repository;

import com.natche.park_ease.entity.User;
import com.natche.park_ease.enums.UserRole;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Login: Fetch by Email or Phone
    Optional<User> findByEmail(String email);
    Optional<User> findByPhone(String phone);

    List<User> findByRoleIn(UserRole... roles);
    
    
    // For validation during registration
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);

    // Flexible login (allow user to enter either email or phone in the same field)
    Optional<User> findByEmailOrPhone(String email, String phone);

        // ✅ NEW: Find users waiting for approval
    List<User> findByIsEnabledFalse();
}
