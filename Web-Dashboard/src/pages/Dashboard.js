import React, { useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useIncidents } from '../contexts/IncidentContext';
import { formatDate, getIncidentStatusColor } from '../utils/helpers';
import LocationName from '../components/LocationName';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/dashboard.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const Dashboard = () => {
  const { incidents = [], fetchIncidents } = useIncidents();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const openPopupIncidentIdRef = useRef(null);
  const hasFitBoundsRef = useRef(false);

  const sortIncidentsByPriority = useCallback((incidents) => {
    if (!incidents || !Array.isArray(incidents)) return incidents;

    return [...incidents].sort((a, b) => {
      const statusPriority = {
        'NEW': 1,
        'OPEN': 2,
        'IN_PROGRESS': 3,
        'REVIEWING': 4,
        'RESOLVED': 5,
        'CLOSED': 6,
        'CANCELLED': 7
      };

      const aPriority = statusPriority[a.status] || 999;
      const bPriority = statusPriority[b.status] || 999;

      if (aPriority === bPriority) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }

      return aPriority - bPriority;
    });
  }, []);

  const calculateIncidentCounts = useCallback((incidents) => {
    if (!incidents || !Array.isArray(incidents)) return {};

    const counts = {
      new: 0,
      inProgress: 0,
      resolved: 0,
      total: incidents.length,
      highPriority: 0
    };

    incidents.forEach(incident => {
      const status = (incident.status || '').toLowerCase();
      const priority = (incident.priority || 'low').toLowerCase();

      if (status === 'new' || status === 'open') {
        counts.new++;
      } else if (status === 'in_progress' || status === 'inprogress') {
        counts.inProgress++;
      } else if (status === 'resolved' || status === 'closed') {
        counts.resolved++;
      }

      if (priority === 'high') {
        counts.highPriority++;
      }
    });

    return counts;
  }, []);

  useEffect(() => {
    if (!mapInstance.current && mapRef.current) {
      mapInstance.current = L.map(mapRef.current, {
        center: [6.6745, -1.5713],
        zoom: 12,
        zoomControl: false,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true,
        boxZoom: true,
        closePopupOnClick: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(mapInstance.current);

      L.control.zoom({ position: 'topright' }).addTo(mapInstance.current);
      // Ensure scroll wheel zoom is enabled explicitly
      mapInstance.current.scrollWheelZoom.enable();
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (
      !mapRef.current ||
      !mapInstance.current ||
      !mapInstance.current._container ||
      !Array.isArray(incidents)
    ) {
      return;
    }

    markersRef.current.forEach(marker => mapInstance.current.removeLayer(marker));
    markersRef.current = [];

    const bounds = [];

    incidents.forEach(incident => {
      const lat = incident.location?.latitude;
      const lng = incident.location?.longitude;
      const priority = (incident.priority || 'low').toLowerCase();
      const type = (incident.incidentType || '').toLowerCase();

      if (lat && lng) {
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: `priority-marker priority-${priority}`,
            html: `<span class="material-icons">${getIconForIncidentType(type)}</span>`,
            iconSize: [32, 32]
          })
        })
          .addTo(mapInstance.current)
          .bindPopup(`
            <div class="map-popup">
              <h3>${incident.incidentType || 'Unknown Type'}</h3>
              <p><strong>Location:</strong> <span class="js-loc-${incident.incidentId}">Resolving…</span></p>
              <p><strong>Status:</strong> ${incident.status || 'Unknown'}</p>
              <p><strong>Priority:</strong> ${incident.priority || 'Unknown'}</p>
              <p><strong>Reported:</strong> ${formatDate(incident.createdAt)}</p>
              <a href="/incidents/${incident.incidentId}" class="map-popup-link">View Details</a>
             </div>
           `, { autoClose: false, closeOnClick: false, closeButton: true, keepInView: true, maxWidth: 280 });

        // Resolve place name and nearest landmark after popup creation
        (async () => {
          try {
            const { reverseGeocodeDetails, getCachedPlaceName } = await import('../services/geocoding');
            const cached = getCachedPlaceName(lat, lng);
            let name = cached;
            let landmark = null;
            if (!name) {
              const details = await reverseGeocodeDetails(lat, lng);
              name = details?.label || null;
              landmark = details?.landmark || null;
            }
            if (name || landmark) {
              const elems = document.getElementsByClassName(`js-loc-${incident.incidentId}`);
              if (elems && elems.length) {
              Array.from(elems).forEach((el) => (el.textContent = landmark ? `${name || ''}${name ? ' — ' : ''}${landmark}` : (name || el.textContent)));
              }
            }
          } catch (_) {
            // ignore
          }
        })();

        // Track and restore open popup across refreshes
        marker.on('popupopen', () => {
          openPopupIncidentIdRef.current = incident.incidentId;
        });
        marker.on('popupclose', () => {
          // Keep the last opened id so we can restore on next render if needed
          // But if the user explicitly closed it via button, we clear it
          openPopupIncidentIdRef.current = null;
        });

        // If this popup was open before refresh, reopen it
        if (openPopupIncidentIdRef.current && openPopupIncidentIdRef.current === incident.incidentId) {
          setTimeout(() => {
            try { marker.openPopup(); } catch (_) { /* noop */ }
          }, 0);
        }

        markersRef.current.push(marker);
        bounds.push([lat, lng]);
      }
    });

    if (bounds.length > 0 && !hasFitBoundsRef.current) {
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
      hasFitBoundsRef.current = true;
    }
  }, [incidents]);

  useEffect(() => {
    const handleResize = () => {
      if (mapInstance.current) {
        setTimeout(() => mapInstance.current.invalidateSize(), 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getIconForIncidentType = (type) => {
    switch ((type || '').toLowerCase()) {
      case 'fire':
      case 'fire alarm':
        return 'local_fire_department';
      case 'suspicious person':
        return 'person';
      case 'theft':
        return 'money_off';
      case 'medical':
        return 'medical_services';
      case 'assault':
        return 'crisis_alert';
      case 'vandalism':
        return 'gavel';
      default:
        return 'report_problem';
    }
  };

  // Initial silent fetch and periodic silent refresh every 10 minutes
  useEffect(() => {
    const silentFetch = async () => {
      try {
        await fetchIncidents({ limit: 10, sort: 'createdAt,desc' });
      } catch (_) {
        // Swallow errors to keep the dashboard uninterrupted
      }
    };

    // Initial fetch
    silentFetch();

    // Interval refresh (600000 ms = 10 minutes)
    const timer = setInterval(silentFetch, 600000);
    return () => clearInterval(timer);
  }, [fetchIncidents]);

  return (
    <div className="dashboard">
      <h1 className="page-title">Dashboard</h1>

      <div className="stats-cards">
        <div className="stats-card stats-card-total">
          <div className="stats-card-icon"><span className="material-icons">assessment</span></div>
          <div className="stats-card-content">
            <h3 className="stats-card-value">{calculateIncidentCounts(incidents).total || 0}</h3>
            <p className="stats-card-label">Total Incidents</p>
          </div>
        </div>

        <div className="stats-card stats-card-new">
          <div className="stats-card-icon"><span className="material-icons">fiber_new</span></div>
          <div className="stats-card-content">
            <h3 className="stats-card-value">{calculateIncidentCounts(incidents).new || 0}</h3>
            <p className="stats-card-label">New Incidents</p>
          </div>
        </div>

        <div className="stats-card stats-card-inprogress">
          <div className="stats-card-icon"><span className="material-icons">pending</span></div>
          <div className="stats-card-content">
            <h3 className="stats-card-value">{calculateIncidentCounts(incidents).inProgress || 0}</h3>
            <p className="stats-card-label">In Progress</p>
          </div>
        </div>

        <div className="stats-card stats-card-resolved">
          <div className="stats-card-icon"><span className="material-icons" style={{ color: 'green' }}>task_alt</span></div>
          <div className="stats-card-content">
            <h3 className="stats-card-value">{calculateIncidentCounts(incidents).resolved || 0}</h3>
            <p className="stats-card-label">Resolved</p>
          </div>
        </div>

        <div className="stats-card stats-card-highpriority">
          <div className="stats-card-icon"><span className="material-icons">high_priority</span></div>
          <div className="stats-card-content">
            <h3 className="stats-card-value">{calculateIncidentCounts(incidents).highPriority || 0}</h3>
            <p className="stats-card-label">High Priority</p>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-column">
          <div className="dashboard-card recent-incidents">
            <div className="dashboard-card-header">
              <h2 className="dashboard-card-title">
                <i className="material-icons">access_time</i> Recent Incidents
              </h2>
              <Link to="/incidents" className="view-all-link">View All <i className="material-icons">chevron_right</i></Link>
            </div>

            <div className="dashboard-card-body">
              {incidents.length > 0 ? (
                <div className="incident-list">
                  {sortIncidentsByPriority(incidents).map(incident => (
                    <Link 
                      to={`/incidents/${incident.incidentId}`} 
                      key={incident.incidentId} 
                      className={`incident-list-item ${['NEW', 'OPEN'].includes(incident.status) ? 'new-incident' : ''}`}
                    >
                      <div className={`incident-status ${(incident.status || 'unknown').toLowerCase()}`}>
                        <span className="status-dot" style={{ backgroundColor: getIncidentStatusColor(incident.status) }}></span>
                        <span className="status-text">{incident.status}</span>
                      </div>

                      <div className="incident-info">
                        <h3 className="incident-title">
                          <span className={`incident-priority priority-${(incident.priority || 'low').toLowerCase()}`}>{incident.priority}</span>
                          <span className="incident-type">{incident.incidentType}</span>
                        </h3>
                        <p className="incident-location">
                          <i className="material-icons">location_on</i>
                          <span><LocationName incident={incident} /></span>
                        </p>
                        <p className="incident-time">
                          <i className="material-icons">schedule</i>
                          <span>{formatDate(incident.createdAt)}</span>
                        </p>
                      </div>

                      <div className="incident-action">
                        <i className="material-icons">chevron_right</i>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="no-incidents">
                  <i className="material-icons">info</i>
                  <p>No recent incidents</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-column">
          <div className="dashboard-card incident-map">
            <div className="dashboard-card-header">
              <h2 className="dashboard-card-title"><i className="material-icons">map</i> Incident Map</h2>
            </div>

            <div className="dashboard-card-body">
              <div ref={mapRef} className="map-container" style={{ height: '500px', width: '100%' }}></div>
              <div className="map-legend">
                <div className="map-legend-item">
                  <span className="map-legend-dot priority-high"></span><span className="map-legend-text">High Priority</span>
                </div>
                <div className="map-legend-item">
                  <span className="map-legend-dot priority-medium"></span><span className="map-legend-text">Medium Priority</span>
                </div>
                <div className="map-legend-item">
                  <span className="map-legend-dot priority-low"></span><span className="map-legend-text">Low Priority</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;