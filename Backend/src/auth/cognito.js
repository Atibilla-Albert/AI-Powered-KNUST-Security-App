const {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  GetUserCommand,
  RespondToAuthChallengeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ResendConfirmationCodeCommand
} = require("@aws-sdk/client-cognito-identity-provider");

const config = require("../config/config");
const awsConfig = require("../config/aws-config");
const { getUserRoleById } = require("./userRole");
const { errorResponse } = require("../utils/api-response");
const { User } = require('../data/models/users');
const { createItem } = require('../data/dynamodbclient');
const { TABLES } = require('../config/config');

// Validate Cognito configuration
function validateCognitoConfig() {
  if (
    !config.cognitoUserPoolId ||
    typeof config.cognitoUserPoolId !== 'string' ||
    !config.cognitoClientId ||
    typeof config.cognitoClientId !== 'string'
  ) {
    throw new Error(
      `Invalid Cognito configuration. ` +
      `UserPoolId: ${JSON.stringify(config.cognitoUserPoolId)}, ` +
      `ClientId: ${JSON.stringify(config.cognitoClientId)}`
    );
  }
}

const cognitoClient = new CognitoIdentityProviderClient({
  region: awsConfig.AWS_REGION
});

// Get user details from Cognito
async function getUserDetails(accessToken) {
  const command = new GetUserCommand({ AccessToken: accessToken });
  const response = await cognitoClient.send(command);
  const attributes = {};
  response.UserAttributes.forEach(attr => {
    attributes[attr.Name] = attr.Value;
  });
  return attributes;
}

// Error handler
const handleCognitoError = (error, operation) => {
  const mapping = {
    UsernameExistsException: [409, "An account with these details already exists"],
    NotAuthorizedException: [401, "Invalid credentials or expired session"],
    UserNotFoundException: [400, "Unable to complete authentication request"],
    UserNotConfirmedException: [403, "Account confirmation is required"],
    CodeMismatchException: [400, "Invalid verification code"],
    ExpiredCodeException: [400, "Verification code has expired"],
    TooManyRequestsException: [429, "Too many requests. Try again later"],
    LimitExceededException: [429, "Too many requests. Try again later"],
    InvalidPasswordException: [400, "Password does not meet the security requirements"],
  };
  const [statusCode, message] = mapping[error.name] || [500, "Authentication service request failed"];
  console.warn("Cognito operation failed", { operation, code: error.name || "UnknownError" });
  const safeError = new Error(message);
  safeError.statusCode = statusCode;
  safeError.code = error.name || "COGNITO_ERROR";
  return safeError;
};

// Register user with required custom attributes
async function registerUser(email, password, attributes = {}) {
  validateCognitoConfig();

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const firstName = attributes['custom:firstName'] || attributes.firstName;
  const lastName = attributes['custom:lastName'] || attributes.lastName;

  if (!firstName || !lastName) {
    throw new Error("First name and last name are required");
  }

  const userAttributes = [
    {
      Name: 'email',
      Value: email
    },
    {
      Name: 'custom:firstName',
      Value: firstName
    },
    {
      Name: 'custom:lastName',
      Value: lastName
    },
  ];

  const command = new SignUpCommand({
    ClientId: config.cognitoClientId,
    Username: email,
    Password: password,
    UserAttributes: userAttributes
  });

  try {
    const response = await cognitoClient.send(command);
    return {
      userId: response.UserSub,
      requiresConfirmation: !response.UserConfirmed
    };
  } catch (error) {
    throw handleCognitoError(error, 'registration');
  }
}


// Confirm registration
async function confirmRegistration(email, code) {
  validateCognitoConfig();

  if (!email || !code) {
    throw new Error("Email and code are required");
  }

  const command = new ConfirmSignUpCommand({
    ClientId: config.cognitoClientId,
    Username: email,
    ConfirmationCode: code
  });

  try {
    await cognitoClient.send(command);
    return { success: true };
  } catch (error) {
    throw handleCognitoError(error, 'confirmation');
  }
}

