import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ------------------ Configuration ------------------
const API_BASE_URL =
  typeof process !== 'undefined' && process.env?.API_BASE_URL
    ? process.env.API_BASE_URL
    : 'http://172.20.10.4:3000/dev'; // adjust for emulator vs device if needed

// ------------------ Axios instance ------------------
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
});

// ------------------ Retry helper ------------------
const withRetry = async (fn, retries = 2, baseDelay = 500) => {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      const status = err.response?.status;
      const isRetryable =
        !status || status >= 500 || status === 429 || err.code === 'ERR_NETWORK';
      if (attempt >= retries || !isRetryable) {
        throw err;
      }
      const backoff = baseDelay * Math.pow(2, attempt) + Math.random() * 100;
      await new Promise((r) => setTimeout(r, backoff));
      attempt++;
    }
  }
};

// ------------------ Token Helpers ------------------
export const setTokens = async ({ accessToken, refreshToken }) => {
  if (accessToken) await SecureStore.setItemAsync('accessToken', accessToken);
  if (refreshToken) await SecureStore.setItemAsync('refreshToken', refreshToken);
};

export const clearTokens = async () => {
  await Promise.all([
    SecureStore.deleteItemAsync('accessToken'),
    SecureStore.deleteItemAsync('refreshToken'),
    SecureStore.deleteItemAsync('idToken'),
  ]);
};

export const forceLogout = async (navigation) => {
  await clearTokens();
  // Optional: navigate to login if navigation provided
  if (navigation && navigation.reset) {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }
};

// ------------------ Interceptor state ------------------
let isRefreshing = false;
let refreshQueue = [];

/**
 * Notify all queued requests about token refresh result
 */
const processQueue = (error, token = null) => {
  refreshQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token);
  });
  refreshQueue = [];
};

// ------------------ Request Interceptor ------------------
api.interceptors.request.use(
  async (config) => {
    const isPublicAuthRoute = config.url?.startsWith('/auth/');
    const token = isPublicAuthRoute ? null : await SecureStore.getItemAsync('accessToken');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
      if (__DEV__) {
        console.log('Added Authorization header', {
          url: config.url,
          method: config.method,
        });
      }
    } else {
      if (__DEV__) {
        console.warn('No access token found for request', {
          url: config.url,
          method: config.method,
        });
      }
    }
    return config;
  },
  (err) => Promise.reject(err)
);

// ------------------ Response Interceptor ------------------
api.interceptors.response.use(
  (res) => {
    // Do not log response bodies: auth responses include bearer/refresh tokens and other APIs return sensitive data.
    return res;
  },
  async (error) => {
    const originalRequest = error.config;

    // If there's no config or it's already retried, bail
    if (!originalRequest) return Promise.reject(error);

    const status = error.response?.status;

    // Handle 401 token refresh
    const isPublicAuthRoute = originalRequest.url?.startsWith('/auth/');
    if (status === 401 && !originalRequest._retry && !isPublicAuthRoute) {
      if (isRefreshing) {
        // Queue and wait for refresh to complete
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((e) => Promise.reject(e));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) {
          if (__DEV__) console.warn('No refresh token available. Forcing logout.');
          await clearTokens();
          processQueue(new Error('No refresh token'), null);
          isRefreshing = false;
          return Promise.reject(error);
        }

        if (__DEV__) console.log('Refreshing token...');
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken =
          data?.tokens?.AccessToken || data?.tokens?.accessToken;
        const newRefreshToken =
          data?.tokens?.RefreshToken || data?.tokens?.refreshToken;

        if (!newAccessToken) {
          throw new Error('No access token returned from refresh');
        }

        await setTokens({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken ?? refreshToken,
        });

        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        isRefreshing = false;

        if (__DEV__) console.log('Token refreshed successfully');

        return api(originalRequest);
      } catch (e) {
        if (__DEV__) console.warn('Token refresh failed', { status: e.response?.status, code: e.code });

        // Determine if refresh token is invalid/expired
        const errCode =
          e.response?.data?.error?.code ||
          e.response?.data?.error?.message ||
          '' +
            '';
        if (
          errCode.toString().toLowerCase().includes('invalid') ||
          errCode.toString().toLowerCase().includes('expired') ||
          e.response?.status === 401
        ) {
          // Force logout path (consumer can handle redirect)
          await clearTokens();
        }

        processQueue(e, null);
        isRefreshing = false;
        return Promise.reject(e);
      }
    }

    // Log and propagate other errors
    if (__DEV__) {
      console.warn('API request failed', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        code: error.code,
      });
    }
    return Promise.reject(error);
  }
);

