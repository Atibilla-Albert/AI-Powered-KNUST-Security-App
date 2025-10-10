/**
 * SNS client and operations for notifications (AWS SDK v3)
 */
const {
  SNSClient,
  PublishCommand,
  CreateTopicCommand,
  SubscribeCommand,
  ListTopicsCommand,
  ListSubscriptionsByTopicCommand,
} = require('@aws-sdk/client-sns');
const { Logger } = require('@aws-lambda-powertools/logger');

const logger = new Logger({ serviceName: 'security-incident-reporting' });

const snsClient = new SNSClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const DEFAULT_INCIDENT_TOPIC = process.env.SNS_TOPIC_ARN || 'arn:aws:sns:us-east-1:717279717548:security-incident-reporting-dev-incident-alerts';

/**
 * Exponential backoff with jitter
 */
const fetchWithRetry = async (fn, retries = 2, baseDelay = 300) => {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries) throw err;
      const jitter = Math.random() * 100;
      await new Promise((r) =>
        setTimeout(r, baseDelay * Math.pow(2, attempt) + jitter)
      );
      attempt++;
    }
  }
};

/**
 * Send an SNS notification
 * @param {string} topicArn
 * @param {string} subject
 * @param {Object|string} message
 * @param {Object} attributes
 */
const sendNotification = async (topicArn, subject, message, attributes = {}) => {
  try {
    if (!topicArn) throw new Error('topicArn is required');
    if (!subject) throw new Error('subject is required');
    if (!message) throw new Error('message is required');

    const messageAttributes = Object.entries(attributes).reduce((acc, [key, value]) => {
      acc[key] = {
        DataType: typeof value === 'number' ? 'Number' : 'String',
        StringValue: String(value),
      };
      return acc;
    }, {});

    const payload = {
      TopicArn: topicArn,
      Subject: subject,
      Message: typeof message === 'object' ? JSON.stringify(message) : message,
    };
    if (Object.keys(messageAttributes).length) {
      payload.MessageAttributes = messageAttributes;
    }

    const command = new PublishCommand(payload);
    const result = await fetchWithRetry(() => snsClient.send(command), 2, 300);
    logger.info('SNS notification sent', { messageId: result.MessageId, topicArn });
    return result;
  } catch (err) {
    logger.error('Failed to send SNS notification', { error: err.message, topicArn });
    throw new Error(`Failed to send SNS notification: ${err.message}`);
  }
};

/**
 * Publish wrapper
 */
const publishToTopic = async ({ topicArn, subject, message, attributes = {} }) => {
  if (!topicArn || !subject || !message) {
    logger.error('Invalid parameters for publishToTopic', { topicArn, subject, message });
    throw new Error('Missing required parameters: topicArn, subject, or message');
  }
  return sendNotification(topicArn, subject, message, attributes);
};

/**
 * Subscribe email to topic (idempotent-ish)
 */
const subscribeEmail = async (topicArn, email) => {
  try {
    if (!topicArn) throw new Error('topicArn is required');
    if (!email || !email.includes('@')) throw new Error('Valid email is required');

    // Check existing subscriptions to avoid duplicate subscribe requests
    try {
      const listSubsCmd = new ListSubscriptionsByTopicCommand({ TopicArn: topicArn });
      const subs = await snsClient.send(listSubsCmd);
      const already = (subs.Subscriptions || []).some(
        (s) => s.Endpoint === email && s.Protocol === 'email'
      );
      if (already) {
        logger.info('Email already subscribed', { email, topicArn });
        return;
      }
    } catch (e) {
      // if listing fails, proceed to attempt subscribe anyway
      logger.warn('Failed to list existing subscriptions, will attempt subscribe', {
        email,
        topicArn,
        reason: e.message,
      });
    }

    const command = new SubscribeCommand({
      Protocol: 'email',
      TopicArn: topicArn,
      Endpoint: email,
    });

    const result = await snsClient.send(command);
    logger.info('Email subscribed to SNS topic', { email, topicArn });
    return result;
  } catch (err) {
    logger.error('Failed to subscribe email', { email, topicArn, error: err.message });
    throw new Error(`Failed to subscribe email ${email}: ${err.message}`);
  }
};

/**
 * Create SNS topic
 */
const createTopic = async (name) => {
  try {
    if (!name) throw new Error('Topic name is required');
    const command = new CreateTopicCommand({ Name: name });
    const result = await snsClient.send(command);
    logger.info('Created SNS topic', { topicArn: result.TopicArn });
    return result.TopicArn;
  } catch (err) {
    logger.error('Failed to create SNS topic', { name, error: err.message });
    throw new Error(`Failed to create topic ${name}: ${err.message}`);
  }
};

/**
 * Ensure topic exists (lookup by name suffix), or create it
 */
const ensureTopicExists = async (name) => {
  try {
    if (!name) throw new Error('Topic name is required');
    const listCmd = new ListTopicsCommand({});
    const result = await snsClient.send(listCmd);
    const found = (result.Topics || []).find((t) => t.TopicArn && t.TopicArn.endsWith(`:${name}`));
    if (found && found.TopicArn) {
      logger.info('Topic already exists', { topicArn: found.TopicArn });
      return found.TopicArn;
    }
    return await createTopic(name);
  } catch (err) {
    logger.error('Error ensuring topic exists', { name, error: err.message });
    throw new Error(`Error ensuring topic ${name} exists: ${err.message}`);
  }
};

/**
 * Send structured incident alert to a topic (uses a default topic if none provided)
 */
const sendIncidentAlert = async (incident, incidentId, severityLevel, isSuspicious, topicArn = DEFAULT_INCIDENT_TOPIC) => {
  try {
    if (!incident || !incidentId || !severityLevel) {
      throw new Error('Missing required parameters: incident, incidentId, or severityLevel');
    }

    // Optionally ensure topic exists if using a friendly name instead of full ARN:
    // const resolvedTopicArn = topicArn.includes(':') ? topicArn : await ensureTopicExists(topicArn);
    const resolvedTopicArn = topicArn;

    const subject = `Security Alert: ${incident.type} - ${severityLevel} Priority`;
    const message = {
      incidentId,
      type: incident.type,
      severity: severityLevel,
      description: incident.description,
      location: incident.location,
      timestamp: incident.timestamp,
      isSuspicious,
      priority: severityLevel >= 4 ? 'HIGH' : severityLevel >= 3 ? 'MEDIUM' : 'LOW',
    };

    await sendNotification(resolvedTopicArn, subject, message);
    logger.info('Incident alert sent', { incidentId, topicArn: resolvedTopicArn });
  } catch (error) {
    logger.error('Failed to send incident alert', { incidentId, error: error.message });
    throw new Error(`Failed to send incident alert for ${incidentId}: ${error.message}`);
  }
};

module.exports = {
  sendNotification,
  publishToTopic,
  subscribeEmail,
  createTopic,
  ensureTopicExists,
  sendIncidentAlert,
};
