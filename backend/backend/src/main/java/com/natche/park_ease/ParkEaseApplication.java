package com.natche.park_ease;

import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import jakarta.annotation.PostConstruct;

@SpringBootApplication
public class ParkEaseApplication {

	public static void main(String[] args) {
		SpringApplication.run(ParkEaseApplication.class, args);
	}

	@PostConstruct
	public void init() {
		TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));
		System.out.println("✅ Application Timezone set to: " + new java.util.Date());
	}

}
