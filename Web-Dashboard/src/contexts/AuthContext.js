import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    authService.getCurrentAuthenticatedUser().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const signIn = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const authenticatedUser = await authService.signIn(username, password);
      setUser(authenticatedUser);
      return authenticatedUser;
    } catch (err) {
      setUser(null);
      const message = err.message || 'Login failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setError(null);
  };

  // UI-only gating. The API independently validates identity and authorization.
  const hasPermission = (permission) => user?.role === 'ADMIN' &&
    ['view:incidents', 'assign:incidents', 'update:incidents', 'view:users', 'manage:users'].includes(permission);

  const value = {
    user, loading, error,
    isAuthenticated: Boolean(user && authService.getAuthToken()),
    token: authService.getAuthToken(),
    signIn, login: signIn, signOut, hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
export default AuthContext;
