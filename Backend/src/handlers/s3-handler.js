const { getPresignedUploadUrl, getPresignedDownloadUrl, generateIncidentAttachmentKey } = require('../data/s3client');
const { TABLES } = require('../config/config');
const { getItemById, updateItem } = require('../data/dynamodbclient');
const { generateApiResponse } = require('../utils/api-response');

const S3_BUCKET = process.env.S3_BUCKET;

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

    const key = generateIncidentAttachmentKey(incidentId, filename);
    const url = await getPresignedUploadUrl(S3_BUCKET, key, contentType, 300);

    // Verify incident exists but don't add attachment yet - wait for successful upload
    const incident = await getItemById(TABLES.INCIDENTS, incidentId);
    if (!incident) {
      return generateApiResponse(404, { error: 'Incident not found' });
    }

    return generateApiResponse(200, { url, key });
  } catch (error) {
    console.error('Error generating S3 upload URL:', error);
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
    if (!incident) {
      return generateApiResponse(404, { error: 'Incident not found' });
    }

    const updatedAttachments = [...(incident.attachments || []), { key }];
    await updateItem(TABLES.INCIDENTS, incidentId, { attachments: updatedAttachments });

    return generateApiResponse(200, { message: 'Attachment added successfully', key });
  } catch (error) {
    console.error('Error adding attachment:', error);
    return generateApiResponse(500, { error: 'Failed to add attachment' });
  }
};

// === Download Handler ===
exports.getIncidentMediaDownloadUrl = async (event) => {
  try {
    const incidentId = event.pathParameters?.id;
    const key = event.queryStringParameters?.key;

    console.log('S3 Download Request:', { incidentId, key, bucket: S3_BUCKET });

    if (!incidentId || !key) {
      return generateApiResponse(400, { error: 'Missing incident ID or key' });
    }

    if (!S3_BUCKET) {
      console.error('S3_BUCKET environment variable not set');
      return generateApiResponse(500, { error: 'S3 bucket not configured' });
    }

    const url = await getPresignedDownloadUrl(S3_BUCKET, key, 300);
    console.log('Generated download URL:', url);
    return generateApiResponse(200, { url });
  } catch (error) {
    console.error('Error generating S3 download URL:', error);
    return generateApiResponse(500, { error: 'Failed to generate download URL' });
  }
};
