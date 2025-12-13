package com.natche.park_ease.service;

import com.natche.park_ease.dto.CreateParkingAreaRequest;
import com.natche.park_ease.dto.GuardRegisterRequest;
import com.natche.park_ease.dto.SlotUpdateRequest;
import com.natche.park_ease.dto.UpdateParkingAreaRequest;
import com.natche.park_ease.dto.response.GuardDto;
import com.natche.park_ease.entity.Guard;
import com.natche.park_ease.entity.ParkingArea;
import com.natche.park_ease.entity.ParkingSlot;
import com.natche.park_ease.entity.User;
import com.natche.park_ease.enums.ParkingSlotStatus;
import com.natche.park_ease.enums.UserRole;
import com.natche.park_ease.enums.VehicleType;
import com.natche.park_ease.repository.GuardRepository;
import com.natche.park_ease.repository.ParkingAreaRepository;
import com.natche.park_ease.repository.ParkingSlotRepository;
import com.natche.park_ease.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class AreaOwnerService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ParkingAreaRepository parkingAreaRepository;

    @Autowired
    private GuardRepository guardRepository;

    @Autowired
    private ParkingSlotRepository parkingSlotRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // ==========================================
    // 1. RECRUIT GUARD (Promote or Create)
    // ==========================================
    // @Transactional
    // public User recruitGuard(GuardRegisterRequest request, String ownerEmail) {
        
    //     // 1. Verify Owner & Area Ownership
    //     User loggedInOwner = userRepository.findByEmailOrPhone(ownerEmail, ownerEmail)
    //             .orElseThrow(() -> new RuntimeException("Owner not found"));

    //     if (request.getAreaId() == null) throw new RuntimeException("Area ID required");
        
    //     ParkingArea targetArea = parkingAreaRepository.findById(request.getAreaId())
    //             .orElseThrow(() -> new RuntimeException("This area does not exist"));

    //     if (!Objects.equals(targetArea.getAreaOwner().getUserId(), loggedInOwner.getUserId())) {
    //          throw new RuntimeException("Access Denied: You do not own this Area.");
    //     }

    //     // 2. Check if User exists
    //     Optional<User> existingUserOpt = userRepository.findByEmailOrPhone(request.getEmail(), request.getPhone());
    //     User guardUser;

    //     if (existingUserOpt.isPresent()) {
    //         // --- EXISTING USER LOGIC ---
    //         guardUser = existingUserOpt.get();
            
    //         // Validation: Can only recruit DRIVERS
    //         if (guardUser.getRole() == UserRole.GUARD) {
    //             throw new RuntimeException("User is already a Guard (possibly at another area).");
    //         }
    //         if (guardUser.getRole() == UserRole.AREA_OWNER || guardUser.getRole() == UserRole.ADMIN) {
    //             throw new RuntimeException("Cannot demote Admin/Owner to Guard.");
    //         }

    //         // Promote to GUARD
    //         guardUser.setRole(UserRole.GUARD);
    //         // We do NOT update password for existing users, they keep their own.
    //     } else {
    //         // --- NEW USER LOGIC ---
    //         guardUser = User.builder()
    //                 .name(request.getName())
    //                 .email(request.getEmail())
    //                 .phone(request.getPhone())
    //                 .password(passwordEncoder.encode(request.getPassword()))
    //                 .role(UserRole.GUARD) 
    //                 .isEnabled(true).isBlocked(false)
    //                 .build();
    //     }
        
    //     User savedGuardUser = userRepository.save(guardUser);

    //     // 3. Link Guard to Area
    //     // Check if already linked to avoid duplicates
    //     if (guardRepository.findByUser_UserId(savedGuardUser.getUserId()).isPresent()) {
    //          throw new RuntimeException("User is already linked as a guard in the system.");
    //     }

    //     Guard guardEntity = Guard.builder()
    //             .user(savedGuardUser)
    //             .parkingArea(targetArea)
    //             .build();

    //     guardRepository.save(guardEntity);

    //     return savedGuardUser;
    // }

    @Transactional
    public User recruitGuard(GuardRegisterRequest request, String ownerEmail) {
        
        // 1. Verify Owner & Area
        User loggedInOwner = userRepository.findByEmailOrPhone(ownerEmail, ownerEmail)
                .orElseThrow(() -> new RuntimeException("Owner not found"));

        if (request.getAreaId() == null) throw new RuntimeException("Area ID required");
        
        ParkingArea targetArea = parkingAreaRepository.findById(request.getAreaId())
                .orElseThrow(() -> new RuntimeException("This area does not exist"));

        if (!Objects.equals(targetArea.getAreaOwner().getUserId(), loggedInOwner.getUserId())) {
             throw new RuntimeException("Access Denied: You do not own this Area.");
        }

        // 2. SMART SEARCH LOGIC (Handle Nulls & Flexible Input)
        // Check what data is available
        String searchEmail = (request.getEmail() != null && !request.getEmail().trim().isEmpty()) 
                             ? request.getEmail().trim() : null;
        String searchPhone = (request.getPhone() != null && !request.getPhone().trim().isEmpty()) 
                             ? request.getPhone().trim() : null;

        // Must have at least one identifier
        if (searchEmail == null && searchPhone == null) {
            throw new RuntimeException("At least one identifier (Email or Phone) is required to recruit a guard.");
        }

        Optional<User> existingUserOpt = Optional.empty();

        // Perform Search based on available fields
        if (searchEmail != null && searchPhone != null) {
            existingUserOpt = userRepository.findByEmailOrPhone(searchEmail, searchPhone);
        } else if (searchEmail != null) {
            existingUserOpt = userRepository.findByEmail(searchEmail);
        } else {
            existingUserOpt = userRepository.findByPhone(searchPhone);
        }

        User guardUser;

        if (existingUserOpt.isPresent()) {
            // --- EXISTING USER LOGIC (PROMOTION) ---
            guardUser = existingUserOpt.get();
            
            // Validation
            if (guardUser.getRole() == UserRole.GUARD) {
                // Check if already linked to THIS area
                if (guardRepository.findByUser_UserId(guardUser.getUserId()).isPresent()) {
                     throw new RuntimeException("User is already a Guard.");
                }
                // Technically allows being guard of multiple areas if business logic permits, 
                // but usually one person = one job. For now, fail safe.
                throw new RuntimeException("User is already a Guard.");
            }
            if (guardUser.getRole() == UserRole.AREA_OWNER || guardUser.getRole() == UserRole.ADMIN) {
                throw new RuntimeException("Cannot demote Admin/Owner to Guard.");
            }

            // Promote
            guardUser.setRole(UserRole.GUARD);
            
        } else {
            // --- NEW USER LOGIC (CREATION) ---
            
            // Validate Minimal Requirements
            if (request.getName() == null || request.getName().trim().isEmpty()) {
                throw new RuntimeException("Name is required for new user.");
            }
            if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
                throw new RuntimeException("Password is required for new user.");
            }

            if(searchEmail == null || searchPhone == null) {
                throw new RuntimeException("both identifier (Email or Phone) is required for new user.");
            }
          

            guardUser = User.builder()
                    .name(request.getName())
                    .email(searchEmail) // Might be null
                    .phone(searchPhone) // Might be null
                    .password(passwordEncoder.encode(request.getPassword()))
                    .role(UserRole.GUARD) 
                    .isEnabled(true)
                    .isBlocked(false)
                    .build();
        }
        
        User savedGuardUser = userRepository.save(guardUser);

        // 3. Link Guard to Area
        // Safety check to ensure no duplicate guard entries for the same user
        if (!guardRepository.findByUser_UserId(savedGuardUser.getUserId()).isPresent()) {
             Guard guardEntity = Guard.builder()
                .user(savedGuardUser)
                .parkingArea(targetArea)
                .build();
             guardRepository.save(guardEntity);
        } else {
            // If they are already a guard (logic above might catch this, but double check)
            // Ensure they are linked to the correct area if logic changes later
        }

        return savedGuardUser;
    }


    // ==========================================
    // 2. FIRE GUARD (Demote)
    // ==========================================
    @Transactional
    public void fireGuard(Long guardUserId, String ownerEmail) {
        User loggedInOwner = userRepository.findByEmailOrPhone(ownerEmail, ownerEmail)
                .orElseThrow(() -> new RuntimeException("Owner not found"));

        Guard guardEntry = guardRepository.findByUser_UserId(guardUserId)
                .orElseThrow(() -> new RuntimeException("Guard entry not found"));

        // Security: Can only fire guards in YOUR area
        if (!Objects.equals(guardEntry.getParkingArea().getAreaOwner().getUserId(), loggedInOwner.getUserId())) {
            throw new RuntimeException("You cannot fire a guard from an area you don't own.");
        }

        User user = guardEntry.getUser();
        
        // 1. Remove from Guard Table
        guardRepository.delete(guardEntry);

        // 2. Demote Role to DRIVER
        user.setRole(UserRole.DRIVER);
        userRepository.save(user);
    }

    // ==========================================
    // 3. CREATE PARKING AREA (Auto-Slot Gen)
    // ==========================================
    @Transactional
    public ParkingArea createParkingArea(CreateParkingAreaRequest request, String ownerEmail) {
        User owner = userRepository.findByEmailOrPhone(ownerEmail, ownerEmail)
                .orElseThrow(() -> new RuntimeException("Owner not found"));

        // 1. Set Defaults
        List<Double> multipliers = (request.getReservationRateMultipliers() != null && request.getReservationRateMultipliers().size() == 4)
                ? request.getReservationRateMultipliers()
                : Arrays.asList(0.0, 0.35, 0.65, 1.0);

        int grace = (request.getGracePeriodMinutes() != null) ? request.getGracePeriodMinutes() : 30;
        int waiver = (request.getWaiverPeriodMinutes() != null) ? request.getWaiverPeriodMinutes() : 10;

        if(request.getCapacitySmall() == null || request.getCapacityMedium() == null || request.getCapacityLarge() == null) {
            throw new RuntimeException("All vehicle type capacities must be specified.");
        }

        if(request.getCapacitySmall() <0 || request.getCapacityMedium() <0 || request.getCapacityLarge() <0) {
            throw new RuntimeException("Capacities cannot be negative.");
        }
        if(request.getCapacitySmall() ==0 && request.getCapacityMedium() ==0 && request.getCapacityLarge() ==0) {
            throw new RuntimeException("At least one vehicle type capacity must be greater than zero.");
        }
        if(request.getBaseRateSmall() == null || request.getBaseRateMedium() == null || request.getBaseRateLarge() == null) {
            throw new RuntimeException("Base rates for all vehicle types must be specified.");
        }
        if(request.getBaseRateSmall() <=0 || request.getBaseRateMedium() <=0 || request.getBaseRateLarge() <=0) {
            throw new RuntimeException("Base rates must be greater than zero.");
        }
        if(request.getName() == null || request.getName().isBlank()) {
            throw new RuntimeException("Parking Area name is required.");
        }
        if(request.getAddress() == null || request.getAddress().isBlank()) {
            throw new RuntimeException("Parking Area address is required.");
        }
        if(request.getLatitude() == null || request.getLatitude().isBlank()) {
            throw new RuntimeException("Parking Area latitude is required.");
        }
        if(request.getLongitude() == null || request.getLongitude().isBlank()) {
            throw new RuntimeException("Parking Area longitude is required.");
        }
        if(multipliers.stream().anyMatch(m -> m < 0 || m > 1)) {
            throw new RuntimeException("Reservation rate multipliers must be between 0 and 1.");
        }
    
        if(grace < 0) {
            throw new RuntimeException("Grace period cannot be negative.");
        }
        if(waiver < 0) {
            throw new RuntimeException("Waiver period cannot be negative.");
        }
        if(waiver > grace) {
            throw new RuntimeException("Waiver period cannot exceed grace period.");
        }
        

        // 2. Create Area
        ParkingArea area = new ParkingArea();
        area.setName(request.getName());
        area.setAddress(request.getAddress());
        area.setLatitude(request.getLatitude());
        area.setLongitude(request.getLongitude());
        area.setCapacitySmall(request.getCapacitySmall());
        area.setCapacityMedium(request.getCapacityMedium());
        area.setCapacityLarge(request.getCapacityLarge());
        area.setReservationRateMultipliers(multipliers);
        area.setGracePeriodMinutes(grace);
        area.setReservationWaiverMinutes(waiver);
        area.setAreaOwner(owner);
        area.setCurrentRateIndexSmall(0);
        area.setCurrentRateIndexLarge(0);
        area.setCurrentRateIndexMedium(0);
        area.setOccupancyLarge(0);
        area.setOccupancySmall(0);
        area.setOccupancyMedium(0);
        


        ParkingArea savedArea = parkingAreaRepository.save(area);

        // 3. Auto-Generate Slots (Default: Maintenance Mode, Floor 0)
        List<ParkingSlot> slots = new ArrayList<>();
        
        slots.addAll(generateSlotsForType(savedArea, VehicleType.SMALL, request.getCapacitySmall(), request.getBaseRateSmall(), "S"));
        slots.addAll(generateSlotsForType(savedArea, VehicleType.MEDIUM, request.getCapacityMedium(), request.getBaseRateMedium(), "M"));
        slots.addAll(generateSlotsForType(savedArea, VehicleType.LARGE, request.getCapacityLarge(), request.getBaseRateLarge(), "L"));

        parkingSlotRepository.saveAll(slots);

        return savedArea;
    }

    // Helper for slot generation
    private List<ParkingSlot> generateSlotsForType(ParkingArea area, VehicleType type, int count, Double rate, String prefix) {
        List<ParkingSlot> slots = new ArrayList<>();
        if (rate == null) rate = 50.0; // Fallback default

        for (int i = 1; i <= count; i++) {
            ParkingSlot slot = new ParkingSlot();
            slot.setParkingArea(area);
            slot.setSlotNumber(prefix + "-" + i); // e.g., S-1, M-10
            slot.setFloor(0); // Default Ground Floor
            slot.setSupportedVehicleType(type);
            slot.setStatus(ParkingSlotStatus.MAINTENANCE); // Start in Maintenance
            slot.setBaseHourlyRate(rate);
            slots.add(slot);
        }
        return slots;
    }

    // ==========================================
    // 4. DISABLE PARKING AREA (Bulk Action)
    // ==========================================
    @Transactional
    public void disableParkingArea(Long areaId, String ownerEmail) {
        User loggedInOwner = userRepository.findByEmailOrPhone(ownerEmail, ownerEmail).orElseThrow();
        
        ParkingArea area = parkingAreaRepository.findById(areaId)
                .orElseThrow(() -> new RuntimeException("Area not found"));

        if (!Objects.equals(area.getAreaOwner().getUserId(), loggedInOwner.getUserId())) {
            throw new RuntimeException("Access Denied");
        }

        List<ParkingSlot> slots = parkingSlotRepository.findByParkingArea_AreaId(areaId);
        for(ParkingSlot slot : slots) {
            slot.setStatus(ParkingSlotStatus.MAINTENANCE);
        }
        parkingSlotRepository.saveAll(slots);
    }

    // ==========================================
    // 5. UPDATE SLOTS (Bulk Configuration)
    // ==========================================
    @Transactional
    public void updateSlots(Long areaId, List<SlotUpdateRequest> updates, String ownerEmail) {
        User loggedInOwner = userRepository.findByEmailOrPhone(ownerEmail, ownerEmail).orElseThrow();
        ParkingArea area = parkingAreaRepository.findById(areaId).orElseThrow();

        if (!Objects.equals(area.getAreaOwner().getUserId(), loggedInOwner.getUserId())) {
            throw new RuntimeException("Access Denied");
        }

        for (SlotUpdateRequest update : updates) {
            ParkingSlot slot = parkingSlotRepository.findById(update.getSlotId())
                    .orElseThrow(() -> new RuntimeException("Slot " + update.getSlotId() + " not found"));
            
            // Verify slot belongs to this area (Security)
            if (!slot.getParkingArea().getAreaId().equals(areaId)) {
                throw new RuntimeException("Slot " + slot.getSlotNumber() + " does not belong to Area " + areaId);
            }
            if(update.getType()!=null) slot.setSupportedVehicleType(update.getType());
            if(update.getSlotNumber() != null) slot.setSlotNumber(update.getSlotNumber());
            if(update.getFloor() != null) slot.setFloor(update.getFloor());
            if(update.getStatus() != null) slot.setStatus(update.getStatus());
            if(update.getHourlyRate() != null) slot.setBaseHourlyRate(update.getHourlyRate());
            
            parkingSlotRepository.save(slot);
        }
    }


    @Transactional
    public ParkingArea updateParkingArea(Long areaId, UpdateParkingAreaRequest request, String ownerEmail) {
        
        User owner = userRepository.findByEmailOrPhone(ownerEmail, ownerEmail).orElseThrow();
        ParkingArea area = parkingAreaRepository.findById(areaId).orElseThrow();

        if (!Objects.equals(area.getAreaOwner().getUserId(), owner.getUserId())) {
            throw new RuntimeException("Access Denied");
        }

        // 1. Update Basic Fields
        if (request.getName() != null) area.setName(request.getName());
        if (request.getAddress() != null) area.setAddress(request.getAddress());
        if (request.getLatitude() != null) area.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) area.setLongitude(request.getLongitude());
        if (request.getGracePeriodMinutes() != null) area.setGracePeriodMinutes(request.getGracePeriodMinutes());
        if (request.getReservationRateMultipliers() != null) area.setReservationRateMultipliers(request.getReservationRateMultipliers());

        // 2. Handle Capacity Changes (The hard part)
        if (request.getCapacitySmall() != null) {
            adjustSlots(area, VehicleType.SMALL, area.getCapacitySmall(), request.getCapacitySmall(), "S");
            area.setCapacitySmall(request.getCapacitySmall());
        }
        if (request.getCapacityMedium() != null) {
            adjustSlots(area, VehicleType.MEDIUM, area.getCapacityMedium(), request.getCapacityMedium(), "M");
            area.setCapacityMedium(request.getCapacityMedium());
        }
        if (request.getCapacityLarge() != null) {
            adjustSlots(area, VehicleType.LARGE, area.getCapacityLarge(), request.getCapacityLarge(), "L");
            area.setCapacityLarge(request.getCapacityLarge());
        }

        return parkingAreaRepository.save(area);
    }

    private void adjustSlots(ParkingArea area, VehicleType type, int oldCap, int newCap, String prefix) {
        if (newCap == oldCap) return;

        List<ParkingSlot> existingSlots = parkingSlotRepository.findByParkingArea_AreaIdAndSupportedVehicleTypeAndStatus(
                area.getAreaId(), type, null // Fetch all statuses
        );

        // Sort by Slot ID/Number to ensure we add/remove from the "end" logically
        existingSlots.sort(Comparator.comparing(ParkingSlot::getSlotId));

        if (newCap > oldCap) {
            // INCREASE: Create (newCap - oldCap) new slots
            int slotsToAdd = newCap - oldCap;
            int startingIndex = existingSlots.size() + 1; // Start naming from next number
            List<ParkingSlot> newSlots = new ArrayList<>();

            for (int i = 0; i < slotsToAdd; i++) {
                ParkingSlot slot = new ParkingSlot();
                slot.setParkingArea(area);
                slot.setSupportedVehicleType(type);
                slot.setFloor(0); // Default Ground
                slot.setStatus(ParkingSlotStatus.MAINTENANCE); // Safety first
                slot.setBaseHourlyRate(50.0); // Default, owner updates later
                
                // Naming Protocol: S_0_101
                String uniqueName = generateSlotName(prefix, 0, startingIndex + i);
                slot.setSlotNumber(uniqueName);
                
                newSlots.add(slot);
            }
            parkingSlotRepository.saveAll(newSlots);

        } else {
            // DECREASE: Remove (oldCap - newCap) slots
            // Constraint: Can only remove AVAILABLE or MAINTENANCE slots.
            int slotsToRemove = oldCap - newCap;
            
            // Filter removable slots (Reverse order to remove highest numbers first)
            List<ParkingSlot> removable = existingSlots.stream()
                    .filter(s -> s.getStatus() == ParkingSlotStatus.AVAILABLE || s.getStatus() == ParkingSlotStatus.MAINTENANCE)
                    .sorted(Comparator.comparing(ParkingSlot::getSlotId).reversed())
                    .collect(Collectors.toList());

            if (removable.size() < slotsToRemove) {
                throw new RuntimeException("Cannot reduce capacity by " + slotsToRemove + ". Only " + removable.size() + " slots are empty. Others are Occupied/Reserved.");
            }

            // Delete the top N slots
            List<ParkingSlot> toDelete = removable.subList(0, slotsToRemove);
            parkingSlotRepository.deleteAll(toDelete);
        }
    }

    private String generateSlotName(String prefix, int floor, int number) {
        // Floor Logic: -1 becomes "B1", 0 becomes "G", 1 becomes "1"
        String floorStr = (floor < 0) ? "B" + Math.abs(floor) : (floor == 0 ? "G" : String.valueOf(floor));
        // Format: TYPE_FLOOR_NUM (e.g., S_G_01)
        return prefix + "_" + floorStr + "_" + String.format("%02d", number);
    }

    
