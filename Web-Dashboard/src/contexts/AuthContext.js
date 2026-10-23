import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    authService.getCurrentAuthenticatedUser()
      .then(currentUser => { if (active) setUser(currentUser); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const signIn = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const signedInUser = await authService.signIn(username, password);
      setUser(signedInUser);
      return signedInUser;
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

  // UI-only convenience. Backend routes independently enforce authorization.
  const hasPermission = (permission) => {
    const groups = user?.groups || [];
    const groupToPermissions = {
      ADMIN: ['*'],
      ADMINISTRATORS: ['*'],
      SUPERVISORS: ['view:incidents', 'assign:incidents', 'update:incidents', 'view:users'],
      SECURITY_PERSONNEL: ['view:incidents', 'update:incidents'],
      SECURITYSTAFF: ['view:incidents', 'update:incidents']
    };
    return groups.some(group => {
      const perms = groupToPermissions[String(group).toUpperCase()] || [];
      return perms.includes('*') || perms.includes(permission);
    });
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    token: null,
    signIn,
    login: signIn,
    signOut,
    hasPermission
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export default AuthContext;
