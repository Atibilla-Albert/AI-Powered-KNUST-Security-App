// Simple reverse geocoding via OpenStreetMap Nominatim with in-memory and localStorage caching

const memoryCache = new Map(); // key: "lat,lng" (fixed precision) -> place name

const toKey = (lat, lng) => {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
  // 6 decimals ~ 0.11m precision for better differentiation
  return `${latNum.toFixed(6)},${lngNum.toFixed(6)}`;
};

const readLocal = (key) => {
  try {
    const raw = localStorage.getItem(`revgeo:${key}`);
    if (!raw) return null;
    const { name, ts } = JSON.parse(raw);
    // 30 day TTL
    if (!ts || Date.now() - ts > 30 * 24 * 60 * 60 * 1000) return null;
    return name || null;
  } catch {
    return null;
  }
};

const writeLocal = (key, name) => {
  try {
    localStorage.setItem(`revgeo:${key}`, JSON.stringify({ name, ts: Date.now() }));
  } catch {
    // ignore storage errors
  }
};

export async function reverseGeocodeDetails(lat, lng) {
  const key = toKey(lat, lng);
  if (!key) return null;

  if (memoryCache.has(key)) return memoryCache.get(key);
  const local = readLocal(key);
  if (local) {
    memoryCache.set(key, local);
    return local;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}&zoom=17&addressdetails=1&namedetails=1`;
    const resp = await fetch(url, {
      headers: {
        // Some proxies strip UA; rely on referer and standard headers in browsers
        Accept: 'application/json',
      },
    });
    if (!resp.ok) throw new Error(`Reverse geocode failed: ${resp.status}`);
    const data = await resp.json();
    const addr = data?.address || {};

    // Prefer precise components
    const houseAndRoad = [addr.house_number, addr.road].filter(Boolean).join(' ');
    const poi = addr.campus || addr.building || addr.amenity || addr.shop || addr.tourism || addr.leisure || addr.school || addr.university || addr.hospital || data?.name || '';
    const locality = addr.neighbourhood || addr.suburb || addr.quarter || addr.residential || addr.hamlet || '';
    const city = addr.city || addr.town || addr.village || addr.municipality || '';

    const precise = [houseAndRoad || poi, locality, city]
      .filter((s) => s && String(s).trim().length > 0)
      .join(', ');

    const label = precise || data?.display_name || null;
    const landmark = poi || locality || city || null;

    if (label) {
      memoryCache.set(key, label);
      writeLocal(key, label);
    }
    return { label, landmark };
  } catch (err) {
    // Do not throw; just return null so UI can keep fallback
    return null;
  }
}

export async function reverseGeocode(lat, lng) {
  const details = await reverseGeocodeDetails(lat, lng);
  return details && details.label ? details.label : null;
}

export function getCachedPlaceName(lat, lng) {
  const key = toKey(lat, lng);
  if (!key) return null;
  if (memoryCache.has(key)) return memoryCache.get(key);
  const local = readLocal(key);
  if (local) {
    memoryCache.set(key, local);
    return local;
  }
  return null;
}


