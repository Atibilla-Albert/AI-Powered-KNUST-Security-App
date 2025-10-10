// IncidentMap.js (fixed version)
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useIncidents } from '../contexts/IncidentContext';
import { formatDate, getLocationDisplayName } from '../utils/helpers';
import { useMap } from '../hooks/useCustomHooks';
import 'leaflet/dist/leaflet.css';
import '../styles/IncidentMap.css';

const IncidentMap = () => {
  const { incidents, fetchIncidents } = useIncidents();
  const [mapMarkers, setMapMarkers] = useState([]);
  const [filters, setFilters] = useState({ status: '', priority: '', timeframe: '7d' });
  const [selectedIncident, setSelectedIncident] = useState(null);

  const { map, resizeMap } = useMap('incidents-map', mapMarkers, {
    zoom: 15,
    center: [6.6745, -1.5713]
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const now = new Date();
        const fromDate = new Date(now);
        if (filters.timeframe === '24h') fromDate.setDate(now.getDate() - 1);
        else if (filters.timeframe === '7d') fromDate.setDate(now.getDate() - 7);
        else if (filters.timeframe === '30d') fromDate.setDate(now.getDate() - 30);

        const query = {
          ...(filters.timeframe !== 'all' && { dateFrom: fromDate.toISOString() }),
          ...(filters.status && { status: filters.status }),
          ...(filters.priority && { priority: filters.priority }),
          limit: 100
        };

        await fetchIncidents(query);
      } catch (err) {
        console.error('Error fetching incidents:', err);
      }
    };

    fetchData();
  }, [fetchIncidents, filters]);

  const getIconForIncidentType = useCallback((type) => {
    const icons = {
      'fire': 'local_fire_department',
      'fire alarm': 'local_fire_department',
      'suspicious person': 'person',
      'theft': 'money_off',
      'medical': 'medical_services',
      'assault': 'crisis_alert',
      'vandalism': 'gavel'
    };
    return icons[(type || 'other').toLowerCase()] || 'report_problem';
  }, []);

  const createMapMarkers = useCallback((data) => {
    return (data || [])
      .filter(i => i.location?.latitude && i.location?.longitude)
      .map(i => ({
        id: i.incidentId || i.id,
        lat: i.location.latitude,
        lng: i.location.longitude,
        popup: `
          <div class="map-popup">
            <h3>${i.incidentType || i.type || 'Unknown Type'}</h3>
            <p><strong>Location:</strong> ${i.location?.name || 'Unknown Location'}</p>
            <p><strong>Status:</strong> ${i.status || 'Unknown'}</p>
            <p><strong>Priority:</strong> ${i.priority || 'Unknown'}</p>
            <p><strong>Reported:</strong> ${formatDate(i.createdAt || i.timestamp)}</p>
            <a href="/incidents/${i.incidentId || i.id}" class="map-popup-link">View Details</a>
          </div>
        `,
        className: `priority-${(i.priority || 'low').toLowerCase()}`,
        icon: getIconForIncidentType(i.incidentType || i.type)
      }));
  }, [getIconForIncidentType]);

  useEffect(() => {
    setMapMarkers(createMapMarkers(incidents));
  }, [incidents, createMapMarkers]);

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleMarkerClick = useCallback((id) => {
    const incident = incidents?.find(i => (i.incidentId || i.id) === id);
    if (incident) setSelectedIncident(incident);
  }, [incidents]);

  useEffect(() => {
    if (!map) return;

    const handler = (e) => {
      document.querySelectorAll('.map-popup-link').forEach(link => {
        link.addEventListener('click', evt => {
          evt.preventDefault();
          const id = link.getAttribute('data-incident-id');
          handleMarkerClick(id);
        });
      });
    };

    map.on('popupopen', handler);
    return () => map.off('popupopen', handler);
  }, [map, handleMarkerClick]);

  useEffect(() => {
    const handleResize = () => resizeMap && resizeMap();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [resizeMap]);

  return (
    <div className="incident-map-page">
      {/* Filter + Map UI omitted for brevity */}
      <div id="incidents-map" className="incidents-map"></div>
      {/* Selected Incident Panel */}
      {selectedIncident && (
        <div className="selected-incident-panel">
          <h3>{selectedIncident.incidentType || selectedIncident.type}</h3>
          <p><strong>Status:</strong> {selectedIncident.status}</p>
          <p><strong>Priority:</strong> {selectedIncident.priority}</p>
          <p><strong>Location:</strong> {getLocationDisplayName(selectedIncident)}</p>
          <p><strong>Reported:</strong> {formatDate(selectedIncident.createdAt || selectedIncident.timestamp)}</p>
          <Link to={`/incidents/${selectedIncident.incidentId || selectedIncident.id}`} className="btn btn-primary">
            View Full Details
          </Link>
        </div>
      )}
    </div>
  );
};

export default IncidentMap;
