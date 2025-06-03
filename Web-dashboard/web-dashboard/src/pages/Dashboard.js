import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useIncidents } from '../contexts/IncidentContext';
import { formatDate, calculateDistance, getIncidentStatusColor } from '../utils/helpers';
import { useMap } from '../hooks/useCustomHooks';
import '../styles/dashboard.css';

/**
 * Dashboard component - main overview page for security personnel
 */
const Dashboard = () => {
  const { 
    incidents, 
    incidentStats,
    isLoading, 
    error, 
    fetchIncidents,
    fetchIncidentStats
  } = useIncidents();
  const [mapMarkers, setMapMarkers] = useState([]);
  
  // Initialize map
  const { map, resizeMap } = useMap('dashboard-map', mapMarkers, { zoom: 12 });
  
  // Fetch incident data
  useEffect(() => {
    fetchIncidents({ limit: 10, sort: 'timestamp,desc' });
    fetchIncidentStats();
  }, [fetchIncidents, fetchIncidentStats]);
  
  // Update map markers when incidents change
  useEffect(() => {
    if (incidents && incidents.length > 0) {
      // Create markers from incidents
      const markers = incidents
        .filter(incident => incident.location?.latitude && incident.location?.longitude)
        .map(incident => ({
          lat: incident.location.latitude,
          lng: incident.location.longitude,
          popup: `
            <div class="map-popup">
              <h3>${incident.type}</h3>
              <p><strong>Status:</strong> ${incident.status}</p>
              <p><strong>Priority:</strong> ${incident.priority}</p>
              <p><strong>Reported:</strong> ${formatDate(incident.timestamp)}</p>
              <a href="/incidents/${incident.id}" class="map-popup-link">View Details</a>
            </div>
          `,
          className: `priority-${incident.priority.toLowerCase()}`,
          icon: getIconForIncidentType(incident.type)
        }));
      
      setMapMarkers(markers);
    }
  }, [incidents]);
  
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
  
  // Handle window resize for map
  useEffect(() => {
    const handleResize = () => resizeMap();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [resizeMap]);
  
  // If loading, show loading state
  if (isLoading && !incidents.length) {
    return (
      <div className="dashboard loading">
        <div className="spinner">
          <div className="spinner-border" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }
  
  // If error, show error state
  if (error) {
    return (
      <div className="dashboard error">
        <div className="alert alert-danger" role="alert">
          <i className="material-icons">error</i>
          <span>Error loading dashboard: {error}</span>
        </div>
        <button className="btn btn-primary" onClick={() => {
          fetchIncidents({ limit: 10, sort: 'timestamp,desc' });
          fetchIncidentStats();
        }}>
          <i className="material-icons">refresh</i>
          <span>Retry</span>
        </button>
      </div>
    );
  }
  
  return (
    <div className="dashboard">
      <h1 className="page-title">Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="stats-cards">
        <div className="stats-card stats-card-new">
          <div className="stats-card-icon">
            <i className="material-icons">fiber_new</i>
          </div>
          <div className="stats-card-content">
            <h3 className="stats-card-value">{incidentStats?.new || 0}</h3>
            <p className="stats-card-label">New Incidents</p>
          </div>
        </div>
        
        <div className="stats-card stats-card-inprogress">
          <div className="stats-card-icon">
            <i className="material-icons">pending_actions</i>
          </div>
          <div className="stats-card-content">
            <h3 className="stats-card-value">{incidentStats?.inProgress || 0}</h3>
            <p className="stats-card-label">In Progress</p>
          </div>
        </div>
        
        <div className="stats-card stats-card-resolved">
          <div className="stats-card-icon">
            <i className="material-icons">task_alt</i>
          </div>
          <div className="stats-card-content">
            <h3 className="stats-card-value">{incidentStats?.resolved || 0}</h3>
            <p className="stats-card-label">Resolved</p>
          </div>
        </div>
        
        <div className="stats-card stats-card-highpriority">
          <div className="stats-card-icon">
            <i className="material-icons">priority_high</i>
          </div>
          <div className="stats-card-content">
            <h3 className="stats-card-value">{incidentStats?.highPriority || 0}</h3>
            <p className="stats-card-label">High Priority</p>
          </div>
        </div>
      </div>
      
      <div className="dashboard-content">
        {/* Left Column - Recent Incidents */}
        <div className="dashboard-column">
          <div className="dashboard-card recent-incidents">
            <div className="dashboard-card-header">
              <h2 className="dashboard-card-title">
                <i className="material-icons">access_time</i>
                Recent Incidents
              </h2>
              <Link to="/incidents" className="view-all-link">
                View All <i className="material-icons">chevron_right</i>
              </Link>
            </div>
            
            <div className="dashboard-card-body">
              {incidents.length > 0 ? (
                <div className="incident-list">
                  {incidents.map(incident => (
                    <Link to={`/incidents/${incident.id}`} key={incident.id} className="incident-list-item">
                      <div className={`incident-status ${incident.status.toLowerCase()}`}>
                        <span className="status-dot" style={{ backgroundColor: getIncidentStatusColor(incident.status) }}></span>
                        <span className="status-text">{incident.status}</span>
                      </div>
                      
                      <div className="incident-info">
                        <h3 className="incident-title">
                          <span className={`incident-priority priority-${incident.priority.toLowerCase()}`}>
                            {incident.priority}
                          </span>
                          <span className="incident-type">{incident.type}</span>
                        </h3>
                        
                        <p className="incident-location">
                          <i className="material-icons">location_on</i>
                          <span>{incident.location?.name || 'Unknown location'}</span>
                        </p>
                        
                        <p className="incident-time">
                          <i className="material-icons">schedule</i>
                          <span>{formatDate(incident.timestamp)}</span>
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
        
        {/* Right Column - Map */}
        <div className="dashboard-column">
          <div className="dashboard-card incident-map">
            <div className="dashboard-card-header">
              <h2 className="dashboard-card-title">
                <i className="material-icons">map</i>
                Incident Map
              </h2>
            </div>
            
            <div className="dashboard-card-body">
              {/* Map container */}
              <div id="dashboard-map" className="map-container"></div>
              
              {/* Map Legend */}
              <div className="map-legend">
                <div className="map-legend-item">
                  <span className="map-legend-dot priority-high"></span>
                  <span className="map-legend-text">High Priority</span>
                </div>
                <div className="map-legend-item">
                  <span className="map-legend-dot priority-medium"></span>
                  <span className="map-legend-text">Medium Priority</span>
                </div>
                <div className="map-legend-item">
                  <span className="map-legend-dot priority-low"></span>
                  <span className="map-legend-text">Low Priority</span>
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