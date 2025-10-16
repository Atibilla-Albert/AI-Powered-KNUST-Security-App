import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useIncidents } from '../contexts/IncidentContext';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/users';
import { formatDate } from '../utils/helpers';
import LocationName from '../components/LocationName';
import '../styles/IncidentDetails.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet-routing-machine';
import '@gegeweb/leaflet-routing-machine-openroute';
import IncidentAdminPanel from '../components/AdminPanel';
import { useNotifications } from '../contexts/NotificationContext';
import MediaItem from '../components/MediaItem';
import IncidentAnalysis from '../components/IncidentAnalysis';

// Fix Leaflet icon issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const ADMIN_BLOCK = [6.6745, -1.5713]; // KNUST Admin Block

const IncidentDetail = () => {
  const { incidentId } = useParams();
  const { user } = useAuth();
  const { getIncidentById, addResponse, assignIncident, updateIncident } = useIncidents();
  const { sendNotification } = useNotifications();

  const [incident, setIncident] = useState(null);
  const [reporterName, setReporterName] = useState(null);
  const [reporterLoading, setReporterLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [error, setError] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routingControlRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  const isAdmin = user?.role === 'ADMIN';

  const stableAttachments = useMemo(() => {
    const attachments = incident?.attachments ? [...incident.attachments] : [];
    console.log('Incident attachments:', attachments);
    return attachments;
  }, [incident?.attachments]);

  const fetchIncident = useCallback(async () => {
    setError(null);
    if (!incidentId) {
      setError('Invalid or missing incident ID');
      return;
    }
    try {
      const data = await getIncidentById(incidentId);
      if (!data || !data.incidentId) throw new Error('Invalid incident data');
      setIncident(data);

      setReporterLoading(true);
      try {
        if (data.reporterName || (data.reporter && (data.reporter.fullName || data.reporter.name))) {
          setReporterName(data.reporterName || data.reporter.fullName || data.reporter.name);
        } else if (data.reporterEmail) {
          setReporterName(data.reporterEmail);
        } else if (data.createdBy && typeof data.createdBy === 'object') {
          setReporterName(data.createdBy.fullName || data.createdBy.name);
        } else if (data.createdBy && typeof data.createdBy === 'string') {
          setReporterName(data.createdBy);
        } else if (data.reporterId) {
          try {
            const reporter = await userService.getUserById(data.reporterId);
            setReporterName(reporter?.fullName || reporter?.name || `User ${data.reporterId}`);
          } catch {
            setReporterName(`User ${data.reporterId}`);
          }
        } else {
          setReporterName('Unknown Reporter');
        }
      } finally {
        setReporterLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to load incident');
    }
  }, [incidentId, getIncidentById]);

  const silentRefresh = useCallback(async () => {
    if (!incidentId || !getIncidentById) return;
    try {
      const data = await getIncidentById(incidentId);
      if (data && data.incidentId) {
        setIncident(prev =>
          !prev || JSON.stringify(prev) !== JSON.stringify(data) ? data : prev
        );
      }
    } catch (err) {
      console.debug('Silent refresh failed:', err);
    }
  }, [incidentId, getIncidentById]);

  // Map effect with stability fixes
  useEffect(() => {
    if (activeTab === 'map' && mapContainerRef.current && incident?.location) {
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapContainerRef.current, {
          zoomControl: true,
          doubleClickZoom: true,
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(mapInstanceRef.current);
      }

      // Remove existing markers and routing control
      mapInstanceRef.current.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.Routing.Control) {
          mapInstanceRef.current.removeLayer(layer);
        }
      });

      const { latitude, longitude } = incident.location;
      const marker = L.marker([latitude, longitude]).addTo(mapInstanceRef.current);
      const locationName = incident.location?.name || 'Unknown Location';
      const popupContent = `
        <div class="map-popup">
          <h3>Incident Location</h3>
          <p><strong>Location:</strong> ${locationName}</p>
          <p><strong>Coordinates:</strong> ${latitude.toFixed(6)}, ${longitude.toFixed(6)}</p>
        </div>
      `;
      marker.bindPopup(popupContent);
      mapInstanceRef.current.setView([latitude, longitude], 15);

      // Add routing from server location to incident location
      const serverLocation = [6.6745, -1.5713]; // Replace with actual server location from backend if available
      routingControlRef.current = L.Routing.control({
        waypoints: [
          L.latLng(serverLocation[0], serverLocation[1]),
          L.latLng(latitude, longitude),
        ],
        routeWhileDragging: false,
        showAlternatives: false,
        lineOptions: {
          styles: [{ color: '#007bff', weight: 4 }],
        },
        createMarker: (i, waypoint, n) => {
          const marker = L.marker(waypoint.latLng);
          if (i === 0) {
            marker.bindPopup('Server Location').openPopup();
          }
          return marker;
        },
      }).addTo(mapInstanceRef.current);

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
    }
  }, [activeTab, incident]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (routingControlRef.current) {
        routingControlRef.current = null;
      }
    };
  }, []);
  
  
  
  
  useEffect(() => {
    fetchIncident();
    refreshIntervalRef.current = setInterval(() => silentRefresh(), 30000);
    return () => clearInterval(refreshIntervalRef.current);
  }, [fetchIncident, silentRefresh]);

  if (error) {
    return <div className="error-message">Error: {error} <button onClick={fetchIncident}>Retry</button></div>;
  }
  if (!incident) {
    return <div className="loading-message">Loading... <button onClick={fetchIncident}>Retry</button></div>;
  }

  return (
    <div className="incident-detail">
      <div className="incident-header">
        <Link to="/incidents">← Back</Link>
        <h2>Incident #{incident.incidentId}</h2>
      </div>

      <div className="tabs">
        {['details', 'media', 'map', 'analysis', ...(isAdmin ? ['admin'] : [])].map((tab) => (
          <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'details' && (
          <div>
            <p><strong>Reporter:</strong> {reporterLoading ? 'Loading...' : reporterName}</p>
            <p><strong>Type:</strong> {incident.incidentType}</p>
            <p><strong>Location:</strong> <LocationName incident={incident} /></p>
            <p><strong>Status:</strong> {incident.status}</p>
            <p><strong>Severity:</strong> {incident.severityLevel}</p>
            <p><strong>Department:</strong> {incident.assignedTo || 'Unassigned'}</p>
            <p><strong>Description:</strong> {incident.description}</p>
            <p><strong>Created At:</strong> {formatDate(incident.createdAt)}</p>
          </div>
        )}

        {activeTab === 'media' && (
          <div className="media-section">
            <div className="media-header">
              <h3>Media Files ({stableAttachments.length})</h3>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setSelectedMedia(null)}>
                <i className="material-icons">grid_view</i> Grid View
              </button>
            </div>
            {stableAttachments.length > 0 ? (
              <div className="media-gallery">
                {stableAttachments.map((file) => (
                  <MediaItem key={file.key} file={file} incidentId={incident.incidentId} onSelect={(m) => setSelectedMedia(m)} />
                ))}
              </div>
            ) : <div className="no-media"><i className="material-icons">photo_library</i><p>No media files available</p></div>}
          </div>
        )}

        {activeTab === 'map' && (
          <div className="map-section">
            <div
              ref={mapContainerRef}
              className="map-container"
              style={{ height: "400px", width: "100%" }}
            >
              {mapLoading && <div className="map-loading-overlay"><p>Loading map...</p></div>}
              {!incident?.location && <div className="map-placeholder"><p>No location data available</p></div>}
            </div>
          </div>
        )}

        {activeTab === 'analysis' && <IncidentAnalysis incident={incident} />}
        {activeTab === 'admin' && isAdmin && (
          <IncidentAdminPanel
            incident={incident}
            updateIncident={updateIncident}
            sendNotification={sendNotification}
            refreshIncident={fetchIncident}
            addResponse={addResponse}
            assignIncident={assignIncident}
            currentUser={user}
          />
        )}
      </div>
    </div>
  );
};

export default IncidentDetail;
