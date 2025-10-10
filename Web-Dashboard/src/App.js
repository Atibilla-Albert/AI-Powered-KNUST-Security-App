import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { IncidentProvider } from './contexts/IncidentContext';
import { NotificationProvider } from './contexts/NotificationContext';

import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import IncidentList from './pages/Incidentlist';
import IncidentDetail from './pages/IncidentDetails';
import IncidentMap from './pages/IncidentMap';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/layout';

import './styles/main.css';
import 'leaflet/dist/leaflet.css';

import { Amplify } from 'aws-amplify';
import awsConfig from './services/aws-config';
Amplify.configure(awsConfig);

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <IncidentProvider>
            <div className="app-container">
              <Routes>
                {/* Public Route */}
                <Route path="/login" element={<Login />} />

                {/* Protected Routes */}
                <Route path="/" element={<PrivateRoute />}>
                  <Route element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="incidents" element={<IncidentList />} />
                    <Route path="incidents/:incidentId" element={<IncidentDetail />} />
                    <Route path="incidents/map" element={<IncidentMap />} />
                    {/* Catch-all for unknown routes */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Route>
              </Routes>
            </div>
          </IncidentProvider>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
