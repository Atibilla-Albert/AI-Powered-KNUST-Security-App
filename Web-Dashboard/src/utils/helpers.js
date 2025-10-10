/**
 * Format date to human-readable format
 * @param {string|number|Date} dateInput - Date to format
 * @param {Object} [opts]
 * @param {string} [opts.locale] - BCP-47 locale (defaults to browser locale)
 * @param {string} [opts.timeZone] - IANA time zone (defaults to browser/system)
 * @returns {string} - Formatted date string
 */
export const formatDate = (
  dateInput,
  { locale = undefined, timeZone = 'UTC' } = {}
) => {
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone, // you can override or pass undefined to use local
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Get color for incident status
 * @param {string} status - Incident status
 * @returns {string} - CSS color code
 */
export const getIncidentStatusColor = (status) => {
  switch (status?.toUpperCase()) {
    case 'NEW':
      return '#dc2626'; // red
    case 'OPEN':
      return '#f59e0b'; // yellow
    case 'IN_PROGRESS':
      return '#3b82f6'; // blue
    case 'REVIEWING':
      return '#8b5cf6'; // purple
    case 'RESOLVED':
      return '#10b981'; // green
    case 'CLOSED':
      return '#6b7280'; // gray
    case 'CANCELLED':
      return '#9ca3af'; // light gray
    default:
      return '#000000'; // black
  }
};

/**
 * Determine file/media type from filename/key
 * @param {string} filename
 * @returns {'image'|'video'|'audio'|'document'|'unknown'}
 */
export const getFileType = (filename) => {
  const ext = String(filename)
    .split('.')
    .pop()
    .toLowerCase();
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
  const videoTypes = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'];
  const audioTypes = ['mp3', 'wav', 'ogg', 'aac', 'flac'];
  const documentTypes = ['pdf', 'doc', 'docx', 'txt', 'rtf'];

  if (imageTypes.includes(ext)) return 'image';
  if (videoTypes.includes(ext)) return 'video';
  if (audioTypes.includes(ext)) return 'audio';
  if (documentTypes.includes(ext)) return 'document';
  return 'unknown';
};

/**
 * Format bytes as human-readable string
 * @param {number} bytes
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
  if (bytes == null || isNaN(bytes)) return '';
  if (bytes === 0) return '0 Bytes';
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${Math.round(val * 100) / 100} ${sizes[i]}`;
};

/**
 * Get a human-readable location name from an incident or a location object
 * Tries multiple common fields and falls back to coordinates
 * @param {Object} item - Incident or location object
 * @returns {string}
 */
export const getLocationDisplayName = (item) => {
  if (!item || typeof item !== 'object') return 'Unknown Location';
  const incident = item;
  const loc = incident.location && typeof incident.location === 'object' ? incident.location : {};

  const candidates = [
    // Explicit incident-level fields
    incident.locationName,
    incident.location_name,
    incident.address,
    incident.place,
    incident.placeName,
    incident.area,
    incident.landmark,
    incident.campus,
    // Nested location object fields
    loc.name,
    loc.title,
    loc.label,
    loc.displayName,
    loc.address,
    loc.description,
    loc.place,
    loc.placeName,
    loc.area,
    loc.landmark,
    loc.campus,
  ].filter(Boolean);

  if (candidates.length > 0) {
    return String(candidates[0]);
  }
  return 'Unknown Location';
};
