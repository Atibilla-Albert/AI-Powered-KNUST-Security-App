const {
  registerUserHandler,
  confirmRegistrationHandler,
  authenticateHandler,
  refreshTokensHandler,
  forgotPasswordHandler,
  confirmForgotPasswordHandler,
  resendConfirmationCodeHandler
} = require('../auth/cognito');
const userRepo = require('../data/repositories/userRepo');

const createResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
});

exports.register = async (event) => {
  return await registerUserHandler(event);
};

exports.confirmRegistration = async (event) => {
  return await confirmRegistrationHandler(event);
};

exports.login = async (event) => {
  return await authenticateHandler(event);
};

exports.refreshToken = async (event) => {
  return await refreshTokensHandler(event);
};

// --- Add password reset and resend confirmation handlers ---
exports.forgotPassword = async (event) => {
  return await forgotPasswordHandler(event);
};

exports.confirmForgotPassword = async (event) => {
  return await confirmForgotPasswordHandler(event);
};

exports.resendConfirmationCode = async (event) => {
  return await resendConfirmationCodeHandler(event);
};
