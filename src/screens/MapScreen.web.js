import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { colors } from '../constants/theme';
import { getParkingSpots, getReports } from '../services/firestore';
import { showAlert } from '../utils/alert';


const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Default to a central location in Bengaluru
const defaultCenter = {
  lat: 12.9716,
  lng: 77.5946,
};

const options = {
  disableDefaultUI: true,
  zoomControl: true,
};

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }
    
    if (document.querySelector('#google-maps-script')) return;

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);
  }, []);

  return isLoaded;
}

export default function MapScreen({ navigation }) {
  const isLoaded = useGoogleMaps();
  const mapRef = React.useRef(null);
  const mapInstance = React.useRef(null);
  const markersRef = React.useRef([]);

  const [spots, setSpots] = useState(null);
  const [reports, setReports] = useState([]);
  const [userLocation, setUserLocation] = useState(defaultCenter);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    // Track user location for real-time positioning on the map
    let geoId;
    if (navigator.geolocation) {
      geoId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
    
    return () => {
      if (geoId && navigator.geolocation) {
        navigator.geolocation.clearWatch(geoId);
      }
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const spotsData = await getParkingSpots();
      setSpots(spotsData || []);
      const reportsData = await getReports(userLocation.lat, userLocation.lng);
      setReports(reportsData || []);
    } catch (error) {
      console.error('Error loading map data:', error);
      setSpots([]);
      setReports([]);
      showAlert('Error', 'Failed to load parking spot data.');
    } finally {
      setLoading(false);
    }
  };

  // Render Map and Markers when data and script are loaded
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !spots) return;

    if (!mapInstance.current) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 16,
        ...options,
      });
    }

    // Clear old markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add User Location Marker
    const userMarker = new window.google.maps.Marker({
      position: userLocation,
      map: mapInstance.current,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 8,
      },
    });
    markersRef.current.push(userMarker);

    // Add Spot Markers
    spots.forEach(spot => {
      const isFree = spot.status === 'free' || spot.status === 'available';
      const spotMarker = new window.google.maps.Marker({
        position: { lat: spot.latitude || 12.9716, lng: spot.longitude || 77.5946 },
        map: mapInstance.current,
        label: {
          text: spot.label || 'P',
          color: '#ffffff',
          fontWeight: 'bold',
        },
        icon: {
          path: 'M0-48c-9.8 0-17.7 7.8-17.7 17.4 0 15.5 17.7 30.6 17.7 30.6s17.7-15.4 17.7-30.6c0-9.6-7.9-17.4-17.7-17.4z',
          fillColor: isFree ? colors.success : colors.danger,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 1,
          scale: 0.6,
        },
      });

      spotMarker.addListener('click', () => {
        if (isFree) {
          navigation.navigate('Booking', { spot });
        } else {
          showAlert('Spot Occupied', 'This slot is currently taken.');
        }
      });
      markersRef.current.push(spotMarker);
    });

    // Add Report Markers
    reports.forEach(report => {
      const reportMarker = new window.google.maps.Marker({
        position: { lat: report.latitude, lng: report.longitude },
        map: mapInstance.current,
        label: { text: '⚠️', fontSize: '14px' },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 0,
        },
      });
      markersRef.current.push(reportMarker);
    });

  }, [isLoaded, spots, reports, userLocation, navigation]);

  if (!isLoaded || loading || !spots) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading Campus Map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Premium Web Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Campus Map</Text>
        <Text style={styles.headerSubtitle}>Real-time availability & reports</Text>
      </View>

      <View style={styles.mapCanvas}>
        {/* Raw DOM container for Google Maps */}
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </View>

      {/* Action Footer Button Bar */}
      <View style={styles.footerRow}>
        <Pressable style={styles.secondaryButton} onPress={loadData}>
          <Text style={styles.secondaryButtonText}>Refresh Map</Text>
        </Pressable>

        <Pressable 
          style={styles.primaryButton} 
          onPress={() => navigation.navigate('Report', { latitude: userLocation.lat, longitude: userLocation.lng })}
        >
          <Text style={styles.primaryButtonText}>⚠️ Report Hazard</Text>
        </Pressable>

        <Pressable style={styles.backButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backButtonText}>Exit Map</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF3ED',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF3ED',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.secondaryText,
    fontWeight: '600',
  },
  header: {
    padding: 24,
    backgroundColor: colors.panel,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '850',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.secondaryText,
    marginTop: 4,
  },
  mapCanvas: {
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.panel,
    borderTopWidth: 1,
    borderColor: colors.border,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    flex: 1.2,
    alignItems: 'center',
    marginHorizontal: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '750',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: '750',
    fontSize: 14,
  },
  backButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    flex: 0.8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  backButtonText: {
    color: '#4B5563',
    fontWeight: '700',
    fontSize: 14,
  },
});
