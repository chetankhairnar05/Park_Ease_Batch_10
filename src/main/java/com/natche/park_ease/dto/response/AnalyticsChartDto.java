package com.natche.park_ease.dto.response;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class AnalyticsChartDto {
    // Data points for Last 24 Hours
    private List<DataPoint> hourlyData;
    // Data points for Last 30 Days
    private List<DataPoint> dailyData;

    @Data
    @Builder
    public static class DataPoint {
        private String label; // e.g., "10:00" or "12 Oct"
        private Double revenue;
        private Long bookingCount;
        private Double avgDurationHrs;
    }
}