public List<ParkingArea> getAreasByOwner(String ownerEmail) {
    User owner = userRepository.findByEmailOrPhone(ownerEmail, ownerEmail)
            .orElseThrow(() -> new RuntimeException("Owner not found"));
    
    
    return parkingAreaRepository.findByAreaOwner_UserId(owner.getUserId());
}
    

    // public List<Map<String, Object>> getGuardsByArea(Long areaId, String name) {
    //     User owner = userRepository.findByEmailOrPhone(name, name).orElseThrow();
    //     ParkingArea area = parkingAreaRepository.findById(areaId).orElseThrow();
    //     if(!Objects.equals(area.getAreaOwner().getUserId(), owner.getUserId())) {
    //         throw new RuntimeException("Access Denied");
    //     }
    //     List<Guard> guards = guardRepository.findByParkingArea_AreaId(areaId);
    //     List<Map<String, Object>> response = new ArrayList<>();
    //     for(Guard guard : guards) {
    //         Map<String, Object> guardInfo = new HashMap<>();
    //         guardInfo.put("guardId", guard.getUser().getUserId());
    //         guardInfo.put("name", guard.getUser().getName());
    //         guardInfo.put("email", guard.getUser().getEmail());
    //         guardInfo.put("phone", guard.getUser().getPhone());
    //         response.add(guardInfo);
    //     }
    //     return response;
    // }

    public List<GuardDto> getGuardsByArea(Long areaId, String ownerEmail) {
        User loggedInOwner = userRepository.findByEmailOrPhone(ownerEmail, ownerEmail).orElseThrow();
        
        // 1. Fetch Area
        ParkingArea area = parkingAreaRepository.findById(areaId)
                .orElseThrow(() -> new RuntimeException("Area not found"));

        // 2. Security Check (Owner or Admin)
        if (loggedInOwner.getRole() != UserRole.ADMIN && 
            !Objects.equals(area.getAreaOwner().getUserId(), loggedInOwner.getUserId())) {
            throw new RuntimeException("Access Denied: You do not own this area.");
        }

        // 3. Fetch Guards
        List<Guard> guards = guardRepository.findByParkingArea_AreaId(areaId);

        // 4. Convert to DTO
        return guards.stream()
                .map(GuardDto::fromEntity)
                .collect(Collectors.toList());
    }
  



}