package com.natche.park_ease.service;

import com.natche.park_ease.dto.response.AnalyticsChartDto;
import com.natche.park_ease.dto.response.AreaStatisticsDto;
import com.natche.park_ease.entity.Booking;
import com.natche.park_ease.enums.BookingStatus;
import com.natche.park_ease.repository.BookingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AdminService {

    @Autowired
    private BookingRepository bookingRepository;

    // ==========================================
    // 1. GET AREA STATISTICS (ADMIN VERSION)
    // No ownership check required - Admin sees all
    // ==========================================
    public AreaStatisticsDto getAreaStatistics(Long areaId, LocalDateTime start, LocalDateTime end) {
        
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

            // Time Calc (Fast Mode logic preserved)
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

    // ==========================================
    // 2. GET CHARTS (ADMIN VERSION)
    // ==========================================
    public AnalyticsChartDto getAnalyticsCharts(Long areaId, LocalDateTime start, LocalDateTime end) {
        
        List<Booking> allBookings = bookingRepository.findByArea_AreaId(areaId);
        
        LocalDateTime effectiveStart = start != null ? start : LocalDateTime.now().minusMonths(1);
        LocalDateTime effectiveEnd = end != null ? end : LocalDateTime.now();

        long daysDiff = ChronoUnit.DAYS.between(effectiveStart, effectiveEnd);
        boolean useHourly = daysDiff <= 2; 

        List<AnalyticsChartDto.DataPoint> dataPoints = new ArrayList<>();
        LocalDateTime current = effectiveStart;
        
        while (current.isBefore(effectiveEnd) || current.isEqual(effectiveEnd)) {
            LocalDateTime windowStart = current;
            LocalDateTime windowEnd = useHourly ? current.plusHours(1) : current.plusDays(1);
            
            if(!useHourly) {
               windowStart = current.toLocalDate().atStartOfDay();
               windowEnd = current.plusDays(1).toLocalDate().atStartOfDay();
            }

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

        if (useHourly) {
            return AnalyticsChartDto.builder().hourlyData(dataPoints).dailyData(new ArrayList<>()).build();
        } else {
            return AnalyticsChartDto.builder().hourlyData(new ArrayList<>()).dailyData(dataPoints).build();
        }
    }

    private AnalyticsChartDto.DataPoint calculateDataPoint(List<Booking> bucket, String label) {
        double revenue = 0.0;
        double totalDuration = 0.0;
        long count = bucket.size();

        for (Booking b : bucket) {
            double paid = b.getAmountPaid() != null ? b.getAmountPaid() : 0.0;
            double pending = b.getAmountPending() != null ? b.getAmountPending() : 0.0;
            revenue += (paid + pending);

            LocalDateTime start = b.getReservationTime();
            LocalDateTime end = b.getDepartureTime() != null ? b.getDepartureTime() : 
                               (b.getArrivalTime() != null ? b.getArrivalTime() : start);
            
            if(start != null && end != null) {
                totalDuration += Duration.between(start, end).toSeconds() / 60.0;
            }
        }
        double avgDuration = count > 0 ? (totalDuration / count) : 0.0;

        return AnalyticsChartDto.DataPoint.builder()
                .label(label).bookingCount(count).revenue(revenue)
                .avgDurationHrs(Math.round(avgDuration * 100.0) / 100.0)
                .build();
    }
}