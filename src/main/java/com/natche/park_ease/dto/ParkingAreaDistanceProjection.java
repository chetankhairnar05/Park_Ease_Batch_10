package com.natche.park_ease.dto;

public interface ParkingAreaDistanceProjection {
    Long getAreaId();
    String getAddress();
    String getName();
    String getLatitude();
    String getLongitude();
    Double getDistance(); // Calculated distance in KM
}