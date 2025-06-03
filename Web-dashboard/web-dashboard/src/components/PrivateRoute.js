import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/main.css';

/**
 * PrivateRoute component for route protection
 * @returns {React.ReactElement} Renders children via Outlet if authenticated
 */
const PrivateRoute = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while auth status is loading
  if (isLoading) {
    return (
      <div className="auth-loading">
        <div className="spinner">
          <div className="spinner-border" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p>Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect unauthenticated users
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render nested routes if authenticated
  return <Outlet />;
};

export default PrivateRoute;
