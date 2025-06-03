import React, { createContext, useState, useEffect, useContext } from 'react';
import { incidentService } from '../services/incident';
import { useAuth } from './AuthContext';

// Create incident context
const IncidentContext = createContext();

export const IncidentProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    timeframe: 'week',
    assignedTo: 'all',
    incidentType: 'all',
    searchTerm: ''
  });
  const [stats, setStats] = useState({
    new: 0,
    inProgress: 0,
    resolved: 0,
    high: 0,
    medium: 0,
    low: 0
  });

  // Fetch incidents when authentication status changes or filters change
  useEffect(() => {
    if (isAuthenticated) {
      fetchIncidents();
    }
  }, [isAuthenticated, filters]);

  // Fetch incidents based on current filters
  const fetchIncidents = async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const response = await incidentService.getIncidents(filters);
      setIncidents(response.incidents || []);
      setStats(response.stats || {
        new: 0,
        inProgress: 0,
        resolved: 0,
        high: 0,
        medium: 0,
        low: 0
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch incidents');
      console.error('Error fetching incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get incident by ID
  const getIncidentById = async (incidentId) => {
    setLoading(true);
    try {
      const incident = await incidentService.getIncidentById(incidentId);
      setSelectedIncident(incident);
      return incident;
    } catch (err) {
      setError(err.message || `Failed to fetch incident ${incidentId}`);
      console.error(`Error fetching incident ${incidentId}:`, err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update incident
  const updateIncident = async (incidentId, updateData) => {
    setLoading(true);
    try {
      const updatedIncident = await incidentService.updateIncident(incidentId, updateData);
      
      // Update local state
      if (selectedIncident && selectedIncident.incidentId === incidentId) {
        setSelectedIncident(updatedIncident);
      }
      
      // Update incident in the list
      setIncidents(incidents.map(inc => 
        inc.incidentId === incidentId ? updatedIncident : inc
      ));
      
      // Refresh stats
      fetchIncidents();
      
      return updatedIncident;
    } catch (err) {
      setError(err.message || `Failed to update incident ${incidentId}`);
      console.error(`Error updating incident ${incidentId}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Assign incident to user
  const assignIncident = async (incidentId, userId, notes) => {
    setLoading(true);
    try {
      const updatedIncident = await incidentService.assignIncident(incidentId, userId, notes);
      
      // Update local state
      if (selectedIncident && selectedIncident.incidentId === incidentId) {
        setSelectedIncident(updatedIncident);
      }
      
      // Update incident in the list
      setIncidents(incidents.map(inc => 
        inc.incidentId === incidentId ? updatedIncident : inc
      ));
      
      return updatedIncident;
    } catch (err) {
      setError(err.message || `Failed to assign incident ${incidentId}`);
      console.error(`Error assigning incident ${incidentId}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Change incident status
  const changeIncidentStatus = async (incidentId, newStatus, notes) => {
    setLoading(true);
    try {
      const updatedIncident = await incidentService.changeStatus(incidentId, newStatus, notes);
      
      // Update local state
      if (selectedIncident && selectedIncident.incidentId === incidentId) {
        setSelectedIncident(updatedIncident);
      }
      
      // Update incident in the list
      setIncidents(incidents.map(inc => 
        inc.incidentId === incidentId ? updatedIncident : inc
      ));
      
      // Refresh stats
      fetchIncidents();
      
      return updatedIncident;
    } catch (err) {
      setError(err.message || `Failed to change status for incident ${incidentId}`);
      console.error(`Error changing status for incident ${incidentId}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Add response/action to incident
  const addIncidentResponse = async (incidentId, responseData) => {
    setLoading(true);
    try {
      const updatedIncident = await incidentService.addResponse(incidentId, responseData);
      
      // Update local state
      if (selectedIncident && selectedIncident.incidentId === incidentId) {
        setSelectedIncident(updatedIncident);
      }
      
      // Update incident in the list
      setIncidents(incidents.map(inc => 
        inc.incidentId === incidentId ? updatedIncident : inc
      ));
      
      return updatedIncident;
    } catch (err) {
      setError(err.message || `Failed to add response to incident ${incidentId}`);
      console.error(`Error adding response to incident ${incidentId}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
   // ✅ NEW: Fetch only incident stats separately
  const fetchIncidentStats = async () => {
    setLoading(true);
    try {
      const response = await incidentService.getIncidentStats();
      setStats(response || {
        new: 0,
        inProgress: 0,
        resolved: 0,
        high: 0,
        medium: 0,
        low: 0
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch stats');
      console.error('Error fetching incident stats:', err);
    } finally {
      setLoading(false);
    }
  };


  // Update filters
  const updateFilters = (newFilters) => {
    setFilters({ ...filters, ...newFilters });
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      status: 'all',
      priority: 'all',
      timeframe: 'week',
      assignedTo: 'all',
      incidentType: 'all',
      searchTerm: ''
    });
  };

  const value = {
    incidents,
    selectedIncident,
    setSelectedIncident,
    loading,
    error,
    stats,
    filters,
    updateFilters,
    resetFilters,
    fetchIncidents,
    getIncidentById,
    updateIncident,
    assignIncident,
    fetchIncidentStats,
    changeIncidentStatus,
    addIncidentResponse
  };

  return <IncidentContext.Provider value={value}>{children}</IncidentContext.Provider>;
};

// Custom hook to use incident context
export const useIncidents = () => {
  const context = useContext(IncidentContext);
  if (context === undefined) {
    throw new Error('useIncidents must be used within an IncidentProvider');
  }
  return context;
};

export default IncidentContext;