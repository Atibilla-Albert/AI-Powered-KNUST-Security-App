import React, { useState, useEffect, useRef, useCallback } from 'react';
import apiService from '../services/api';
import { getFileType, formatFileSize } from '../utils/helpers';
import '../styles/IncidentDetails.css';

const DEFAULT_TTL_MS = 4 * 60 * 1000; // 4 minutes

const fetchWithRetry = async (fn, retries = 2, baseDelay = 300) => {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries) throw err;
      const jitter = Math.random() * 100;
      await new Promise((r) =>
        setTimeout(r, baseDelay * Math.pow(2, attempt) + jitter)
      );
      attempt++;
    }
  }
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

const MediaItem = React.memo(({ file, incidentId, onSelect, onError }) => {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const lastFetchRef = useRef(0);
  const mountedRef = useRef(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const previewErrorDebounceRef = useRef(null);

  const fileType = file.type || getFileType(file.key);
  const name = file.name || (file.key && file.key.split('/').pop()) || file.key;

  const fetchUrl = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const now = Date.now();
      if (url && now - lastFetchRef.current < DEFAULT_TTL_MS) {
        return;
      }
      const fetched = await fetchWithRetry(
        () => apiService.getPresignedDownloadUrl(incidentId, file.key),
        2,
        300
      );
      if (!mountedRef.current) return;
      lastFetchRef.current = Date.now();
      setUrl(fetched);
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = err?.message || 'Failed to fetch URL';
      setError(msg);
      if (onError) onError(file.key, msg);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [incidentId, file.key, url, onError]);

  useEffect(() => {
    mountedRef.current = true;
    fetchUrl();
    return () => {
      mountedRef.current = false;
      if (previewErrorDebounceRef.current) {
        clearTimeout(previewErrorDebounceRef.current);
      }
    };
  }, [fetchUrl, refreshTrigger]);

  const handlePreviewError = () => {
    if (previewErrorDebounceRef.current) {
      clearTimeout(previewErrorDebounceRef.current);
    }
    previewErrorDebounceRef.current = window.setTimeout(
      () => setRefreshTrigger((v) => v + 1),
      500
    );
  };

  const retry = () => {
    setRefreshTrigger((v) => v + 1);
  };

  return (
    <div className="media-item">
      <div
        className="media-preview"
        onClick={() =>
          onSelect &&
          url &&
          onSelect({
            key: file.key,
            url,
            name,
            size: file.size,
            type: fileType,
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
          fileType === 'image' ? (
            <img src={url} alt={name} onError={handlePreviewError} />
          ) : fileType === 'video' ? (
            <video src={url} preload="metadata" onError={handlePreviewError} />
          ) : fileType === 'audio' ? (
            <div className="audio-preview">
              <i className="material-icons">audiotrack</i>
            </div>
          ) : fileType === 'document' ? (
            <div className="document-preview">
              <i className="material-icons">description</i>
            </div>
          ) : (
            <div className="file-preview">
              <i className="material-icons">insert_drive_file</i>
            </div>
          )
        ) : (
          <div className="placeholder">
            <div className="spinner" />
          </div>
        )}
      </div>

      <div className="media-info">
        <p className="media-name">{name}</p>
        {file.size && <p className="media-size">{formatFileSize(file.size)}</p>}
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
              onClick={() => downloadFile(url, name)}
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
