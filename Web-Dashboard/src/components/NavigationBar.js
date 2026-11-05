// NavigationBar.jsx
import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box, Button, Menu, MenuItem } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import SecurityIcon from '@mui/icons-material/Security';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useAuth} from '../contexts/AuthContext';

const NavigationBar = () => {

  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const { isAuthenticated, signOut } = useAuth();
  const [isDarkMode, setIsDarkMode] = React.useState(() => {
    try {
      return window.localStorage.getItem('campsec-theme') === 'dark';
    } catch (_) {
      return false;
    }
  });

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    try {
      window.localStorage.setItem('campsec-theme', isDarkMode ? 'dark' : 'light');
    } catch (_) {
      // Keep theme switching available when browser storage is disabled.
    }
  }, [isDarkMode]);

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDepartmentSelect = (department) => {
    // You can add navigation or logic for each department here
    setAnchorEl(null);
    // Example: navigate(`/departments/${department}`);
  };

  const handleLogout = async() => {
  try {  
    await signOut();
    navigate('/login');
  } catch (err) {
    console.error('Logout failed:', err);
  }
};

if (!isAuthenticated) return null;

  return (
    <AppBar position="static" sx={{ backgroundColor: '#219653' }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton size="large" edge="start" color="inherit" onClick={handleMenuClick}>
            <MenuIcon />
          </IconButton>
          
          <SecurityIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component={Link} to="/" sx={{ textDecoration: 'none', color: 'inherit' }}>
            CAMPSEC KNUST
          </Typography>
        </Box>

        <Box display="flex" gap={2}>
          <IconButton
            color="inherit"
            onClick={() => setIsDarkMode((dark) => !dark)}
            aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
          >
            {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
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
