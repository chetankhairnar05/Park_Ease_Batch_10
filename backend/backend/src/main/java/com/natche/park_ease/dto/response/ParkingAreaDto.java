package com.natche.park_ease.dto.response;

import com.natche.park_ease.entity.ParkingArea;
import lombok.Data;

@Data
public class ParkingAreaDto {
    private Long areaId;
    private String name;
    private String address;
    private String latitude;
    private String longitude;
    private int capacitySmall;
    private int capacityMedium;
    private int capacityLarge;

    public static ParkingAreaDto fromEntity(ParkingArea area) {
        ParkingAreaDto dto = new ParkingAreaDto();
        dto.setAreaId(area.getAreaId());
        dto.setName(area.getName());
        dto.setAddress(area.getAddress());
        dto.setLatitude(area.getLatitude());
        dto.setLongitude(area.getLongitude());
        dto.setCapacitySmall(area.getCapacitySmall());
        dto.setCapacityMedium(area.getCapacityMedium());
        dto.setCapacityLarge(area.getCapacityLarge());
        return dto;
    }
}