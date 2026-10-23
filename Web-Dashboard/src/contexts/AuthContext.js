import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/auth'; // ⬅️ Make sure this points to your updated backend-connected authService

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user from localStorage on app init
  useEffect(() => {
    const storedUser = localStorage.getItem('authUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Optional: Quick token validation (e.g., for JWT expiry)
        const token = localStorage.getItem('authToken');
        if (token && parsedUser.signInUserSession?.accessToken?.payload?.exp * 1000 > Date.now()) {
          setUser(parsedUser);
        } else {
          // Invalid/expired: clear and fallback
          localStorage.removeItem('authUser');
          localStorage.removeItem('authToken');
          throw new Error('Token expired');
        }
        setLoading(false);
      } catch (err) {
        console.error('Invalid stored user:', err);
        localStorage.removeItem('authUser');
        localStorage.removeItem('authToken');
        setUser(null);
        setLoading(false);
      }
    } else {
      authService.getCurrentAuthenticatedUser()
        .then((currentUser) => {
          if (currentUser) {
            setUser(currentUser);
            // Re-store if fetched successfully
            localStorage.setItem('authUser', JSON.parse(currentUser));
          } else {
            setUser(null);
          }
          setLoading(false);
        })
        .catch(() => {
          setUser(null);
          setLoading(false);
        });
    }
  }, []);

  // Sign in
  const signIn = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const user = await authService.signIn(username, password);
      setUser(user);
      localStorage.setItem('authUser', JSON.stringify(user));
      return user;
    } catch (err) {
      const msg = err.message || 'Login failed';
      setError(msg);
      setUser(null);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await authService.signOut();
      setUser(null);
      localStorage.removeItem('authUser');
      localStorage.removeItem('authToken');
    } catch (err) {
      setError(err.message || 'Failed to sign out');
      throw err;
    }
  };

  // Permissions
  const hasPermission = (permission) => {
    const groups = user?.signInUserSession?.accessToken?.payload?.['cognito:groups'] || [];
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
    isAuthenticated: !!user,
    token: localStorage.getItem('authToken'), // Add token access
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
