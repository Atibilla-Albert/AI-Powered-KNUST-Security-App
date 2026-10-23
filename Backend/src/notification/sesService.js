/**
 * AWS SES service for direct email sending (no subscription required)
 */
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { Logger } = require('@aws-lambda-powertools/logger');

const logger = new Logger({ serviceName: 'security-incident-reporting' });

const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const DEFAULT_FROM_EMAIL = process.env.DEFAULT_SENDER_EMAIL || 'noreply@campus.edu';

/**
 * Format plain text message as HTML email
 * @param {string} textMessage - Plain text message
 * @returns {string} HTML formatted message
 */
const formatHtmlEmail = (textMessage) => {
  // Convert plain text to HTML with basic formatting
  let html = textMessage
    // Preserve line breaks
    .replace(/\n/g, '<br>')
    // Make headers bold (lines with ===)
    .replace(/^={2,}.*$/gm, '<hr>')
    // Make emojis visible
    .replace(/🚨/g, '🚨')
    .replace(/📍/g, '📍')
    .replace(/📋/g, '📋')
    .replace(/🆔/g, '🆔')
    .replace(/📝/g, '📝')
    .replace(/⚠️/g, '⚠️')
    .replace(/📊/g, '📊')
    .replace(/🕐/g, '🕐')
    .replace(/📄/g, '📄')
    .replace(/👥/g, '👥')
    .replace(/🏢/g, '🏢')
    .replace(/📧/g, '📧')
    .replace(/📞/g, '📞')
    .replace(/👤/g, '👤')
    .replace(/🗺️/g, '🗺️');

  // Wrap in HTML structure
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    hr { border: none; border-top: 2px solid #eee; margin: 20px 0; }
    a { color: #007bff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .header { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .section { margin: 15px 0; padding: 10px; background-color: #f8f9fa; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    ${html}
  </div>
</body>
</html>`;
};

/**
 * Send email directly via SES (no subscription required)
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} message - Email body (plain text)
 * @param {string} fromEmail - Sender email (must be verified in SES)
 * @returns {Promise<Object>} SendEmailCommand result
 */
const sendEmail = async (to, subject, message, fromEmail = DEFAULT_FROM_EMAIL) => {
  try {
    if (!to || !to.includes('@')) {
      throw new Error('Valid recipient email is required');
    }
    if (!subject) {
      throw new Error('Email subject is required');
    }
    if (!message) {
      throw new Error('Email message is required');
    }

    const command = new SendEmailCommand({
      Source: fromEmail,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: message,
            Charset: 'UTF-8',
          },
          // HTML body with better formatting
          Html: {
            Data: formatHtmlEmail(message),
            Charset: 'UTF-8',
          },
        },
      },
    });

    const result = await sesClient.send(command);
    logger.info('Email sent via SES', { 
      messageId: result.MessageId, 
      to,
      subject 
    });
    return result;
  } catch (err) {
    logger.error('Failed to send email via SES', { 
      to,
      error: err.message,
      code: err.code 
    });
    throw new Error(`Failed to send email to ${to}: ${err.message}`);
  }
};

module.exports = {
  sendEmail,
  DEFAULT_FROM_EMAIL,
};

