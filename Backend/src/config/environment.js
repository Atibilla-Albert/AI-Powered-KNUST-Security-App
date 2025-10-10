// config/environment.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const getEnvironmentVariable = (key, defaultValue = '') => {
  const value = process.env[key];
  
  // Special handling for "[object Object]" strings
  if (value === '[object Object]') {
    console.error(`WARNING: Environment variable ${key} is set to "[object Object]"`);
    return defaultValue;
  }
  
  // Handle CloudFormation references during deployment
  if (value && typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
    console.warn(`CloudFormation reference detected for ${key}, using default value`);
    return defaultValue;
  }
  
  return value !== undefined ? value : defaultValue;
};

module.exports = { getEnvironmentVariable };