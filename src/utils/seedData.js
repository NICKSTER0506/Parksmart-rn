// src/utils/seedData.js
import { db } from '../config/firebase';
import { collection, writeBatch, doc, getDocs } from 'firebase/firestore';

const COMPLEXES = [
  { id: 'orion', name: 'Orion Parking Lodge', location: 'Koramangala, Bengaluru', lat: 13.011, lng: 77.555 },
  { id: 'metro', name: 'Metro Parking Center', location: 'MG Road, Bengaluru', lat: 12.971, lng: 77.594 },
  { id: 'city_square', name: 'City Square Parking', location: 'Brigade Road, Bengaluru', lat: 12.935, lng: 77.624 },
  { id: 'green_view', name: 'Green View Parking', location: 'Indiranagar, Bengaluru', lat: 13.028, lng: 77.589 },
  { id: 'airport_link', name: 'Airport Link Parking', location: 'Hebbal, Bengaluru', lat: 13.198, lng: 77.706 }
];

async function clearCollection(collectionName) {
  const snapshot = await getDocs(collection(db, collectionName));
  const batches = [];
  let currentBatch = writeBatch(db);
  let count = 0;

  snapshot.docs.forEach((docSnap) => {
    currentBatch.delete(docSnap.ref);
    count++;
    if (count === 450) {
      batches.push(currentBatch.commit());
      currentBatch = writeBatch(db);
      count = 0;
    }
  });
  if (count > 0) batches.push(currentBatch.commit());
  await Promise.all(batches);
}

export async function seedDatabase() {
  console.log('Starting seed process. Wiping old data...');
  try {
    await clearCollection('slots');
    await clearCollection('bookings');
    await clearCollection('complexes');

    console.log('Generating new multi-floor hierarchy...');
    const slotBatches = [];
    let currentSlotBatch = writeBatch(db);
    let slotBatchCount = 0;

    for (const complex of COMPLEXES) {
      let availableCount = 0;
      let bikeAvailable = 0;
      let carAvailable = 0;
      let occupiedCount = 0;
      let reservedCount = 0;
      let maintenanceCount = 0;

      // Floor 1: Bikes
      for (let i = 1; i <= 80; i++) {
        const slotRef = doc(collection(db, 'slots'));
        const statusRand = Math.random();
        let status = 'available';
        if (statusRand > 0.95) status = 'maintenance';
        else if (statusRand > 0.85) status = 'reserved';
        else if (statusRand > 0.6) status = 'occupied';

        if (status === 'available') { availableCount++; bikeAvailable++; }
        else if (status === 'occupied') occupiedCount++;
        else if (status === 'reserved') reservedCount++;
        else maintenanceCount++;

        const labelNum = i < 10 ? `00${i}` : i < 100 ? `0${i}` : `${i}`;
        const slotData = {
          slotId: slotRef.id,
          label: `B${labelNum}`,
          floor: 1,
          complexId: complex.id,
          complexName: complex.name,
          vehicleType: 'bike',
          isHandicap: false,
          status,
          updatedAt: new Date()
        };

        currentSlotBatch.set(slotRef, slotData);
        slotBatchCount++;
        if (slotBatchCount === 450) {
          slotBatches.push(currentSlotBatch.commit());
          currentSlotBatch = writeBatch(db);
          slotBatchCount = 0;
        }
      }

      // Floors 2-5: Cars
      for (let floor = 2; floor <= 5; floor++) {
        // Pick 3 random handicap slots for this floor
        const handicapIndices = [];
        while (handicapIndices.length < 3) {
          const randIdx = Math.floor(Math.random() * 40) + 1;
          if (!handicapIndices.includes(randIdx)) handicapIndices.push(randIdx);
        }

        for (let i = 1; i <= 40; i++) {
          const slotRef = doc(collection(db, 'slots'));
          const statusRand = Math.random();
          let status = 'available';
          if (statusRand > 0.95) status = 'maintenance';
          else if (statusRand > 0.85) status = 'reserved';
          else if (statusRand > 0.6) status = 'occupied';

          if (status === 'available') { availableCount++; carAvailable++; }
          else if (status === 'occupied') occupiedCount++;
          else if (status === 'reserved') reservedCount++;
          else maintenanceCount++;

          const isHandicap = handicapIndices.includes(i);
          const labelNum = i < 10 ? `0${i}` : `${i}`;
          
          const slotData = {
            slotId: slotRef.id,
            label: `C${floor}-${labelNum}`,
            floor: floor,
            complexId: complex.id,
            complexName: complex.name,
            vehicleType: isHandicap ? 'handicap' : 'car',
            isHandicap,
            status,
            updatedAt: new Date()
          };

          currentSlotBatch.set(slotRef, slotData);
          slotBatchCount++;
          if (slotBatchCount === 450) {
            slotBatches.push(currentSlotBatch.commit());
            currentSlotBatch = writeBatch(db);
            slotBatchCount = 0;
          }
        }
      }

      // Create Complex aggregation doc
      const complexRef = doc(db, 'complexes', complex.id);
      currentSlotBatch.set(complexRef, {
        ...complex,
        totalSlots: 240,
        availableCount,
        bikeAvailable,
        carAvailable,
        occupiedCount,
        reservedCount,
        maintenanceCount,
        updatedAt: new Date()
      });
      slotBatchCount++;
      if (slotBatchCount === 450) {
        slotBatches.push(currentSlotBatch.commit());
        currentSlotBatch = writeBatch(db);
        slotBatchCount = 0;
      }
    }

    if (slotBatchCount > 0) slotBatches.push(currentSlotBatch.commit());
    await Promise.all(slotBatches);

    console.log('Database seeded successfully with 1,200 slots!');
    return true;
  } catch (error) {
    console.error('Error seeding database:', error);
    return false;
  }
}
