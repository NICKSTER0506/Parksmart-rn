// src/services/adminService.js
import { db } from '../config/firebase';
import {
  collection,
  getDocs,
  query,
  orderBy
} from 'firebase/firestore';

const bookingsCollection = collection(db, 'bookings');
const slotsCollection = collection(db, 'slots');

/**
 * Fetch all bookings in the system for admin auditing.
 */
export async function getAllBookings() {
  try {
    const q = query(bookingsCollection, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    // Index fallback
    const snapshot = await getDocs(bookingsCollection);
    return snapshot.docs
      .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
      .sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
  }
}

/**
 * Fetch and count live slot statuses for dashboard metrics.
 */
export async function getSlotOccupancy() {
  try {
    const snapshot = await getDocs(slotsCollection);
    const slots = snapshot.docs.map(docSnap => docSnap.data());
    
    const total = slots.length;
    const booked = slots.filter(s => s.status === 'booked').length;
    const available = slots.filter(s => s.status === 'available').length;
    const disabled = slots.filter(s => s.status === 'disabled').length;

    const occupancyRate = total > 0 ? Math.round((booked / total) * 100) : 0;

    return {
      total,
      booked,
      available,
      disabled,
      occupancyRate
    };
  } catch (error) {
    throw new Error(`Failed to calculate occupancy: ${error.message}`);
  }
}

/**
 * Rule-based peak hour estimate as defined in TRD 5.4.
 * Rules: 8-10am = High, 12-2pm = High, 4-7pm = Medium, else = Low
 * 
 * @param {number} hour Hour in 24h format (0 - 23)
 * @returns {'High' | 'Medium' | 'Low'}
 */
export function getPeakHourEstimate(hour) {
  if ((hour >= 8 && hour < 10) || (hour >= 12 && hour < 14)) {
    return 'High';
  } else if (hour >= 16 && hour < 19) {
    return 'Medium';
  } else {
    return 'Low';
  }
}

/**
 * Generate a complete peak hours chart/table for display.
 */
export function getPeakHoursTable() {
  return [
    { range: '08:00 AM - 10:00 AM', status: 'High' },
    { range: '10:00 AM - 12:00 PM', status: 'Low' },
    { range: '12:00 PM - 02:00 PM', status: 'High' },
    { range: '02:00 PM - 04:00 PM', status: 'Low' },
    { range: '04:00 PM - 07:00 PM', status: 'Medium' },
    { range: '07:00 PM - 08:00 AM', status: 'Low' },
  ];
}
