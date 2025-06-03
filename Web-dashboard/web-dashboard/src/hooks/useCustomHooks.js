import { useState, useEffect, useCallback } from 'react';

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
export const useMap = (mapId, markers = [], options = {}) => {
  const [map, setMap] = useState(null);
  const [mapMarkers, setMapMarkers] = useState([]);

  useEffect(() => {
    let mapInstance = null;
    let leaflet = null;

    const loadLeaflet = async () => {
      if (window.L) return window.L;

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css';
      link.integrity = 'sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A==';
      link.crossOrigin = '';
      document.head.appendChild(link);

      return new Promise(resolve => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js';
        script.integrity = 'sha512-XQoYMqMTK8LvdxXYG3nZ448hOEQiglfqkJs1NOQV44cWnUrBc8PkAOcXy20w0vlaXaVUearIOBhiXZ5V3ynxwA==';
        script.crossOrigin = '';
        script.onload = () => resolve(window.L);
        document.head.appendChild(script);
      });
    };

    const initMap = async () => {
      try {
        const mapElement = document.getElementById(mapId);
        if (!mapElement) return;

        leaflet = await loadLeaflet();

        const defaultOptions = {
          center: [40.7128, -74.0060],
          zoom: 13,
          maxZoom: 19,
          minZoom: 3
        };

        mapInstance = leaflet.map(mapId, { ...defaultOptions, ...options });

        leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(mapInstance);

        setMap(mapInstance);
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initMap();

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [mapId, options]);

  useEffect(() => {
    if (!map || !markers.length) return;

    mapMarkers.forEach(marker => marker.remove());

    const L = window.L;
    if (!L) return;

    const newMarkers = markers.map(({ lat, lng, popup, icon, className }) => {
      const markerOptions = {};
      if (icon) {
        markerOptions.icon = L.divIcon({
          html: `<i class="material-icons">${icon}</i>`,
          className: `custom-div-icon ${className || ''}`,
          iconSize: [30, 30]
        });
      }
      const marker = L.marker([lat, lng], markerOptions).addTo(map);
      if (popup) marker.bindPopup(popup);
      return marker;
    });

    setMapMarkers(newMarkers);

    if (newMarkers.length > 1) {
      const group = L.featureGroup(newMarkers);
      map.fitBounds(group.getBounds(), { padding: [50, 50] });
    } else if (newMarkers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 15);
    }
  }, [map, markers]);

  const recenterMap = useCallback((lat, lng, zoom = 15) => {
    if (map) {
      map.setView([lat, lng], zoom);
    }
  }, [map]);

  const resizeMap = useCallback(() => {
    if (map) {
      map.invalidateSize();
    }
  }, [map]);

  return { map, markers: mapMarkers, recenterMap, resizeMap };
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
