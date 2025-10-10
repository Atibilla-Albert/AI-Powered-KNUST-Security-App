import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserLocation } from '../hooks/useUserLocation'; 
import FloatingSOSButton from './Emergency';

export default function DashBoardScreen({ navigation }) {
  const isDark = useColorScheme() === 'dark';
  const { location, placeName, errorMsg } = useUserLocation();

  const backgroundColors = isDark
    ? ['#003c2b', '#005738']
    : ['#e0f2f1', '#f1faee'];

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('idToken');
      navigation.navigate('Login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <LinearGradient colors={backgroundColors} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: isDark ? '#7ed957' : '#004225' }]}>
          Welcome to KNUST CAMPSEC
        </Text>

        {errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : placeName ? (
          <Text style={styles.locationText}>📍 Location: {placeName}</Text>
        ) : (
          <Text style={styles.locationText}>Fetching location...</Text>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: isDark ? '#7ed957' : '#004225' },
          ]}
          onPress={() => navigation.navigate('ReportIncident')}
        >
          <Text style={styles.buttonText}>🚨 Report New Incident</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: isDark ? '#16a34a' : '#065f46' },
          ]}
          onPress={() => navigation.navigate('IncidentList')}
        >
          <Text style={styles.buttonText}>📁 View Incident Reports</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: isDark ? '#6b7280' : '#4b5563' }]}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Powered by AI & AWS — Securing the Future
        </Text>
      </ScrollView>
      <FloatingSOSButton />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  scrollContent: {
    paddingBottom: 40,
    gap: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#f87171',
  },
  locationText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6b7280',
  },
  button: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 2,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#9ca3af',
    marginTop: 24,
  },
});