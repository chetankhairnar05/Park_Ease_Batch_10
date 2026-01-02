package com.natche.park_ease.controller;
// 1. Get Slots by specific Area ID (Existing)
// 2.  Get Slots for the Nearest Area based on User Location
// 3. Get All Nearest Areas with Slot Counts

import com.natche.park_ease.dto.ParkingAreaDistanceProjection;
import com.natche.park_ease.dto.response.ParkingAreaSummaryResponse;
import com.natche.park_ease.entity.ParkingArea;
import com.natche.park_ease.entity.ParkingSlot;
import com.natche.park_ease.entity.User;
import com.natche.park_ease.enums.VehicleType;
import com.natche.park_ease.repository.ParkingAreaRepository;
import com.natche.park_ease.repository.ParkingSlotRepository;
import com.natche.park_ease.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/slots")
public class SlotController {

    @Autowired
    private ParkingSlotRepository slotRepository;

    @Autowired
    private ParkingAreaRepository areaRepository;

    @Autowired
    private UserRepository userRepository;

    // 1. Get Slots by specific Area ID (Existing)
    @GetMapping("/area/{areaId}")
    public ResponseEntity<List<ParkingSlot>> getSlotsByArea(@PathVariable Long areaId) {
        return ResponseEntity.ok(slotRepository.findByParkingArea_AreaId(areaId));
    }

    // 2.  Get Slots for the Nearest Area based on User Location
    @GetMapping("/nearest")
    public ResponseEntity<?> getNearestSlots(Principal principal) {
        // A. Get User Location
        Optional<User> user1 = userRepository.findByEmailOrPhone(principal.getName(), principal.getName());
        if(user1.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
        }
        User user = user1.get();
                

        if (user.getLatitude() == null || user.getLongitude() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "User location not set. Please update profile location first."));
        }

        Double lat = Double.parseDouble(user.getLatitude());
        Double lon = Double.parseDouble(user.getLongitude());

        // B. Find Nearest Areas (Returns list sorted by distance)
        List<ParkingAreaDistanceProjection> nearestAreas = areaRepository.findNearestAreas(lat, lon);

        if (nearestAreas.isEmpty()) {
            return ResponseEntity.ok(List.of()); // No areas found
        }

        // C. Pick the closest one (Index 0)
        ParkingAreaDistanceProjection closestArea = nearestAreas.get(0);
        
        // D. Fetch Slots for that area
        List<ParkingSlot> slots = slotRepository.findByParkingArea_AreaId(closestArea.getAreaId());

        // Optional: Wrap response to include Area Info + Slots
        return ResponseEntity.ok(Map.of(
            "address", closestArea.getAddress(),
            "areaId", closestArea.getAreaId(),
            "areaName", closestArea.getName(),
            "distanceKm", String.format("%.2f", closestArea.getDistance()),
            "slots", slots
        ));
    }
        // 3. Get All Nearest Areas with Slot Counts
    @GetMapping("/all")
    public ResponseEntity<?> getAllAreasWithCounts(Principal principal) {
        
        // A. Validate User Location
        User user = userRepository.findByEmailOrPhone(principal.getName(), principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getLatitude() == null || user.getLongitude() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "User location not set."));
        }

        Double lat = Double.parseDouble(user.getLatitude());
        Double lon = Double.parseDouble(user.getLongitude());

        // B. Fetch All Areas sorted by Distance
        List<ParkingAreaDistanceProjection> areas = areaRepository.findNearestAreas(lat, lon);
        List<ParkingAreaSummaryResponse> responseList = new ArrayList<>();

        // C. Build the Response
        for (ParkingAreaDistanceProjection area : areas) {
            
            // Fetch Counts Grouped by Type (Optimized Query)
            List<Object[]> counts = slotRepository.countAvailableSlotsGroupedByType(area.getAreaId());
            
            long small = 0;
            long medium = 0;
            long large = 0;

            // Parse the Group By result
            for (Object[] row : counts) {
                VehicleType type = (VehicleType) row[0];
                Long count = (Long) row[1];
                
                if (type == VehicleType.SMALL) small = count;
                else if (type == VehicleType.MEDIUM) medium = count;
                else if (type == VehicleType.LARGE) large = count;
            }

            // Create DTO
            ParkingAreaSummaryResponse dto = ParkingAreaSummaryResponse.builder()
                    .areaId(area.getAreaId())
                    .name(area.getName())
                    .distanceKm(String.format("%.2f", area.getDistance()))
                    // Note: If you want address, you might need to add getAddress() to your Projection interface
                    .availableSmall(small)
                    .availableMedium(medium)
                    .availableLarge(large)
                    .address(area.getAddress())
                    .latitude(area.getLatitude() )
                    .longitude(area.getLongitude())
                    .build();

            responseList.add(dto);
        }

        return ResponseEntity.ok(responseList);
    }

    @GetMapping("/{slotId}/details")
    public ResponseEntity<?> getSlotDetails(@PathVariable Long slotId) {
        ParkingSlot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new RuntimeException("Slot not found"));

        ParkingArea area = slot.getParkingArea();
        Double multiplier = area.getReservationRateMultipliers().get(1);
        
        // FIXED: Added safe null checks for EVERY field
        // Map.of CRASHES if any value is null. We must provide defaults.
        return ResponseEntity.ok(Map.of(
            "slotId", slot.getSlotId(),
            "slotNumber", slot.getSlotNumber() != null ? slot.getSlotNumber() : "Unknown",
            "type", slot.getSupportedVehicleType(),
            "baseRate", slot.getBaseHourlyRate() != null ? slot.getBaseHourlyRate() : 0.0,
            "floor", slot.getFloor(),
            "areaId", slot.getParkingArea().getAreaId(),
            "areaName", slot.getParkingArea().getName() != null ? slot.getParkingArea().getName() : "Unknown Area",
            "address", slot.getParkingArea().getAddress() != null ? slot.getParkingArea().getAddress() : "Address not available",
            "reservationRate", slot.getBaseHourlyRate() != null ? slot.getBaseHourlyRate() * multiplier : 0.0
        ));
    }}
