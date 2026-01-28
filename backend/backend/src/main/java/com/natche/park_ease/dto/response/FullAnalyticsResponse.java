package com.natche.park_ease.dto.response;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class FullAnalyticsResponse {
    private List<SlotAnalyticsDto> topRevenue24h;
    private List<SlotAnalyticsDto> topTime24h;
    private List<SlotAnalyticsDto> topRevenue30d;
    private List<SlotAnalyticsDto> topTime30d;
}