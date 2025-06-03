import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/auth'; // Make sure this exists and has all the methods

// Create auth context
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already authenticated
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentAuthenticatedUser();
        setUser(currentUser);
      } catch (err) {
        setUser(null); // Not authenticated
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Sign in
  const signIn = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const user = await authService.signIn(username, password);
      setUser(user);
      return user;
    } catch (err) {
      setError(err.message || 'Failed to sign in');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    setLoading(true);
    try {
      await authService.signOut();
      setUser(null);
    } catch (err) {
      setError(err.message || 'Failed to sign out');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign up
  const signUp = async (username, password, email, additionalAttributes = {}) => {
    setLoading(true);
    setError(null);
    try {
      return await authService.signUp(username, password, email, additionalAttributes);
    } catch (err) {
      setError(err.message || 'Failed to sign up');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Confirm sign up
  const confirmSignUp = async (username, code) => {
    setLoading(true);
    setError(null);
    try {
      return await authService.confirmSignUp(username, code);
    } catch (err) {
      setError(err.message || 'Failed to confirm sign up');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Forgot password
  const forgotPassword = async (username) => {
    setLoading(true);
    setError(null);
    try {
      return await authService.forgotPassword(username);
    } catch (err) {
      setError(err.message || 'Failed to start password reset');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Confirm forgot password
  const confirmForgotPassword = async (username, code, newPassword) => {
    setLoading(true);
    setError(null);
    try {
      return await authService.confirmForgotPassword(username, code, newPassword);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Permissions
  const hasPermission = (permission) => {
    if (!user?.signInUserSession?.accessToken) return false;

    const groups = user.signInUserSession.accessToken.payload['cognito:groups'] || [];
    const groupToPermissions = {
      Administrators: ['*'],
      Supervisors: ['view:incidents', 'assign:incidents', 'update:incidents', 'view:users'],
      SecurityStaff: ['view:incidents', 'update:incidents']
    };

    return groups.some(group => {
      const perms = groupToPermissions[group] || [];
      return perms.includes('*') || perms.includes(permission);
    });
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    login: signIn, // alias for backward compatibility
    signOut,
    signUp,
    confirmSignUp,
    forgotPassword,
    confirmForgotPassword,
    hasPermission,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export default AuthContext;
