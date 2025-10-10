import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { incidentService } from '../services/incident';
import { useAuth } from './AuthContext';

const IncidentContext = createContext();

export const IncidentProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalIncidents, setTotalIncidents] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [filters, setFilters] = useState({
    status: '',
    type: '',
    assignedTo: '',
    dateFrom: '',
    dateTo: '',
    searchQuery: '',
  });

  const extractErrorMessage = (err) => {
    return err?.response?.data?.message || err?.message || 'Unexpected error';
  };

  const buildQueryParams = () => {
    const query = {};
    if (filters.status && filters.status !== '') query.status = filters.status;
    if (filters.type && filters.type !== '') query.incidentType = filters.type;
    if (filters.assignedTo && filters.assignedTo !== '') query.assignedTo = filters.assignedTo;
    if (filters.searchQuery && filters.searchQuery.trim() !== '') query.search = filters.searchQuery.trim();
    if (filters.dateFrom) query.dateFrom = new Date(filters.dateFrom).toISOString();
    if (filters.dateTo) query.dateTo = new Date(filters.dateTo).toISOString();
    query.page = currentPage;
    query.limit = pageSize;
    query.sort = 'createdAt,desc';
    return query;
  };

  const fetchIncidents = useCallback(async () => {
    if (!isAuthenticated) return;

    console.log('fetchIncidents called with filters:', filters);
    setLoading(true);
    setError(null);
    try {
      const queryParams = buildQueryParams();
      console.log('Fetching incidents with query params:', queryParams);
      const response = await incidentService.getIncidents(queryParams);
      console.log('Fetched incidents response:', response);
      setIncidents(response.incidents || []);
      setTotalIncidents(response.totalIncidents || 0);
    } catch (err) {
      console.error('Error fetching incidents:', err);
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, filters, currentPage, pageSize]);

  const getIncidentById = async (incidentId) => {
    if (!isAuthenticated) throw new Error('User not authenticated');
  
    setLoading(true);
    setError(null);
    try {
      console.log(`Fetching incident by ID: ${incidentId}`);
      const response = await incidentService.getIncidentById(incidentId);
      console.log(`Fetched incident by ID ${incidentId} response:`, response);
      return response;
    } catch (err) {
      console.error('Error fetching incident by ID:', {
        message: err?.response?.data?.message || err.message,
        status: err?.response?.status,
        stack: err.stack
      });
      setError(extractErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addResponse = async (incidentId, responseData) => {
    if (!isAuthenticated) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);
    try {
      console.log(`Adding response to incident ${incidentId} with data:`, responseData);
      const response = await incidentService.addResponse(incidentId, responseData);
      console.log(`Added response to incident ${incidentId} response:`, response);
      await fetchIncidents(); // Refresh incidents list
      return response;
    } catch (err) {
      console.error('Error adding response:', err);
      setError(extractErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const assignIncident = async (incidentId, department, notes = '') => {
    if (!isAuthenticated) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);
    try {
      console.log(`Assigning incident ${incidentId} to department ${department} with notes: ${notes}`);
      const response = await incidentService.assignIncident(incidentId, department, notes);
      console.log(`Assigned incident ${incidentId} to department ${department} response:`, response);
      await fetchIncidents(); // Refresh incidents list
      return response;
    } catch (err) {
      console.error('Error assigning incident to department:', err);
      setError(extractErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateIncident = async (incidentId, updateData) => {
    if (!isAuthenticated) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);
    try {
      console.log(`Updating incident ${incidentId} with data:`, updateData);
      const response = await incidentService.updateIncident(incidentId, updateData);
      console.log(`Updated incident ${incidentId} response:`, response);
      await fetchIncidents(); // Refresh incidents list
      return response;
    } catch (err) {
      console.error('Error updating incident:', err);
      setError(extractErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      type: '',
      assignedTo: '',
      dateFrom: '',
      dateTo: '',
      searchQuery: '',
    });
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const value = {
    incidents,
    loading,
    error,
    totalIncidents,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    filters,
    updateFilters,
    resetFilters,
    fetchIncidents,
    getIncidentById,
    addResponse,
    assignIncident,
    updateIncident,
  };

  return (
    <IncidentContext.Provider value={value}>
      {children}
    </IncidentContext.Provider>
  );
};

export const useIncidents = () => {
  const context = useContext(IncidentContext);
  if (!context) {
    throw new Error('useIncidents must be used within an IncidentProvider');
  }
  return context;
};

export default IncidentContext;