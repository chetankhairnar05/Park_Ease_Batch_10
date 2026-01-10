package com.natche.park_ease.config;

import com.natche.park_ease.entity.*;
import com.natche.park_ease.enums.*;
import com.natche.park_ease.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.DependsOn;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import java.util.concurrent.atomic.AtomicLong;

@Component
@DependsOn("entityManagerFactory")
public class AdminSeeder implements CommandLineRunner {

    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private ParkingAreaRepository parkingAreaRepository;
    @Autowired private ParkingSlotRepository parkingSlotRepository;
    @Autowired private GuardRepository guardRepository;
    @Autowired private VehicleRepository vehicleRepository;
    @Autowired private UserVehicleAccessRepository userVehicleAccessRepository;

    // Unique Phone Generator (Starts at 6745235600)
    private final AtomicLong phoneCounter = new AtomicLong(6745235600L);
    // Unique Plate Counter
    private final AtomicLong plateCounter = new AtomicLong(1000);
    
    private final Random random = new Random();

    // Mock Data for Indore (Expanded to handle more areas)
    private final String[] AREA_NAMES = {
        "Phoenix Citadel Mall", "Treasure Island Mall (TI)", "C21 Mall", 
        "56 Dukan Parking", "Rajwada Public Parking", "Indore Railway Station (East)",
        "Vijay Nagar Square", "Bhawarkua Square", "Airport Road Parking"
    };
    private final String[] AREA_ADDRESSES = {
        "MR 10 Road, Indore, MP", "MG Road, Indore, MP", "AB Road, Vijay Nagar, Indore",
        "Chappan Dukan, New Palasia, Indore", "Rajwada Circle, Indore", "Chhoti Gwaltoli, Indore",
        "Vijay Nagar, Indore, MP", "Bhawarkua, Indore, MP", "Devi Ahilya Airport Area, Indore"
    };

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        
        // Prevent double seeding
        if (userRepository.findByEmail("admin1@gmail.com").isPresent()) {
            System.out.println("ℹ️ Database already seeded.");
            return;
        }

        System.out.println("🌱 Seeding Indore Parking Data...");
        String commonPass = passwordEncoder.encode("1234");
        
        int areaCounter = 0;

        // 1. Create 3 Admins (Each gets 1 Area & Vehicles)
        for (int i = 1; i <= 3; i++) {
            User admin = createUser("Admin " + i, "admin" + i + "@gmail.com", commonPass, UserRole.ADMIN, null, null);
            // createVehiclesForUser(admin); // Assign Vehicles
            // createFullAreaEnvironment(admin, areaCounter++, commonPass); // Assign 1 Area
        }

        // 2. Create 3 Area Owners (Each gets 2 Areas & Vehicles)
        for (int i = 1; i <= 3; i++) {
            User owner = createUser("Owner " + i, "owner" + i + "@gmail.com", commonPass, UserRole.AREA_OWNER, null, null);
            // createVehiclesForUser(owner); // Assign Vehicles
            
            // Each Owner gets 2 distinct areas
            createFullAreaEnvironment(owner, areaCounter++, commonPass);
            createFullAreaEnvironment(owner, areaCounter++, commonPass);
        }

        // 3. Create 3 Users (Drivers) with Vehicles
        for (int i = 1; i <= 3; i++) {
            // Random location for user (simulating they are somewhere in Indore)
            double uLat = 22.7196 + (random.nextDouble() * 0.1 - 0.05);
            double uLon = 75.8577 + (random.nextDouble() * 0.1 - 0.05);

            User driver = createUser("User " + i, "user" + i + "@gmail.com", commonPass, UserRole.DRIVER, 
                                     String.valueOf(uLat), String.valueOf(uLon));
            driver.setWalletBalance(2000.0); // Rich drivers for testing
            userRepository.save(driver);

            createVehiclesForUser(driver); // Assign Vehicles
        }

