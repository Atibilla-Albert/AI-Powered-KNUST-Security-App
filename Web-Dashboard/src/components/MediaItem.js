import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import apiService from '../services/api';
import { getFileType, formatFileSize } from '../utils/helpers';
import '../styles/IncidentDetails.css';

// Cache for presigned URLs to avoid repeated API calls
const urlCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CONCURRENT_REQUESTS = 3;
let activeRequests = 0;
const requestQueue = [];

// Optimized retry with exponential backoff and jitter
const fetchWithRetry = async (fn, retries = 2, baseDelay = 200) => {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries) throw err;
      const jitter = Math.random() * 50;
      const delay = Math.min(baseDelay * Math.pow(1.5, attempt) + jitter, 2000);
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
    }
  }
};

// Queue management for concurrent requests
const processQueue = async () => {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS || requestQueue.length === 0) {
    return;
  }
  
  activeRequests++;
  const { resolve, reject, fn } = requestQueue.shift();
  
  try {
    const result = await fn();
    resolve(result);
  } catch (error) {
    reject(error);
  } finally {
    activeRequests--;
    processQueue();
  }
};

const queuedFetch = (fn) => {
  return new Promise((resolve, reject) => {
    requestQueue.push({ resolve, reject, fn });
    processQueue();
  });
};

