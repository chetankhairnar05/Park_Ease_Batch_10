package com.natche.park_ease.service;

import com.natche.park_ease.dto.CreateParkingAreaRequest;
import com.natche.park_ease.dto.CreateSlotRequest;
import com.natche.park_ease.dto.GuardRegisterRequest;
import com.natche.park_ease.dto.SlotUpdateRequest;
import com.natche.park_ease.dto.UpdateParkingAreaRequest;
import com.natche.park_ease.dto.response.AnalyticsChartDto;
import com.natche.park_ease.dto.response.AreaBookingLogDto;
import com.natche.park_ease.dto.response.AreaStatisticsDto;
import com.natche.park_ease.dto.response.FullAnalyticsResponse;
import com.natche.park_ease.dto.response.GuardDto;
import com.natche.park_ease.dto.response.SlotAnalyticsDto;
import com.natche.park_ease.entity.Booking;
import com.natche.park_ease.entity.Guard;
import com.natche.park_ease.entity.ParkingArea;
import com.natche.park_ease.entity.ParkingSlot;
import com.natche.park_ease.entity.User;
import com.natche.park_ease.enums.BookingStatus;
import com.natche.park_ease.enums.ParkingSlotStatus;
import com.natche.park_ease.enums.UserRole;
import com.natche.park_ease.enums.VehicleType;
import com.natche.park_ease.repository.BookingRepository;
import com.natche.park_ease.repository.GuardRepository;
import com.natche.park_ease.repository.ParkingAreaRepository;
import com.natche.park_ease.repository.ParkingSlotRepository;
import com.natche.park_ease.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
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
                    .role(UserRole.GUARD) .latitude("22.73860505802358")
                .longitude("75.88164655202729")
                .walletBalance(0.0)
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

        // ==========================================
    // GET STATISTICS (With Date Filter)
    // ==========================================
    public AreaStatisticsDto getAreaStatistics1(Long areaId, String ownerEmail, LocalDateTime start, LocalDateTime end) {
        User loggedInUser = userRepository.findByEmailOrPhone(ownerEmail, ownerEmail).orElseThrow();
        ParkingArea area = parkingAreaRepository.findById(areaId).orElseThrow(() -> new RuntimeException("Area not found"));

        if (loggedInUser.getRole() != UserRole.ADMIN && 
            !Objects.equals(area.getAreaOwner().getUserId(), loggedInUser.getUserId())) {
            throw new RuntimeException("Access Denied");
        }

        List<Booking> allBookings = bookingRepository.findByArea_AreaId(areaId);
        
        // Filter by Date Range
        List<Booking> bookings = allBookings.stream()
                .filter(b -> {
                    LocalDateTime time = b.getBookingTime() != null ? b.getBookingTime() : b.getReservationTime();
                    if (time == null) return false;
                    return (start == null || !time.isBefore(start)) && (end == null || !time.isAfter(end));
                })
                .collect(Collectors.toList());

        // Aggregate Data
        double totalEarnings = 0.0;
        double totalPending = 0.0;
        long completed = 0;
        long cancelled = 0;
        long active = 0;
        double resHours = 0.0;
        double parkHours = 0.0;

        Set<Long> userIds = new java.util.HashSet<>();
        Set<Long> vehicleIds = new java.util.HashSet<>();

        for (Booking b : bookings) {
            if (b.getUser() != null) userIds.add(b.getUser().getUserId());
            if (b.getVehicle() != null) vehicleIds.add(b.getVehicle().getVehicleId());

            if (b.getAmountPaid() != null) totalEarnings += b.getAmountPaid();
            if (b.getAmountPending() != null) totalPending += b.getAmountPending();

            if (b.getStatus() == BookingStatus.COMPLETED) completed++;
            else if (b.getStatus() == BookingStatus.CANCELLED_NO_SHOW || b.getStatus() == BookingStatus.DEFAULTED) cancelled++;
            else if (b.getStatus() == BookingStatus.RESERVED || b.getStatus() == BookingStatus.ACTIVE_PARKING) active++;

            // Time Calc
            if (b.getReservationTime() != null) {
                LocalDateTime endRes = b.getArrivalTime() != null ? b.getArrivalTime() : 
                                     (b.getExpectedEndTime() != null ? b.getExpectedEndTime() : LocalDateTime.now());
                resHours += Duration.between(b.getReservationTime(), endRes).toSeconds() / 60.0;
            }
            if (b.getArrivalTime() != null) {
                LocalDateTime endPark = b.getDepartureTime() != null ? b.getDepartureTime() : LocalDateTime.now();
                parkHours += Duration.between(b.getArrivalTime(), endPark).toSeconds() / 60.0;
            }
        }

        return AreaStatisticsDto.builder()
                .totalBookings((long) bookings.size())
                .totalEarnings(totalEarnings)
                .totalPending(totalPending)
                .completedBookings(completed)
                .cancelledBookings(cancelled)
                .activeBookings(active)
                .uniqueUsers((long) userIds.size())
                .uniqueVehicles((long) vehicleIds.size())
                .totalReservationHours(Math.round(resHours * 100.0) / 100.0)
                .totalParkingHours(Math.round(parkHours * 100.0) / 100.0)
                .build();
    }

    // Overload for backward compatibility (defaults to All Time)
    public AreaStatisticsDto getAreaStatistics1(Long areaId, String ownerEmail) {
        return getAreaStatistics1(areaId, ownerEmail, null, null);
    }

    // ==========================================
    // GET CHARTS (Dynamic X-Axis)
    // ==========================================
    public AnalyticsChartDto getAnalyticsCharts1(Long areaId, String ownerEmail, LocalDateTime start, LocalDateTime end) {
        // Validation same as above...
        
        List<Booking> allBookings = bookingRepository.findByArea_AreaId(areaId);
        
        // Defaults if null
        LocalDateTime effectiveStart = start != null ? start : LocalDateTime.now().minusMonths(1);
        LocalDateTime effectiveEnd = end != null ? end : LocalDateTime.now();

        long daysDiff = ChronoUnit.DAYS.between(effectiveStart, effectiveEnd);
        boolean useHourly = daysDiff <= 2; // <= 2 days -> Hourly, > 2 days -> Daily

        List<AnalyticsChartDto.DataPoint> dataPoints = new ArrayList<>();
        
        LocalDateTime current = effectiveStart;
        
        while (current.isBefore(effectiveEnd) || current.isEqual(effectiveEnd)) {
            LocalDateTime windowStart = current;
            LocalDateTime windowEnd = useHourly ? current.plusHours(1) : current.plusDays(1);
            
            // If using daily, ensure we cover the whole day 00:00 to 23:59
            if(!useHourly) {
               windowStart = current.toLocalDate().atStartOfDay();
               windowEnd = current.plusDays(1).toLocalDate().atStartOfDay();
            }

            // Final variable for lambda
            final LocalDateTime finalStart = windowStart;
            final LocalDateTime finalEnd = windowEnd;

            List<Booking> bucket = allBookings.stream()
                .filter(b -> {
                    LocalDateTime t = b.getBookingTime() != null ? b.getBookingTime() : b.getReservationTime();
                    return t != null && (t.isEqual(finalStart) || t.isAfter(finalStart)) && t.isBefore(finalEnd);
                })
                .collect(Collectors.toList());
            
            String label = useHourly ? finalStart.format(DateTimeFormatter.ofPattern("HH:00")) 
                                     : finalStart.format(DateTimeFormatter.ofPattern("dd MMM"));

            dataPoints.add(calculateDataPoint(bucket, label));
            
            current = useHourly ? current.plusHours(1) : current.plusDays(1);
        }

        // Return data in 'hourlyData' if hourly, 'dailyData' if daily (Frontend will check array length)
        // Or better: Use the appropriate field based on logic
        if (useHourly) {
            return AnalyticsChartDto.builder().hourlyData(dataPoints).dailyData(new ArrayList<>()).build();
        } else {
            return AnalyticsChartDto.builder().hourlyData(new ArrayList<>()).dailyData(dataPoints).build();
        }
    }
    
    // Original method overload for 24h default
    public AnalyticsChartDto getAnalyticsCharts1(Long areaId, String ownerEmail) {
        return getAnalyticsCharts1(areaId, ownerEmail, LocalDateTime.now().minusHours(24), LocalDateTime.now());
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
        
        
        

        if ( !Objects.equals(area.getAreaOwner().getUserId(), loggedInOwner.getUserId())) {
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
    

        @Autowired
    private BookingRepository bookingRepository; // Ensure this is injected

    public AreaStatisticsDto getAreaStatistics(Long areaId, String ownerEmail) {
        // 1. Verify Ownership
        User loggedInUser = userRepository.findByEmailOrPhone(ownerEmail, ownerEmail).orElseThrow();
        ParkingArea area = parkingAreaRepository.findById(areaId).orElseThrow(() -> new RuntimeException("Area not found"));

// CORRECT LOGIC: Block ONLY if (Not Admin) AND (Not The Owner)
        if (loggedInUser.getRole() != UserRole.ADMIN && 
            !Objects.equals(area.getAreaOwner().getUserId(), loggedInUser.getUserId())) {
            throw new RuntimeException("Access Denied");
        }

        // 2. Fetch All Bookings for this Area
        List<Booking> bookings = bookingRepository.findByArea_AreaId(areaId);

        // 3. Aggregate Data
        double totalEarnings = 0.0;
        double totalPending = 0.0;
        long completed = 0;
        long cancelled = 0;
        long active = 0;
        double resHours = 0.0;
        double parkHours = 0.0;

        Set<Long> userIds = new java.util.HashSet<>();
        Set<Long> vehicleIds = new java.util.HashSet<>();

        for (Booking b : bookings) {
            // Count Uniques
            if (b.getUser() != null) userIds.add(b.getUser().getUserId());
            if (b.getVehicle() != null) vehicleIds.add(b.getVehicle().getVehicleId());

            // Money
            if (b.getAmountPaid() != null) totalEarnings += b.getAmountPaid();
            if (b.getAmountPending() != null) totalPending += b.getAmountPending();

            // Status Counts
            if (b.getStatus() == BookingStatus.COMPLETED) completed++;
            else if (b.getStatus() == BookingStatus.CANCELLED_NO_SHOW || b.getStatus() == BookingStatus.DEFAULTED) cancelled++;
            else if (b.getStatus() == BookingStatus.RESERVED || b.getStatus() == BookingStatus.ACTIVE_PARKING) active++;

            // --- Time Calculation (Robust Null Checks) ---
            
            // A. Reservation Duration
            if (b.getReservationTime() != null) {
                LocalDateTime endRes = null;
                if (b.getArrivalTime() != null) endRes = b.getArrivalTime(); // Arrived
                else if (b.getExpectedEndTime() != null) endRes = b.getExpectedEndTime(); // Expired/Reserved
                else if (b.getStatus() == BookingStatus.RESERVED) endRes = LocalDateTime.now(); // Currently Running

                if (endRes != null) {
                    long minutes = Duration.between(b.getReservationTime(), endRes).toMinutes();
                    resHours += (minutes / 60.0); // Fast Mode: 60 sec = 1 hr
                }
            }

            // B. Parking Duration
            if (b.getArrivalTime() != null) {
                LocalDateTime endPark = null;
                if (b.getDepartureTime() != null) endPark = b.getDepartureTime(); // Exited
                else if (b.getStatus() == BookingStatus.ACTIVE_PARKING) endPark = LocalDateTime.now(); // Currently Parked

                if (endPark != null) {
                    long minutes = Duration.between(b.getArrivalTime(), endPark).toMinutes();
                    parkHours += (minutes / 60.0); // Fast Mode
                }
            }
        }

        return AreaStatisticsDto.builder()
                .totalBookings((long) bookings.size())
                .totalEarnings(totalEarnings)
                .totalPending(totalPending)
                .completedBookings(completed)
                .cancelledBookings(cancelled)
                .activeBookings(active)
                .uniqueUsers((long) userIds.size())
                .uniqueVehicles((long) vehicleIds.size())
                .totalReservationHours(Math.round(resHours * 100.0) / 100.0) // Round to 2 decimals
                .totalParkingHours(Math.round(parkHours * 100.0) / 100.0)
                .build();
    }


    
    @Transactional
    public void addSlotToArea(Long areaId, CreateSlotRequest request, String ownerEmail) {
        // 1. Verify Ownership
        User loggedInOwner = userRepository.findByEmailOrPhone(ownerEmail, ownerEmail).orElseThrow();
        ParkingArea area = parkingAreaRepository.findById(areaId)
                .orElseThrow(() -> new RuntimeException("Area not found"));

        if (loggedInOwner.getRole() != UserRole.ADMIN && 
            !Objects.equals(area.getAreaOwner().getUserId(), loggedInOwner.getUserId())) {
            throw new RuntimeException("Access Denied: You do not own this area.");
        }

        // 2. Validate Inputs
        if (request.getSlotNumber() == null || request.getSlotNumber().isBlank()) 
            throw new RuntimeException("Slot Number is required");
        if (request.getBaseHourlyRate() == null || request.getBaseHourlyRate() <= 0) 
            throw new RuntimeException("Valid Hourly Rate is required");

        // 3. Create Slot
        ParkingSlot slot = new ParkingSlot();
        slot.setParkingArea(area);
        slot.setSlotNumber(request.getSlotNumber());
        slot.setFloor(request.getFloor() != null ? request.getFloor() : 0);
        slot.setSupportedVehicleType(request.getSupportedVehicleType());
        slot.setBaseHourlyRate(request.getBaseHourlyRate());
        
        // Default to MAINTENANCE as requested
        slot.setStatus(ParkingSlotStatus.MAINTENANCE); 

        parkingSlotRepository.save(slot);
        
        // Optional: Update Area Capacity counters if you want strict tracking
        // if (request.getSupportedVehicleType() == VehicleType.SMALL) area.setCapacitySmall(area.getCapacitySmall() + 1);
        // ... (save area)
    }


    // ==========================================
    // 8. GET BOOKING LOGS (History)
    // ==========================================
    public List<AreaBookingLogDto> getAreaBookingLogs(Long areaId, String ownerEmail) {
        User loggedInOwner = userRepository.findByEmailOrPhone(ownerEmail, ownerEmail).orElseThrow();
        ParkingArea area = parkingAreaRepository.findById(areaId).orElseThrow(() -> new RuntimeException("Area not found"));

        if (loggedInOwner.getRole() != UserRole.ADMIN && 
            !Objects.equals(area.getAreaOwner().getUserId(), loggedInOwner.getUserId())) {
            throw new RuntimeException("Access Denied");
        }

        List<Booking> bookings = bookingRepository.findByArea_AreaId(areaId);

        return bookings.stream()
                // Sort by Time Descending (Newest first)
                .sorted((a, b) -> {
                    LocalDateTime t1 = a.getBookingTime() != null ? a.getBookingTime() : a.getReservationTime();
                    LocalDateTime t2 = b.getBookingTime() != null ? b.getBookingTime() : b.getReservationTime();
                    if(t1 == null) return 1;
                    if(t2 == null) return -1;
                    return t2.compareTo(t1); 
                })
                .map(AreaBookingLogDto::fromEntity)
                .collect(Collectors.toList());
    }

    public FullAnalyticsResponse getSlotAnalytics(Long areaId, String ownerEmail) {
        // 1. Verify Access
        User loggedInOwner = userRepository.findByEmailOrPhone(ownerEmail, ownerEmail).orElseThrow();
        ParkingArea area = parkingAreaRepository.findById(areaId).orElseThrow(() -> new RuntimeException("Area not found"));

        if (loggedInOwner.getRole() != UserRole.ADMIN && 
            !Objects.equals(area.getAreaOwner().getUserId(), loggedInOwner.getUserId())) {
            throw new RuntimeException("Access Denied");
        }

        // 2. Fetch All Bookings
        List<Booking> allBookings = bookingRepository.findByArea_AreaId(areaId);
        LocalDateTime now = LocalDateTime.now();

        // 3. Filter Lists
        List<Booking> list24h = allBookings.stream()
                .filter(b -> b.getBookingTime() != null && b.getBookingTime().isAfter(now.minusHours(24)))
                .collect(Collectors.toList());

        List<Booking> list30d = allBookings.stream()
                .filter(b -> b.getBookingTime() != null && b.getBookingTime().isAfter(now.minusDays(30)))
                .collect(Collectors.toList());

        // 4. Build Response
        return FullAnalyticsResponse.builder()
                .topRevenue24h(aggregateTopSlots(list24h, true))
                .topTime24h(aggregateTopSlots(list24h, false))
                .topRevenue30d(aggregateTopSlots(list30d, true))
                .topTime30d(aggregateTopSlots(list30d, false))
                .build();
    }

    
   
    public FullAnalyticsResponse getSlotAnalytics1(Long areaId, String ownerEmail) {
        // 1. Verify Access
        User loggedInUser = userRepository.findByEmailOrPhone(ownerEmail, ownerEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        ParkingArea area = parkingAreaRepository.findById(areaId)
                .orElseThrow(() -> new RuntimeException("Area not found"));

        if (loggedInUser.getRole() != UserRole.ADMIN && 
            !Objects.equals(area.getAreaOwner().getUserId(), loggedInUser.getUserId())) {
            throw new RuntimeException("Access Denied");
        }

        // 2. Fetch All Bookings
        List<Booking> allBookings = bookingRepository.findByArea_AreaId(areaId);
        LocalDateTime now = LocalDateTime.now();

        // 3. Filter Lists (24h and 30d)
        List<Booking> list24h = allBookings.stream()
                .filter(b -> {
                    LocalDateTime t = b.getBookingTime() != null ? b.getBookingTime() : b.getReservationTime();
                    return t != null && t.isAfter(now.minusHours(24));
                })
                .collect(Collectors.toList());

        List<Booking> list30d = allBookings.stream()
                .filter(b -> {
                    LocalDateTime t = b.getBookingTime() != null ? b.getBookingTime() : b.getReservationTime();
                    return t != null && t.isAfter(now.minusDays(30));
                })
                .collect(Collectors.toList());

        // 4. Build Response using Helper
        return FullAnalyticsResponse.builder()
                .topRevenue24h(aggregateTopSlots1(list24h, true))
                .topTime24h(aggregateTopSlots1(list24h, false))
                .topRevenue30d(aggregateTopSlots1(list30d, true))
                .topTime30d(aggregateTopSlots1(list30d, false))
                .build();
    }
    // // Helper to Group, Sum, and Sort
    private List<SlotAnalyticsDto> aggregateTopSlots(List<Booking> bookings, boolean isRevenue) {
        Map<String, SlotAnalyticsDto> map = new HashMap<>();

        for (Booking b : bookings) {
            if (b.getSlot() == null) continue;
            String slotNum = b.getSlot().getSlotNumber();
            
            map.putIfAbsent(slotNum, SlotAnalyticsDto.builder()
                    .slotNumber(slotNum).value(0.0).bookingCount(0L).build());

            SlotAnalyticsDto dto = map.get(slotNum);
            dto.setBookingCount(dto.getBookingCount() + 1);

            if (isRevenue) {
                // Sum Paid + Pending
                double amt = (b.getAmountPaid() != null ? b.getAmountPaid() : 0) + 
                             (b.getAmountPending() != null ? b.getAmountPending() : 0);
                dto.setValue(dto.getValue() + amt);
            } else {
                // Sum Hours (Reservation + Parking)
                double hours = 0;
                // ... (Reuse time calculation logic from getAreaStatistics or simplify) ...
                // Simplified Time Calc for Stats:
                if (b.getReservationTime() != null && b.getArrivalTime() != null) {
                    hours += Duration.between(b.getReservationTime(), b.getArrivalTime()).toMinutes() / 60.0;
                }
                if (b.getArrivalTime() != null && b.getDepartureTime() != null) {
                    hours += Duration.between(b.getArrivalTime(), b.getDepartureTime()).toMinutes() / 60.0;
                }
                dto.setValue(dto.getValue() + hours);
            }
        }

        return map.values().stream()
                .sorted(Comparator.comparing(SlotAnalyticsDto::getValue).reversed())
                .limit(5) // Top 5
                .collect(Collectors.toList());
    }
        // Helper to Group, Sum, Sort and Limit to Top 5
    private List<SlotAnalyticsDto> aggregateTopSlots1(List<Booking> bookings, boolean isRevenue) {
        Map<String, SlotAnalyticsDto> map = new HashMap<>();

        for (Booking b : bookings) {
            if (b.getSlot() == null) continue;
            String slotNum = b.getSlot().getSlotNumber();
            
            // Initialize map entry if missing
            map.putIfAbsent(slotNum, SlotAnalyticsDto.builder()
                    .slotNumber(slotNum)
                    .value(0.0)
                    .bookingCount(0L)
                    .build());

            SlotAnalyticsDto dto = map.get(slotNum);
            dto.setBookingCount(dto.getBookingCount() + 1);

            if (isRevenue) {
                // Sum Money (Paid + Pending)
                double amt = (b.getAmountPaid() != null ? b.getAmountPaid() : 0.0) + 
                             (b.getAmountPending() != null ? b.getAmountPending() : 0.0);
                dto.setValue(dto.getValue() + amt);
            } else {
                // Sum Time (Hours)
                double hours = 0.0;
                
                // 1. Reservation Duration
                if (b.getReservationTime() != null) {
                    LocalDateTime endRes = b.getArrivalTime() != null ? b.getArrivalTime() : 
                                         (b.getExpectedEndTime() != null ? b.getExpectedEndTime() : LocalDateTime.now());
                    
                    // Real Time Logic: Minutes / 60.0
                    hours += Duration.between(b.getReservationTime(), endRes).toMinutes() / 60.0;
                }
                
                // 2. Parking Duration
                if (b.getArrivalTime() != null) {
                    LocalDateTime endPark = b.getDepartureTime() != null ? b.getDepartureTime() : LocalDateTime.now();
                    
                    // Real Time Logic: Minutes / 60.0
                    hours += Duration.between(b.getArrivalTime(), endPark).toMinutes() / 60.0;
                }
                
                dto.setValue(dto.getValue() + hours);
            }
        }

        // Sort Descending and Pick Top 5
        return map.values().stream()
                .sorted(Comparator.comparing(SlotAnalyticsDto::getValue).reversed())
                .limit(5)
                .collect(Collectors.toList());
    }

   

    public AnalyticsChartDto getAnalyticsCharts(Long areaId, String userEmail) {
        // 1. Fetch User and Area
        User loggedInUser = userRepository.findByEmailOrPhone(userEmail, userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        ParkingArea area = parkingAreaRepository.findById(areaId)
                .orElseThrow(() -> new RuntimeException("Area not found"));

        // 2. SECURITY FIX: Allow if user is Owner OR Admin
        if (loggedInUser.getRole() != UserRole.ADMIN && 
            !Objects.equals(area.getAreaOwner().getUserId(), loggedInUser.getUserId())) {
            throw new RuntimeException("Access Denied: You do not have permission to view this area.");
        }

        List<Booking> bookings = bookingRepository.findByArea_AreaId(areaId);
        LocalDateTime now = LocalDateTime.now();

        // 3. Generate Hourly Data (Last 24 Hours)
        List<AnalyticsChartDto.DataPoint> hourly = new ArrayList<>();
        for (int i = 23; i >= 0; i--) {
            LocalDateTime startWindow = now.minusHours(i);
            LocalDateTime endWindow = startWindow.plusHours(1);
            
            List<Booking> bucket = bookings.stream()
                .filter(b -> {
                    LocalDateTime time = b.getBookingTime() != null ? b.getBookingTime() : b.getReservationTime();
                    return time != null && (time.isEqual(startWindow) || time.isAfter(startWindow)) && time.isBefore(endWindow);
                })
                .collect(Collectors.toList());

            hourly.add(calculateDataPoint(bucket, startWindow.format(DateTimeFormatter.ofPattern("HH:00"))));
        }

        // 4. Generate Daily Data (Last 30 Days)
        List<AnalyticsChartDto.DataPoint> daily = new ArrayList<>();
        for (int i = 29; i >= 0; i--) {
            LocalDateTime startDay = now.minusDays(i).withHour(0).withMinute(0);
            LocalDateTime endDay = startDay.plusDays(1);

            List<Booking> bucket = bookings.stream()
                .filter(b -> {
                    LocalDateTime time = b.getBookingTime() != null ? b.getBookingTime() : b.getReservationTime();
                    return time != null && (time.isEqual(startDay) || time.isAfter(startDay)) && time.isBefore(endDay);
                })
                .collect(Collectors.toList());

            daily.add(calculateDataPoint(bucket, startDay.format(DateTimeFormatter.ofPattern("dd MMM"))));
        }

        return AnalyticsChartDto.builder().hourlyData(hourly).dailyData(daily).build();
    }

    // Helper Math Logic
    private AnalyticsChartDto.DataPoint calculateDataPoint(List<Booking> bucket, String label) {
        double revenue = 0.0;
        double totalDuration = 0.0;
        long count = bucket.size();

        for (Booking b : bucket) {
            // Revenue
            double paid = b.getAmountPaid() != null ? b.getAmountPaid() : 0.0;
            double pending = b.getAmountPending() != null ? b.getAmountPending() : 0.0;
            revenue += (paid + pending);

            // Duration (Fast Mode: 1 Real Sec = 1 Virtual Min -> / 60.0 for Hours)
            // Or Real Mode: Minutes / 60.0
            // Assuming Real Mode based on previous fix
            LocalDateTime start = b.getReservationTime();
            LocalDateTime end = b.getDepartureTime() != null ? b.getDepartureTime() : 
                               (b.getArrivalTime() != null ? b.getArrivalTime() : start);
            
            if(start != null && end != null) {
                long minutes = Duration.between(start, end).toMinutes();
                totalDuration += (minutes / 60.0);
            }
        }

        double avgDuration = count > 0 ? (totalDuration / count) : 0.0;

        return AnalyticsChartDto.DataPoint.builder()
                .label(label)
                .bookingCount(count)
                .revenue(revenue)
                .avgDurationHrs(Math.round(avgDuration * 100.0) / 100.0)
                .build();
    }



}