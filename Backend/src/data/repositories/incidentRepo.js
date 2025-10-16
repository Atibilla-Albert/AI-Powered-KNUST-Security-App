const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { Logger } = require('@aws-lambda-powertools/logger');
const { s3Client } = require('../s3client');
const { Incident, INCIDENT_STATUS } = require('../models/incidents');

const logger = new Logger({ serviceName: 'security-incident-reporting' });

const dynamodbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);
const INCIDENTS_TABLE = process.env.INCIDENTS_TABLE_NAME || 'security-incident-reporting-dev-incidents';
const INCIDENT_ATTACHMENTS_BUCKET = process.env.S3_BUCKET || 'security-incident-reporting-dev-incident-media';

/**
 * Create a new incident
 * @async
 * @param {Incident} incident - Incident to create
 * @returns {Promise<Incident>} Created incident
 */
const createIncident = async (incident) => {
  try {
    logger.info('Creating incident', { incidentId: incident.incidentId });
    const item = incident.toDynamoItem();
    const params = {
      TableName: INCIDENTS_TABLE,
      Item: item,
    };
    await dynamodb.send(new PutCommand(params));
    logger.info('Incident created', { incidentId: incident.incidentId });
    return incident;
  } catch (error) {
    logger.error('Error creating incident', { error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Get incident by ID
 * @async
 * @param {string} incidentId - Incident ID
 * @returns {Promise<Incident|null>} Incident or null if not found
 */
const getIncidentById = async (incidentId) => {
  try {
    logger.info('Getting incident by ID', { incidentId, table: INCIDENTS_TABLE });
    const params = {
      TableName: INCIDENTS_TABLE,
      Key: { incidentId },
    };
    logger.debug('GetCommand params:', params);
    const result = await dynamodb.send(new GetCommand(params));
    logger.debug('GetCommand result:', { item: result.Item, consumedCapacity: result.ConsumedCapacity });
    if (!result.Item) {
      logger.info('Incident not found', { incidentId });
      return null;
    }
    const incident = Incident.fromDynamoItem(result.Item);
    logger.debug('Converted incident:', { incidentId, incident: incident.toPublicJSON() });
    return incident;
  } catch (error) {
    logger.error('Error getting incident', { incidentId, error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Update incident
 * @async
 * @param {Incident} incident - Updated incident
 * @returns {Promise<Incident>} Updated incident
 */
const updateIncident = async (incident) => {
  try {
    logger.info('Updating incident', { incidentId: incident.incidentId });
    incident.updatedAt = new Date().toISOString();
    const params = {
      TableName: INCIDENTS_TABLE,
      Key: { incidentId: incident.incidentId },
      UpdateExpression: 'SET #data = :data, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#data': 'data',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':data': incident.toDynamoItem(),
        ':updatedAt': incident.updatedAt,
      },
      ReturnValues: 'ALL_NEW',
    };
    const result = await dynamodb.send(new UpdateCommand(params));
    logger.info('Incident updated', { incidentId: incident.incidentId });
    return Incident.fromDynamoItem(result.Attributes);
  } catch (error) {
    logger.error('Error updating incident', { incidentId: incident.incidentId, error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Update incident status
 * @async
 * @param {string} incidentId - Incident ID
 * @param {string} status - New status
 * @param {string} [assignedTo] - Optional assigned user ID
 * @returns {Promise<Incident>} Updated incident
 */
const updateIncidentStatus = async (incidentId, status, assignedTo) => {
  try {
    logger.info('Updating incident status', { incidentId, status });
    const incident = await getIncidentById(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }
    incident.updateStatus(status, assignedTo);
    return await updateIncident(incident);
  } catch (error) {
    logger.error('Error updating incident status', { incidentId, error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Get incidents by status
 * @async
 * @param {string} status - Incident status
 * @param {number} [limit=10] - Maximum number of items to return
 * @param {Object} [lastEvaluatedKey] - Last evaluated key for pagination
 * @returns {Promise<Object>} Incidents and last evaluated key
 */
const getIncidentsByStatus = async (status, limit = 10, lastEvaluatedKey) => {
  try {
    logger.info('Fetching incidents by status', { status, limit });
    const params = {
      TableName: INCIDENTS_TABLE,
      IndexName: 'StatusCreatedAtIndex',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': status },
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
    };
    const result = await dynamodb.send(new QueryCommand(params));
    logger.info('Fetched incidents by status', { status, count: result.Items?.length || 0 });
    return {
      items: result.Items.map(item => Incident.fromDynamoItem(item)),
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  } catch (error) {
    logger.error('Error getting incidents by status', { status, error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Get incidents by reporter ID
 * @async
 * @param {string} reporterId - Reporter ID
 * @param {number} [limit=10] - Maximum number of items to return
 * @param {Object} [lastEvaluatedKey] - Last evaluated key for pagination
 * @returns {Promise<Object>} Incidents and last evaluated key
 */
const getIncidentsByReporterId = async (reporterId, limit = 10, lastEvaluatedKey) => {
  try {
    logger.info('Fetching incidents by reporter ID', { reporterId, limit });
    const params = {
      TableName: INCIDENTS_TABLE,
      IndexName: 'ReporterIdCreatedAtIndex',
      KeyConditionExpression: '#reporterId = :reporterId',
      ExpressionAttributeNames: { '#reporterId': 'reporterId' },
      ExpressionAttributeValues: { ':reporterId': reporterId },
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
    };
    const result = await dynamodb.send(new QueryCommand(params));
    logger.info('Fetched incidents by reporter', { reporterId, count: result.Items?.length || 0 });
    return {
      items: result.Items.map(item => Incident.fromDynamoItem(item)),
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  } catch (error) {
    logger.info('Falling back to scan', { reporterId });
    try {
      let items = [];
      let lastEvaluatedKeyResult = lastEvaluatedKey;
      let totalItems = 0;

      do {
        const scanParams = {
          TableName: INCIDENTS_TABLE,
          FilterExpression: '#reporterId = :reporterId',
          ExpressionAttributeNames: { '#reporterId': 'reporterId' },
          ExpressionAttributeValues: { ':reporterId': reporterId },
          Limit: limit - totalItems,
          ExclusiveStartKey: lastEvaluatedKeyResult,
        };

        const scanResult = await dynamodb.send(new ScanCommand(scanParams));
        items = items.concat(scanResult.Items || []);
        lastEvaluatedKeyResult = scanResult.LastEvaluatedKey;
        totalItems += scanResult.Items?.length || 0;

        if (totalItems >= limit || !lastEvaluatedKeyResult) {
          break;
        }
      } while (lastEvaluatedKeyResult);

      logger.info('Fetched incidents via scan', { reporterId, count: items.length });
      return {
        items: items.map(item => Incident.fromDynamoItem(item)),
        lastEvaluatedKey: lastEvaluatedKeyResult,
      };
    } catch (scanError) {
      logger.error('Error scanning incidents for reporter', { reporterId, error: scanError.message, stack: scanError.stack });
      throw new Error(`Error scanning incidents: ${scanError.message}`);
    }
  }
};

/**
 * Get high-priority incidents (severity level HIGH)
 * @async
 * @param {number} [limit=10] - Maximum number of items to return
 * @param {Object} [lastEvaluatedKey] - Last evaluated key for pagination
 * @returns {Promise<Object>} Incidents and last evaluated key
 */
const getHighPriorityIncidents = async (limit = 10, lastEvaluatedKey) => {
  try {
    logger.info('Fetching high-priority incidents', { limit });
    const params = {
      TableName: INCIDENTS_TABLE,
      IndexName: 'SeverityLevelCreatedAtIndex',
      KeyConditionExpression: '#severityLevel = :severityLevel',
      ExpressionAttributeNames: { '#severityLevel': 'severityLevel' },
      ExpressionAttributeValues: { ':severityLevel': 'HIGH' },
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
    };
    
    const result = await dynamodb.send(new QueryCommand(params));
    logger.info('Fetched high-priority incidents', { count: result.Items?.length || 0 });
    
    return {
      items: result.Items.map(item => Incident.fromDynamoItem(item)),
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  } catch (error) {
    logger.error('Error getting high-priority incidents', { error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Get signed URL for incident attachment upload
 * @async
 * @param {string} incidentId - Incident ID
 * @param {string} fileName - Original file name
 * @param {string} contentType - Content type of the file
 * @returns {Promise<Object>} Upload URL and key
 */
const getAttachmentUploadUrl = async (incidentId, fileName, contentType) => {
  try {
    logger.info('Generating attachment upload URL', { incidentId, fileName });
    const key = s3Client.generateIncidentAttachmentKey(incidentId, fileName);
    const url = await s3Client.getPresignedUploadUrl(
      INCIDENT_ATTACHMENTS_BUCKET,
      key,
      contentType,
      300 // 5 minutes
    );
    
    logger.info('Generated attachment upload URL', { incidentId, key });
    return { url, key };
  } catch (error) {
    logger.error('Error generating attachment upload URL', { incidentId, error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Add attachment to incident
 * @async
 * @param {string} incidentId - Incident ID
 * @param {string} attachmentKey - S3 key of the attachment
 * @returns {Promise<Incident>} Updated incident
 */
const addAttachmentToIncident = async (incidentId, attachmentKey) => {
  try {
    logger.info('Adding attachment to incident', { incidentId, attachmentKey });
    const incident = await getIncidentById(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }
    
    incident.addAttachment(attachmentKey);
    return await updateIncident(incident);
  } catch (error) {
    logger.error('Error adding attachment to incident', { incidentId, error: error.message, stack: error.stack });
    throw error;
  }
};

module.exports = {
  createIncident,
  getIncidentById,
  updateIncident,
  updateIncidentStatus,
  getIncidentsByStatus,
  getIncidentsByReporterId,
  getHighPriorityIncidents,
  getAttachmentUploadUrl,
  addAttachmentToIncident,
};