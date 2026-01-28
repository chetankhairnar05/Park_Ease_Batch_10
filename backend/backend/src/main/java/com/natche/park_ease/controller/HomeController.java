package com.natche.park_ease.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.security.core.Authentication;


@Controller
public class HomeController {

    @GetMapping("/")
    public String home(Authentication authentication) {

        

        // Logged in user
        return "redirect:/dashboard.html";
    }
}
