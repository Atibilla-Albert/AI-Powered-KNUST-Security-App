import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useIncidents } from '../contexts/IncidentContext';
import { formatDate, getIncidentStatusColor } from '../utils/helpers';
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
    setPageSize
  } = useIncidents();

  const [filters, setFilters] = useState({
    status: '',
    type: '',
    priority: '',
    assignedTo: '',
    dateFrom: '',
    dateTo: '',
    searchQuery: ''
  });

  const debouncedSearchQuery = useDebounce(filters.searchQuery, 500);

  const [filterOptions, setFilterOptions] = useState({ types: [], statuses: [], priorities: [] });

  useEffect(() => {
    if (incidents?.length) {
      const types = [...new Set(incidents.map(i => i.type))];
      const statuses = [...new Set(incidents.map(i => i.status))];
      const priorities = [...new Set(incidents.map(i => i.priority))];
      setFilterOptions({ types, statuses, priorities });
    }
  }, [incidents]);

  const createQueryObject = useCallback(() => {
    const query = { ...filters };
    if (filters.dateFrom) query.dateFrom = new Date(filters.dateFrom).toISOString();
    if (filters.dateTo) query.dateTo = new Date(filters.dateTo).toISOString();
    if (debouncedSearchQuery) query.search = debouncedSearchQuery;
    query.page = currentPage;
    query.limit = pageSize;
    query.sort = 'timestamp,desc';
    return query;
  }, [filters, currentPage, pageSize, debouncedSearchQuery]);

  useEffect(() => {
    fetchIncidents(createQueryObject());
  }, [fetchIncidents, createQueryObject]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({ status: '', type: '', priority: '', assignedTo: '', dateFrom: '', dateTo: '', searchQuery: '' });
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalIncidents / pageSize);

  return (
    <div className="incidents-page">
      <header className="incidents-header">
        <h1 className="page-title">Incidents</h1>
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
              className="form-control"
            />
          </div>
          {["status", "priority", "type"].map((key) => (
            <div className="filter-group" key={key}>
              <label htmlFor={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
              <select
                id={key}
                name={key}
                value={filters[key]}
                onChange={handleFilterChange}
                className="form-control"
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
                className="form-control"
              />
            </div>
          ))}
          <div className="filter-group">
            <button onClick={resetFilters} className="btn btn-outline-secondary">
              <i className="material-icons">clear</i> Reset Filters
            </button>
          </div>
        </div>
      </section>

      <section className="incidents-results">
        {isLoading && !incidents.length ? (
          <div className="loading-container">Loading incidents...</div>
        ) : error ? (
          <div className="alert alert-danger">
            <i className="material-icons">error</i>
            <span>Error: {error}</span>
            <button className="btn btn-sm btn-outline-danger" onClick={() => fetchIncidents(createQueryObject())}>
              <i className="material-icons">refresh</i> Retry
            </button>
          </div>
        ) : incidents.length === 0 ? (
          <div className="empty-state">
            <i className="material-icons empty-icon">search_off</i>
            <p>No incidents found</p>
            <button className="btn btn-primary" onClick={resetFilters}>Clear Filters</button>
          </div>
        ) : (
          <>
            <div className="incidents-table-container">
              <table className="incidents-table">
                <thead>
                  <tr>
                    <th>ID</th><th>Type</th><th>Location</th><th>Reported</th><th>Status</th>
                    <th>Priority</th><th>Assigned</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map(incident => (
                    <tr key={incident.id}>
                      <td>{incident.id}</td>
                      <td>{incident.type}</td>
                      <td>{incident.location?.name || 'Unknown'}</td>
                      <td>{formatDate(incident.timestamp)}</td>
                      <td>
                        <span className="status-indicator" style={{ backgroundColor: getIncidentStatusColor(incident.status) }}></span>
                        {incident.status}
                      </td>
                      <td>
                        <span className={`priority-badge priority-${incident.priority.toLowerCase()}`}>{incident.priority}</span>
                      </td>
                      <td>{incident.assignedToUser?.name || 'Unassigned'}</td>
                      <td>
                        <Link to={`/incidents/${incident.id}`} className="btn btn-sm btn-outline-primary">
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
                    {[10, 25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
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