// ------------------ AUTH API ------------------
export const registerUser = (userData) => {
  // Do not log registration payloads; they contain passwords and personal data.
  return api.post('/auth/register', userData);
};

export const confirmRegistration = (data) => {
  // Do not log verification codes or email addresses.
  return api.post('/auth/confirm', data);
};

export const loginUser = (credentials) => {
  if (__DEV__) console.log('Logging in');
  return api.post('/auth/login', credentials);
};

export const forgotPassword = (data) => {
  if (__DEV__) console.log('Requesting password reset');
  return api.post('/auth/forgot-password', data);
};

export const confirmForgotPassword = (data) => {
  if (__DEV__) console.log('Confirming password reset');
  return api.post('/auth/confirm-forgot-password', data);
};

export const resendConfirmation = (data) => {
  if (__DEV__) console.log('Resending confirmation');
  return api.post('/auth/resend-confirmation', data);
};

export const refreshTokens = (refreshToken) => {
  if (__DEV__) console.log('Refreshing tokens manually');
  return api.post('/auth/refresh', { refreshToken });
};

// ------------------ INCIDENT API ------------------
export const reportIncident = (incidentData) => {
  if (__DEV__) console.log('Reporting incident', { incidentData });
  return api
    .post('/incidents', incidentData)
    .then((response) => {
      // Incident responses can contain sensitive personal information.
      return response;
    })
    .catch((error) => {
      if (__DEV__) {
        console.error('Incident report failed:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
      }
      throw error;
    });
};

export const getIncidents = () => {
  if (__DEV__) console.log('Fetching all incidents');
  return api.get('/incidents');
};

export const getMyIncidents = () => {
  if (__DEV__) console.log('Fetching user incidents');
  return api.get('/incidents/my');
};

export const getIncidentById = (id) => {
  if (__DEV__) console.log('Fetching incident by ID', { id });
  return api.get(`/incidents/${id}`);
};

export const getIncidentMediaUploadUrl = (incidentId, filename, contentType) => {
  // Upload URLs and incident metadata must not be written to logs.
  return api
    .post(`/incidents/${incidentId}/media/upload-url`, {
      filename,
      contentType,
    })
    .then((response) => {
      // Presigned URLs are temporary bearer credentials; never log them.
      return response;
    })
    .catch((error) => {
      if (__DEV__) {
        console.error('Failed to get upload URL:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
      }
      throw error;
    });
};

// Upload to S3 (pre-signed)
export const uploadToS3 = async (presignedUrl, fileUri, contentType) => {
  // Never log presigned URLs or local file URIs.

  const response = await fetch(fileUri);
  const blob = await response.blob();

  const uploadRes = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: blob,
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    if (__DEV__) {
      console.error('S3 upload failed', { status: uploadRes.status, text });
    }
    throw new Error(`Failed to upload media to S3: ${uploadRes.status} ${text}`);
  }

  if (__DEV__) console.log('S3 upload successful');
  return true;
};

// Add attachment to incident
export const addIncidentAttachment = (incidentId, key) => {
  if (__DEV__) console.log('Adding attachment to incident', { incidentId, key });
  return api
    .post(`/incidents/${incidentId}/media`, { key })
    .then((response) => {
      if (__DEV__) console.log('Attachment added successfully', response.data);
      return response;
    })
    .catch((error) => {
      if (__DEV__) {
        console.error('Failed to add attachment:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
      }
      throw error;
    });
};

// ------------------ EMERGENCY ALERT ------------------
export const sendEmergencyAlert = async (
  { latitude, longitude, address, timestamp, accuracy },
  opts = {}
) => {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    if (__DEV__) console.error('Invalid emergency alert data', { latitude, longitude });
    throw new Error('Latitude and longitude must be numbers');
  }

  const payload = {
    latitude,
    longitude,
    address: address || 'Unknown location',
    timestamp: timestamp || new Date().toISOString(),
    accuracy: typeof accuracy === 'number' ? accuracy : null,
  };

  if (__DEV__) {
    console.log('Sending emergency alert with data:', payload);
  }

  try {
    const response = await withRetry(() => api.post('/emergency/alert', payload), 2);

    // Expect proper envelope
    if (response.status >= 200 && response.status < 300) {
      const body = response.data;
      if (!body || body.success !== true) {
        const errMsg = body?.error || 'Unexpected response shape from alert endpoint';
        throw new Error(errMsg);
      }
      if (__DEV__) console.log('Emergency alert sent successfully', body);
      return response;
    }

    throw new Error(`Unexpected status code ${response.status}`);
  } catch (error) {
    if (__DEV__) {
      console.warn('Emergency alert failed', {
        status: error.response?.status,
        code: error.code,
        method: error.config?.method,
      });
    }
    throw error;
  }
};

export default api;
