import { useState, useEffect, useCallback } from 'react';
import L from 'leaflet';

// Fix Leaflet icon issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

/* ==============================
   useForm Hook
============================== */
export const useForm = (initialValues, validate) => {
  const [values, setValues] = useState(initialValues || {});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setValues(initialValues || {});
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;

    setValues(prev => ({ ...prev, [name]: val }));
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  const setFieldValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  const handleSubmit = useCallback((callback) => (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const allTouched = Object.keys(values).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    if (validate) {
      const validationErrors = validate(values);
      setErrors(validationErrors);

      if (Object.keys(validationErrors).length === 0) {
        callback(values);
      } else {
        setIsSubmitting(false);
      }
    } else {
      callback(values);
      setIsSubmitting(false);
    }
  }, [values, validate]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    resetForm,
    setValues
  };
};

/* ==============================
   useMap Hook
============================== */
export const useMap = (mapContainer, markers = [], options = {}) => {
  const [map, setMap] = useState(null);
  const [mapMarkers, setMapMarkers] = useState([]);

  useEffect(() => {
    if (!mapContainer || !L) return;

    const mapInstance = L.map(mapContainer, {
      ...options,
      zoomControl: true,
      doubleClickZoom: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(mapInstance);

    setMap(mapInstance);

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [mapContainer]);

  useEffect(() => {
    if (!map || !markers.length) return;

    // Clear existing markers
    mapMarkers.forEach(marker => marker.remove());

    const newMarkers = markers.map(marker => {
      const newMarker = L.marker([marker.lat, marker.lng]).addTo(map);
      if (marker.popup) {
        newMarker.bindPopup(marker.popup);
      }
      return newMarker;
    });

    setMapMarkers(newMarkers);

    if (newMarkers.length > 1) {
      const group = L.featureGroup(newMarkers);
      map.fitBounds(group.getBounds(), { padding: [50, 50] });
    } else if (newMarkers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], options.zoom || 15);
    }

    return () => {
      newMarkers.forEach(marker => marker.remove());
    };
  }, [map, markers]);

  const resizeMap = useCallback(() => {
    if (map) {
      setTimeout(() => map.invalidateSize(), 100);
    }
  }, [map]);

  return { map, resizeMap };
};

/* ==============================
   useMediaUpload Hook
============================== */
export const useMediaUpload = (options = {}) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploadedUrls, setUploadedUrls] = useState([]);

  const handleFileSelect = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setError(null);
  }, []);

  const uploadFiles = useCallback(async () => {
    if (!files.length) return { success: false, message: 'No files to upload' };

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const uploadPromises = files.map(async (file, index) => {
        const { Storage } = await import('aws-amplify');

        const timestamp = Date.now();
        const key = options.prefix 
          ? `${options.prefix}/${timestamp}_${file.name}`
          : `uploads/${timestamp}_${file.name}`;

        const contentType = file.type || 'application/octet-stream';

        const result = await Storage.put(key, file, {
          contentType,
          progressCallback: (uploadProgress) => {
            const fileProgress = (uploadProgress.loaded / uploadProgress.total) * 100;
            const overallProgress = (
              (index * 100 + fileProgress) / (files.length * 100)
            ) * 100;
            setProgress(Math.round(overallProgress));
          }
        });

        const url = await Storage.get(result.key);
        return { key: result.key, url };
      });

      const results = await Promise.all(uploadPromises);
      setUploadedUrls(results.map(r => r.url));

      return {
        success: true,
        message: `Successfully uploaded ${results.length} files`,
        urls: results.map(r => r.url)
      };
    } catch (err) {
      setError(err.message || 'Upload failed');
      return {
        success: false,
        message: err.message || 'Upload failed'
      };
    } finally {
      setUploading(false);
      setProgress(100);
    }
  }, [files, options.prefix]);

  const resetUpload = useCallback(() => {
    setFiles([]);
    setProgress(0);
    setError(null);
    setUploadedUrls([]);
  }, []);

  return {
    files,
    uploading,
    progress,
    error,
    uploadedUrls,
    handleFileSelect,
    uploadFiles,
    resetUpload
  };
};

/* ==============================
   useDebounce Hook
============================== */
export const useDebounce = (value, delay = 500) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};