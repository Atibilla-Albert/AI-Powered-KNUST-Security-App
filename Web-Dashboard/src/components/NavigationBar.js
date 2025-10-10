// NavigationBar.jsx
import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box, Button, Menu, MenuItem } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import SecurityIcon from '@mui/icons-material/Security';

const NavigationBar = () => {

  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

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

  const handleLogout = () => {
    // add your auth logout logic here
    localStorage.clear();
    navigate('/login');
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: '#219653' }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton size="large" edge="start" color="inherit" onClick={handleMenuClick}>
            <MenuIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={() => handleDepartmentSelect('Police')}>Police</MenuItem>
            <MenuItem onClick={() => handleDepartmentSelect('Electricals/Air condition')}>Electricals/Air Condition</MenuItem>
            <MenuItem onClick={() => handleDepartmentSelect('Road-worth')}>Road Worth</MenuItem>
            <MenuItem onClick={() => handleDepartmentSelect('Wood-works')}>Wood Works</MenuItem>
            <MenuItem onClick={() => handleDepartmentSelect('Fire-Safety')}>Fire Safety</MenuItem>
            <MenuItem onClick={() => handleDepartmentSelect('Mechanical')}>Mechanical</MenuItem>
            <MenuItem onClick={() => handleDepartmentSelect('Civil')}>Civil</MenuItem>
          </Menu>
          <SecurityIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component={Link} to="/" sx={{ textDecoration: 'none', color: 'inherit' }}>
            CAMPSEC KNUST
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
