/**
 * Lambda handlers for incident processing
 */
const { S3Client, GetSignedUrlCommand } = require('@aws-sdk/client-s3');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { v4: uuidv4 } = require('uuid');
const incidentRepo = require('../data/repositories/incidentRepo');
const userRepo = require('../data/repositories/userRepo');
const fraudDetectionService = require('../ml/fraudDetection');
const snsService = require('../notification/snsService');
const { shouldTriggerAlert, calculatePriorityLevel } = require('../notification/alertRules');
const { Incident, INCIDENT_STATUS } = require('../data/models/incidents');
const { TABLES, DEPARTMENTS } = require('../config/config');
const { createItem, getItemById, updateItem, deleteItem, scanTable } = require('../data/dynamodbclient');
const { generateApiResponse } = require('../utils/api-response');
const { getUserDetails } = require('../auth/cognito');
const fetch = require('node-fetch');
const { User } = require('../data/models/users');
const { formatDepartmentAssignmentNotification } = require('../notification/templates');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const lambda = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.S3_BUCKET || 'security-incident-reporting-dev-incident-media';

const supportedContentTypes = [
  'image/jpeg',
  'image/png',
  'video/mp4',
  'video/quicktime',
  'audio/mp4',
  'audio/mpeg',
];

/**
 * Report incident (used by POST /incidents)
 */
