package com.natche.park_ease.controller;

/*
this is for register and login of all users including drivers ,area owners,guards and admins,
login is done via email or phone along with password and it returns a jwt token 
*/
import com.natche.park_ease.dto.LoginRequest;
import com.natche.park_ease.dto.LoginResponse;
import com.natche.park_ease.dto.RegisterRequest;
import com.natche.park_ease.entity.User;
import com.natche.park_ease.enums.UserRole;
import com.natche.park_ease.repository.UserRepository;
import com.natche.park_ease.security.JwtHelper;
import com.natche.park_ease.service.CustomUserDetailsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @Autowired
    private JwtHelper jwtHelper;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;

    // --- LOGIN API ---
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            // 1. Authenticate with Spring Security (Checks password)
            // Note: passing same identifier to user/pass as per your "Email Or Phone" logic
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getIdentifier(), request.getPassword())
            );
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid Credentials");
        }

        // 2. Generate Token
        UserDetails userDetails = userDetailsService.loadUserByUsername(request.getIdentifier());
        String token = jwtHelper.generateToken(userDetails);

        // 3. Return JSON
        return ResponseEntity.ok(new LoginResponse(token, userDetails.getUsername()));
    }

    // --- REGISTER API ---
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        
        if(userRepository.findByEmailOrPhone(request.getEmail(), request.getPhone()).isPresent()) {
            return ResponseEntity.badRequest().body("User already exists with this email or phone");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(UserRole.DRIVER) // Default role
                .isEnabled(true).isBlocked(false)
                .build();

        userRepository.save(user);
        
        return ResponseEntity.ok("User Registered Successfully");
    }
}

