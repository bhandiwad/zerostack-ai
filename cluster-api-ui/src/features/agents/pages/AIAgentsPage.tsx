import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAIAgentContext } from '../context/AIAgentProvider';
import {
  Box,
  Container,

  Tabs,
  Tab,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
  Drawer,
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  List as ListIcon,
  Add as AddIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import AIAgentList from '../components/AIAgentList';
import AIAgentDashboard from '../components/AIAgentDashboard';
import AIAgentForm from '../components/AIAgentForm';
import AIAgentDetails from '../components/AIAgentDetails';

const drawerWidth = 300;

type TabValue = 'dashboard' | 'list';

const AIAgentsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { agentId } = useParams<{ agentId?: string }>();
      const { selectAgent, activeAgent, refreshAgents } = useAIAgentContext();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabValue>('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | undefined>(undefined);

  // Handle mobile drawer toggle
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: TabValue) => {
    setActiveTab(newValue);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  // Handle agent selection
  const handleSelectAgent = (id: string) => {
    selectAgent(id);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  // Handle create new agent
  const handleCreateAgent = () => {
    setEditingAgentId(undefined);
    setIsFormOpen(true);
  };

  // Handle edit agent
  const handleEditAgent = (agent: { id: string }) => {
    setEditingAgentId(agent.id);
    setIsFormOpen(true);
  };

  // Close the form
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingAgentId(undefined);
  };

  // Effect to handle URL changes for agent details
  useEffect(() => {
    if (agentId) {
      selectAgent(agentId);
    }
  }, [agentId, selectAgent]);

  // Render the main content based on the active tab
  const renderMainContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AIAgentDashboard />;
      case 'list':
        return (
          <AIAgentList
            onSelectAgent={handleSelectAgent}
            onCreateAgent={handleCreateAgent}
            onEditAgent={handleEditAgent}
            onRefreshAgents={async () => {
              await refreshAgents();
            }}
          />
        );
      default:
        return <AIAgentDashboard />;
    }
  };

  // Render the drawer content
  const drawerContent = (
    <Box sx={{ overflow: 'auto' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          AI Agents
        </Typography>
        <Tooltip title="Create New Agent">
          <IconButton color="primary" onClick={handleCreateAgent} size="large">
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Divider />
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        orientation={isMobile ? 'horizontal' : 'vertical'}
        variant="fullWidth"
        sx={{
          borderRight: isMobile ? 'none' : 1,
          borderColor: 'divider',
          minWidth: isMobile ? 'auto' : drawerWidth - 50,
        }}
      >
        <Tab
          icon={<DashboardIcon />}
          label={isMobile ? '' : 'Dashboard'}
          value="dashboard"
          iconPosition="start"
        />
        <Tab
          icon={<ListIcon />}
          label={isMobile ? '' : 'Agent List'}
          value="list"
          iconPosition="start"
        />
      </Tabs>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Desktop Drawer */}
      <Paper
        elevation={3}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          display: { xs: 'none', md: 'block' },
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          zIndex: theme.zIndex.drawer,
        }}
      >
        {drawerContent}
      </Paper>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          backgroundColor: theme.palette.background.default,
        }}
      >
        {/* Mobile Header */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, mb: 2 }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            {activeTab === 'dashboard' ? 'Agent Dashboard' : 'Agent List'}
          </Typography>
        </Box>

        {/* Render the main content */}
        <Container maxWidth="xl">
          {renderMainContent()}
          
          {/* Agent Details Panel */}
          {activeAgent && (
            <AIAgentDetails 
              agent={activeAgent} 
              onEdit={() => handleEditAgent(activeAgent)}
              onClose={() => navigate('/agents')}
            />
          )}
        </Container>
      </Box>

      {/* Agent Form Dialog */}
      <AIAgentForm
        open={isFormOpen}
        onClose={handleCloseForm}
        agentId={editingAgentId}
      />
    </Box>
  );
};

export default AIAgentsPage;
