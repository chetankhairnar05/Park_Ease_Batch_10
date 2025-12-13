package com.natche.park_ease.controller;
/*
area owner can recruit and fire guards, create parking areas, disable areas for maintenance, and update slot configurations in bulk , getting all slots by area id , getting guards by area id, getting all areas owned by area owner and admin
*/

import com.natche.park_ease.dto.CreateParkingAreaRequest;
import com.natche.park_ease.dto.GuardRegisterRequest;
import com.natche.park_ease.dto.SlotUpdateRequest;
import com.natche.park_ease.dto.response.GuardDto;
import com.natche.park_ease.dto.response.ParkingAreaDto;
import com.natche.park_ease.entity.ParkingArea;
import com.natche.park_ease.repository.ParkingSlotRepository;
import com.natche.park_ease.service.AreaOwnerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/area-owner")
public class AreaOwnerController {

     @Autowired
    private ParkingSlotRepository slotRepository;

    @Autowired
    private AreaOwnerService areaOwnerService;

    // 1. Recruit Guard (Promote or Create)
    @PostMapping("/recruit-guard")
    @PreAuthorize("hasRole('AREA_OWNER')")
    public ResponseEntity<?> recruitGuard(@RequestBody GuardRegisterRequest request, Principal principal) {
        try {
            System.out.println(request.getName()+request.getEmail()+ request.getPassword()+ request.getAreaId());
            areaOwnerService.recruitGuard(request, principal.getName());
            return ResponseEntity.ok(Map.of("message", "Guard recruited successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 2. Fire Guard
    @PostMapping("/fire-guard/{guardUserId}")
    @PreAuthorize("hasRole('AREA_OWNER')")
    public ResponseEntity<?> fireGuard(@PathVariable Long guardUserId, Principal principal) {
        try {
            areaOwnerService.fireGuard(guardUserId, principal.getName());
            return ResponseEntity.ok(Map.of("message", "Guard removed and demoted to Driver"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 3. Create Parking Area
    @PostMapping("/create-area")
    @PreAuthorize("hasRole('AREA_OWNER')")
    public ResponseEntity<?> createParkingArea(@RequestBody CreateParkingAreaRequest request, Principal principal) {
        try {
            ParkingArea area = areaOwnerService.createParkingArea(request, principal.getName());
            return ResponseEntity.ok(Map.of("message", "Area Created", "areaId", area.getAreaId()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 4. Disable Area (Maintenance Mode)
    @PutMapping("/area/{areaId}/disable")
    @PreAuthorize("hasRole('AREA_OWNER') or hasRole('ADMIN')")
    public ResponseEntity<?> disableArea(@PathVariable Long areaId, Principal principal) {
        try {
            areaOwnerService.disableParkingArea(areaId, principal.getName());
            return ResponseEntity.ok(Map.of("message", "All slots set to Maintenance mode"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 5. Update Slots (Bulk Config)
    @PutMapping("/area/{areaId}/slots/update")
    @PreAuthorize("hasRole('AREA_OWNER') or hasRole('ADMIN')")
    public ResponseEntity<?> updateSlots(@PathVariable Long areaId, @RequestBody List<SlotUpdateRequest> updates, Principal principal) {
        try {
            areaOwnerService.updateSlots(areaId, updates, principal.getName());
            return ResponseEntity.ok(Map.of("message", "Slots updated successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    
    @GetMapping("/my-areas")
    @PreAuthorize("hasRole('AREA_OWNER') or hasRole('ADMIN')")
    public ResponseEntity<?> getMyAreas(Principal principal) {
        try {
            List<ParkingArea> areas = areaOwnerService.getAreasByOwner(principal.getName());
            
            // CONVERT TO DTO TO FIX SERIALIZATION ERROR
            List<ParkingAreaDto> dtos = areas.stream()
                    .map(ParkingAreaDto::fromEntity)
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(dtos);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    
    @GetMapping("/area/{areaId}/guards")
    @PreAuthorize("hasRole('AREA_OWNER') or hasRole('ADMIN')")
    public ResponseEntity<?> getGuardsByArea(@PathVariable Long areaId, Principal principal) {
        try {
            // Now returns List<GuardDto> which is safe JSON
            List<GuardDto> guards = areaOwnerService.getGuardsByArea(areaId, principal.getName());
            return ResponseEntity.ok(guards);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    //we will create a get endpoint for getting all slots by area id
    @GetMapping("/area/{areaId}/slots")
    @PreAuthorize("hasRole('AREA_OWNER') or hasRole('ADMIN')")
    public ResponseEntity<?> getSlotsByArea(@PathVariable Long areaId, Principal principal) {
        return ResponseEntity.ok(slotRepository.findByParkingArea_AreaId(areaId));
    }
    
    
}