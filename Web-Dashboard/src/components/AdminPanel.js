import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/AdminPanel.css';

const IncidentAdminPanel = ({ 
  incident, 
  updateIncident, 
  sendNotification, 
  refreshIncident, 
  assignIncident, // Added for consistency
  addResponse,    // Added for consistency
  currentUser     // Added to use instead of useAuth
}) => {
  const { user } = useAuth(); // Kept for fallback, but prefer currentUser
  const isAdmin = (currentUser?.role === 'ADMIN') || (user?.role === 'ADMIN');

  const [responseText, setResponseText] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newStatus, setNewStatus] = useState('');

  // Comprehensive list of school departments
  const departments = [
    'Security',
    'Woodwork',
    'Electrical',
    'Roadworthy',
    'Mechanical',
    'Building & Construction',
    'Information Technology',
    'Administration',
    'Student Affairs',
    'Facilities Management',
    'Health Services',
    'Transportation',
    'Catering',
    'Library',
    'Sports & Recreation',
    'Academic Affairs',
    'Research & Development',
    'International Relations',
    'Finance & Accounting',
    'Human Resources',
    'Legal Services',
    'Public Relations',
    'Environmental Services',
    'Emergency Response',
    'Quality Assurance'
  ];

  const handleAddResponse = async () => {
    if (!incident || !responseText.trim()) return;
    try {
      const updated = await addResponse(incident.incidentId, responseText.trim());
      setResponseText('');
      sendNotification('Response added', 'success');
      refreshIncident();
    } catch (err) {
      console.error('Failed to add response:', err);
      sendNotification('Failed to add response', 'error');
    }
  };

  const handleAssignToDepartment = async () => {
    if (!incident || !newDepartment.trim()) return;
    try {
      const updated = await assignIncident(incident.incidentId, newDepartment.trim(), `Assigned to ${newDepartment} department`);
      setNewDepartment('');
      sendNotification(`Incident assigned to ${newDepartment} department`, 'success');
      refreshIncident();
    } catch (err) {
      console.error('Failed to assign incident:', err);
      sendNotification('Failed to assign to department', 'error');
    }
  };

  const handleChangeStatus = async () => {
    if (!incident || !newStatus) return;
    try {
      const updated = await updateIncident(incident.incidentId, {
        status: newStatus
      });
      setNewStatus('');
      sendNotification('Status updated', 'success');
      refreshIncident();
    } catch (err) {
      console.error('Failed to update status:', err);
      sendNotification('Status update failed', 'error');
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="admin-tab">
      <div className="admin-section">
        <h4>Add Response</h4>
        <textarea
          value={responseText}
          onChange={e => setResponseText(e.target.value)}
          placeholder="Write response..."
        />
        <button className="admin-btn admin-btn-primary" onClick={handleAddResponse}>Submit</button>
      </div>

      <div className="admin-section">
        <h4>Assign to Department</h4>
        <select
          value={newDepartment}
          onChange={e => setNewDepartment(e.target.value)}
          className="department-select"
        >
          <option value="">Select Department</option>
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
        <button 
          className="admin-btn admin-btn-secondary" 
          onClick={handleAssignToDepartment}
          disabled={!newDepartment}
        >
          Assign to Department
        </button>
      </div>

      <div className="admin-section">
        <h4>Change Status</h4>
        <select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
          <option value="">Select Status</option>
          <option value="NEW">NEW</option>
          <option value="ASSIGNED">ASSIGNED</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="PENDING">PENDING</option>
          <option value="REVIEWING">REVIEWING</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="CLOSED">CLOSED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
        <button 
          className="admin-btn admin-btn-success" 
          onClick={handleChangeStatus}
          disabled={!newStatus}
        >
          Update Status
        </button>
      </div>

      <div className="admin-section">
        <h4>Current Assignment</h4>
        <div className="current-assignment">
          <p><strong>Department:</strong> {incident.assignedTo || 'Unassigned'}</p>
          <p><strong>Status:</strong> {incident.status}</p>
          <p><strong>Severity:</strong> {incident.severityLevel}</p>
        </div>
      </div>
    </div>
  );
};

export default IncidentAdminPanel;