// src/screens/MapScreen.js
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Pressable, Text, StatusBar, Alert, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors } from '../constants/theme';
import { subscribeToComplexesRealtime } from '../services/firestore';

export default function MapScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [complexes, setComplexes] = useState([]);
  const [selectedComplex, setSelectedComplex] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    let locationSubscription;

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 5,
        },
        (loc) => {
          setLocation(loc);
          if (!location && mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            });
          }
        }
      );
    })();

    const unsubscribe = subscribeToComplexesRealtime((data) => {
      setComplexes(data);
    });

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
      unsubscribe();
    };
  }, []);

  const handleGetDirections = () => {
    if (!selectedComplex) return;
    
    // Construct Google Maps URL Intent
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${selectedComplex.lat},${selectedComplex.lng}`;
    const label = selectedComplex.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });
    
    // Fallback directly to Google Maps web URL if native intent fails
    const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${latLng}`;

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        return Linking.openURL(url);
      } else {
        return Linking.openURL(fallbackUrl);
      }
    }).catch(err => console.error('An error occurred', err));
  };

  // Calculate Haversine distance
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    return (R * c).toFixed(1); // Distance in km to 1 decimal place
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 12.9720,
          longitude: 77.5940,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onPress={() => setSelectedComplex(null)} // Dismiss card on map tap
      >
        {complexes.map(complex => (
          <Marker
            key={complex.id}
            coordinate={{ latitude: complex.lat, longitude: complex.lng }}
            onPress={(e) => {
              e.stopPropagation();
              setSelectedComplex(complex);
              mapRef.current?.animateToRegion({
                latitude: complex.lat - 0.005, // Offset slightly to accommodate bottom card
                longitude: complex.lng,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              });
            }}
          >
            <View style={styles.markerContainer}>
              <View style={[
                styles.markerPin, 
                { backgroundColor: complex.availableCount > 0 ? colors.success : colors.danger }
              ]}>
                <Ionicons name="car" size={16} color="#FFFFFF" />
              </View>
              <View style={styles.markerTail} />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Floating Header */}
      <View style={styles.floatingHeader}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2C2C2A" />
        </Pressable>
        <Text style={styles.headerTitle}>Find Parking</Text>
      </View>

      {/* Bottom Sheet Card */}
      {selectedComplex && (
        <View style={styles.bottomCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>{selectedComplex.name}</Text>
              <Text style={styles.cardSubtitle}>
                Total capacity: {selectedComplex.totalSlots} 
                {location && `  •  ${getDistance(location.coords.latitude, location.coords.longitude, selectedComplex.lat, selectedComplex.lng)} km away`}
              </Text>
            </View>
            <Pressable onPress={() => setSelectedComplex(null)} hitSlop={10}>
              <Ionicons name="close-circle" size={28} color="#D3D1C7" />
            </Pressable>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Available</Text>
              <Text style={[styles.statValue, { color: colors.success }]}>{selectedComplex.availableCount}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Occupied</Text>
              <Text style={[styles.statValue, { color: colors.danger }]}>{selectedComplex.occupiedCount}</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable 
              style={[styles.actionBtn, styles.btnSecondary]} 
              onPress={handleGetDirections}
            >
              <Ionicons name="navigate" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnSecondaryText}>Directions</Text>
            </Pressable>
            <Pressable 
              style={[styles.actionBtn, styles.btnPrimary]}
              onPress={() => navigation.navigate('ComplexOverview', { complex: selectedComplex })}
            >
              <Text style={styles.btnPrimaryText}>View Floors</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Floating Action Button (Only show if no complex is selected) */}
      {!selectedComplex && (
        <Pressable
          style={styles.reportButton}
          onPress={() => navigation.navigate('Report')}
        >
          <Ionicons name="alert-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.reportText}>Report Issue</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1EFE8'
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%'
  },
  floatingHeader: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C2C2A',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPin: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerTail: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
    marginTop: -2,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2C2C2A',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#5F5E5A',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#F1EFE8',
    borderRadius: 12,
    padding: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#5F5E5A',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSecondary: {
    backgroundColor: '#4285F4', // Google Blue
    marginRight: 10,
  },
  btnSecondaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  reportButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#791F1F',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  reportText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 8,
  }
});
