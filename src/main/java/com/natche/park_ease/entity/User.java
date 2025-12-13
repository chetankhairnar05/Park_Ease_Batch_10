package com.natche.park_ease.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.natche.park_ease.enums.UserRole;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.util.List;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data // Lombok: Getters, Setters, toString, etc.
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userId;

    @NotBlank(message = "Name is required")
    private String name;

    @Email(message = "Invalid email format")
    @Column(unique = true, nullable = false)
    @NotBlank(message = "Email is required")
    private String email;

    @Column(unique = true, nullable = false)
    @NotBlank(message = "Phone number is required")
    private String phone;

    @NotBlank
    private String password;

    // Live Location
    private String latitude;
    private String longitude;

    @Enumerated(EnumType.STRING)
    private UserRole role;

    private Double walletBalance = 0.0; // To simulate payments

    @CreationTimestamp
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<UserVehicleAccess> vehicleAccessList;

    

    

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    private Boolean isEnabled = true;
    private Boolean isBlocked = false;
    
    
    // Helper to check total debt quickly via Repository, not stored field
}

// import java.time.LocalDateTime;
// import java.util.ArrayList;
// import java.util.Arrays;
// import java.util.List;

// import com.natche.parking.Enum.BookingStatus;
// import com.natche.parking.Enum.ParkingSlotStatus;
// import com.natche.parking.Enum.PaymentMethod;
// import com.natche.parking.Enum.PaymentStatus;
// import com.natche.parking.Enum.UserRole;
// import com.natche.parking.Enum.UserVehicleAccessRole;
// import com.natche.parking.Enum.VehicleType;

// public class User {
//     private Long userId;
//     private String name;
//     private String email;
//     private String phone;
//     private String password;
//     private UserRole role;
//     private LocalDateTime createdAt;
//     private Boolean isEnabled;
// }
// class Vehicle{
//     private Long vehicleId;
//     private String registerNumber;
//     private VehicleType vehicleType;
//     private String color;
//     private String model;
//     // for location of vehicle
//     private String lattitude;
//     private String longitude;
// }
// class UserVehicleAccess{
//     private Long id;
//     private User userId;
//     private Vehicle vehicleId;
//     private UserVehicleAccessRole role;
//     private Boolean isEnabled;
// }
// class ParkingArea{
//     private Long AreaId;
//     private String name;
//     private int capacityForSmall;
//     private int capacityForMedium;
//     private int capacityForLarge;
//     //location
//     private String lattitude;
//     private String longitude;
//     private String address;
//     private List<Double> reservationRateMultiplier = new ArrayList<>(Arrays.asList(0.0, 0.35, 0.65, 1.0));//dynamic reservation rate according to demand
//     private int reservationRateIndexSmall = 1;//we have array of 4 rates so it is pointing to 1st index of array
//     private int reservationRateIndexMedium = 1;
//     private int reservationRateIndexLarge = 1;
//     private int smallOccupancy;//how many slots have filled for small
//     private int mediumOccupancy;
//     private int largeOccupancy;
//     private Integer gracePeriodMinutes; //grace period for parking area
//     private User areaOwner; //area owner id
// }

// class ParkingSlot{
//     private long slotId;
//     private ParkingArea areaId;
//     private String slotNumber;
//     private int floor;
//     private VehicleType vehicleType;
//     private ParkingSlotStatus status;
//     private Double hourlyRate; //what is hourly rate of slot
//     private Double reservationRateMultiplier; //how much of hourly rate reservation rate is ie. 0.65
//     private Integer gracePeriodMinutes;//reservation is valid untill this period because if user not arrive after reservation the slot will be reserved forever
//     private Integer reservationFeeVaiverPeriodMinutes;//if reservation user arrive withing this period he do not have to pay for reservation

// }

// class Payment{
//     private Long paymentId;
//     private Booking bookingId;
//     private PaymentMethod method;
//     private PaymentStatus status;
//     private LocalDateTime time;
// }

// class Booking{
//     private Long id;
//     private ParkingSlot slotId;
//     private ParkingArea areaId;
//     private User userId;
//     private Vehicle vehicleId;
    
//     private LocalDateTime reservationStartTime;//user booked reservation or booking start time
//     private LocalDateTime reservationEndTime;//reservationStartTime+ (time)gracePeriodMinutes
//     private LocalDateTime arrivalTime;
//     private LocalDateTime departureTime;
//     private BookingStatus bookingStatus;
//     private Boolean isExpired;//is booking ongoing or ended
//     private double amount;//previousdue+reservation+booking
//     private OutstandingDue previousOutstandingDue;//previous dues
//     private Double hourlyReservationRate;//actual reservation rate hourly like 40rs
//     private Double hourlyParkingRate;//actual parking rate hourly ie 60rs
//     private Double totalReservationFee;//sums up at arrival or departure
//     private Double totalParkingFee;//sums up at departure
// }
// class OutstandingDue{
//     private Long dueId;
//     private User userId;
//     private Vehicle vehicleId;
// //due are related to user and vehicle both and in next booking he have to pay this due, 
//     private Booking BookingId;
//     private boolean isPaid;
//     private boolean isDefaulter;
//     private Double amount;//amount = previous due amount of vehicle + previous outstanding due amount of user + this due amount
//     private OutstandingDue previousOutstandingDueUser;//user has to pay his all dues previous
//     private OutstandingDue previousOutstandingDueVehicle;//user has to pay all previous due of this vehicle(even if he was not user for this vehicle that time)

// }

/*flow:
user registers
user register vehicle then he is owner of vehicle
user give guest access to another user => another user accept that access now he is guest
owner can revoke access from guest
owner can release his access from vehicle but he have to pay all dues with same vehicle( including guest dues of same vehicle), but he not have to pay dues for another vehicles if he has ownership of them until next booking , and he have to make unother user owner 
user can relese his access from vehicle but but he have to pay all dues from same vehicle of his own(his own dues accosiated with vehicle)
admin can do many things so with great power comes great responsibility so we work on him later
parkingAreaOwner can create area , create slot , set them under maintainance , if user ran away without paying and user has not stopped parking clock so it is showing parking slot is under parking but user ran away so he stop bookinng and set booking status defaulted so dues will be added in user's outstanding dues

if user stopped clock and ran away without paying by any reason his outstanding dues created and he have to pay it

user can reserve slot he can specify reservation but but only for grace period of slot if he not arrive until then his reservation will cancelled and reservation outstanding due will added ie graceperiod = 30 minutes then after 30 minutes of reservation the booking will get cancelled if user not arrive because if this not then if user never arrive the slot will reserved forever

if user arrive before reservationFeeVaiverPeriodMinutes he will not have to pay for reservation ie 10 minutes

user arrive without reservation he can park his. reservation time = parking time = reservation end time so by our logic he have to pay only for parking

the app will be real time so if someone reserve , park it will be updated allover the parking area


*/