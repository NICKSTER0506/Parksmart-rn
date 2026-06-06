// src/context/ParkingContext.js
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { listenToSlots } from '../services/slotService';
import { getUserBookings } from '../services/bookingService';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getRecommendedSlot } from '../services/aiService';

const ParkingContext = createContext(null);

export function ParkingProvider({ children }) {
  const { user, role, userDoc } = useAuth();
  
  const [slots, setSlots] = useState([]);
  const [activeBooking, setActiveBooking] = useState(null);
  const [bookingHistory, setBookingHistory] = useState([]);
  
  // 1. Removed global slots listener to prevent 1,200 document reads.
  // Slots are now lazy-loaded directly in SlotGridScreen.

  // 2. Active Booking Listener Lifecycle
  useEffect(() => {
    if (!user || role === 'admin') {
      setActiveBooking(null);
      return;
    }

    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', user.uid),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setActiveBooking(null);
      } else {
        const docSnap = snapshot.docs[0];
        setActiveBooking({
          id: docSnap.id,
          ...docSnap.data()
        });
      }
    }, (error) => {
      console.error("Error listening to active booking: ", error);
    });

    return () => unsubscribe();
  }, [user, role]);

  // 3. Load booking history (one-time fetch helper)
  const refreshHistory = async () => {
    if (!user) return;
    try {
      const history = await getUserBookings(user.uid);
      setBookingHistory(history);
    } catch (error) {
      console.error("Failed to load booking history: ", error);
    }
  };

  // Automatically refresh history when the user logs in or role changes
  useEffect(() => {
    if (user && role === 'user') {
      refreshHistory();
    } else {
      setBookingHistory([]);
    }
  }, [user, role]);

  // 4. Compute recommended slot
  const recommendedSlot = useMemo(() => {
    if (!slots.length || !userDoc) return null;
    return getRecommendedSlot(slots, bookingHistory, userDoc.vehicleType);
  }, [slots, bookingHistory, userDoc]);

  const value = {
    slots,
    activeBooking,
    bookingHistory,
    recommendedSlot,
    refreshHistory
  };

  return (
    <ParkingContext.Provider value={value}>
      {children}
    </ParkingContext.Provider>
  );
}

export function useParking() {
  const context = useContext(ParkingContext);
  if (!context) {
    throw new Error('useParking must be used within a ParkingProvider');
  }
  return context;
}
export default ParkingContext;