const reportIncident = async (event) => {
  try {
    const data = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return generateApiResponse(401, { error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const user = await getUserDetails(token);
    const reporterId = user?.sub;
    if (!reporterId) {
      return generateApiResponse(401, { error: 'Invalid token: no user ID' });
    }

    let reporterName = 'Unknown';
    if (reporterId) {
      try {
        const userItem = await userRepo.getUserById(reporterId);
        const reporterUser = User.fromDynamoItem(userItem);
        reporterName = reporterUser.toPublicJSON().fullName;
      } catch (err) {
        console.warn('Failed to fetch reporter name from userRepo:', err);
        reporterName = `User ${reporterId}`;
      }
    }

    const validSeverities = ['low', 'medium', 'high'];
    const severityInput = (data.severity || '').toLowerCase();
    if (!validSeverities.includes(severityInput)) {
      return generateApiResponse(400, {
        error: 'Severity must be one of: low, medium, or high.',
      });
    }
    data.severityLevel = severityInput.toUpperCase();

    let location = data.location || null;
    if (!location) {
      const ip = event.requestContext?.identity?.sourceIp;
      if (ip) {
        const geo = await fetch(`http://ip-api.com/json/${ip}`).then(res => res.json());
        if (geo.status === 'success') {
          location = {
            latitude: geo.lat,
            longitude: geo.lon,
          };
        }
      }
    }

    if (!location && process.env.STAGE === 'dev') {
      location = { latitude: 6.674, longitude: -1.571 }; // Dummy KNUST location
    }

    if (!location) {
      return generateApiResponse(400, {
        error: 'Location data is required.',
      });
    }

    const incident = new Incident({
      ...data,
      reporterId,
      reporterName,
      location,
      status: INCIDENT_STATUS.NEW,
      createdAt: new Date().toISOString(),
    });

    console.log('Creating incident:', JSON.stringify(incident.toDynamoItem(), null, 2));
    const savedIncident = await incidentRepo.createIncident(incident);

    console.log('Invoking fraud assessment Lambda for incident:', savedIncident.incidentId);
    await lambda.send(new InvokeCommand({
      FunctionName: 'security-system-fraud-assessment',
      InvocationType: 'Event',
      Payload: JSON.stringify({
        incident: savedIncident.toDynamoItem(),
        reporter: { id: reporterId, name: reporterName },
      }),
    })).catch(err => {
      console.error('Error invoking fraud assessment:', err);
    });

    return generateApiResponse(201, { incidentId: savedIncident.incidentId, ...savedIncident.toPublicJSON() });
  } catch (error) {
    console.error('Error reporting incident:', error);
    return generateApiResponse(400, { error: error.message });
  }
};

/**
 * Process new incident and trigger fraud assessment (used by POST /incidents/process)
 */
const processNewIncident = async (event, context) => {
  console.log('Processing new incident report:', JSON.stringify(event, null, 2));

  try {
    const data = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

    const rawToken = event.headers?.Authorization || '';
    const accessToken = rawToken.replace(/^Bearer\s+/i, '');

    const user = await getUserDetails(accessToken);
    const reporter = {
      id: user.Username || user.sub,
      email: user.email,
    };

    let reporterName = 'Unknown';
    if (reporter.id) {
      try {
        const userItem = await userRepo.getUserById(reporter.id);
        const reporterUser = User.fromDynamoItem(userItem);
        reporterName = reporterUser.toPublicJSON().fullName;
      } catch (err) {
        console.warn('Failed to fetch reporter name from userRepo:', err);
        reporterName = `User ${reporter.id}`;
      }
    }

    data.reporterId = reporter.id;
    data.reporterName = reporterName;
    data.status = INCIDENT_STATUS.NEW;
    data.createdAt = new Date().toISOString();

    const incident = new Incident(data);
    const savedIncident = await createItem(TABLES.INCIDENTS, incident.toDynamoItem());

    const fraudAssessmentParams = {
      incidentId: savedIncident.incidentId,
      reporterHistory: await incidentRepo.getIncidentsByReporterId(reporter.id),
    };

    console.log('Invoking fraud assessment Lambda for incident:', savedIncident.incidentId);
    await lambda.send(new InvokeCommand({
      FunctionName: 'security-system-fraud-assessment',
      InvocationType: 'Event',
      Payload: JSON.stringify({
        incident: savedIncident,
        reporter,
        ...fraudAssessmentParams,
      }),
    })).catch(err => {
      console.error('Error invoking fraud assessment:', err);
    });

    return generateApiResponse(201, { incidentId: savedIncident.incidentId, ...Incident.fromDynamoItem(savedIncident).toPublicJSON() });
  } catch (error) {
    console.error('Error processing incident:', error);
    return generateApiResponse(400, { error: error.message });
  }
};

/**
 * Generate pre-signed URL for media upload (used by POST /incidents/{incidentId}/media/upload-url)
 */
const getMediaUploadUrl = async (event) => {
  try {
    const { incidentId, fileName, contentType } = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    if (!incidentId || !fileName || !contentType) {
      return generateApiResponse(400, { error: 'Missing required fields: incidentId, fileName, contentType' });
    }

    const normalizedContentType = contentType === 'video/quicktime' ? 'video/mp4' : contentType;
    if (!supportedContentTypes.includes(normalizedContentType)) {
      return generateApiResponse(400, { error: `Unsupported content type: ${contentType}` });
    }

    const incident = await getItemById(TABLES.INCIDENTS, incidentId);
    if (!incident) {
      return generateApiResponse(404, { error: 'Incident not found' });
    }

    const key = `${incidentId}/${uuidv4()}/${fileName}`;
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: normalizedContentType,
      Expires: 300,
    };

    const url = await s3.send(new GetSignedUrlCommand({ ...params, Operation: 'putObject' }));
    return generateApiResponse(200, { url, key });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return generateApiResponse(500, { error: 'Failed to generate upload URL' });
  }
};

/**
 * Add attachment to incident (used by POST /incidents/{incidentId}/media)
 */
const addAttachment = async (event) => {
  try {
    const { incidentId, attachmentKey } = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    if (!incidentId || !attachmentKey) {
      return generateApiResponse(400, { error: 'Missing required fields: incidentId, attachmentKey' });
    }

    const incident = await getItemById(TABLES.INCIDENTS, incidentId);
    if (!incident) {
      return generateApiResponse(404, { error: 'Incident not found' });
    }

    const updatedIncident = await incidentRepo.addAttachmentToIncident(incidentId, attachmentKey);
    return generateApiResponse(200, Incident.fromDynamoItem(updatedIncident).toPublicJSON());
  } catch (error) {
    console.error('Error adding attachment:', error);
    return generateApiResponse(500, { error: 'Failed to add attachment' });
  }
};

/**
 * List incidents with pagination and filtering (used by GET /incidents)
 */
const listIncidents = async (event) => {
  try {
    const { page = 1, limit = 10, sort = 'createdAt,desc', status, incidentType, search, dateFrom, dateTo, assignedTo } = event.queryStringParameters || {};

    let items = [];
    if (status) {
      const queryParams = {
        TableName: TABLES.INCIDENTS,
        IndexName: 'StatusCreatedAtIndex',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': { S: status.toUpperCase() },
        },
        ScanIndexForward: sort.includes('desc') ? false : true,
        Limit: parseInt(limit),
      };

      const conditions = [];
      if (incidentType) {
        conditions.push('#incidentType = :incidentType');
        queryParams.ExpressionAttributeValues[':incidentType'] = { S: incidentType.toUpperCase() };
        queryParams.ExpressionAttributeNames['#incidentType'] = 'incidentType';
      }
      if (assignedTo) {
        conditions.push('#assignedTo = :assignedTo');
        queryParams.ExpressionAttributeValues[':assignedTo'] = { S: assignedTo };
        queryParams.ExpressionAttributeNames['#assignedTo'] = 'assignedTo';
      }
      if (search) {
        conditions.push('contains(#description, :search)');
        queryParams.ExpressionAttributeValues[':search'] = { S: search.toLowerCase() };
        queryParams.ExpressionAttributeNames['#description'] = 'description';
      }
      if (dateFrom) {
        conditions.push('#createdAt >= :dateFrom');
        queryParams.ExpressionAttributeValues[':dateFrom'] = { S: new Date(dateFrom).toISOString() };
        queryParams.ExpressionAttributeNames['#createdAt'] = 'createdAt';
      }
      if (dateTo) {
        conditions.push('#createdAt <= :dateTo');
        queryParams.ExpressionAttributeValues[':dateTo'] = { S: new Date(dateTo).toISOString() };
        queryParams.ExpressionAttributeNames['#createdAt'] = 'createdAt';
      }

      if (conditions.length > 0) {
        queryParams.FilterExpression = conditions.join(' AND ');
      }

      console.log('Query params:', JSON.stringify(queryParams, null, 2));
      items = await incidentRepo.getIncidentsByStatus(status.toUpperCase(), limit, null);
      items = items.items;
    } else {
      const scanParams = {
        TableName: TABLES.INCIDENTS,
        Limit: parseInt(limit),
      };

      const conditions = [];
      if (incidentType) {
        conditions.push('#incidentType = :incidentType');
        scanParams.ExpressionAttributeValues = scanParams.ExpressionAttributeValues || {};
        scanParams.ExpressionAttributeValues[':incidentType'] = { S: incidentType.toUpperCase() };
        scanParams.ExpressionAttributeNames = scanParams.ExpressionAttributeNames || {};
        scanParams.ExpressionAttributeNames['#incidentType'] = 'incidentType';
      }
      if (assignedTo) {
        conditions.push('#assignedTo = :assignedTo');
        scanParams.ExpressionAttributeValues = scanParams.ExpressionAttributeValues || {};
        scanParams.ExpressionAttributeValues[':assignedTo'] = { S: assignedTo };
        scanParams.ExpressionAttributeNames = scanParams.ExpressionAttributeNames || {};
        scanParams.ExpressionAttributeNames['#assignedTo'] = 'assignedTo';
      }
      if (search) {
        conditions.push('contains(#description, :search)');
        scanParams.ExpressionAttributeValues = scanParams.ExpressionAttributeValues || {};
        scanParams.ExpressionAttributeValues[':search'] = { S: search.toLowerCase() };
        scanParams.ExpressionAttributeNames = scanParams.ExpressionAttributeNames || {};
        scanParams.ExpressionAttributeNames['#description'] = 'description';
      }
      if (dateFrom) {
        conditions.push('#createdAt >= :dateFrom');
        scanParams.ExpressionAttributeValues = scanParams.ExpressionAttributeValues || {};
        scanParams.ExpressionAttributeValues[':dateFrom'] = { S: new Date(dateFrom).toISOString() };
        scanParams.ExpressionAttributeNames = scanParams.ExpressionAttributeNames || {};
        scanParams.ExpressionAttributeNames['#createdAt'] = 'createdAt';
      }
      if (dateTo) {
        conditions.push('#createdAt <= :dateTo');
        scanParams.ExpressionAttributeValues = scanParams.ExpressionAttributeValues || {};
        scanParams.ExpressionAttributeValues[':dateTo'] = { S: new Date(dateTo).toISOString() };
        scanParams.ExpressionAttributeNames = scanParams.ExpressionAttributeNames || {};
        scanParams.ExpressionAttributeNames['#createdAt'] = 'createdAt';
      }

      if (conditions.length > 0) {
        scanParams.FilterExpression = conditions.join(' AND ');
      }

      console.log('Scan params:', JSON.stringify(scanParams, null, 2));
      items = await scanTable(scanParams);
    }

    items = items.filter(item => item !== undefined);
    console.log('Filtered queried items:', JSON.stringify(items, null, 2));

    let incidents = items.map(item => {
      console.log('Processing item:', JSON.stringify(item, null, 2));
      if (!item) return null;
      try {
        const incident = Incident.fromDynamoItem(item);
        console.log('Converted incident:', JSON.stringify(incident.toPublicJSON(), null, 2));
        return incident.toPublicJSON();
      } catch (error) {
        console.error(`Failed to process item ${item.incidentId || 'unknown'}: ${error.message}`);
        return null;
      }
    }).filter(incident => incident !== null);

    if (search && !conditions.includes('contains(#description, :search)')) {
      incidents = incidents.filter(incident => 
        incident.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    incidents = incidents.sort((a, b) => {
      const statusPriority = {
        'NEW': 1,
        'OPEN': 2,
        'IN_PROGRESS': 3,
        'REVIEWING': 4,
        'RESOLVED': 5,
        'CLOSED': 6,
        'CANCELLED': 7,
        'SUSPICIOUS': 8,
      };
      const aPriority = statusPriority[a.status] || 999;
      const bPriority = statusPriority[b.status] || 999;
      if (aPriority === bPriority) {
        return sort.includes('desc') 
          ? new Date(b.createdAt) - new Date(a.createdAt)
          : new Date(a.createdAt) - new Date(b.createdAt);
      }
      return aPriority - bPriority;
    });

    const startIndex = (page - 1) * limit;
    const paginatedIncidents = incidents.slice(startIndex, startIndex + parseInt(limit));

    return generateApiResponse(200, {
      incidents: paginatedIncidents,
      totalIncidents: incidents.length,
    });
  } catch (error) {
    console.error('Error listing incidents:', error);
    return generateApiResponse(500, { error: 'Failed to list incidents', details: error.message });
  }
};

/**
 * List incidents reported by the authenticated user (used by GET /my-incidents)
 */
const listMyIncidents = async (event) => {
  try {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return generateApiResponse(401, { error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const user = await getUserDetails(token);
    const reporterId = user?.sub;

    if (!reporterId) {
      return generateApiResponse(401, { error: 'Invalid token: no user ID' });
    }

    const { items } = await incidentRepo.getIncidentsByReporterId(reporterId, 50);
    const myIncidents = items.map((item) => {
      try {
        return Incident.fromDynamoItem(item).toPublicJSON();
      } catch (error) {
        console.error(`Failed to process item ${item.incidentId || 'unknown'}: ${error.message}`);
        return null;
      }
    }).filter(incident => incident !== null);

    return generateApiResponse(200, myIncidents);
  } catch (error) {
    console.error('Error fetching user incidents:', error);
    return generateApiResponse(500, { error: 'Failed to fetch user incidents' });
  }
};

/**
 * Get a single incident by ID (used by GET /incidents/{id})
 */
const getIncident = async (event) => {
  try {
    const incidentId = event.pathParameters.id;
    console.log('Fetching incident with incidentId:', incidentId);

    const item = await incidentRepo.getIncidentById(incidentId);
    console.log('Fetched incident:', JSON.stringify(item?.toPublicJSON() || null, null, 2));

    if (!item) {
      return generateApiResponse(404, { error: 'Incident not found' });
    }

    let reporterName = item.reporterName || 'Unknown';
    if (item.reporterId) {
      try {
        const userItem = await userRepo.getUserById(item.reporterId);
        if (userItem) {
          const reporterUser = User.fromDynamoItem(userItem);
          reporterName = reporterUser.toPublicJSON().fullName;
          await updateItem(TABLES.INCIDENTS, incidentId, { reporterName });
        }
      } catch (err) {
        console.warn(`Failed to get reporter name for ID ${item.reporterId}:`, err);
      }
    }

    const incident = Incident.fromDynamoItem({ ...item.toDynamoItem(), reporterName });
    return generateApiResponse(200, incident.toPublicJSON());
  } catch (error) {
    console.error('Error getting incident:', error);
    return generateApiResponse(500, { error: 'Failed to get incident', details: error.message });
  }
};

/**
 * Update incident status (used by PATCH /incidents/{id}/status)
 */
const updateIncidentStatus = async (event) => {
  try {
    const incidentId = event.pathParameters.id;
    const updates = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const validStatuses = Object.values(INCIDENT_STATUS);
    if (updates.status && !validStatuses.includes(updates.status.toUpperCase())) {
      return generateApiResponse(400, { error: 'Invalid status value' });
    }
    updates.status = updates.status?.toUpperCase();
    const updatedItem = await updateItem(TABLES.INCIDENTS, incidentId, updates);
    return generateApiResponse(200, Incident.fromDynamoItem(updatedItem).toPublicJSON());
  } catch (error) {
    console.error('Error updating incident:', error);
    return generateApiResponse(500, { error: 'Failed to update incident' });
  }
};

/**
 * Delete an incident (used by DELETE /incidents/{id})
 */
const deleteIncident = async (event) => {
  try {
    const incidentId = event.pathParameters.id;
    await deleteItem(TABLES.INCIDENTS, incidentId);
    return generateApiResponse(204, {});
  } catch (error) {
    console.error('Error deleting incident:', error);
    return generateApiResponse(500, { error: 'Failed to delete incident' });
  }
};

/**
 * List all incidents (alias for listIncidents)
 */
const listAllIncidents = async (event) => {
  return listIncidents(event);
};

/**
 * Assign incident to a department (used by POST /incidents/{id}/assign)
 */
const assignIncidentToDepartment = async (event) => {
  try {
    const incidentId = event.pathParameters.id;
    const data = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { departmentId, notes } = data;

    // Validate required fields
    if (!departmentId) {
      return generateApiResponse(400, { error: 'Department ID is required' });
    }

    // Validate department exists
    const department = DEPARTMENTS[departmentId.toUpperCase()];
    if (!department) {
      return generateApiResponse(400, { 
        error: 'Invalid department ID', 
        availableDepartments: Object.keys(DEPARTMENTS) 
      });
    }

    // Get authenticated user
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return generateApiResponse(401, { error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const user = await getUserDetails(token);
    const assignedBy = user?.sub;
    if (!assignedBy) {
      return generateApiResponse(401, { error: 'Invalid token: no user ID' });
    }

    // Get assigned by user name
    let assignedByName = 'Unknown';
    try {
      const userItem = await userRepo.getUserById(assignedBy);
      if (userItem) {
        const assignedByUser = User.fromDynamoItem(userItem);
        assignedByName = assignedByUser.toPublicJSON().fullName;
      }
    } catch (err) {
      console.warn('Failed to fetch assigned by user name:', err);
      assignedByName = `User ${assignedBy}`;
    }

    // Get the incident
    const incident = await incidentRepo.getIncidentById(incidentId);
    if (!incident) {
      return generateApiResponse(404, { error: 'Incident not found' });
    }

    // Update incident with department assignment
    const updates = {
      assignedTo: departmentId.toUpperCase(),
      assignedBy: assignedBy,
      assignedAt: new Date().toISOString(),
      status: INCIDENT_STATUS.IN_PROGRESS,
      assignmentNotes: notes || null,
      updatedAt: new Date().toISOString()
    };

    const updatedIncident = await incidentRepo.updateIncident(incident.updateFromObject(updates));

    // Send notification to department
    try {
      const notificationMessage = formatDepartmentAssignmentNotification(
        updatedIncident.toPublicJSON(),
        department,
        assignedByName
      );

      const subject = `Incident Assignment: ${incident.incidentId} - ${department.name}`;
      
      // Send email notification to department
      await snsService.sendNotification(
        process.env.SNS_TOPIC_ARN || 'arn:aws:sns:us-east-1:717279717548:security-incident-reporting-dev-incident-alerts',
        subject,
        notificationMessage,
        {
          incidentId: incident.incidentId,
          departmentId: departmentId.toUpperCase(),
          severityLevel: incident.severityLevel,
          assignmentType: 'department'
        }
      );

      console.log(`Department assignment notification sent to ${department.name} for incident ${incidentId}`);
    } catch (notificationError) {
      console.error('Failed to send department assignment notification:', notificationError);
      // Don't fail the assignment if notification fails
    }

    return generateApiResponse(200, {
      message: 'Incident successfully assigned to department',
      incident: updatedIncident.toPublicJSON(),
      department: department,
      assignedBy: assignedByName
    });

  } catch (error) {
    console.error('Error assigning incident to department:', error);
    return generateApiResponse(500, { error: 'Failed to assign incident to department', details: error.message });
  }
};

/**
 * Get available departments (used by GET /departments)
 */
const getDepartments = async (event) => {
  try {
    return generateApiResponse(200, {
      departments: Object.entries(DEPARTMENTS).map(([key, dept]) => ({
        id: key,
        ...dept
      }))
    });
  } catch (error) {
    console.error('Error getting departments:', error);
    return generateApiResponse(500, { error: 'Failed to get departments' });
  }
};

/**
 * Assess fraud risk for an incident
 */
const assessFraudRisk = async (event) => {
  try {
    const { incident, reporter } = typeof event === 'string' ? JSON.parse(event) : event;

    const fraudAssessment = await fraudDetectionService.calculateFraudProbability(
      {
        description: incident.description,
        type: incident.incidentType,
        severityLevel: incident.severityLevel,
        location: incident.location,
        timestamp: incident.createdAt,
      },
      reporter.id,
    );

    const updatedIncident = await incidentRepo.getIncidentById(incident.incidentId);
    if (!updatedIncident) {
      throw new Error(`Incident ${incident.incidentId} not found`);
    }
    updatedIncident.setMLAnalysisResults(fraudAssessment);
    await incidentRepo.updateIncident(updatedIncident);

    if (shouldTriggerAlert(incident, fraudAssessment)) {
      const priorityLevel = calculatePriorityLevel(incident, fraudAssessment);
      if (priorityLevel === 'HIGH') {
        console.log('Sending SNS alert for high-priority incident:', incident.incidentId);
        await snsService.sendIncidentAlert(
          incident,
          incident.incidentId,
          incident.severityLevel,
          fraudAssessment.isSuspicious,
        );
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        incidentId: incident.incidentId,
        fraudProbability: fraudAssessment.fraudProbability,
        riskFactors: fraudAssessment.riskFactors,
        isSuspicious: fraudAssessment.isSuspicious,
        recommendation: fraudAssessment.recommendation,
        confidenceScore: fraudAssessment.confidenceScore,
        alertSent: shouldTriggerAlert(incident, fraudAssessment),
      }),
    };
  } catch (error) {
    console.error('Error assessing fraud risk:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error assessing fraud risk' }),
    };
  }
};

module.exports = {
  reportIncident,
  listIncidents,
  getIncident,
  updateIncidentStatus,
  deleteIncident,
  listAllIncidents,
  processNewIncident,
  assessFraudRisk,
  listMyIncidents,
  getMediaUploadUrl,
  addAttachment,
  assignIncidentToDepartment,
  getDepartments,
};