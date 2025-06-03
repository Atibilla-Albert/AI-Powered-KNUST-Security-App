/**
 * Format date to human-readable format
 * @param {string|number|Date} dateInput - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date string
 */
export const formatDate = (dateInput, options = {}) => {
  if (!dateInput) return '';
  
  const date = typeof dateInput === 'object' 
    ? dateInput 
    : new Date(dateInput);
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(date);
};

/**
 * Format relative time (e.g., "5 minutes ago")
 * @param {string|number|Date} dateInput - Date to format
 * @returns {string} - Relative time string
 */
export const formatRelativeTime = (dateInput) => {
  if (!dateInput) return '';
  
  const date = typeof dateInput === 'object' 
    ? dateInput 
    : new Date(dateInput);
  
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
  
  // Fall back to regular date format for older dates
  return formatDate(date);
};

/**
 * Get color for priority level
 * @param {string} priority - Priority level (high, medium, low)
 * @returns {string} - CSS color code
 */
export const getPriorityColor = (priority) => {
  switch (priority?.toLowerCase()) {
    case 'high':
      return '#dc3545'; // red
    case 'medium':
      return '#ffc107'; // yellow
    case 'low':
      return '#28a745'; // green
    default:
      return '#6c757d'; // gray
  }
};

/**
 * Get color for incident status
 * @param {string} status - Incident status
 * @returns {string} - CSS color code
 */
export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'new':
      return '#dc3545'; // red
    case 'assigned':
      return '#fd7e14'; // orange
    case 'in progress':
      return '#007bff'; // blue
    case 'resolved':
      return '#28a745'; // green
    case 'closed':
      return '#6c757d'; // gray
    default:
      return '#6c757d'; // gray
  }
};

/**
 * Get icon name for incident type
 * @param {string} type - Incident type
 * @returns {string} - Material icon name
 */
export const getIncidentTypeIcon = (type) => {
  switch (type?.toLowerCase()) {
    case 'suspicious person':
      return 'person_alert';
    case 'theft':
      return 'shopping_bag';
    case 'vandalism':
      return 'gavel';
    case 'fire':
    case 'fire alarm':
      return 'local_fire_department';
    case 'medical emergency':
      return 'medical_services';
    case 'assault':
      return 'person_off';
    case 'trespassing':
      return 'no_trespassing';
    case 'cyber security':
      return 'security';
    default:
      return 'report_problem';
  }
};

/**
 * Validate incident data
 * @param {Object} incidentData - Incident data to validate
 * @returns {Object} - Validation result { isValid, errors }
 */
export const validateIncidentData = (incidentData) => {
  const errors = {};
  
  if (!incidentData.title?.trim()) {
    errors.title = 'Title is required';
  }
  
  if (!incidentData.type?.trim()) {
    errors.type = 'Incident type is required';
  }
  
  if (!incidentData.description?.trim()) {
    errors.description = 'Description is required';
  }
  
  if (!incidentData.location?.trim()) {
    errors.location = 'Location is required';
  }
  
  if (!incidentData.priority) {
    errors.priority = 'Priority is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Filter incidents based on filter criteria
 * @param {Array} incidents - List of incidents
 * @param {Object} filters - Filter criteria
 * @returns {Array} - Filtered incidents
 */
export const filterIncidents = (incidents, filters) => {
  if (!incidents || !Array.isArray(incidents)) {
    return [];
  }
  
  return incidents.filter(incident => {
    // Filter by status
    if (filters.status !== 'all' && incident.status !== filters.status) {
      return false;
    }
    
    // Filter by priority
    if (filters.priority !== 'all' && incident.priority !== filters.priority) {
      return false;
    }
    
    // Filter by assigned user
    if (filters.assignedTo !== 'all' && incident.assignedTo !== filters.assignedTo) {
      return false;
    }
    
    // Filter by incident type
    if (filters.incidentType !== 'all' && incident.type !== filters.incidentType) {
      return false;
    }
    
    // Filter by timeframe
    if (filters.timeframe !== 'all') {
      const incidentDate = new Date(incident.timestamp);
      const now = new Date();
      
      if (filters.timeframe === 'today') {
        // Check if date is today
        return incidentDate.toDateString() === now.toDateString();
      } else if (filters.timeframe === 'week') {
        // Check if date is within the last 7 days
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return incidentDate >= weekAgo;
      } else if (filters.timeframe === 'month') {
        // Check if date is within the last 30 days
        const monthAgo = new Date();
        monthAgo.setDate(now.getDate() - 30);
        return incidentDate >= monthAgo;
      }
    }
    
    // Filter by search term
    if (filters.searchTerm) {
      const searchTermLower = filters.searchTerm.toLowerCase();
      return (
        incident.title?.toLowerCase().includes(searchTermLower) ||
        incident.description?.toLowerCase().includes(searchTermLower) ||
        incident.location?.toLowerCase().includes(searchTermLower) ||
        incident.reportedBy?.name?.toLowerCase().includes(searchTermLower)
      );
    }
    
    return true;
  });
};

/**
 * Group incidents by attribute
 * @param {Array} incidents - List of incidents
 * @param {string} attribute - Attribute to group by (e.g., 'status', 'priority', 'type')
 * @returns {Object} - Grouped incidents
 */
export const groupIncidentsByAttribute = (incidents, attribute) => {
  if (!incidents || !Array.isArray(incidents)) {
    return {};
  }
  
  return incidents.reduce((groups, incident) => {
    const key = incident[attribute] || 'unknown';
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(incident);
    return groups;
  }, {});
};

export const getIncidentStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'new':
      return '#2196f3'; // blue
    case 'inprogress':
    case 'in-progress':
      return '#ff9800'; // orange
    case 'resolved':
      return '#4caf50'; // green
    case 'closed':
      return '#9e9e9e'; // grey
    case 'assigned':
      return '#3f51b5'; // indigo
    default:
      return '#757575'; // default grey
  }
};
