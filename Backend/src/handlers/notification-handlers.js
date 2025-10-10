const AWS = require('aws-sdk');
const axios = require('axios');
const snsService = require('../notification/snsService');
const { formatResponse, formatError } = require('../utils/api-response');

const GEOCODING_API_KEY = process.env.GEOCODING_API_KEY;

/**
 * Get place name from coordinates using OpenCage Geocoding API
 */
const getLocationName = async (lat, lng) => {
  try {
    const response = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
      params: {
        q: `${lat},${lng}`,
        key: GEOCODING_API_KEY,
      },
    });

    const place = response.data.results[0]?.formatted;
    return place || 'Unknown Location';
  } catch (error) {
    console.error('Error fetching location name:', error.message);
    return 'Unknown Location';
  }
};

/**
 * Create or update a notification config (Admin only)
 */
module.exports.createOrUpdateNotificationConfig = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const userId = event.requestContext.authorizer.claims.sub;
    const userType = event.requestContext.authorizer.claims['custom:user_type'];

    if (userType !== 'Admin') {
      return formatError(403, 'Only administrators can manage notification configurations');
    }

    const config = await snsService.createOrUpdateNotificationConfig(body, userId);

    return formatResponse(200, {
      configId: config.configId,
      name: config.name,
      active: config.active,
    });
  } catch (error) {
    console.error('Error in createOrUpdateNotificationConfig:', error.message);
    if (error.message.includes('Missing required')) {
      return formatError(400, error.message);
    }
    return formatError(500, 'Error managing notification configuration');
  }
};

/**
 * Subscribe user to a topic (Admin or Security only)
 */
module.exports.subscribeUserToTopic = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const userType = event.requestContext.authorizer.claims['custom:user_type'];

    if (!body.topicArn || !body.email) {
      return formatError(400, 'Topic ARN and email are required');
    }

    if (!['Admin', 'Security'].includes(userType)) {
      return formatError(403, 'Insufficient permissions to subscribe to notification topics');
    }

    const result = await snsService.subscribeUserToTopic(body.topicArn, body.email);

    return formatResponse(200, {
      subscriptionArn: result.subscriptionArn,
      email: result.email,
    });
  } catch (error) {
    console.error('Error in subscribeUserToTopic:', error.message);
    return formatError(500, 'Error subscribing to notification topic');
  }
};

/**
 * Send a test notification (Admin only)
 */
module.exports.sendNotification = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const userType = event.requestContext.authorizer.claims['custom:user_type'];

    if (userType !== 'Admin') {
      return formatError(403, 'Only administrators can send test notifications');
    }

    if (!body.topicArn || !body.subject || !body.message) {
      return formatError(400, 'Topic ARN, subject, and message are required');
    }

    const sns = new AWS.SNS();
    const result = await sns
      .publish({
        TopicArn: body.topicArn,
        Subject: `[TEST] ${body.subject}`,
        Message: body.message,
      })
      .promise();

    return formatResponse(200, {
      messageId: result.MessageId,
      status: 'Test notification sent',
    });
  } catch (error) {
    console.error('Error in sendTestNotification:', error.message);
    return formatError(500, 'Error sending test notification');
  }
};

/**
 * Process high-credibility incidents from DynamoDB stream
 */
module.exports.processHighCredibilityIncident = async (event) => {
  const dynamo = AWS.DynamoDB.Converter;

  try {
    for (const record of event.Records) {
      if (record.eventName !== 'MODIFY') continue;

      const newImage = dynamo.unmarshall(record.dynamodb.NewImage);

      if (!newImage.incidentId || !newImage.mlAnalysis) continue;

      const { credibilityScore, fakeProbability } = newImage.mlAnalysis;
      const severityLevel = newImage.severityLevel;

      if (credibilityScore >= 70 && fakeProbability < 30 && severityLevel >= 3) {
        console.log(`Notifying about high-credibility incident: ${newImage.incidentId}`);
        await snsService.notifyAboutIncident(newImage, newImage.mlAnalysis);
      }
    }

    return { statusCode: 200, body: 'Stream processed' };
  } catch (error) {
    console.error('Error in processHighCredibilityIncident:', error.message);
    throw error;
  }
};

/**
 * Receive SOS emergency alert and resolve place name
 */
module.exports.receiveEmergencyAlert = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const userId = event.requestContext.authorizer.claims.sub;
    const userType = event.requestContext.authorizer.claims['custom:user_type'];

    const { latitude, longitude } = body;

    if (!latitude || !longitude) {
      return formatError(400, 'Latitude and longitude are required');
    }

    const topicArn = process.env.SOS_ALERT_TOPIC_ARN;
    if (!topicArn) {
      return formatError(500, 'Missing SOS_ALERT_TOPIC_ARN in environment');
    }

    const locationName = await getLocationName(latitude, longitude);

    const message = `🚨 EMERGENCY ALERT 🚨\nUser ID: ${userId}\nRole: ${userType}\nLocation: ${locationName}\nMap: https://www.google.com/maps?q=${latitude},${longitude}`;

    await snsService.publishToTopic({
      topicArn,
      subject: '🚨 Emergency Alert',
      message,
    });

    return formatResponse(200, { status: 'Emergency alert sent' });
  } catch (error) {
    console.error('Error in receiveEmergencyAlert:', error.message);
    return formatError(500, 'Failed to process emergency alert');
  }
};
