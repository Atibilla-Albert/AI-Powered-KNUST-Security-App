const { v4: uuidv4 } = require('uuid');

const INCIDENT_STATUS = {
  NEW: 'NEW',
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  REVIEWING: 'REVIEWING',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
  REPORTED: 'REPORTED',
  SUSPICIOUS: 'SUSPICIOUS',
};

const INCIDENT_TYPE = {
  PHYSICAL_SECURITY: 'PHYSICAL_SECURITY',
  CYBER_SECURITY_INCIDENT: 'CYBER_SECURITY_INCIDENT',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  SAFETY_HAZARD: 'SAFETY_HAZARD',
};

const SEVERITY_LEVEL = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
};

class Incident {
  constructor(data) {
    this.incidentId = data.incidentId || uuidv4();
    this.reporterId = data.reporterId;
    this.reporterName = data.reporterName || null;
    this.description = data.description;
    this.severityLevel = data.severityLevel;
    this.incidentType = data.incidentType;
    this.location = data.location;
    this.attachments = data.attachments || [];
    this.status = data.status || INCIDENT_STATUS.NEW;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.fraudProbability = data.fraudProbability || null;
    this.riskFactors = data.riskFactors || [];
    this.isSuspicious = data.isSuspicious || false;
    this.recommendation = data.recommendation || null;
    this.confidenceScore = data.confidenceScore || null;
    this.assignedTo = data.assignedTo || null;
    this.assignedBy = data.assignedBy || null;
    this.assignedAt = data.assignedAt || null;
    this.assignmentNotes = data.assignmentNotes || null;
    this.resolutionNotes = data.resolutionNotes || null;
    this.resolutionTimestamp = data.resolutionTimestamp || null;

    this.validate();
  }

  validate() {
    if (!this.reporterId) throw new Error('Reporter ID is required.');
    if (!this.description) throw new Error('Description is required.');

    if (!Object.values(SEVERITY_LEVEL).includes(this.severityLevel)) {
      throw new Error('Severity level must be LOW, MEDIUM, or HIGH.');
    }

    if (!Object.values(INCIDENT_TYPE).includes(this.incidentType)) {
      throw new Error(`Invalid incident type: ${this.incidentType}`);
    }

    if (!Object.values(INCIDENT_STATUS).includes(this.status)) {
      throw new Error(`Invalid status: ${this.status}`);
    }

    if (
      !this.location ||
      typeof this.location.latitude !== 'number' ||
      typeof this.location.longitude !== 'number'
    ) {
      throw new Error('Location with latitude and longitude is required.');
    }
  }

  toPublicJSON() {
    return {
      incidentId: this.incidentId,
      reporterId: this.reporterId,
      reporterName: this.reporterName,
      description: this.description,
      severityLevel: this.severityLevel,
      incidentType: this.incidentType,
      location: this.location,
      attachments: this.attachments,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      fraudProbability: this.fraudProbability,
      riskFactors: this.riskFactors,
      isSuspicious: this.isSuspicious,
      recommendation: this.recommendation,
      confidenceScore: this.confidenceScore,
      assignedTo: this.assignedTo,
      assignedBy: this.assignedBy,
      assignedAt: this.assignedAt,
      assignmentNotes: this.assignmentNotes,
      resolutionNotes: this.resolutionNotes,
      resolutionTimestamp: this.resolutionTimestamp,
    };
  }

  toDynamoItem() {
    return {
      incidentId: this.incidentId,
      reporterId: this.reporterId,
      reporterName: this.reporterName,
      description: this.description,
      severityLevel: this.severityLevel,
      incidentType: this.incidentType,
      location: this.location,
      attachments: this.attachments,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      fraudProbability: this.fraudProbability,
      riskFactors: this.riskFactors,
      isSuspicious: this.isSuspicious,
      recommendation: this.recommendation,
      confidenceScore: this.confidenceScore,
      assignedTo: this.assignedTo,
      assignedBy: this.assignedBy,
      assignedAt: this.assignedAt,
      assignmentNotes: this.assignmentNotes,
      resolutionNotes: this.resolutionNotes,
      resolutionTimestamp: this.resolutionTimestamp,
    };
  }

  static fromDynamoItem(item) {
    return new Incident({
      incidentId: item.incidentId,
      reporterId: item.reporterId,
      reporterName: item.reporterName || null,
      description: item.description,
      severityLevel: item.severityLevel,
      incidentType: item.incidentType,
      location: item.location,
      attachments: item.attachments || [],
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      fraudProbability: item.fraudProbability || null,
      riskFactors: item.riskFactors || [],
      isSuspicious: item.isSuspicious || false,
      recommendation: item.recommendation || null,
      confidenceScore: item.confidenceScore || null,
      assignedTo: item.assignedTo || null,
      assignedBy: item.assignedBy || null,
      assignedAt: item.assignedAt || null,
      assignmentNotes: item.assignmentNotes || null,
      resolutionNotes: item.resolutionNotes || null,
      resolutionTimestamp: item.resolutionTimestamp || null,
    });
  }

  updateStatus(status, assignedTo = null) {
    if (!Object.values(INCIDENT_STATUS).includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    this.status = status;
    this.updatedAt = new Date().toISOString();
    if (assignedTo) {
      this.assignedTo = assignedTo;
    }
    if (status === INCIDENT_STATUS.RESOLVED) {
      this.resolutionTimestamp = new Date().toISOString();
    }
  }

  addAttachment(attachmentKey) {
    if (attachmentKey) {
      this.attachments.push(attachmentKey);
      this.updatedAt = new Date().toISOString();
    }
  }

  setMLAnalysisResults({ fraudProbability, riskFactors, isSuspicious, recommendation, confidenceScore }) {
    this.fraudProbability = fraudProbability;
    this.riskFactors = riskFactors || [];
    this.isSuspicious = isSuspicious || false;
    this.recommendation = recommendation || 'PROCESS_NORMALLY';
    this.confidenceScore = confidenceScore || 0.5;
    this.updatedAt = new Date().toISOString();
  }

  updateFromObject(updates) {
    const fields = [
      'description',
      'severityLevel',
      'incidentType',
      'location',
      'assignedTo',
      'assignedBy',
      'assignedAt',
      'assignmentNotes',
      'status',
      'resolutionNotes',
      'reporterName',
      'fraudProbability',
      'riskFactors',
      'isSuspicious',
      'recommendation',
      'confidenceScore',
    ];

    for (const key of fields) {
      if (updates[key] !== undefined) {
        this[key] = updates[key];
      }
    }

    this.updatedAt = new Date().toISOString();
    this.validate();
  }
}

module.exports = {
  Incident,
  INCIDENT_STATUS,
  INCIDENT_TYPE,
  SEVERITY_LEVEL,
};