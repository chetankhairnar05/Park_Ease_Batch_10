package com.natche.park_ease.enums;

/**
 * Access roles describing a user's relationship to a vehicle.
 */
public enum UserVehicleAccessRole {
    OWNER,//user is actual owner of vehicle
    GUEST;//user make other user guest and give and can revoke access from guest
}
