import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useIncidents } from '../contexts/IncidentContext';
import { formatDate, getIncidentPriorityColor } from '../utils/helpers';
import { useMap } from '../hooks/useCustomHooks';
import '../styles/IncidentMap.css';

/**
 * IncidentMap component for visualizing incidents on a map
 */
const IncidentMap = () => {
  const { incidents, isLoading, error, fetchIncidents } = useIncidents();
  const [mapMarkers, setMapMarkers] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    timeframe: '7d' // 24h, 7d, 30d, all
  });
  const [selectedIncident, setSelectedIncident] = useState(null);
  
  // Initialize map
  const { map, resizeMap } = useMap('incidents-map', mapMarkers, {
  zoom: 15,
  center: [6.6745, -1.5713], // KNUST coordinates
});

  // Fetch incident data
  useEffect(() => {
    // Calculate date filter based on timeframe
    const getDateFilter = () => {
      if (filters.timeframe === 'all') return {};
      
      const now = new Date();
      let fromDate = new Date(now);
      
      switch (filters.timeframe) {
        case '24h':
          fromDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          fromDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          fromDate.setDate(now.getDate() - 30);
          break;
        default:
          fromDate.setDate(now.getDate() - 7);
      }
      
      return { dateFrom: fromDate.toISOString() };
    };
    
    // Create query object
    const query = {
      ...getDateFilter(),
      limit: 100 // Get more incidents for map view
    };
    
    // Add status and priority filters if set
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    
    fetchIncidents(query);
  }, [fetchIncidents, filters]);
  
  // Update map markers when incidents change
  useEffect(() => {
    if (incidents && incidents.length > 0) {
      // Create markers from incidents with valid coordinates
      const markers = incidents
        .filter(incident => incident.location?.latitude && incident.location?.longitude)
        .map(incident => ({
          id: incident.id,
          lat: incident.location.latitude,
          lng: incident.location.longitude,
          popup: `
            <div class="map-popup">
              <h3>${incident.type}</h3>
              <p><strong>Status:</strong> ${incident.status}</p>
              <p><strong>Priority:</strong> ${incident.priority}</p>
              <p><strong>Reported:</strong> ${formatDate(incident.timestamp)}</p>
              <a href="#" data-incident-id="${incident.id}" class="map-popup-link">View Details</a>
            </div>
          `,
          className: `priority-${incident.priority.toLowerCase()}`,
          icon: getIconForIncidentType(incident.type)
        }));
      
      setMapMarkers(markers);
    }
  }, [incidents]);
  
  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  // Get icon based on incident type
  const getIconForIncidentType = (type) => {
    switch (type.toLowerCase()) {
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
  
  // Handle marker click to show incident details
  const handleMarkerClick = useCallback((incidentId) => {
    const incident = incidents.find(inc => inc.id === incidentId);
    setSelectedIncident(incident);
  }, [incidents]);
  
  // Add event listener for map popup links
  useEffect(() => {
    if (map) {
      // Listen for clicks on popup links
      map.on('popupopen', (e) => {
        const links = document.querySelectorAll('.map-popup-link');
        links.forEach(link => {
          link.addEventListener('click', (event) => {
            event.preventDefault();
            const incidentId = link.getAttribute('data-incident-id');
            handleMarkerClick(incidentId);
          });
        });
      });
    }
  }, [map, handleMarkerClick]);
  
  // Close incident details panel
  const closeIncidentDetails = () => {
    setSelectedIncident(null);
  };
  
  // Handle window resize for map
  useEffect(() => {
    const handleResize = () => resizeMap();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [resizeMap]);
  
  return (
    <div className="incident-map-page">
      <div className="incident-map-header">
        <h1 className="page-title">Incident Map</h1>
        <div className="incident-map-actions">
          <Link to="/incidents" className="btn btn-secondary">
            <i className="material-icons">list</i>
            <span>List View</span>
          </Link>
        </div>
      </div>
      
      <div className="incident-map-container">
        {/* Map Filters */}
        <div className="map-filters">
          <div className="filter-group">
            <label htmlFor="timeframe">Time Period</label>
            <select
              id="timeframe"
              name="timeframe"
              value={filters.timeframe}
              onChange={handleFilterChange}
              className="form-control"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="form-control"
            >
              <option value="">All Statuses</option>
              <option value="New">New</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="On Hold">On Hold</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              name="priority"
              value={filters.priority}
              onChange={handleFilterChange}
              className="form-control"
            >
              <option value="">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
        
        <div className="map-container-wrapper">
          {/* Map Container */}
          {isLoading && !incidents.length ? (
            <div className="map-loading">
              <div className="spinner-border" role="status">
                <span className="sr-only">Loading...</span>
              </div>
              <p>Loading incident data...</p>
            </div>
          ) : error ? (
            <div className="map-error">
              <div className="alert alert-danger" role="alert">
                <i className="material-icons">error</i>
                <span>Error loading incidents: {error}</span>
              </div>
              <button className="btn btn-primary" onClick={() => fetchIncidents()}>
                <i className="material-icons">refresh</i>
                <span>Retry</span>
              </button>
            </div>
          ) : (
            <div id="incidents-map" className="incidents-map"></div>
          )}
          
          {/* Map Legend */}
          <div className="map-legend">
            <h3 className="legend-title">
              <i className="material-icons">map</i>
              <span>Map Legend</span>
            </h3>
            
            <div className="legend-section">
              <h4 className="legend-subtitle">Priority</h4>
              <div className="legend-items">
                <div className="legend-item">
                  <span className="legend-marker priority-high"></span>
                  <span className="legend-label">High</span>
                </div>
                <div className="legend-item">
                  <span className="legend-marker priority-medium"></span>
                  <span className="legend-label">Medium</span>
                </div>
                <div className="legend-item">
                  <span className="legend-marker priority-low"></span>
                  <span className="legend-label">Low</span>
                </div>
              </div>
            </div>
            
            <div className="legend-section">
              <h4 className="legend-subtitle">Incident Types</h4>
              <div className="legend-items">
                <div className="legend-item">
                  <i className="material-icons">local_fire_department</i>
                  <span className="legend-label">Fire</span>
                </div>
                <div className="legend-item">
                  <i className="material-icons">person</i>
                  <span className="legend-label">Suspicious Person</span>
                </div>
                <div className="legend-item">
                  <i className="material-icons">money_off</i>
                  <span className="legend-label">Theft</span>
                </div>
                <div className="legend-item">
                  <i className="material-icons">medical_services</i>
                  <span className="legend-label">Medical</span>
                </div>
                <div className="legend-item">
                  <i className="material-icons">report_problem</i>
                  <span className="legend-label">Other</span>
                </div>
              </div>
            </div>
            
            <div className="legend-stats">
              <div className="legend-stat">
                <span className="stat-value">{incidents.length}</span>
                <span className="stat-label">Total Incidents</span>
              </div>
              <div className="legend-stat">
                <span className="stat-value">
                  {mapMarkers.length}
                </span>
                <span className="stat-label">On Map</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Selected Incident Details Panel */}
        {selectedIncident && (
          <div className="selected-incident-panel">
            <button className="close-panel" onClick={closeIncidentDetails}>
              <i className="material-icons">close</i>
            </button>
            
            <div className="incident-panel-header">
              <h2 className="incident-panel-title">
                <span className="incident-panel-id">#{selectedIncident.id}</span>
                <span className="incident-panel-type">{selectedIncident.type}</span>
              </h2>
              
              <div className="incident-panel-status">
                <span className={`incident-status status-${selectedIncident.status.toLowerCase()}`}>
                  {selectedIncident.status}
                </span>
                
                <span className={`incident-priority priority-${selectedIncident.priority.toLowerCase()}`}>
                  {selectedIncident.priority} Priority
                </span>
              </div>
            </div>
            
            <div className="incident-panel-content">
              <div className="incident-panel-section">
                <h3 className="panel-section-title">
                  <i className="material-icons">info</i>
                  <span>Incident Details</span>
                </h3>
                
                <div className="panel-info-group">
                  <label className="panel-info-label">Reported</label>
                  <div className="panel-info-value">{formatDate(selectedIncident.timestamp)}</div>
                </div>
                
                <div className="panel-info-group">
                  <label className="panel-info-label">Location</label>
                  <div className="panel-info-value">{selectedIncident.location?.name || 'Unknown'}</div>
                </div>
                
                {selectedIncident.location?.address && (
                  <div className="panel-info-group">
                    <label className="panel-info-label">Address</label>
                    <div className="panel-info-value">{selectedIncident.location.address}</div>
                  </div>
                )}
                
                <div className="panel-info-group">
                  <label className="panel-info-label">Description</label>
                  <div className="panel-info-value description">{selectedIncident.description}</div>
                </div>
              </div>
              
              {selectedIncident.assignedToUser && (
                <div className="incident-panel-section">
                  <h3 className="panel-section-title">
                    <i className="material-icons">person</i>
                    <span>Assignment</span>
                  </h3>
                  
                  <div className="panel-assigned-user">
                    <div className="panel-user-avatar">
                      {selectedIncident.assignedToUser.photoUrl ? (
                        <img src={selectedIncident.assignedToUser.photoUrl} alt={selectedIncident.assignedToUser.name} />
                      ) : (
                        <span className="avatar-initials">
                          {selectedIncident.assignedToUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="panel-user-info">
                      <div className="panel-user-name">{selectedIncident.assignedToUser.name}</div>
                      <div className="panel-user-role">{selectedIncident.assignedToUser.role}</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="incident-panel-actions">
                <Link to={`/incidents/${selectedIncident.id}`} className="btn btn-primary">
                  <i className="material-icons">visibility</i>
                  <span>View Full Details</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncidentMap;