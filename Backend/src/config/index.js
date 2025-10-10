const { getEnvironmentVariable } = require('./environment');

const loadConfig = () => {
  const awsRegion = getEnvironmentVariable('AWS_REGION', 'us-east-1');
  const stage = getEnvironmentVariable('STAGE', 'dev');
  
  // Directly use the values from your .env file
  const cognitoUserPoolId = 'us-east-1_d5YngXjKC';
  const cognitoClientId = '72ncbq4u2avoqdmfd58likbt9e';

  console.log('Loaded Cognito configuration:', {
    userPoolId: cognitoUserPoolId,
    clientId: cognitoClientId,
    issuer: `https://cognito-idp.${awsRegion}.amazonaws.com/${cognitoUserPoolId}`
  });

  return {
    awsRegion,
    stage,
    cognito: {
      userPoolId: cognitoUserPoolId,
      clientId: cognitoClientId,
      issuer: `https://cognito-idp.${awsRegion}.amazonaws.com/${cognitoUserPoolId}`
    },
    isLocal: stage === 'local' || process.env.IS_OFFLINE
  };
};

module.exports = loadConfig();