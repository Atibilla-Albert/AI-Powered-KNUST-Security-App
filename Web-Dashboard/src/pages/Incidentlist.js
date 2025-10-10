import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useIncidents } from '../contexts/IncidentContext';
import { formatDate, getIncidentStatusColor } from '../utils/helpers';
import LocationName from '../components/LocationName';
import { useDebounce } from '../hooks/useCustomHooks';
import '../styles/incident-list.css';

const IncidentList = () => {
  const {
    incidents,
    isLoading,
    error,
    fetchIncidents,
    totalIncidents,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    filters,
    updateFilters,
    resetFilters,
  } = useIncidents();

  const [filterOptions, setFilterOptions] = useState({ types: [], statuses: [] });

  const debouncedSearchQuery = useDebounce(filters.searchQuery, 500);

  useEffect(() => {
    if (incidents?.length) {
      const types = [...new Set(incidents.map(i => i.incidentType))];
      const statuses = [...new Set(incidents.map(i => i.status))];
      setFilterOptions({ types, statuses });
    }
  }, [incidents]);

  // Update filters when debounced search changes
  useEffect(() => {
    if (debouncedSearchQuery !== filters.searchQuery) {
      updateFilters({ ...filters, searchQuery: debouncedSearchQuery });
    }
  }, [debouncedSearchQuery, updateFilters]);

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
        'CANCELLED': 7,
      };

      const aPriority = statusPriority[a.status] || 999;
      const bPriority = statusPriority[b.status] || 999;

      if (aPriority === bPriority) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }

      return aPriority - bPriority;
    });
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    console.log('Filter change:', name, value);
    updateFilters({ ...filters, [name]: value });
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    resetFilters();
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalIncidents / pageSize);

  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <div className="incidents-page">
      <header className="incidents-header">
        <div className="header-content">
          <h1 className="page-title">Incidents</h1>
          {incidents.length > 0 && (
            <div className="incident-summary">
              <span className="new-incidents-count">
                {incidents.filter(incident => incident.status === 'NEW').length} new
              </span>
              <span className="total-incidents-count">
                {totalIncidents} total
              </span>
              {hasActiveFilters && (
                <span className="active-filters-indicator">
                  <i className="material-icons">filter_list</i> Filters Active
                </span>
              )}
            </div>
          )}
        </div>
        <Link to="/incidents/map" className="btn">
          <i className="material-icons">map</i> Map View
        </Link>
      </header>

      <section className="incidents-filters">
        <div className="filter-row">
          <div className="filter-group search-filter">
            <i className="material-icons search-icon">search</i>
            <input
              type="text"
              name="searchQuery"
              value={filters.searchQuery}
              onChange={handleFilterChange}
              placeholder="Search incidents..."
              className={`form-control ${filters.searchQuery ? 'has-value' : ''}`}
            />
          </div>
          {["status", "type"].map((key) => (
            <div className="filter-group" key={key}>
              <label htmlFor={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
              <select
                id={key}
                name={key}
                value={filters[key]}
                onChange={handleFilterChange}
                className={`form-control ${filters[key] ? 'has-value' : ''}`}
              >
                <option value="">All</option>
                {filterOptions[key + 's']?.map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="filter-row">
          {['dateFrom', 'dateTo'].map(dateKey => (
            <div className="filter-group" key={dateKey}>
              <label htmlFor={dateKey}>{dateKey === 'dateFrom' ? 'From Date' : 'To Date'}</label>
              <input
                type="date"
                id={dateKey}
                name={dateKey}
                value={filters[dateKey]}
                onChange={handleFilterChange}
                className={`form-control ${filters[dateKey] ? 'has-value' : ''}`}
              />
            </div>
          ))}
          <div className="filter-group">
            <button onClick={handleResetFilters} className="btn btn-outline-secondary">
              <i className="material-icons">clear</i> Reset Filters
            </button>
          </div>
        </div>
      </section>

      <section className="incidents-results">
        {isLoading && !incidents.length ? (
          <div className="loading-container">
            <i className="material-icons">hourglass_empty</i>
            <p>Loading incidents...</p>
          </div>
        ) : error ? (
          <div className="alert alert-danger">
            <i className="material-icons">error</i>
            <span>Error: {error}</span>
            <button className="btn btn-sm btn-outline-danger" onClick={() => fetchIncidents()}>
              <i className="material-icons">refresh</i> Retry
            </button>
          </div>
        ) : incidents.length === 0 ? (
          <div className="empty-state">
            <i className="material-icons empty-icon">search_off</i>
            <p>No incidents found</p>
            {hasActiveFilters && (
              <p className="empty-state-subtitle">Try adjusting your filters or search terms</p>
            )}
            <button className="btn btn-primary" onClick={handleResetFilters}>Clear Filters</button>
          </div>
        ) : (
          <>
            {isLoading && incidents.length > 0 && (
              <div className="filter-loading-indicator">
                <i className="material-icons">sync</i>
                <span>Updating results...</span>
              </div>
            )}
            <div className="incidents-table-container">
              <table className="incidents-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Reported</th>
                    <th>Status</th>
                    <th>Department</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortIncidentsByPriority(incidents).map(incident => (
                    <tr 
                      key={incident.incidentId} 
                      className={`incident-row ${incident.status === 'NEW' ? 'new-incident' : ''}`}
                    >
                      <td>{incident.incidentId}</td>
                      <td>{incident.incidentType}</td>
                      <td><LocationName incident={incident} /></td>
                      <td>{formatDate(incident.createdAt)}</td>
                      <td>
                        <span className="status-indicator" style={{ backgroundColor: getIncidentStatusColor(incident.status) }}></span>
                        {incident.status}
                        {incident.status === 'NEW' && (
                          <span className="new-badge">New</span>
                        )}
                      </td>
                      <td>{incident.assignedTo || 'Unassigned'}</td>
                      <td>
                        <Link to={`/incidents/${incident.incidentId}`} className="btn btn-sm btn-outline-primary">
                          <i className="material-icons">visibility</i> View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination-container">
              <div className="pagination-info">
                Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalIncidents)} of {totalIncidents}
              </div>
              <div className="pagination-controls">
                <div className="page-size">
                  <label htmlFor="pageSize">Show:</label>
                  <select id="pageSize" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                    {[5, 10, 25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
                  </select>
                </div>
                <div className="pagination">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><i className="material-icons">first_page</i></button>
                  <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}><i className="material-icons">chevron_left</i></button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}><i className="material-icons">chevron_right</i></button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}><i className="material-icons">last_page</i></button>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default IncidentList;