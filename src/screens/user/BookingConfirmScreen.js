// src/screens/user/BookingConfirmScreen.js
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { useParking } from '../../context/ParkingContext';
import { useAuth } from '../../context/AuthContext';
import { createBooking } from '../../services/bookingService';
import { colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function BookingConfirmScreen({ route, navigation }) {
  const { slot } = route.params || {};
  const { user, userDoc } = useAuth();
  
  const [selectedDuration, setSelectedDuration] = useState(null); // in minutes
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!slot) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Invalid slot reference.</Text>
        <Pressable onPress={() => navigation.popToTop()}>
          <Text style={styles.backLinkText}>Return to grid</Text>
        </Pressable>
      </View>
    );
  }

  const durationOptions = [
    { label: '30 Minutes', value: 30 },
    { label: '1 Hour', value: 60 },
    { label: '2 Hours', value: 120 },
    { label: '4 Hours', value: 240 },
  ];

  const handleConfirm = async () => {
    if (!selectedDuration) return;
    setErrorMsg('');
    setLoading(true);

    try {
      const result = await createBooking(
        user.uid,
        slot.id,
        slot.label,
        slot.complexId,
        selectedDuration,
        userDoc?.vehicleType || null
      );
      // Replace stack screen with Ticket to prevent backing into confirmation
      navigation.replace('Ticket', { booking: result, slot });
    } catch (err) {
      setErrorMsg('That slot was just taken — choose another.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <StatusBar backgroundColor="#F1EFE8" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back-outline" size={24} color="#2C2C2A" />
        </Pressable>
        <Text style={styles.screenTitle}>Confirm Booking</Text>
      </View>

      <View style={styles.container}>
        {/* Slot Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>SELECTED SLOT</Text>
          <Text style={styles.summaryValue}>{slot.label}</Text>
          <Text style={styles.summarySub}>Zone {slot.zone} • Floor {slot.floor === 0 ? 'Ground' : slot.floor}</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.summaryLabel}>YOUR VEHICLE</Text>
          <Text style={[styles.summaryValue, { fontSize: 24, textTransform: 'capitalize' }]}>
            {userDoc?.vehicleType || 'General'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Select Duration</Text>

        {/* 2-Column Duration Grid Picker */}
        <View style={styles.pickerGrid}>
          {durationOptions.map((opt) => {
            const isSelected = selectedDuration === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[
                  styles.durationCard,
                  isSelected && styles.durationCardSelected,
                ]}
                onPress={() => {
                  setSelectedDuration(opt.value);
                  setErrorMsg('');
                }}
              >
                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={isSelected ? colors.primary : '#888780'}
                  style={styles.radioIcon}
                />
                <Text style={[styles.durationLabel, isSelected && styles.durationLabelSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#791F1F" />
            <Text style={styles.errorBannerText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Primary CTA Button */}
        <Pressable
          style={[
            styles.primaryButton,
            (!selectedDuration || loading) && styles.disabledButton,
          ]}
          onPress={handleConfirm}
          disabled={!selectedDuration || loading}
        >
          {loading ? (
            <View style={styles.buttonLoaderRow}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.buttonTextLoading}>Booking...</Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>Confirm booking</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F1EFE8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    marginRight: 12,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C2C2A',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    marginBottom: 24,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888780',
    letterSpacing: 1,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2C2C2A',
    marginTop: 6,
  },
  summarySub: {
    fontSize: 13,
    color: '#5F5E5A',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1EFE8',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C2C2A',
    marginBottom: 12,
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  durationCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D3D1C7',
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
  },
  durationCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#E6F1FB', // brand tint
  },
  radioIcon: {
    marginRight: 10,
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5F5E5A',
  },
  durationLabelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCEBEB',
    borderColor: '#F4C4C4',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#791F1F',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  primaryButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonLoaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonTextLoading: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1EFE8',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#791F1F',
    marginBottom: 12,
  },
  backLinkText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
