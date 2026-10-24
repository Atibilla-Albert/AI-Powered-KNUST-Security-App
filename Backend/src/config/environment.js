// config/environment.js
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const backendEnvPath = path.resolve(__dirname, '../../.env');
const repositoryEnvPath = path.resolve(__dirname, '../../../.env');

// Keep local .env values available for Serverless Offline. Serverless Offline
// stringifies CloudFormation intrinsic objects (for example !Ref) to
// "[object Object]" instead of resolving them locally.
const localEnv = {};
for (const envPath of [repositoryEnvPath, backendEnvPath]) {
  if (fs.existsSync(envPath)) {
    try {
      Object.assign(localEnv, dotenv.parse(fs.readFileSync(envPath)));
    } catch (error) {
      // Do not log file contents or secrets; environment loading can continue.
    }
  }
}

// Preserve normal dotenv behavior: existing shell/Lambda environment variables
// take precedence over .env values.
dotenv.config({ path: backendEnvPath });

const isPlaceholder = (value) =>
  value === '[object Object]' ||
  (typeof value === 'string' && value.startsWith('${') && value.endsWith('}'));

const getEnvironmentVariable = (key, defaultValue = '') => {
  let value = process.env[key];

  // A local .env string is the correct fallback when Serverless Offline cannot
  // resolve a CloudFormation intrinsic function. In deployed Lambda, CloudFormation
  // resolves these references before the function starts, so this branch is not used.
  if (isPlaceholder(value) || value === undefined || value === '') {
    const localValue = localEnv[key];
    if (typeof localValue === 'string' && localValue !== '' && !isPlaceholder(localValue)) {
      return localValue;
    }
  }

  if (isPlaceholder(value)) {
    return defaultValue;
  }

  return value !== undefined && value !== '' ? value : defaultValue;
};

module.exports = { getEnvironmentVariable };
