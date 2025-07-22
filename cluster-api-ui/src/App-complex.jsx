import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';

// Import components
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './components/pages/Dashboard';
import ClusterList from './components/pages/ClusterList';
import ClusterCreation from './components/pages/ClusterCreation';
import ClusterDetails from './components/pages/ClusterDetails';
import Monitoring from './components/pages/Monitoring';

import './App.css';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000, // 30 seconds
    },
  },
});

// Sify Material-UI Theme
const sifyTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#bdd70c',
      light: '#d4e84a',
      dark: '#8ba309',
      contrastText: '#000000',
    },
    secondary: {
      main: '#00bcd4',
      light: '#4dd0e1',
      dark: '#0097a7',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
    success: {
      main: '#4caf50',
    },
    info: {
      main: '#00bcd4',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.6,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '8px',
          fontWeight: 500,
          padding: '8px 16px',
        },
        containedPrimary: {
          background: 'linear-gradient(45deg, #bdd70c 30%, #d4e84a 90%)',
          boxShadow: '0 3px 5px 2px rgba(189, 215, 12, .3)',
          '&:hover': {
            background: 'linear-gradient(45deg, #8ba309 30%, #bdd70c 90%)',
            boxShadow: '0 4px 8px 2px rgba(189, 215, 12, .4)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(45deg, #00bcd4 30%, #4dd0e1 90%)',
          boxShadow: '0 3px 5px 2px rgba(0, 188, 212, .3)',
          '&:hover': {
            background: 'linear-gradient(45deg, #0097a7 30%, #00bcd4 90%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            '&.Mui-focused fieldset': {
              borderColor: '#bdd70c',
              borderWidth: '2px',
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(45deg, #1a1a1a 0%, #0097a7 100%)',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
        },
      },
    },
  },
});

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleThemeToggle = () => {
    setDarkMode(!darkMode);
  };

  // Update theme based on dark mode
  const currentTheme = createTheme({
    ...sifyTheme,
    palette: {
      ...sifyTheme.palette,
      mode: darkMode ? 'dark' : 'light',
      background: {
        default: darkMode ? '#1a1a1a' : '#f8f9fa',
        paper: darkMode ? '#2d2d2d' : '#ffffff',
      },
      text: {
        primary: darkMode ? '#ffffff' : '#333333',
        secondary: darkMode ? '#cccccc' : '#666666',
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={currentTheme}>
        <CssBaseline />
        <Router>
          <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {/* Header */}
            <Header
              onMenuToggle={handleSidebarToggle}
              onThemeToggle={handleThemeToggle}
              darkMode={darkMode}
            />
            
            {/* Sidebar */}
            <Sidebar
              open={sidebarOpen}
              onToggle={handleSidebarToggle}
            />
            
            {/* Main Content */}
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: 3,
                mt: 8, // Account for header height
                ml: sidebarOpen ? '280px' : '80px',
                transition: 'margin-left 0.3s ease',
                backgroundColor: 'background.default',
                minHeight: 'calc(100vh - 64px)',
              }}
            >
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/clusters" element={<ClusterList />} />
                <Route path="/clusters/create" element={<ClusterCreation />} />
                <Route path="/clusters/:id" element={<ClusterDetails />} />
                <Route path="/monitoring" element={<Monitoring />} />
              </Routes>
            </Box>
          </Box>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

