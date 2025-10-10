// components/FloatingSOSButton.js
import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import { sendEmergencyAlert } from '../Services/api'; // adjust path if needed
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function FloatingSOSButton() {
  const [loading, setLoading] = useState(false);
  const lastLocationRef = useRef(null); // cache of last successful location+address
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Request location (with reverse geocoding) and cache result
  const requestLocation = async () => {
    try {
      console.log('Requesting location permissions...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Denied',
          'Please enable location permissions in your device settings to send emergency alerts.',
          [{ text: 'OK' }]
        );
        return null;
      }

      console.log('Fetching device location...');
      const locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });

      if (!locationData) {
        return null;
      }

      // Reverse geocode (best effort)
      let addressData = [];
      try {
        addressData = await Location.reverseGeocodeAsync({
          latitude: locationData.coords.latitude,
          longitude: locationData.coords.longitude,
        });
      } catch (err) {
        console.warn('Reverse geocode failed:', err.message);
      }

      const formattedAddress = addressData[0]
        ? `${addressData[0].name || ''}, ${addressData[0].street || ''}, ${addressData[0].city || ''}, ${addressData[0].country || ''}`
            .replace(/(^[,\s]+)|([,\s]+$)/g, '') // trim stray commas/spaces
        : 'Unknown location';

      const result = { location: locationData, address: formattedAddress };
      lastLocationRef.current = result; // cache it
      console.log('Location fetched:', result);
      return result;
    } catch (err) {
      console.error('Location fetch failed:', err.message);
      return null;
    }
  };

  const sendAlert = async () => {
    if (loading) return; // prevent duplicate
    setLoading(true);
    try {
      // Use cached location if present, otherwise fetch new
      let current = lastLocationRef.current;
      if (!current) {
        console.log('No cached location; fetching now...');
        current = await requestLocation();
        if (!current) {
          Toast.show({
            type: 'error',
            text1: 'Location Error',
            text2: 'Could not obtain location. Please try again.',
            position: 'top',
          });
          return;
        }
      }

      const { latitude, longitude, accuracy } = current.location.coords;
      const address = current.address || 'Unknown location';

      // Get auth token
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert(
          'Authentication Error',
          'You must be logged in to send an emergency alert. Please log in.',
          [{ text: 'OK' }]
        );
        return;
      }

      const payload = {
        latitude,
        longitude,
        address,
        timestamp: new Date().toISOString(),
        accuracy: typeof accuracy === 'number' ? accuracy : null,
      };

      console.log('Sending emergency alert with data:', payload);
      const response = await sendEmergencyAlert(payload); // token auto-injected by interceptor

      Toast.show({
        type: 'success',
        text1: '🚨 Emergency Alert Sent!',
        text2: `Location: ${address}`,
        position: 'top',
        visibilityTime: 4000,
      });

      console.log('Emergency alert response:', response.data);
    } catch (err) {
      console.error('SOS Error:', err);
      let errorMessage = 'Please try again or contact security directly';

      const status = err.response?.status;
      if (status === 500) {
        errorMessage = 'Server error occurred. Please try again in a moment.';
      } else if (status === 400) {
        errorMessage = 'Invalid location data. Please try again.';
      } else if (status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Check your network and try again.';
      } else if (err.code === 'ERR_NETWORK') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      Toast.show({
        type: 'error',
        text1: 'Failed to Send Emergency Alert',
        text2: errorMessage,
        position: 'top',
        visibilityTime: 4000,
      });
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={sendAlert}
        style={[styles.button, loading && styles.buttonDisabled]}
        disabled={loading}
        accessibilityLabel="Send SOS Alert"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Ionicons name="alert-circle" size={32} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    zIndex: 999,
  },
  button: {
    backgroundColor: '#dc2626',
    borderRadius: 50,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
});
