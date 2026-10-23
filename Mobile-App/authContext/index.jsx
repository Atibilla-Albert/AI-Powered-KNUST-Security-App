import React, { useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, setTokens, clearTokens, getTokens } from '../Services/api';

const AuthContext = React.createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

const claimsForDisplayOnly = (token) => {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(globalThis.atob(payload));
  } catch {
    return {};
  }
};

const userFromAccessToken = (token) => {
  const claims = claimsForDisplayOnly(token);
  const groups = Array.isArray(claims['cognito:groups']) ? claims['cognito:groups'] : [];
  const names = new Set(groups.map(group => String(group).toUpperCase()));
  const role = names.has('ADMIN') || names.has('ADMINISTRATORS')
    ? 'ADMIN'
    : names.has('SECURITY_PERSONNEL') || names.has('SECURITYSTAFF') || names.has('SUPERVISORS')
      ? 'SECURITY_PERSONNEL'
      : 'REGULAR_USER';
  return {
    id: claims.sub || null,
    email: claims.email || null,
    groups,
    role,
    tokenExpiresAt: claims.exp ? claims.exp * 1000 : null
  };
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const initializeUser = useCallback(async () => {
    try {
      const tokens = await getTokens();
      if (!tokens.accessToken) {
        setCurrentUser(null);
        setUserLoggedIn(false);
        return;
      }
      const user = userFromAccessToken(tokens.accessToken);
      if (!user.tokenExpiresAt || user.tokenExpiresAt <= Date.now()) {
        await clearTokens();
        setCurrentUser(null);
        setUserLoggedIn(false);
        return;
      }
      setCurrentUser(user);
      setUserLoggedIn(true);
    } catch {
      setCurrentUser(null);
      setUserLoggedIn(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeUser();
  }, [initializeUser]);

  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const response = await loginUser({ email, password });
      const tokens = response.data?.tokens;
      const accessToken = tokens?.AccessToken || tokens?.accessToken;
      const refreshToken = tokens?.RefreshToken || tokens?.refreshToken;
      if (!accessToken) throw new Error('Login response did not include an access token.');
      await clearTokens();
      await setTokens({ accessToken, refreshToken });
      const user = userFromAccessToken(accessToken);
      setCurrentUser(user);
      setUserLoggedIn(true);
      return user;
    } catch (error) {
      await clearTokens();
      setCurrentUser(null);
      setUserLoggedIn(false);
      throw new Error(error?.response?.status === 401 ? 'Invalid email or password.' : (error.message || 'Login failed.'));
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await clearTokens();
    setCurrentUser(null);
    setUserLoggedIn(false);
  };

  const value = {
    currentUser,
    userLoggedIn,
    loading,
    isEmailUser: userLoggedIn,
    isGoogleUser: false,
    setCurrentUser,
    signIn,
    login: signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
