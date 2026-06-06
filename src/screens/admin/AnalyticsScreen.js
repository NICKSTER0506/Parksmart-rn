// src/screens/admin/AnalyticsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Dimensions, Pressable } from 'react-native';
import { getPeakHoursTable, getPeakHourEstimate, getAllBookings } from '../../services/adminService';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, PieChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width - 32;

export default function AnalyticsScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentHourText, setCurrentHourText] = useState('');
  const [timeFilter, setTimeFilter] = useState('Today'); // 'Today', 'Week', 'Month'

  const loadAnalytics = async () => {
    try {
      const data = await getAllBookings();
      setBookings(data);

      const hour = new Date().getHours();
      const estimate = getPeakHourEstimate(hour);
      setCurrentHourText(
        `Current Traffic: ${estimate} (at ${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'})`
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  // Aggregation Logic
  const getFilteredBookings = () => {
    const now = new Date();
    return bookings.filter(b => {
      if (!b.createdAt) return false;
      const date = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      if (timeFilter === 'Today') {
        return date.toDateString() === now.toDateString();
      } else if (timeFilter === 'Week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return date >= weekAgo;
      } else if (timeFilter === 'Month') {
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }
      return true;
    });
  };

  const filteredBookings = getFilteredBookings();

  // Line Chart Data
  let labels = [];
  let dataPoints = [];

  if (timeFilter === 'Today') {
    const hours = new Array(24).fill(0);
    filteredBookings.forEach(b => {
      const date = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      hours[date.getHours()]++;
    });
    // Sample every 4 hours for the chart
    labels = ['12A', '4A', '8A', '12P', '4P', '8P'];
    dataPoints = [hours[0], hours[4], hours[8], hours[12], hours[16], hours[20]];
  } else if (timeFilter === 'Week') {
    const days = new Array(7).fill(0);
    filteredBookings.forEach(b => {
      const date = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      days[date.getDay()]++;
    });
    labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dataPoints = days;
  } else {
    // Month: 4 weeks
    const weeks = new Array(4).fill(0);
    filteredBookings.forEach(b => {
      const date = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      const weekNum = Math.floor(date.getDate() / 7);
      if (weekNum < 4) weeks[weekNum]++;
    });
    labels = ['Wk1', 'Wk2', 'Wk3', 'Wk4'];
    dataPoints = weeks;
  }

  // Ensure we don't pass empty data to chart
  if (dataPoints.every(v => v === 0)) dataPoints = dataPoints.map(() => 0.1); 

  // Pie Chart Data (Zone Distribution)
  const zoneMap = {};
  filteredBookings.forEach(b => {
    const zone = b.slotLabel ? b.slotLabel.charAt(0) : 'Other'; // Assuming slot format 'A12'
    zoneMap[zone] = (zoneMap[zone] || 0) + 1;
  });
  
  const pieColors = ['#4DA8DA', '#1E3D59', '#F2994A', '#27500A', '#791F1F'];
  const pieData = Object.keys(zoneMap).map((zone, idx) => ({
    name: `Zone ${zone}`,
    population: zoneMap[zone],
    color: pieColors[idx % pieColors.length],
    legendFontColor: '#5F5E5A',
    legendFontSize: 12,
  }));

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#f8f9fa',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(77, 168, 218, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(95, 94, 90, ${opacity})`,
    style: { borderRadius: 12 },
    propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary },
  };

  const getPeakColor = (status) => {
    switch (status) {
      case 'High': return { fill: '#FCEBEB', text: '#791F1F', border: '#F4C4C4' };
      case 'Medium': return { fill: '#FAEEDA', text: '#633806', border: '#F0D4A8' };
      case 'Low': return { fill: '#EAF3DE', text: '#27500A', border: '#D2E3BE' };
      default: return { fill: '#F1EFE8', text: '#888780', border: '#D3D1C7' };
    }
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAnalytics} colors={[colors.primary]} />}
    >
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Analytics</Text>
        <Text style={styles.subtitle}>Traffic patterns and history</Text>
      </View>

      {/* Time Filters */}
      <View style={styles.filterRow}>
        {['Today', 'Week', 'Month'].map(f => (
          <Pressable 
            key={f} 
            style={[styles.filterBtn, timeFilter === f && styles.filterBtnActive]}
            onPress={() => setTimeFilter(f)}
          >
            <Text style={[styles.filterText, timeFilter === f && styles.filterTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </View>

      {/* Line Chart */}
      <Text style={styles.sectionHeader}>BOOKING VOLUME</Text>
      <View style={styles.card}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ height: 220 }} />
        ) : (
          <LineChart
            data={{ labels, datasets: [{ data: dataPoints }] }}
            width={screenWidth - 40}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chartStyle}
          />
        )}
      </View>

      {/* Pie Chart */}
      {pieData.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>ZONE DISTRIBUTION</Text>
          <View style={styles.card}>
            <PieChart
              data={pieData}
              width={screenWidth - 40}
              height={200}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        </>
      )}

      {/* Peak Traffic Timetable */}
      <Text style={styles.sectionHeader}>PEAK TRAFFIC FORECAST</Text>
      <View style={styles.card}>
        <View style={styles.trafficHeader}>
          <Ionicons name="time-outline" size={20} color={colors.primary} />
          <Text style={styles.trafficTitle}>{currentHourText || 'Current Traffic Estimate'}</Text>
        </View>
        <View style={styles.timetable}>
          {getPeakHoursTable().map((row, index) => {
            const colorsSpec = getPeakColor(row.status);
            return (
              <View key={index} style={styles.timeRow}>
                <Text style={styles.timeRange}>{row.range}</Text>
                <View style={[styles.statusBadge, { backgroundColor: colorsSpec.fill, borderColor: colorsSpec.border }]}>
                  <Text style={[styles.statusText, { color: colorsSpec.text }]}>{row.status}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Recent Bookings */}
      <Text style={styles.sectionHeader}>RECENT GLOBAL BOOKINGS</Text>
      {filteredBookings.length > 0 ? (
        filteredBookings.slice(0, 10).map((booking) => {
          const isCancelled = booking.status === 'cancelled';
          const bookingDate = booking.createdAt?.toDate ? booking.createdAt.toDate().toLocaleDateString() : new Date(booking.createdAt).toLocaleDateString();
          return (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={styles.bookingLeft}>
                <Text style={styles.bookingSlot}>{booking.slotLabel}</Text>
                <Text style={styles.bookingId}>ID: #{booking.bookingId.substring(0, 8).toUpperCase()}</Text>
                <Text style={styles.bookingMeta}>{bookingDate} • {booking.duration} mins • User: {booking.userId.substring(0, 5)}...</Text>
              </View>
              <View style={[styles.bookingBadge, isCancelled ? styles.badgeCancelled : styles.badgeCompleted]}>
                <Text style={[styles.bookingBadgeText, isCancelled ? styles.textCancelled : styles.textCompleted]}>
                  {isCancelled ? 'Cancelled' : 'Active'}
                </Text>
              </View>
            </View>
          );
        })
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="car-sport-outline" size={32} color="#888780" />
          <Text style={styles.emptyTitle}>No bookings found</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F1EFE8' },
  content: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 20 },
  screenTitle: { fontSize: 22, fontWeight: '800', color: '#2C2C2A' },
  subtitle: { fontSize: 13, color: '#5F5E5A', marginTop: 4 },
  filterRow: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#FFFFFF', borderRadius: 8, padding: 4, borderWidth: 1, borderColor: '#D3D1C7' },
  filterBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  filterBtnActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: '#888780' },
  filterTextActive: { color: '#FFFFFF' },
  sectionHeader: { fontSize: 11, fontWeight: '700', color: '#888780', letterSpacing: 1, marginBottom: 10 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#D3D1C7', padding: 20, marginBottom: 24, overflow: 'hidden' },
  chartStyle: { marginVertical: 8, borderRadius: 12 },
  trafficHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  trafficTitle: { fontSize: 14, fontWeight: '750', color: '#2C2C2A', marginLeft: 8 },
  timetable: { marginBottom: 12 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1EFE8' },
  timeRange: { fontSize: 13, color: '#5F5E5A', fontWeight: '500' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
  bookingCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#D3D1C7', padding: 16, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingLeft: { flex: 1 },
  bookingSlot: { fontSize: 16, fontWeight: '700', color: '#2C2C2A' },
  bookingId: { fontSize: 11, color: '#888780', marginTop: 2, fontWeight: '500' },
  bookingMeta: { fontSize: 12, color: '#5F5E5A', marginTop: 4 },
  bookingBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeCompleted: { backgroundColor: '#EAF3DE', borderColor: '#D2E3BE' },
  badgeCancelled: { backgroundColor: '#FCEBEB', borderColor: '#F4C4C4' },
  bookingBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  textCompleted: { color: '#27500A' },
  textCancelled: { color: '#791F1F' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#D3D1C7' },
  emptyTitle: { fontSize: 14, color: '#888780', fontWeight: '500', marginTop: 8 }
});
