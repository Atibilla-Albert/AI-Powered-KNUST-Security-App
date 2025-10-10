import React, { useEffect, useState } from 'react';
import { reverseGeocodeDetails, getCachedPlaceName } from '../services/geocoding';

/**
 * LocationName
 * Props:
 * - incident: { location?: { name?, latitude, longitude, lat, lng } } or any object with lat/lng
 * - className?: string
 * - fallback?: string
 */
const LocationName = ({ incident, className = '', fallback = 'Unknown Location' }) => {
  const loc = incident?.location || incident || {};
  const explicitName =
    incident?.locationName ||
    incident?.location_name ||
    loc?.name ||
    loc?.title ||
    loc?.displayName ||
    loc?.address ||
    incident?.address ||
    null;

  const lat = Number(loc?.latitude ?? loc?.lat ?? incident?.latitude ?? incident?.lat);
  const lng = Number(loc?.longitude ?? loc?.lng ?? incident?.longitude ?? incident?.lng);

  const [resolvedName, setResolvedName] = useState(() => {
    if (explicitName) return explicitName;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return getCachedPlaceName(lat, lng) || null;
    }
    return null;
  });
  const [landmark, setLandmark] = useState(null);

  useEffect(() => {
    if (resolvedName || explicitName) return;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    let mounted = true;
    reverseGeocodeDetails(lat, lng).then((details) => {
      if (!mounted || !details) return;
      if (details.label) setResolvedName(details.label);
      if (details.landmark) setLandmark(details.landmark);
    });
    return () => {
      mounted = false;
    };
  }, [lat, lng, resolvedName, explicitName]);

  const display = explicitName || (landmark ? `${resolvedName || ''}${resolvedName ? ' — ' : ''}${landmark}` : resolvedName) || fallback;
  return <span className={className}>{display}</span>;
};

export default LocationName;


