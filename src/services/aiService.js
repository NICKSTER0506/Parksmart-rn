// src/services/aiService.js

export function scoreSlot(slot, bookingHistory, userVehicleType) {
  return 0; // stub
}

export function getRecommendedSlot(slots, bookingHistory, userVehicleType) {
  return null; // stub
}

export function detectOverstays(slots, bookings) {
  return slots; // stub
}

export async function computePeakHours(totalSlots = 50) {
  return []; // stub
}

export async function getAnalyticsSummary() {
  return {
    totalBookings: 0,
    avgDuration: 0,
    mostPopularSlot: 'N/A'
  }; // stub
}
