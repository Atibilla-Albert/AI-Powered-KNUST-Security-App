const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { S3Client } = require('@aws-sdk/client-s3');
const { CognitoIdentityProviderClient } = require('@aws-sdk/client-cognito-identity-provider');
const { SageMakerClient } = require('@aws-sdk/client-sagemaker');
const { SNSClient } = require('@aws-sdk/client-sns');
const { LambdaClient } = require('@aws-sdk/client-lambda');
const { getEnvironmentVariable } = require('./environment');

// Environment variables
const AWS_REGION = getEnvironmentVariable('AWS_REGION', 'us-east-1');
const STAGE = getEnvironmentVariable('STAGE', 'dev');

// AWS SDK Clients
const dynamoDb = new DynamoDBClient({ region: AWS_REGION });
const s3Client = new S3Client({ region: AWS_REGION });
const cognitoClient = new CognitoIdentityProviderClient({ region: AWS_REGION });
const sagemakerClient = new SageMakerClient({ region: AWS_REGION });
const snsClient = new SNSClient({ region: AWS_REGION });
const lambdaClient = new LambdaClient({ region: AWS_REGION });

// Table names
const TABLES = {
  INCIDENTS: `${STAGE}-incidents`,
  USERS: `${STAGE}-users`,
  ORGANIZATIONS: `${STAGE}-organizations`,
  NOTIFICATIONS: `${STAGE}-notifications`
};

// S3 Buckets
const BUCKETS = {
  INCIDENT_MEDIA: `${STAGE}-incident-media`,
  ML_MODELS: `${STAGE}-ml-models`
};

// Cognito
const COGNITO = {
  USER_POOL_ID: getEnvironmentVariable('COGNITO_USER_POOL_ID'),
  USER_POOL_CLIENT_ID: getEnvironmentVariable('COGNITO_USER_POOL_CLIENT_ID'),
  IDENTITY_POOL_ID: getEnvironmentVariable('COGNITO_IDENTITY_POOL_ID'),
  REGION: AWS_REGION
};

// SNS
const SNS = {
  HIGH_PRIORITY_INCIDENTS: getEnvironmentVariable('SNS_HIGH_PRIORITY_TOPIC_ARN'),
  REGION: AWS_REGION
};

// SageMaker Endpoints
const SAGEMAKER = {
  FRAUD_DETECTION_ENDPOINT: getEnvironmentVariable('SAGEMAKER_FRAUD_DETECTION_ENDPOINT'),
  INCIDENT_CLASSIFICATION_ENDPOINT: getEnvironmentVariable('SAGEMAKER_INCIDENT_CLASSIFICATION_ENDPOINT'),
  REGION: AWS_REGION
};

// API Gateway Endpoints
const ENDPOINTS = {
  REGISTER: getEnvironmentVariable('API_REGISTER'),
  LOGIN: getEnvironmentVariable('API_LOGIN'),
  REFRESH_TOKEN: getEnvironmentVariable('API_REFRESH_TOKEN'),
  GET_USER: getEnvironmentVariable('API_GET_USER'),
  UPDATE_USER: getEnvironmentVariable('API_UPDATE_USER'),
  CREATE_SECURITY_PERSONNEL: getEnvironmentVariable('API_CREATE_SECURITY_PERSONNEL'),
  CREATE_INCIDENT: getEnvironmentVariable('API_CREATE_INCIDENT'),
  GET_INCIDENT: getEnvironmentVariable('API_GET_INCIDENT'),
  UPLOAD_INCIDENT_MEDIA: getEnvironmentVariable('API_UPLOAD_INCIDENT_MEDIA'),
  LIST_USER_INCIDENTS: getEnvironmentVariable('API_LIST_USER_INCIDENTS'),
  LIST_ALL_INCIDENTS: getEnvironmentVariable('API_LIST_ALL_INCIDENTS'),
  UPDATE_INCIDENT_STATUS: getEnvironmentVariable('API_UPDATE_INCIDENT_STATUS'),
  CREATE_NOTIFICATION_CONFIG: getEnvironmentVariable('API_CREATE_NOTIFICATION_CONFIG'),
  SUBSCRIBE_TO_NOTIFICATIONS: getEnvironmentVariable('API_SUBSCRIBE_TO_NOTIFICATIONS')
};

// Configurations
const S3 = { REGION: AWS_REGION };
const SageMaker = { REGION: AWS_REGION };

// ✅ Export all
module.exports = {
  AWS_REGION,
  STAGE,
  dynamoDb,
  s3Client,
  cognitoClient,
  sagemakerClient,
  snsClient,
  lambdaClient,
  TABLES,
  BUCKETS,
  COGNITO,
  SNS,
  SAGEMAKER,
  ENDPOINTS,
  S3,
  SageMaker
};