        System.out.println("✅ SEEDING COMPLETE! Login with user1@gmail.com / 1234");
    }

    // --- CORE LOGIC ---

    private void createFullAreaEnvironment(User owner, int index, String password) {
        String name = (index < AREA_NAMES.length) ? AREA_NAMES[index] : "Area " + index;
        String addr = (index < AREA_ADDRESSES.length) ? AREA_ADDRESSES[index] : "Street " + index + ", Indore";

        // Randomize Location: Indore Center +/- 0.15 degrees (~15-20km radius)
        double lat = 22.7196 + (random.nextDouble() * 0.3 - 0.15);
        double lon = 75.8577 + (random.nextDouble() * 0.3 - 0.15);

        ParkingArea area = new ParkingArea();
        area.setName(name);
        area.setAddress(addr);
        area.setLatitude(String.valueOf(lat));
        area.setLongitude(String.valueOf(lon));
        
        // Capacities
        area.setCapacitySmall(10);
        area.setCapacityMedium(10);
        area.setCapacityLarge(10);

        // Pricing Configuration
        area.setReservationRateMultipliers(Arrays.asList(0.0, 0.25, 0.50, 1.0));
        area.setGracePeriodMinutes(30);
        area.setReservationWaiverMinutes(10);
        area.setAreaOwner(owner);

        // Initialize Dynamic Rate Indexes to 0 (Lowest Demand)
        area.setCurrentRateIndexSmall(0);
        area.setCurrentRateIndexMedium(0);
        area.setCurrentRateIndexLarge(0);

        // Initialize Occupancy
        area.setOccupancySmall(0);
        area.setOccupancyMedium(0);
        area.setOccupancyLarge(0);

        ParkingArea savedArea = parkingAreaRepository.save(area);

        // --- Create Slots ---
        // Range: Small(40-70), Medium(90-120), Large(140-180)
        double rateS = 40 + random.nextInt(31); 
        double rateM = 90 + random.nextInt(31);
        double rateL = 140 + random.nextInt(41);

        List<ParkingSlot> slots = new ArrayList<>();
        slots.addAll(generateSlots(savedArea, VehicleType.SMALL, 10, rateS, "S"));
        slots.addAll(generateSlots(savedArea, VehicleType.MEDIUM, 10, rateM, "M"));
        slots.addAll(generateSlots(savedArea, VehicleType.LARGE, 10, rateL, "L"));
        parkingSlotRepository.saveAll(slots);

        // --- Create 2 Guards ---
        for (int g = 1; g <= 2; g++) {
            String gEmail = "guard" + savedArea.getAreaId() + "_" + g + "@gmail.com";
            User guardUser = createUser("Guard " + savedArea.getAreaId() + "-" + g, gEmail, password, UserRole.GUARD, null, null);
            
            Guard guard = Guard.builder()
                    .user(guardUser)
                    .parkingArea(savedArea)
                    .build();
            guardRepository.save(guard);
        }
    }

    private List<ParkingSlot> generateSlots(ParkingArea area, VehicleType type, int count, Double rate, String prefix) {
        List<ParkingSlot> slots = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            ParkingSlot slot = new ParkingSlot();
            slot.setParkingArea(area);
            slot.setSlotNumber(prefix + "-" + i);
            slot.setFloor(0); // Ground floor default
            slot.setSupportedVehicleType(type);
            
            // 3 out of 10 slots are in MAINTENANCE mode
            if (i <= 3) {
                slot.setStatus(ParkingSlotStatus.MAINTENANCE);
            } else {
                slot.setStatus(ParkingSlotStatus.AVAILABLE);
            }
            
            slot.setBaseHourlyRate(rate);
            slots.add(slot);
        }
        return slots;
    }

    private User createUser(String name, String email, String password, UserRole role, String lat, String lon) {
        return userRepository.save(User.builder()
                .name(name)
                .email(email)
                .phone(String.valueOf(phoneCounter.getAndIncrement()))
                .password(password)
                .role(role)
                .isEnabled(true)
                .isBlocked(false)
                .walletBalance(0.0)
                .latitude(lat != null ? lat : "22.7196")
                .longitude(lon != null ? lon : "75.8577")
                .build());
    }

    private void createVehiclesForUser(User user) {
        String[] carModels = {"Honda City", "Swift Dzire", "Hyundai Creta", "Tata Nexon", "Kia Seltos"};
        String[] bikeModels = {"Activa 6G", "Splendor Plus", "Royal Enfield", "Jupiter", "Pulsar 150"};
        String[] suvModels = {"Toyota Fortuner", "Mahindra Thar", "Tata Safari", "XUV 700", "Scorpio N"};
        String[] colors = {"White", "Black", "Silver", "Red", "Blue", "Grey"};

        // Create 2 vehicles per user with random types
        for (int i = 0; i < 2; i++) {
            Vehicle v = new Vehicle();
            v.setCreatedBy(user);
            
            // Randomly select type (0=Small, 1=Medium, 2=Large)
            int typeRoll = random.nextInt(3);
            
            if (typeRoll == 0) {
                v.setRegisterNumber("MP-09-BK-" + plateCounter.getAndIncrement());
                v.setModel(bikeModels[random.nextInt(bikeModels.length)]);
                v.setVehicleType(VehicleType.SMALL);
            } else if (typeRoll == 1) {
                v.setRegisterNumber("MP-09-CA-" + plateCounter.getAndIncrement());
                v.setModel(carModels[random.nextInt(carModels.length)]);
                v.setVehicleType(VehicleType.MEDIUM);
            } else {
                v.setRegisterNumber("MP-09-SUV-" + plateCounter.getAndIncrement());
                v.setModel(suvModels[random.nextInt(suvModels.length)]);
                v.setVehicleType(VehicleType.LARGE);
            }
            
            v.setColor(colors[random.nextInt(colors.length)]);
            Vehicle savedV = vehicleRepository.save(v);

            // Grant Access (First one is Primary)
            UserVehicleAccess access = UserVehicleAccess.builder()
                    .user(user)
                    .vehicle(savedV)
                    .role(UserVehicleAccessRole.OWNER)
                    .isPrimary(i == 0) 
                    .isEnabled(true)
                    .build();
            userVehicleAccessRepository.save(access);
        }
    }
}