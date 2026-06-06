/**
 * Calculates the distance between two GPS coordinates using the Haversine formula.
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == lat2 && lon1 == lon2) {
    return 0;
  }
  
  const radlat1 = (Math.PI * lat1) / 180;
  const radlat2 = (Math.PI * lat2) / 180;
  const theta = lon1 - lon2;
  const radtheta = (Math.PI * theta) / 180;
  
  let dist =
    Math.sin(radlat1) * Math.sin(radlat2) +
    Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    
  if (dist > 1) {
    dist = 1;
  }
  
  dist = Math.acos(dist);
  dist = (dist * 180) / Math.PI;
  dist = dist * 60 * 1.1515;
  // convert to kilometers
  dist = dist * 1.609344;
  
  return dist;
}

/**
 * Formats a distance in kilometers for display.
 * @param {number} distanceInKm 
 * @returns {string} Formatted distance (e.g., "1.2 km" or "800 m")
 */
export function formatDistance(distanceInKm) {
  if (distanceInKm < 1) {
    return `${Math.round(distanceInKm * 1000)} m`;
  }
  return `${distanceInKm.toFixed(1)} km`;
}

// Ensure this key is the same as the one in MapScreen.web.js
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

/**
 * Fetches actual driving distances from Google Maps Distance Matrix API.
 * @param {{latitude: number, longitude: number}} origin 
 * @param {Array<{lat: number, lng: number, id: string}>} destinations 
 * @returns {Promise<Object>} Map of destination ID to { distanceStr, distanceVal }
 */
export async function getDrivingDistances(origin, destinations) {
  if (!origin || !destinations || destinations.length === 0) return {};

  const destString = destinations.map(d => `${d.lat},${d.lng}`).join('|');
  const originString = `${origin.latitude},${origin.longitude}`;

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originString}&destinations=${destString}&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.rows || !data.rows[0]) {
      throw new Error('Invalid response from Distance Matrix API');
    }

    const elements = data.rows[0].elements;
    const results = {};

    destinations.forEach((dest, index) => {
      const el = elements[index];
      if (el.status === 'OK') {
        // value is in meters
        results[dest.id] = {
          distanceStr: el.distance.text,
          distanceVal: el.distance.value / 1000 // Convert to km for sorting
        };
      } else {
        // Fallback to Haversine
        const dist = calculateDistance(origin.latitude, origin.longitude, dest.lat, dest.lng);
        results[dest.id] = {
          distanceStr: formatDistance(dist),
          distanceVal: dist
        };
      }
    });

    return results;
  } catch (error) {
    console.warn('Failed to fetch driving distances, falling back to Haversine', error);
    const results = {};
    destinations.forEach(dest => {
      const dist = calculateDistance(origin.latitude, origin.longitude, dest.lat, dest.lng);
      results[dest.id] = {
        distanceStr: formatDistance(dist),
        distanceVal: dist
      };
    });
    return results;
  }
}