// Authenticate
async function authenticate(email, password) {
  validateCognitoConfig();

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const command = new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: config.cognitoClientId,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password
    }
  });

  try {
    const response = await cognitoClient.send(command);
    const user = await getUserDetails(response.AuthenticationResult.AccessToken);
    const role = user.sub ? await getUserRoleById(user.sub) : null;
    if (!role) {
      throw new Error("User profile is not provisioned");
    }
    return {
      ...response.AuthenticationResult,
      role
    };
  } catch (error) {
    throw handleCognitoError(error, 'authentication');
  }
}

// Token refresh
async function refreshTokens(refreshToken) {
  validateCognitoConfig();

  if (!refreshToken) {
    throw new Error("Refresh token is required");
  }

  const command = new InitiateAuthCommand({
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: config.cognitoClientId,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken
    }
  });

  try {
    const response = await cognitoClient.send(command);
    return response.AuthenticationResult;
  } catch (error) {
    throw handleCognitoError(error, 'token refresh');
  }
}

// Forgot password
async function forgotPasswordHandler(event) {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { email } = body;
    validateCognitoConfig();
    const command = new ForgotPasswordCommand({
      ClientId: config.cognitoClientId,
      Username: email
    });
    await cognitoClient.send(command);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Password reset code sent to email" })
    };
  } catch (error) {
    return errorResponse(error.message || "Failed to send password reset code", 400);
  }
}

// Confirm forgot password
async function confirmForgotPasswordHandler(event) {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { email, code, newPassword } = body;
    validateCognitoConfig();
    const command = new ConfirmForgotPasswordCommand({
      ClientId: config.cognitoClientId,
      Username: email,
      ConfirmationCode: code,
      Password: newPassword
    });
    await cognitoClient.send(command);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Password has been reset successfully" })
    };
  } catch (error) {
    return errorResponse(error.message || "Failed to reset password", 400);
  }
}

// Resend confirmation
async function resendConfirmationCodeHandler(event) {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { email } = body;
    if (!email) {
      return errorResponse("Email is required", 400);
    }
    validateCognitoConfig();
    const command = new ResendConfirmationCodeCommand({
      ClientId: config.cognitoClientId,
      Username: email
    });
    await cognitoClient.send(command);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Confirmation code resent successfully" })
    };
  } catch (error) {
    return errorResponse(error.message || "Failed to resend confirmation code", 400);
  }
}

// ✅ Register handler with firstName/lastName auto-detection
async function registerUserHandler(event) {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { email, password, attributes = {} } = body;

    const result = await registerUser(email, password, attributes);

    // Auto-extract full name fields
    const firstName = attributes['custom:firstName'] || attributes.firstName || '';
    const lastName = attributes['custom:lastName'] || attributes.lastName || '';
    // Public registration must never assign elevated privileges.
    const role = 'REGULAR_USER';

    if (result && result.userId) {
      const user = new User({
        id: result.userId,
        email,
        firstName,
        lastName,
        role,
        cognitoId: result.userId
      });

      await createItem(TABLES.USERS, user.toDynamoItem());
    }

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "User registered successfully",
        ...result
      })
    };
  } catch (error) {
    return errorResponse(error.message || "Registration failed", error.statusCode || 400);
  }
}

// Auth handlers
async function confirmRegistrationHandler(event) {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { email, code } = body;
    await confirmRegistration(email, code);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "User confirmed successfully" })
    };
  } catch (error) {
    return errorResponse(error.message, 400);
  }
}

async function authenticateHandler(event) {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { email, password } = body;
    const tokens = await authenticate(email, password);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Authentication successful",
        tokens
      })
    };
  } catch (error) {
    return errorResponse(error.message || "Authentication failed", error.statusCode || 400);
  }
}

async function refreshTokensHandler(event) {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { refreshToken } = body;
    const tokens = await refreshTokens(refreshToken);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Token refreshed successfully",
        tokens
      })
    };
  } catch (error) {
    return errorResponse(error.message || "Token refresh failed", error.statusCode || 400);
  }
}

module.exports = {
  registerUser,
  registerUserHandler,
  confirmRegistration,
  confirmRegistrationHandler,
  authenticate,
  authenticateHandler,
  refreshTokens,
  refreshTokensHandler,
  forgotPasswordHandler,
  confirmForgotPasswordHandler,
  resendConfirmationCodeHandler,
  getUserDetails
};
