import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/AdminPanel.css';
import { incidentService } from '../services/incident';

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
  const [departmentOptions, setDepartmentOptions] = useState([]);

  // Load departments from backend so we use valid IDs (keys expected by API)
  useEffect(() => {
    let isMounted = true;
    const loadDepartments = async () => {
      try {
        const data = await incidentService.getDepartments();
        // Expecting { departments: [{ id, name, ... }] }
        const options = (data?.departments || []).map(d => ({ id: d.id, name: d.name || d.id }));
        if (isMounted) setDepartmentOptions(options);
      } catch (err) {
        console.error('Failed to load departments:', err);
      }
    };
    loadDepartments();
    return () => { isMounted = false; };
  }, []);

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
    const deptId = newDepartment.trim();
    const deptName = departmentOptions.find(d => d.id === deptId)?.name || deptId;
    try {
      // newDepartment is the department ID (e.g., SECURITY) as required by backend
      const response = await assignIncident(
        incident.incidentId,
        deptId,
        `Assigned to ${deptName} department`
      );
      setNewDepartment('');
      sendNotification(`Incident assigned to ${deptName} department`, 'success');
      // Refresh incident to show updated assignment
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
          {departmentOptions.map(opt => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
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
          <p><strong>Department:</strong> {
            (departmentOptions.find(d => d.id === incident.assignedTo)?.name) || incident.assignedTo || 'Unassigned'
          }</p>
          <p><strong>Status:</strong> {incident.status}</p>
          <p><strong>Severity:</strong> {incident.severityLevel}</p>
        </div>
      </div>
    </div>
  );
};

export default IncidentAdminPanel;