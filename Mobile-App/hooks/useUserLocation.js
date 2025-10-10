import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export function useUserLocation() {
  const [location, setLocation] = useState(null);
  const [placeName, setPlaceName] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setLocation(location);

        // Perform reverse geocoding to get precise place name
        let geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (geocode.length > 0) {
          const { name, street, city, region, country } = geocode[0];
          // Construct a readable place name (e.g., "Kwame Nkrumah Circle, Accra, Ghana")
          const place = [
            name || street,
            city,
            region,
            country,
          ].filter(Boolean).join(', ');
          setPlaceName(place || 'Unknown location');
        } else {
          setPlaceName('Unknown location');
        }
      } catch (error) {
        setErrorMsg('Failed to fetch location. Please try again.');
        console.error('Location error:', error);
      }
    })();
  }, []);

  return { location, placeName, errorMsg };
}