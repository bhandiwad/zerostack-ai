import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  Chip,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Storage as ClustersIcon,
  Add as CreateIcon,
  Monitor as MonitoringIcon,
  Cloud as CloudIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  ExpandLess,
  ExpandMore,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Computer as OnPremIcon,
} from '@mui/icons-material';
import { useState } from 'react';

const DRAWER_WIDTH = 280;
const DRAWER_WIDTH_COLLAPSED = 80;

const Sidebar = ({ open, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [providersExpanded, setProvidersExpanded] = useState(false);

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleProvidersToggle = () => {
    setProvidersExpanded(!providersExpanded);
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      badge: null,
    },
    {
      text: 'Clusters',
      icon: <ClustersIcon />,
      path: '/clusters',
      badge: '12',
    },
    {
      text: 'Create Cluster',
      icon: <CreateIcon />,
      path: '/clusters/create',
      badge: null,
    },
    {
      text: 'Monitoring',
      icon: <MonitoringIcon />,
      path: '/monitoring',
      badge: '3',
      badgeColor: 'warning',
    },
  ];

  const providerItems = [
    {
      text: 'AWS',
      icon: <CloudIcon sx={{ color: '#ff9900' }} />,
      path: '/providers/aws',
      status: 'active',
    },
    {
      text: 'Google Cloud',
      icon: <CloudIcon sx={{ color: '#4285f4' }} />,
      path: '/providers/gcp',
      status: 'active',
    },
    {
      text: 'Azure',
      icon: <CloudIcon sx={{ color: '#0078d4' }} />,
      path: '/providers/azure',
      status: 'active',
    },
    {
      text: 'VMWare',
      icon: <CloudIcon sx={{ color: '#607078' }} />,
      path: '/providers/vmware',
      status: 'inactive',
    },
    {
      text: 'On-Premises',
      icon: <OnPremIcon />,
      path: '/providers/onprem',
      status: 'active',
    },
  ];

  const bottomMenuItems = [
    {
      text: 'Settings',
      icon: <SettingsIcon />,
      path: '/settings',
    },
    {
      text: 'Help & Support',
      icon: <HelpIcon />,
      path: '/help',
    },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 100%)',
          color: 'white',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          transition: 'width 0.3s ease',
          overflowX: 'hidden',
        },
      }}
    >
      {/* Sidebar Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'space-between' : 'center',
          p: 2,
          mt: 8, // Account for header height
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {open && (
          <Typography variant="h6" sx={{ color: '#bdd70c', fontWeight: 600 }}>
            Navigation
          </Typography>
        )}
        <IconButton
          onClick={onToggle}
          sx={{
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(189, 215, 12, 0.1)',
            },
          }}
        >
          {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Box>

      {/* Main Navigation */}
      <List sx={{ px: 1, py: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              sx={{
                borderRadius: 2,
                mx: 1,
                backgroundColor: isActive(item.path) ? 'rgba(189, 215, 12, 0.15)' : 'transparent',
                '&:hover': {
                  backgroundColor: isActive(item.path) 
                    ? 'rgba(189, 215, 12, 0.25)' 
                    : 'rgba(255, 255, 255, 0.05)',
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(189, 215, 12, 0.15)',
                },
              }}
              selected={isActive(item.path)}
            >
              <ListItemIcon
                sx={{
                  color: isActive(item.path) ? '#bdd70c' : 'rgba(255, 255, 255, 0.7)',
                  minWidth: open ? 40 : 'auto',
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {open && (
                <>
                  <ListItemText
                    primary={item.text}
                    sx={{
                      color: isActive(item.path) ? '#bdd70c' : 'white',
                      '& .MuiListItemText-primary': {
                        fontWeight: isActive(item.path) ? 600 : 400,
                      },
                    }}
                  />
                  {item.badge && (
                    <Chip
                      label={item.badge}
                      size="small"
                      color={item.badgeColor || 'primary'}
                      sx={{
                        height: 20,
                        fontSize: '0.75rem',
                        backgroundColor: item.badgeColor === 'warning' ? '#ff9800' : '#bdd70c',
                        color: '#000',
                      }}
                    />
                  )}
                </>
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', mx: 2 }} />

      {/* Providers Section */}
      <List sx={{ px: 1, py: 1 }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleProvidersToggle}
            sx={{
              borderRadius: 2,
              mx: 1,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
              },
            }}
          >
            <ListItemIcon
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                minWidth: open ? 40 : 'auto',
                justifyContent: 'center',
              }}
            >
              <CloudIcon />
            </ListItemIcon>
            {open && (
              <>
                <ListItemText
                  primary="Providers"
                  sx={{ color: 'white' }}
                />
                {providersExpanded ? <ExpandLess /> : <ExpandMore />}
              </>
            )}
          </ListItemButton>
        </ListItem>

        {open && (
          <Collapse in={providersExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {providerItems.map((item) => (
                <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => handleNavigation(item.path)}
                    sx={{
                      borderRadius: 2,
                      mx: 1,
                      pl: 4,
                      backgroundColor: isActive(item.path) ? 'rgba(189, 215, 12, 0.15)' : 'transparent',
                      '&:hover': {
                        backgroundColor: isActive(item.path) 
                          ? 'rgba(189, 215, 12, 0.25)' 
                          : 'rgba(255, 255, 255, 0.05)',
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: isActive(item.path) ? '#bdd70c' : 'rgba(255, 255, 255, 0.7)',
                        minWidth: 40,
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      sx={{
                        color: isActive(item.path) ? '#bdd70c' : 'white',
                        '& .MuiListItemText-primary': {
                          fontSize: '0.875rem',
                        },
                      }}
                    />
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: item.status === 'active' ? '#4caf50' : '#666',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Collapse>
        )}
      </List>

      {/* Bottom Navigation */}
      <Box sx={{ flexGrow: 1 }} />
      <List sx={{ px: 1, pb: 2 }}>
        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', mx: 2, mb: 2 }} />
        {bottomMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              sx={{
                borderRadius: 2,
                mx: 1,
                backgroundColor: isActive(item.path) ? 'rgba(189, 215, 12, 0.15)' : 'transparent',
                '&:hover': {
                  backgroundColor: isActive(item.path) 
                    ? 'rgba(189, 215, 12, 0.25)' 
                    : 'rgba(255, 255, 255, 0.05)',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: isActive(item.path) ? '#bdd70c' : 'rgba(255, 255, 255, 0.7)',
                  minWidth: open ? 40 : 'auto',
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {open && (
                <ListItemText
                  primary={item.text}
                  sx={{
                    color: isActive(item.path) ? '#bdd70c' : 'white',
                    '& .MuiListItemText-primary': {
                      fontSize: '0.875rem',
                    },
                  }}
                />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default Sidebar;

