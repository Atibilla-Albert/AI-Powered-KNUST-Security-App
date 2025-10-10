const { SNSClient, PublishCommand, SubscribeCommand, ListSubscriptionsByTopicCommand } = require('@aws-sdk/client-sns');
const axios = require('axios');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { Logger } = require('@aws-lambda-powertools/logger');

const logger = new Logger({ serviceName: 'security-incident-reporting' });

const USERS_TABLE = process.env.USERS_TABLE || 'dev-users';
const SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:717279717548:security-incident-reporting-dev-incident-alerts';

const dynamodbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);
const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });

const getReadableLocation = async (lat, lon) => {
  try {
    const apiKey = process.env.GEOCODING_API_KEY;
    if (!apiKey) {
      logger.warn('Geocoding API key not set');
      return null;
    }

    logger.info('Fetching readable location', { latitude: lat, longitude: lon });
    const res = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
      params: {
        key: apiKey,
        q: `${lat},${lon}`,
        language: 'en',
        pretty: 1,
      },
      timeout: 5000,
    });

    const formatted = res.data?.results?.[0]?.formatted || null;
    logger.info('Geocoding result', { formatted });
    return formatted;
  } catch (error) {
    logger.error('Geocoding failed', { error: error.message, code: error.code });
    return null;
  }
};

const getAdminUsers = async () => {
  try {
    logger.info('Scanning DynamoDB for admin users', { table: USERS_TABLE });
    const params = {
      TableName: USERS_TABLE,
      FilterExpression: '#r = :admin',
      ExpressionAttributeNames: { '#r': 'role' },
      ExpressionAttributeValues: { ':admin': 'admin' },
    };

    const result = await dynamodb.send(new ScanCommand(params));
    const items = result.Items || [];
    logger.info('Fetched admin users', { count: items.length });
    return items;
  } catch (error) {
    logger.error('Failed to fetch admin users', { error: error.message, code: error.code });
    throw new Error(`DynamoDB scan failed: ${error.message}`);
  }
};

const ensureEmailSubscribed = async (email) => {
  // Avoid resubscribing if already subscribed/confirmed
  try {
    const listCmd = new ListSubscriptionsByTopicCommand({ TopicArn: SNS_TOPIC_ARN });
    const existing = await snsClient.send(listCmd);
    const already = (existing.Subscriptions || []).some(
      (s) => s.Endpoint === email && s.Protocol === 'email'
    );
    if (already) {
      logger.info('Email already subscribed to topic', { email });
      return;
    }
    logger.info('Subscribing email to SNS topic', { email, topicArn: SNS_TOPIC_ARN });
    const subscribeCommand = new SubscribeCommand({
      Protocol: 'email',
      TopicArn: SNS_TOPIC_ARN,
      Endpoint: email,
    });
    await snsClient.send(subscribeCommand);
    logger.info('Subscription request sent (email)', { email });
  } catch (err) {
    logger.warn('Failed to ensure email subscription', { email, error: err.message });
    // proceed; subscription failure shouldn't block alert publish
  }
};

const publishToSns = async (message) => {
  if (!SNS_TOPIC_ARN || typeof SNS_TOPIC_ARN !== 'string' || !SNS_TOPIC_ARN.startsWith('arn:aws:sns:')) {
    logger.error('Invalid or missing SNS_TOPIC_ARN', { snsTopicArn: SNS_TOPIC_ARN });
    throw new Error('Invalid or missing SNS_TOPIC_ARN environment variable');
  }

  try {
    logger.info('Publishing to SNS topic', { topicArn: SNS_TOPIC_ARN });
    const publishCommand = new PublishCommand({
      TopicArn: SNS_TOPIC_ARN,
      Message: message,
      Subject: '🚨 Emergency Alert',
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional',
        },
      },
    });
    const result = await snsClient.send(publishCommand);
    logger.info('Published emergency alert', { messageId: result.MessageId });
    return result;
  } catch (error) {
    logger.error('Failed to publish to SNS topic', { error: error.message, code: error.code });
    throw new Error(`SNS publish failed: ${error.message}`);
  }
};

module.exports.receiveEmergencyAlert = async (event, context) => {
  try {
    logger.info('Received emergency alert event', {
      eventId: context.awsRequestId,
      body: event.body,
    });

    const body = JSON.parse(event.body || '{}');
    const { latitude, longitude, address, timestamp, accuracy } = body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      logger.warn('Missing required fields', { body });
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Latitude and longitude are required and must be numbers',
        }),
      };
    }

    const userId = event.requestContext?.authorizer?.claims?.sub || 'Unknown';
    const role = event.requestContext?.authorizer?.claims?.['custom:role'] || 'Unknown';

    const readableLocation = await getReadableLocation(latitude, longitude);
    const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    const message = `🚨 EMERGENCY ALERT 🚨
User: ${userId}
Role: ${role}
Location: ${readableLocation || address || 'Unknown'}
Map: ${mapsLink}
Timestamp: ${timestamp || new Date().toISOString()}
Accuracy: ${accuracy != null ? accuracy : 'Unknown'} m`;

    logger.info('Preparing to notify admins', { message });

    // Fetch admins and ensure they are subscribed (only email subscription)
    let admins = [];
    try {
      admins = await getAdminUsers();
      if (admins.length === 0) {
        logger.warn('No admin users found for notification, skipping individual subscribe');
      } else {
        // Ensure each admin's email is subscribed (non-blocking)
        await Promise.all(
          admins
            .filter((a) => a.email)
            .map((admin) => ensureEmailSubscribed(admin.email))
        );
      }
    } catch (err) {
      logger.warn('Failed to fetch or subscribe admins, proceeding to publish to topic', { error: err.message });
    }

    // Publish the alert
    await publishToSns(message);

    // Success response
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Alert sent to SNS topic',
      }),
    };
  } catch (error) {
    logger.error('Error in receiveEmergencyAlert', {
      error: error.message,
      code: error.code,
      stack: error.stack,
    });
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: `Failed to process emergency alert: ${error.message}`,
      }),
    };
  }
};
