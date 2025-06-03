import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useIncidents } from '../contexts/IncidentContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { useForm, useMap } from '../hooks/useCustomHooks';
import { formatDate, getIncidentStatusColor, getIncidentPriorityColor } from '../utils/helpers';
import { sagemakerService } from '../services/sagemaker';
import { userService } from '../services/users';
import '../styles/IncidentDetails.css';

/**
 * IncidentDetail component for viewing and managing a single incident
 */
const IncidentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getIncident, updateIncident, isLoading, error } = useIncidents();
  const { sendNotification } = useNotifications();
  
  // State
  const [incident, setIncident] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [securityPersonnel, setSecurityPersonnel] = useState([]);
  const [loadingPersonnel, setLoadingPersonnel] = useState(false);
  const [riskAnalysis, setRiskAnalysis] = useState(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  
  // Map
  const [mapMarker, setMapMarker] = useState(null);
  const { map } = useMap('incident-location-map', mapMarker ? [mapMarker] : [], { zoom: 15 });
  
  // Status form
  const { values: statusValues, handleChange: handleStatusChange, handleSubmit: handleStatusSubmit } = 
    useForm({
      status: '',
      notes: '',
    });
  
  // Assignment form
  const { values: assignValues, handleChange: handleAssignChange, handleSubmit: handleAssignSubmit } = 
    useForm({
      assignedTo: '',
      notes: '',
    });
  
  // Response form
  const { values: responseValues, handleChange: handleResponseChange, handleSubmit: handleResponseSubmit, reset: resetResponseForm } = 
    useForm({
      responseType: 'note',
      notes: '',
      attachments: []
    });
  
  // Fetch incident data
  const fetchIncidentData = useCallback(async () => {
    try {
      const incidentData = await getIncident(id);
      setIncident(incidentData);
      
      // Set map marker if location exists
      if (incidentData.location?.latitude && incidentData.location?.longitude) {
        setMapMarker({
          lat: incidentData.location.latitude,
          lng: incidentData.location.longitude,
          popup: `
            <div class="map-popup">
              <h3>${incidentData.location.name || 'Incident Location'}</h3>
              <p>${incidentData.location.address || ''}</p>
            </div>
          `
        });
      }
    } catch (error) {
      console.error('Error fetching incident:', error);
    }
  }, [id, getIncident]);
  
  // Fetch security personnel for assignment
  const fetchSecurityPersonnel = useCallback(async () => {
    try {
      setLoadingPersonnel(true);
      const personnel = await userService.getUsers({ role: 'security' });
      setSecurityPersonnel(personnel);
      setLoadingPersonnel(false);
    } catch (error) {
      console.error('Error fetching security personnel:', error);
      setLoadingPersonnel(false);
    }
  }, []);
  
  // Fetch risk analysis from SageMaker
  const fetchRiskAnalysis = useCallback(async () => {
    if (!incident) return;
    
    try {
      setIsLoadingAnalysis(true);
      setAnalysisError(null);
      
      const analysis = await sagemakerService.analyzeIncident(id);
      setRiskAnalysis(analysis);
      setIsLoadingAnalysis(false);
    } catch (error) {
      console.error('Error fetching risk analysis:', error);
      setAnalysisError(error.message || 'Failed to load risk analysis');
      setIsLoadingAnalysis(false);
    }
  }, [id, incident]);
  
  // Load initial data
  useEffect(() => {
    fetchIncidentData();
    fetchSecurityPersonnel();
  }, [fetchIncidentData, fetchSecurityPersonnel]);
  
  // Handle status update
  const submitStatusUpdate = async (formValues) => {
    try {
      const { status, notes } = formValues;
      
      // Update incident status
      await updateIncident(id, {
        status,
        statusNotes: notes,
        updatedBy: user.id
      });
      
      // Send notification
      await sendNotification({
        title: `Incident ${id} status updated`,
        message: `Incident status changed to ${status}`,
        type: 'status_update',
        incidentId: id
      });
      
      // Refresh incident data
      fetchIncidentData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };
  
  // Handle assignment
  const submitAssignment = async (formValues) => {
    try {
      const { assignedTo, notes } = formValues;
      
      // Update incident assignment
      await updateIncident(id, {
        assignedTo,
        assignmentNotes: notes,
        updatedBy: user.id
      });
      
      // Find assigned user
      const assignedUser = securityPersonnel.find(p => p.id === assignedTo);
      
      // Send notification to the assigned user
      if (assignedUser) {
        await sendNotification({
          title: `Incident ${id} assigned to you`,
          message: `You have been assigned to incident ${id}`,
          type: 'assignment',
          incidentId: id,
          recipient: assignedTo
        });
      }
      
      // Refresh incident data
      fetchIncidentData();
    } catch (error) {
      console.error('Error updating assignment:', error);
    }
  };
  
  // Handle response submission
  const submitResponse = async (formValues) => {
    try {
      const { responseType, notes, attachments } = formValues;
      
      // Create response
      await updateIncident(id, {
        response: {
          type: responseType,
          notes,
          attachments: attachments || [],
          timestamp: new Date().toISOString(),
          userId: user.id
        }
      });
      
      // Reset form
      resetResponseForm();
      
      // Refresh incident data
      fetchIncidentData();
    } catch (error) {
      console.error('Error submitting response:', error);
    }
  };
  
  // Open media modal
  const openMediaModal = (media) => {
    setSelectedMedia(media);
    setShowMediaModal(true);
  };
  
  // Close media modal
  const closeMediaModal = () => {
    setSelectedMedia(null);
    setShowMediaModal(false);
  };
  
  // If loading and no incident data yet, show loading state
  if (isLoading && !incident) {
    return (
      <div className="incident-detail loading">
        <div className="spinner">
          <div className="spinner-border" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p>Loading incident data...</p>
        </div>
      </div>
    );
  }
  
  // If error, show error state
  if (error) {
    return (
      <div className="incident-detail error">
        <div className="alert alert-danger" role="alert">
          <i className="material-icons">error</i>
          <span>Error loading incident: {error}</span>
        </div>
        <div className="error-actions">
          <button className="btn btn-primary" onClick={fetchIncidentData}>
            <i className="material-icons">refresh</i>
            <span>Retry</span>
          </button>
          <Link to="/incidents" className="btn btn-secondary">
            <i className="material-icons">list</i>
            <span>Back to Incidents</span>
          </Link>
        </div>
      </div>
    );
  }
  
  // If no incident data, show not found state
  if (!incident) {
    return (
      <div className="incident-detail not-found">
        <div className="alert alert-warning" role="alert">
          <i className="material-icons">search</i>
          <span>Incident not found</span>
        </div>
        <Link to="/incidents" className="btn btn-primary">
          <i className="material-icons">arrow_back</i>
          <span>Back to Incidents</span>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="incident-detail">
      {/* Header */}
      <div className="incident-header">
        <div className="incident-header-left">
          <Link to="/incidents" className="back-link">
            <i className="material-icons">arrow_back</i>
            <span>Back to Incidents</span>
          </Link>
          
          <h1 className="incident-title">
            <span className="incident-id">Incident #{incident.id}</span>
            <span className="incident-type">{incident.type}</span>
          </h1>
        </div>
        
        <div className="incident-header-right">
          <span className={`incident-status status-${incident.status.toLowerCase()}`}>
            <span className="status-dot" style={{ backgroundColor: getIncidentStatusColor(incident.status) }}></span>
            <span className="status-text">{incident.status}</span>
          </span>
          
          <span className={`incident-priority priority-${incident.priority.toLowerCase()}`}>
            <i className="material-icons">flag</i>
            <span>{incident.priority} Priority</span>
          </span>
        </div>
      </div>
      
      <div className="incident-content">
        {/* Tabs navigation */}
        <div className="incident-tabs">
          <button
            className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <i className="material-icons">info</i>
            <span>Details</span>
          </button>
          
          <button
            className={`tab-button ${activeTab === 'updates' ? 'active' : ''}`}
            onClick={() => setActiveTab('updates')}
          >
            <i className="material-icons">history</i>
            <span>Updates</span>
          </button>
          
          <button
            className={`tab-button ${activeTab === 'media' ? 'active' : ''}`}
            onClick={() => setActiveTab('media')}
          >
            <i className="material-icons">perm_media</i>
            <span>Media</span>
            {incident.media && incident.media.length > 0 && (
              <span className="badge badge-pill">{incident.media.length}</span>
            )}
          </button>
          
          <button
            className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('analysis');
              if (!riskAnalysis && !isLoadingAnalysis && !analysisError) {
                fetchRiskAnalysis();
              }
            }}
          >
            <i className="material-icons">analytics</i>
            <span>Risk Analysis</span>
          </button>
        </div>
        
        {/* Tab content */}
        <div className="incident-tab-content">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="tab-pane details-tab">
              <div className="incident-row">
                {/* Incident Information */}
                <div className="incident-column">
                  <div className="incident-card">
                    <div className="incident-card-header">
                      <h2 className="incident-card-title">
                        <i className="material-icons">description</i>
                        <span>Incident Information</span>
                      </h2>
                    </div>
                    
                    <div className="incident-card-body">
                      <div className="info-group">
                        <label className="info-label">Reported By</label>
                        <div className="info-value">
                          <div className="reporter-info">
                            <div className="reporter-avatar">
                              {incident.reportedBy?.photoUrl ? (
                                <img src={incident.reportedBy.photoUrl} alt={incident.reportedBy.name} />
                              ) : (
                                <span className="avatar-initials">
                                  {incident.reportedBy?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                                </span>
                              )}
                            </div>
                            <div className="reporter-details">
                              <div className="reporter-name">{incident.reportedBy?.name || 'Anonymous'}</div>
                              {incident.reportedBy?.phone && (
                                <div className="reporter-phone">{incident.reportedBy.phone}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="info-group">
                        <label className="info-label">Reported On</label>
                        <div className="info-value">{formatDate(incident.timestamp)}</div>
                      </div>
                      
                      <div className="info-group">
                        <label className="info-label">Description</label>
                        <div className="info-value description">{incident.description}</div>
                      </div>
                      
                      <div className="info-group">
                        <label className="info-label">Type</label>
                        <div className="info-value">{incident.type}</div>
                      </div>
                      
                      <div className="info-group">
                        <label className="info-label">Priority</label>
                        <div className="info-value">
                          <span className={`priority-badge priority-${incident.priority.toLowerCase()}`}>
                            {incident.priority}
                          </span>
                        </div>
                      </div>
                      
                      <div className="info-group">
                        <label className="info-label">Status</label>
                        <div className="info-value">
                          <span className="status-indicator" style={{ backgroundColor: getIncidentStatusColor(incident.status) }}></span>
                          {incident.status}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Location Card */}
                  <div className="incident-card">
                    <div className="incident-card-header">
                      <h2 className="incident-card-title">
                        <i className="material-icons">location_on</i>
                        <span>Location</span>
                      </h2>
                    </div>
                    
                    <div className="incident-card-body">
                      {incident.location ? (
                        <>
                          <div className="info-group">
                            <label className="info-label">Location Name</label>
                            <div className="info-value">{incident.location.name || 'Unnamed Location'}</div>
                          </div>
                          
                          {incident.location.address && (
                            <div className="info-group">
                              <label className="info-label">Address</label>
                              <div className="info-value">{incident.location.address}</div>
                            </div>
                          )}
                          
                          {(incident.location.latitude && incident.location.longitude) && (
                            <div className="location-map-container">
                              <div id="incident-location-map" className="location-map"></div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="no-location">
                          <i className="material-icons">location_off</i>
                          <p>No location information available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Actions Column */}
                <div className="incident-column">
                  {/* Update Status Card */}
                  <div className="incident-card">
                    <div className="incident-card-header">
                      <h2 className="incident-card-title">
                        <i className="material-icons">update</i>
                        <span>Update Status</span>
                      </h2>
                    </div>
                    
                    <div className="incident-card-body">
                      <form onSubmit={(e) => handleStatusSubmit(e, submitStatusUpdate)}>
                        <div className="form-group">
                          <label htmlFor="status">Status</label>
                          <select
                            id="status"
                            name="status"
                            value={statusValues.status}
                            onChange={handleStatusChange}
                            className="form-control"
                            required
                          >
                            <option value="" disabled>Select Status</option>
                            <option value="New">New</option>
                            <option value="Assigned">Assigned</option>
                            <option value="In Progress">In Progress</option>
                            <option value="On Hold">On Hold</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Closed">Closed</option>
                          </select>
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor="statusNotes">Notes</label>
                          <textarea
                            id="statusNotes"
                            name="notes"
                            value={statusValues.notes}
                            onChange={handleStatusChange}
                            className="form-control"
                            rows="3"
                            placeholder="Add notes about this status update"
                          ></textarea>
                        </div>
                        
                        <button type="submit" className="btn btn-primary">
                          <i className="material-icons">save</i>
                          <span>Update Status</span>
                        </button>
                      </form>
                    </div>
                  </div>
                  
                  {/* Assign Incident Card */}
                  <div className="incident-card">
                    <div className="incident-card-header">
                      <h2 className="incident-card-title">
                        <i className="material-icons">person_add</i>
                        <span>Assign Incident</span>
                      </h2>
                    </div>
                    
                    <div className="incident-card-body">
                      <div className="current-assignment">
                        <label>Currently Assigned To:</label>
                        {incident.assignedToUser ? (
                          <div className="assigned-user">
                            <div className="assigned-avatar">
                              {incident.assignedToUser.photoUrl ? (
                                <img src={incident.assignedToUser.photoUrl} alt={incident.assignedToUser.name} />
                              ) : (
                                <span className="avatar-initials">
                                  {incident.assignedToUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="assigned-info">
                              <div className="assigned-name">{incident.assignedToUser.name}</div>
                              {incident.assignedTimestamp && (
                                <div className="assigned-time">
                                  Assigned {formatDate(incident.assignedTimestamp)}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="not-assigned">Not assigned to anyone</div>
                        )}
                      </div>
                      
                      <form onSubmit={(e) => handleAssignSubmit(e, submitAssignment)}>
                        <div className="form-group">
                          <label htmlFor="assignedTo">Assign To</label>
                          {loadingPersonnel ? (
                            <div className="loading-spinner-small"></div>
                          ) : (
                            <select
                              id="assignedTo"
                              name="assignedTo"
                              value={assignValues.assignedTo}
                              onChange={handleAssignChange}
                              className="form-control"
                              required
                            >
                              <option value="" disabled>Select Security Personnel</option>
                              {securityPersonnel.map(person => (
                                <option key={person.id} value={person.id}>
                                  {person.name} ({person.role})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor="assignmentNotes">Notes</label>
                          <textarea
                            id="assignmentNotes"
                            name="notes"
                            value={assignValues.notes}
                            onChange={handleAssignChange}
                            className="form-control"
                            rows="3"
                            placeholder="Add notes about this assignment"
                          ></textarea>
                        </div>
                        
                        <button 
                          type="submit" 
                          className="btn btn-primary"
                          disabled={loadingPersonnel}
                        >
                          <i className="material-icons">assignment_ind</i>
                          <span>Assign Incident</span>
                        </button>
                      </form>
                    </div>
                  </div>
                  
                  {/* Response Card */}
                  <div className="incident-card">
                    <div className="incident-card-header">
                      <h2 className="incident-card-title">
                        <i className="material-icons">comment</i>
                        <span>Add Response</span>
                      </h2>
                    </div>
                    
                    <div className="incident-card-body">
                      <form onSubmit={(e) => handleResponseSubmit(e, submitResponse)}>
                        <div className="form-group">
                          <label htmlFor="responseType">Response Type</label>
                          <select
                            id="responseType"
                            name="responseType"
                            value={responseValues.responseType}
                            onChange={handleResponseChange}
                            className="form-control"
                            required
                          >
                            <option value="note">Note</option>
                            <option value="action">Action Taken</option>
                            <option value="update">Status Update</option>
                            <option value="resolution">Resolution</option>
                          </select>
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor="responseNotes">Notes</label>
                          <textarea
                            id="responseNotes"
                            name="notes"
                            value={responseValues.notes}
                            onChange={handleResponseChange}
                            className="form-control"
                            rows="4"
                            placeholder="Enter your response"
                            required
                          ></textarea>
                        </div>
                        
                        <button type="submit" className="btn btn-primary">
                          <i className="material-icons">send</i>
                          <span>Submit Response</span>
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Updates Tab */}
          {activeTab === 'updates' && (
            <div className="tab-pane updates-tab">
              <div className="incident-timeline">
                {incident.updates && incident.updates.length > 0 ? (
                  <div className="timeline">
                    {[...incident.updates].reverse().map((update, index) => (
                      <div key={index} className={`timeline-item ${update.type}`}>
                        <div className="timeline-icon">
                          <i className="material-icons">
                            {update.type === 'status' ? 'update' : 
                             update.type === 'assignment' ? 'person_add' :
                             update.type === 'response' ? 'comment' : 'event_note'}
                          </i>
                        </div>
                        
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <h3 className="timeline-title">
                              {update.type === 'status' ? `Status changed to ${update.data.status}` :
                               update.type === 'assignment' ? `Assigned to ${update.data.assignedToName}` :
                               update.type === 'response' ? `${update.data.responseType}` :
                               'Update'}
                            </h3>
                            <span className="timeline-time">{formatDate(update.timestamp)}</span>
                          </div>
                          
                          {update.data.notes && (
                            <div className="timeline-notes">{update.data.notes}</div>
                          )}
                          
                          <div className="timeline-user">
                            <div className="timeline-user-avatar">
                              {update.user?.photoUrl ? (
                                <img src={update.user.photoUrl} alt={update.user.name} />
                              ) : (
                                <span className="avatar-initials">
                                  {update.user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                                </span>
                              )}
                            </div>
                            <span className="timeline-user-name">
                              {update.user?.name || 'Unknown User'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Initial incident report */}
                    <div className="timeline-item creation">
                      <div className="timeline-icon">
                        <i className="material-icons">fiber_new</i>
                      </div>
                      
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <h3 className="timeline-title">Incident Reported</h3>
                          <span className="timeline-time">{formatDate(incident.timestamp)}</span>
                        </div>
                        
                        <div className="timeline-notes">{incident.description}</div>
                        
                        <div className="timeline-user">
                          <div className="timeline-user-avatar">
                            {incident.reportedBy?.photoUrl ? (
                              <img src={incident.reportedBy.photoUrl} alt={incident.reportedBy.name} />
                            ) : (
                              <span className="avatar-initials">
                                {incident.reportedBy?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                              </span>
                            )}
                          </div>
                          <span className="timeline-user-name">
                            {incident.reportedBy?.name || 'Anonymous'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="no-updates">
                    <i className="material-icons">info</i>
                    <p>No updates available for this incident</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Media Tab */}
          {activeTab === 'media' && (
            <div className="tab-pane media-tab">
              {incident.media && incident.media.length > 0 ? (
                <div className="media-gallery">
                  {incident.media.map((media, index) => (
                    <div key={index} className="media-item" onClick={() => openMediaModal(media)}>
                      {media.type.startsWith('image/') ? (
                        <img src={media.url} alt={media.caption || `Media ${index + 1}`} />
                      ) : media.type.startsWith('video/') ? (
                        <div className="video-thumbnail">
                          <i className="material-icons">play_circle</i>
                          <img src={media.thumbnailUrl || media.url} alt={media.caption || `Video ${index + 1}`} />
                        </div>
                      ) : (
                        <div className="document-thumbnail">
                          <i className="material-icons">description</i>
                          <span>{media.filename || `Document ${index + 1}`}</span>
                        </div>
                      )}
                      
                      <div className="media-info">
                        <span className="media-caption">{media.caption || `Media ${index + 1}`}</span>
                        <span className="media-time">{formatDate(media.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-media">
                  <i className="material-icons">no_photography</i>
                  <p>No media files attached to this incident</p>
                </div>
              )}
            </div>
          )}
          
          {/* Analysis Tab */}
          {activeTab === 'analysis' && (
            <div className="tab-pane analysis-tab">
              {isLoadingAnalysis ? (
                <div className="analysis-loading">
                  <div className="spinner">
                    <div className="spinner-border" role="status">
                      <span className="sr-only">Loading...</span>
                    </div>
                    <p>Analyzing incident data via SageMaker...</p>
                  </div>
                </div>
              ) : analysisError ? (
                <div className="analysis-error">
                  <div className="alert alert-danger" role="alert">
                    <i className="material-icons">error</i>
                    <span>Error loading analysis: {analysisError}</span>
                  </div>
                  <button className="btn btn-primary" onClick={fetchRiskAnalysis}>
                    <i className="material-icons">refresh</i>
                    <span>Retry Analysis</span>
                  </button>
                </div>
              ) : riskAnalysis ? (
                <div className="analysis-content">
                  <div className="analysis-section risk-score">
                    <h3 className="analysis-title">
                      <i className="material-icons">assessment</i>
                      <span>Risk Assessment</span>
                    </h3>
                    
                    <div className="risk-gauge">
                      <div className="risk-meter" style={{ 
                        '--risk-percentage': `${riskAnalysis.riskScore}%`,
                        '--risk-color': riskAnalysis.riskScore > 70 ? 'var(--danger)' :
                                        riskAnalysis.riskScore > 40 ? 'var(--warning)' :
                                        'var(--success)'
                      }}>
                        <div className="risk-needle"></div>
                        <div className="risk-value">{riskAnalysis.riskScore}%</div>
                      </div>
                      
                      <div className="risk-label">
                        <span className={`risk-level ${
                          riskAnalysis.riskScore > 70 ? 'high' :
                          riskAnalysis.riskScore > 40 ? 'medium' :
                          'low'
                        }`}>
                          {riskAnalysis.riskScore > 70 ? 'High Risk' :
                           riskAnalysis.riskScore > 40 ? 'Medium Risk' :
                           'Low Risk'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="analysis-section risk-factors">
                    <h3 className="analysis-title">
                      <i className="material-icons">list</i>
                      <span>Risk Factors</span>
                    </h3>
                    
                    <ul className="risk-factors-list">
                      {riskAnalysis.riskFactors.map((factor, index) => (
                        <li key={index} className="risk-factor">
                          <span className="risk-factor-name">{factor.name}</span>
                          <div className="risk-factor-bar-container">
                            <div 
                              className="risk-factor-bar" 
                              style={{ 
                                width: `${factor.impact}%`,
                                backgroundColor: factor.impact > 70 ? 'var(--danger)' :
                                                factor.impact > 40 ? 'var(--warning)' :
                                                'var(--success)'
                              }}
                            ></div>
                            <span className="risk-factor-value">{factor.impact}%</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="analysis-section recommendations">
                    <h3 className="analysis-title">
                      <i className="material-icons">lightbulb</i>
                      <span>Recommendations</span>
                    </h3>
                    
                    <ul className="recommendations-list">
                      {riskAnalysis.recommendations.map((recommendation, index) => (
                        <li key={index} className="recommendation">
                          <i className="material-icons">check_circle</i>
                          <span>{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="analysis-section similar-incidents">
                    <h3 className="analysis-title">
                      <i className="material-icons">compare</i>
                      <span>Similar Incidents</span>
                    </h3>
                    
                    {riskAnalysis.similarIncidents.length > 0 ? (
                      <div className="similar-incidents-list">
                        {riskAnalysis.similarIncidents.map((similarIncident, index) => (
                          <Link 
                            to={`/incidents/${similarIncident.id}`} 
                            key={index} 
                            className="similar-incident-item"
                          >
                            <div className="similar-incident-info">
                              <h4 className="similar-incident-title">
                                <span className="similar-incident-id">#{similarIncident.id}</span>
                                <span className="similar-incident-type">{similarIncident.type}</span>
                              </h4>
                              
                              <p className="similar-incident-date">
                                <i className="material-icons">event</i>
                                <span>{formatDate(similarIncident.timestamp)}</span>
                              </p>
                              
                              <p className="similar-incident-location">
                                <i className="material-icons">location_on</i>
                                <span>{similarIncident.location || 'Unknown location'}</span>
                              </p>
                            </div>
                            
                            <div className="similar-incident-match">
                              <span className="match-percentage">{similarIncident.matchPercentage}%</span>
                              <span className="match-label">Match</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="no-similar-incidents">
                        <i className="material-icons">info</i>
                        <p>No similar incidents found</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="no-analysis">
                  <i className="material-icons">analytics</i>
                  <p>Risk analysis not yet performed</p>
                  <button className="btn btn-primary" onClick={fetchRiskAnalysis}>
                    <i className="material-icons">play_arrow</i>
                    <span>Run Analysis</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Media Modal */}
      {showMediaModal && selectedMedia && (
        <div className="media-modal-overlay" onClick={closeMediaModal}>
          <div className="media-modal" onClick={(e) => e.stopPropagation()}>
            <button className="media-modal-close" onClick={closeMediaModal}>
              <i className="material-icons">close</i>
            </button>
            
            <div className="media-modal-content">
              {selectedMedia.type.startsWith('image/') ? (
                <img 
                  src={selectedMedia.url} 
                  alt={selectedMedia.caption || 'Media'} 
                  className="media-modal-image"
                />
              ) : selectedMedia.type.startsWith('video/') ? (
                <video 
                  src={selectedMedia.url} 
                  controls 
                  className="media-modal-video"
                ></video>
              ) : (
                <div className="media-modal-document">
                  <i className="material-icons">description</i>
                  <p>{selectedMedia.filename || 'Document'}</p>
                  <a 
                    href={selectedMedia.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn btn-primary"
                  >
                    <i className="material-icons">download</i>
                    <span>Download</span>
                  </a>
                </div>
              )}
            </div>
            
            <div className="media-modal-footer">
              <div className="media-modal-caption">
                {selectedMedia.caption || 'No caption'}
              </div>
              <div className="media-modal-timestamp">
                {formatDate(selectedMedia.timestamp)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentDetail;