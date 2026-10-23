const { getPresignedUploadUrl, getPresignedDownloadUrl, generateIncidentAttachmentKey } = require('../data/s3client');
const { TABLES } = require('../config/config');
const { getItemById, updateItem } = require('../data/dynamodbclient');
const { generateApiResponse } = require('../utils/api-response');

const S3_BUCKET = process.env.S3_BUCKET;

const canAccessIncident = (event, incident) => {
  const user = event.authContext;
  if (!user || !incident) return false;
  if (user.role === 'ADMIN' || user.role === 'SECURITY_PERSONNEL') return true;
  return user.id === incident.reporterId;
};

// === Upload Handler ===
exports.getIncidentMediaUploadUrl = async (event) => {
  try {
    const incidentId = event.pathParameters?.id;
    const { filename, contentType } = JSON.parse(event.body || '{}');

    if (!incidentId) {
      return generateApiResponse(400, { error: 'Missing incident ID in path' });
    }

    if (!filename || !contentType) {
      return generateApiResponse(400, { error: 'filename and contentType are required' });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4', 'audio/mpeg'];
    if (!allowedTypes.includes(contentType)) {
      return generateApiResponse(400, { error: 'Unsupported content type' });
    }

    // Confirm the incident exists and belongs to this user before signing an upload.
    const incident = await getItemById(TABLES.INCIDENTS, incidentId);
    if (!incident) return generateApiResponse(404, { error: 'Incident not found' });
    if (!canAccessIncident(event, incident)) return generateApiResponse(403, { error: 'Forbidden' });

    const key = generateIncidentAttachmentKey(incidentId, filename);
    const url = await getPresignedUploadUrl(S3_BUCKET, key, contentType, 300);
    return generateApiResponse(200, { url, key });
  } catch (error) {
    console.error('Error generating S3 upload URL', { name: error.name || 'Error' });
    return generateApiResponse(500, { error: 'Failed to generate upload URL' });
  }
};

// === Add Attachment Handler ===
exports.addIncidentAttachment = async (event) => {
  try {
    const incidentId = event.pathParameters?.id;
    const { key } = JSON.parse(event.body || '{}');

    if (!incidentId || !key) {
      return generateApiResponse(400, { error: 'Missing incident ID or key' });
    }

    const incident = await getItemById(TABLES.INCIDENTS, incidentId);
    if (!incident) return generateApiResponse(404, { error: 'Incident not found' });
    if (!canAccessIncident(event, incident)) return generateApiResponse(403, { error: 'Forbidden' });
    if (!key.startsWith(`${incidentId}/`)) return generateApiResponse(400, { error: 'Attachment key does not belong to this incident' });

    const updatedAttachments = [...(incident.attachments || []), { key }];
    await updateItem(TABLES.INCIDENTS, incidentId, { attachments: updatedAttachments });

    return generateApiResponse(200, { message: 'Attachment added successfully', key });
  } catch (error) {
    console.error('Error adding attachment', { name: error.name || 'Error' });
    return generateApiResponse(500, { error: 'Failed to add attachment' });
  }
};

// === Download Handler ===
exports.getIncidentMediaDownloadUrl = async (event) => {
  try {
    const incidentId = event.pathParameters?.id;
    const key = event.queryStringParameters?.key;

    if (!incidentId || !key) {
      return generateApiResponse(400, { error: 'Missing incident ID or key' });
    }

    if (!S3_BUCKET) {
      console.error('S3 bucket configuration missing');
      return generateApiResponse(500, { error: 'S3 bucket not configured' });
    }

    const incident = await getItemById(TABLES.INCIDENTS, incidentId);
    if (!incident) return generateApiResponse(404, { error: 'Incident not found' });
    if (!canAccessIncident(event, incident)) return generateApiResponse(403, { error: 'Forbidden' });
    if (!key.startsWith(`${incidentId}/`) || !(incident.attachments || []).some(item => item.key === key)) {
      return generateApiResponse(404, { error: 'Attachment not found' });
    }

    const url = await getPresignedDownloadUrl(S3_BUCKET, key, 300);
    return generateApiResponse(200, { url });
  } catch (error) {
    console.error('Error generating S3 download URL', { name: error.name || 'Error' });
    return generateApiResponse(500, { error: 'Failed to generate download URL' });
  }
};
