// AWS Amplify configuration
import { Amplify } from 'aws-amplify';

const awsConfig = {
  Auth: {
    // Amazon Cognito Region
    region: 'us-east-1',
    userPoolId: 'us-east-1_example',
    userPoolWebClientId: 'example-client-id',
    mandatorySignIn: true,
    authenticationFlowType: 'USER_PASSWORD_AUTH',
  },
  Storage: {
    // Amazon S3 configuration
    AWSS3: {
      bucket: 'incident-media-files',
      region: 'us-east-1',
    }
  },
  API: {
    // API Gateway configuration
    endpoints: [
      {
        name: 'incidentApi',
        endpoint: 'https://api.example.com/incidents',
        region: 'us-east-1',
      },
      {
        name: 'notificationApi',
        endpoint: 'https://api.example.com/notifications',
        region: 'us-east-1',
      },
      {
        name: 'userApi',
        endpoint: 'https://api.example.com/users',
        region: 'us-east-1',
      }
    ]
  },
  Analytics: {
    // Amazon Sagemaker configuration
    // This would be handled via API Gateway typically
  },
  Predictions: {
    // For potential image analysis features
    interpret: {
      // Vision capabilities if needed for image analysis 
      region: 'us-east-1',
    }
  }
};

export const configureAmplify = () => {
  Amplify.configure(awsConfig);
};

export default awsConfig;