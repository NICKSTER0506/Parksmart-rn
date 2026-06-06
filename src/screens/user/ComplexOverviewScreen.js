import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Linking } from 'react-native';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { toggleFavorite } from '../../services/firestore';

export default function ComplexOverviewScreen({ route, navigation }) {
  const { complex } = route.params;
  const [floorStats, setFloorStats] = React.useState([
    { num: 1, type: 'Bikes', available: 0, total: 80 },
    { num: 2, type: 'Cars', available: 0, total: 40 },
    { num: 3, type: 'Cars', available: 0, total: 40 },
    { num: 4, type: 'Cars', available: 0, total: 40 },
    { num: 5, type: 'Cars', available: 0, total: 40 },
  ]);

  const { user, userDoc } = useAuth();
  const isFav = userDoc?.favorites?.includes(complex.id);

  const handleToggleFav = async () => {
    try {
      await toggleFavorite(user.uid, complex.id, isFav);
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    if (!complex.id) return;

    const q = query(collection(db, 'slots'), where('complexId', '==', complex.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const totals = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        totals[data.floor] = (totals[data.floor] || 0) + 1;
        if (data.status === 'available') {
          counts[data.floor] = (counts[data.floor] || 0) + 1;
        }
      });

      setFloorStats([
        { num: 1, type: 'Bikes', available: counts[1], total: totals[1] || 80 },
        { num: 2, type: 'Cars', available: counts[2], total: totals[2] || 40 },
        { num: 3, type: 'Cars', available: counts[3], total: totals[3] || 40 },
        { num: 4, type: 'Cars', available: counts[4], total: totals[4] || 40 },
        { num: 5, type: 'Cars', available: counts[5], total: totals[5] || 40 },
      ]);
    });

    return () => unsubscribe();
  }, [complex.id]);

  const handleGetDirections = () => {
    if (!complex.lat || !complex.lng) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${complex.lat},${complex.lng}`;
    Linking.openURL(url);
  };

  const bestFloor = React.useMemo(() => {
    let maxAvail = -1;
    let best = null;
    floorStats.forEach(f => {
      if (f.available > maxAvail) {
        maxAvail = f.available;
        best = f.num;
      }
    });
    return maxAvail > 0 ? best : null;
  }, [floorStats]);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#2C2C2A" />
      </Pressable>

      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.screenTitle}>{complex.name}</Text>
            {complex.distanceStr ? (
              <Text style={[styles.subtitle, { color: colors.primary, fontWeight: '700' }]}>
                {complex.distanceStr} away • Select a floor
              </Text>
            ) : (
              <Text style={styles.subtitle}>Select a floor to view individual slots</Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={handleToggleFav} style={styles.starBtn}>
              <Ionicons name={isFav ? "star" : "star-outline"} size={22} color={isFav ? "#F59E0B" : "#888780"} />
            </Pressable>
            {complex.lat && complex.lng && (
              <Pressable style={styles.directionsBtn} onPress={handleGetDirections}>
                <Ionicons name="navigate" size={16} color="#fff" />
                <Text style={styles.directionsText}>Directions</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Complex Overview</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Capacity</Text>
          <Text style={styles.summaryValue}>{complex.totalSlots}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Available Slots</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>{complex.availableCount}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Occupied Slots</Text>
          <Text style={[styles.summaryValue, { color: colors.danger }]}>{complex.occupiedCount}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Reserved Slots</Text>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>{complex.reservedCount}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Maintenance</Text>
          <Text style={[styles.summaryValue, { color: '#888780' }]}>{complex.maintenanceCount}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Floor Summary</Text>
      
      {floorStats.map((floor) => (
        <Pressable 
          key={floor.num} 
          style={[styles.floorCard, bestFloor === floor.num && styles.bestFloorCard]}
          onPress={() => navigation.navigate('Slots', { complexId: complex.id, floorNum: floor.num, distanceStr: complex.distanceStr })}
        >
          <View style={styles.floorHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.floorTitle}>Floor {floor.num}</Text>
              {bestFloor === floor.num && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>BEST</Text>
                </View>
              )}
            </View>
            <Text style={styles.floorType}>{floor.type}</Text>
          </View>
          <View style={styles.floorProgressContainer}>
            <View style={[styles.progressBar, { width: `${Math.min(100, (floor.available / Math.max(1, floor.total)) * 100)}%` }]} />
          </View>
          <Text style={styles.floorStats}>{floor.available}/{floor.total} Available</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F1EFE8' },
  content: { padding: 16, paddingBottom: 40 },
  backBtn: { marginBottom: 16 },
  header: { marginBottom: 24 },
  screenTitle: { fontSize: 26, fontWeight: '800', color: '#2C2C2A' },
  subtitle: { fontSize: 14, color: '#5F5E5A', marginTop: 4 },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#D3D1C7',
  },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: '#2C2C2A', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { fontSize: 14, color: '#5F5E5A', fontWeight: '500' },
  summaryValue: { fontSize: 15, fontWeight: '700', color: '#2C2C2A' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#2C2C2A', marginBottom: 16 },
  floorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D3D1C7',
  },
  floorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  floorTitle: { fontSize: 16, fontWeight: '700', color: '#2C2C2A' },
  floorType: { fontSize: 12, fontWeight: '600', color: '#888780', textTransform: 'uppercase' },
  floorProgressContainer: { height: 6, backgroundColor: '#F1EFE8', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressBar: { height: '100%', backgroundColor: colors.success, borderRadius: 3 },
  floorStats: { fontSize: 13, color: '#5F5E5A', fontWeight: '600', textAlign: 'right' },
  directionsBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  directionsText: { color: '#fff', fontWeight: '700', fontSize: 13, marginLeft: 4 },
  starBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D3D1C7', padding: 6, borderRadius: 20, marginRight: 8 },
  bestFloorCard: { borderColor: colors.primary, borderWidth: 2, backgroundColor: '#F4F9FF' },
  badge: { backgroundColor: colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 8 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' }
});
