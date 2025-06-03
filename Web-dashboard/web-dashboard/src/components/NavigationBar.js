// NavigationBar.jsx
import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box, Button } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import SecurityIcon from '@mui/icons-material/Security';

const NavigationBar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // add your auth logout logic here
    localStorage.clear();
    navigate('/login');
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: '#1976d2' }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton size="large" edge="start" color="inherit">
            <MenuIcon />
          </IconButton>
          <SecurityIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component={Link} to="/" sx={{ textDecoration: 'none', color: 'inherit' }}>
            KNUST Security Dashboard
          </Typography>
        </Box>

        <Box display="flex" gap={2}>
          <Button color="inherit" component={Link} to="/">Dashboard</Button>
          <Button color="inherit" component={Link} to="/incidents">Incidents</Button>
          <Button color="inherit" component={Link} to="/incidents/map">Map View</Button>
          <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>Logout</Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default NavigationBar;