const downloadFile = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const MediaItem = React.memo(({ file, incidentId, onSelect, onError, priority = 'normal' }) => {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const previewErrorDebounceRef = useRef(null);
  const intersectionObserverRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  // Memoize file properties to prevent unnecessary re-renders
  const fileProps = useMemo(() => {
    // Handle different attachment formats from backend
    // Backend stores attachments as: [{ key: "path/to/file.jpg" }] or just strings
    let key, name, type, size;
    
    if (typeof file === 'string') {
      // If file is just a string (the key)
      key = file;
      name = file.split('/').pop() || 'Unknown file';
      type = getFileType(file);
      size = null;
    } else if (file && typeof file === 'object') {
      // If file is an object with properties
      key = file.key || file;
      name = file.name || (key && key.split('/').pop()) || 'Unknown file';
      type = file.type || getFileType(key);
      size = file.size || null;
    } else {
      // Fallback
      key = 'unknown';
      name = 'Unknown file';
      type = 'unknown';
      size = null;
    }
    
    const cacheKey = `${incidentId}-${key}`;
    
    console.log('Processing file:', { originalFile: file, key, name, type, size });
    
    return { fileType: type, name, cacheKey, key, size };
  }, [file, incidentId]);

  // Check cache first
  const getCachedUrl = useCallback((cacheKey) => {
    const cached = urlCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.url;
    }
    return null;
  }, []);

  // Set cache
  const setCachedUrl = useCallback((cacheKey, url) => {
    urlCache.set(cacheKey, { url, timestamp: Date.now() });
  }, []);

  const fetchUrl = useCallback(async () => {
    // Check cache first
    const cachedUrl = getCachedUrl(fileProps.cacheKey);
    if (cachedUrl) {
      setUrl(cachedUrl);
      return;
    }

    setError(null);
    setLoading(true);
    
    try {
      console.log(`Fetching media URL for incident ${incidentId}, key: ${fileProps.key}`);
      const fetched = await queuedFetch(() =>
        fetchWithRetry(
          () => apiService.getPresignedDownloadUrl(incidentId, fileProps.key),
          2,
          200
        )
      );
      
      if (!mountedRef.current) return;
      
      console.log(`Successfully fetched URL for ${fileProps.key}:`, fetched);
      // Cache the URL
      setCachedUrl(fileProps.cacheKey, fetched);
      setUrl(fetched);
    } catch (err) {
      if (!mountedRef.current) return;
      console.error(`Failed to fetch URL for ${fileProps.key}:`, err);
      const msg = err?.message || 'Failed to fetch URL';
      setError(msg);
      if (onError) onError(fileProps.key, msg);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [incidentId, fileProps.key, fileProps.cacheKey, getCachedUrl, setCachedUrl, onError]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const element = document.querySelector(`[data-media-key="${fileProps.key}"]`);
    if (!element) return;

    intersectionObserverRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          intersectionObserverRef.current?.disconnect();
        }
      },
      { 
        rootMargin: '50px', // Start loading 50px before visible
        threshold: 0.1 
      }
    );

    intersectionObserverRef.current.observe(element);

    return () => {
      intersectionObserverRef.current?.disconnect();
    };
  }, [fileProps.key]);

  // Fetch URL when component becomes visible or on refresh trigger
  useEffect(() => {
    mountedRef.current = true;
    
    if (isVisible || priority === 'high') {
      fetchUrl();
    }
    
    return () => {
      mountedRef.current = false;
      if (previewErrorDebounceRef.current) {
        clearTimeout(previewErrorDebounceRef.current);
      }
    };
  }, [fetchUrl, refreshTrigger, isVisible, priority]);

  const handlePreviewError = useCallback(() => {
    if (previewErrorDebounceRef.current) {
      clearTimeout(previewErrorDebounceRef.current);
    }
    previewErrorDebounceRef.current = window.setTimeout(
      () => setRefreshTrigger((v) => v + 1),
      300 // Reduced debounce time
    );
  }, []);

  const retry = useCallback(() => {
    setRefreshTrigger((v) => v + 1);
  }, []);

  return (
    <div className="media-item" data-media-key={fileProps.key}>
      <div
        className="media-preview"
        onClick={() =>
          onSelect &&
          url &&
          onSelect({
            key: fileProps.key,
            url,
            name: fileProps.name,
            size: fileProps.size,
            type: fileProps.fileType,
          })
        }
      >
        {loading ? (
          <div className="placeholder">
            <div className="spinner" />
          </div>
        ) : error ? (
          <div className="media-error-box">
            <p>Failed to load</p>
            <button onClick={retry}>Retry</button>
          </div>
        ) : url ? (
          fileProps.fileType === 'image' ? (
            <img 
              src={url} 
              alt={fileProps.name} 
              onError={handlePreviewError}
              loading="lazy"
              decoding="async"
            />
          ) : fileProps.fileType === 'video' ? (
            <video 
              src={url} 
              preload="metadata" 
              onError={handlePreviewError}
              loading="lazy"
            />
          ) : fileProps.fileType === 'audio' ? (
            <div className="audio-preview">
              <i className="material-icons">audiotrack</i>
            </div>
          ) : fileProps.fileType === 'document' ? (
            <div className="document-preview">
              <i className="material-icons">description</i>
            </div>
          ) : (
            <div className="file-preview">
              <i className="material-icons">insert_drive_file</i>
            </div>
          )
        ) : !isVisible && priority !== 'high' ? (
          <div className="placeholder">
            <div className="lazy-placeholder">
              <i className="material-icons">visibility</i>
              <span>Scroll to load</span>
            </div>
          </div>
        ) : (
          <div className="placeholder">
            <div className="spinner" />
          </div>
        )}
      </div>

      <div className="media-info">
        <p className="media-name">{fileProps.name}</p>
        {fileProps.size && <p className="media-size">{formatFileSize(fileProps.size)}</p>}
      </div>
      <div className="media-actions">
        {url && (
          <>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => window.open(url, '_blank')}
              aria-label="Open"
            >
              <i className="material-icons">open_in_new</i>
            </button>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => downloadFile(url, fileProps.name)}
              aria-label="Download"
            >
              <i className="material-icons">download</i>
            </button>
          </>
        )}
        {error && (
          <button className="btn btn-sm btn-warning" onClick={retry} aria-label="Retry">
            Retry
          </button>
        )}
      </div>
    </div>
  );
});

export default MediaItem;
