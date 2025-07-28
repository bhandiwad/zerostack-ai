import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Drawer,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert,
  Button,
  styled,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Dashboard as DashboardIcon,
  Chat as ChatIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useAgents } from './context/AgentContext';
import AgentCard from './components/AgentCard';
import AgentChat from './components/AgentChat';
import AgentConfig from './components/AgentConfig';
import { Agent, AgentCapability } from './types';
import AgentCapabilities from './components/AgentCapabilities';
import { useNavigate } from 'react-router-dom';

const AgentsDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const navigate = useNavigate();
  const { 
    agents, 
    loading, 
    error, 
    currentConversation,
    createConversation,
    selectConversation,
  } = useAgents();
  
  const [activeTab, setActiveTab] = useState(0);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedAgentForCapabilities, setSelectedAgentForCapabilities] = useState<Agent | null>(null);
  const [selectedCapability, setSelectedCapability] = useState<AgentCapability | null>(null);
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent);
    if (isMobile) {
      setMobileChatOpen(true);
    }
  };

  const handleAgentCapabilities = (agent: Agent) => {
    setSelectedAgentForCapabilities(agent);
    setActiveTab(2); // Switch to capabilities tab
    if (isMobile) {
      setMobileChatOpen(false);
    }
  };

  const handleConfigureCapability = (capability: AgentCapability) => {
    setSelectedCapability(capability);
    setShowConfigDrawer(true);
  };

  const handleSaveConfig = async (config: any) => {
    try {
      // In a real app, this would save the config to the backend
      console.log('Saving config:', config);
      // Update the agent's config in the UI
      if (selectedAgentForCapabilities) {
        // This is a simplified example - in a real app, you would update the agent's config in your state
        console.log(`Updated config for agent ${selectedAgentForCapabilities.name}`, config);
      }
      setShowConfigDrawer(false);
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  const handleRefreshConfig = async () => {
    // In a real app, this would refresh the config from the backend
    console.log('Refreshing config...');
  };

  const handleAgentChat = async (agentId: string) => {
    try {
      const agent = agents.find(a => a.id === agentId);
      if (!agent) return;
      
      setSelectedAgent(agent);
      
      if (isMobile) {
        setMobileChatOpen(true);
      } else {
        setActiveTab(1);
      }
      
      // If no current conversation exists, create one
      if (!currentConversation || currentConversation.agentId !== agentId) {
        const conversation = await createConversation(agentId, `Chat with ${agent.name}`);
        if (conversation) {
          selectConversation(conversation.id);
        }
      }
    } catch (err) {
      console.error('Error starting chat:', err);
    }
  };

  const handleCloseMobileChat = () => {
    setMobileChatOpen(false);
  };

  const handleAgentAction = async (agentId: string) => {
    try {
      const agent = agents.find(a => a.id === agentId);
      if (!agent) return;
      
      // Toggle agent active status
      const updatedAgent = {
        ...agent,
        status: {
          ...agent.status,
          isActive: !agent.status.isActive,
          lastPing: new Date()
        }
      };
      
      // In a real app, this would be an API call to update the agent status
      console.log(`Agent ${agentId} ${updatedAgent.status.isActive ? 'activated' : 'deactivated'}`);
      
      // Update local state
      const updatedAgents = agents.map(a => 
        a.id === agentId ? updatedAgent : a
      );
      
      // This would be handled by the context in a real app
      // For now, we'll just log it
      console.log('Updated agents:', updatedAgents);
      
    } catch (error) {
      console.error('Error toggling agent status:', error);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <Box p={2}>
            <Typography variant="h5" gutterBottom>
              All Agents
            </Typography>
            {loading ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert 
                severity="error"
                action={
                  <Button 
                    color="inherit" 
                    size="small" 
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </Button>
                }
              >
                {error.toString()}
              </Alert>
            ) : agents.length > 0 ? (
              <Box 
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)'
                  },
                  gap: 3,
                  width: '100%'
                }}
              >
                {agents.map((agent) => (
                  <Box 
                    key={agent.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'stretch'
                    }}
                  >
                    <AgentCard
                      agent={agent}
                      onChat={() => handleAgentChat(agent.id)}
                      onSelect={() => handleAgentSelect(agent)}
                      isSelected={selectedAgent?.id === agent.id}
                    />
                  </Box>
                ))}
              </Box>
            ) : (
              <Alert severity="info">No agents found. Create an agent to get started.</Alert>
            )}
          </Box>
        );
      case 1:
        return (
          <Box p={2}>
            <Typography variant="h5" gutterBottom>
              Agent Chat
            </Typography>
            {selectedAgent ? (
              <AgentChat agent={selectedAgent} />
            ) : (
              <Alert severity="info">
                Select an agent from the list to start chatting
              </Alert>
            )}
          </Box>
        );
      case 2:
        return (
          <Box p={2}>
            <Typography variant="h5" gutterBottom>
              Agent Capabilities
            </Typography>
            {selectedAgentForCapabilities ? (
              <Box>
                <Box mb={3}>
                  <Typography variant="h5" gutterBottom>
                    {selectedAgentForCapabilities.name}'s Capabilities
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage and configure the capabilities available to this agent.
                  </Typography>
                </Box>
                <AgentCapabilities 
                  agentId={selectedAgentForCapabilities.id} 
                  onConfigureCapability={handleConfigureCapability}
                />
              </Box>
            ) : (
              <Alert severity="info">
                Select an agent to view and manage its capabilities
              </Alert>
            )}
          </Box>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    const errorMessage = (() => {
      if (typeof error === 'string') return error;
      if (error && typeof error === 'object' && 'message' in error) {
        return (error as { message: string }).message;
      }
      return 'Unknown error';
    })();
    
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        Error loading agents: {errorMessage}
      </Alert>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 1, md: 3 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        AI Agents
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage and interact with AI agents that help monitor and maintain your clusters.
      </Typography>

      <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="agent tabs"
        >
          <Tab icon={<DashboardIcon />} label="Agents" />
          <Tab 
            icon={<ChatIcon />} 
            label="Chat" 
            disabled={!selectedAgent}
          />
          <Tab 
            icon={<SettingsIcon />} 
            label={
              <Box display="flex" alignItems="center">
                <span>Capabilities</span>
                {selectedAgentForCapabilities && (
                  <Chip 
                    label={selectedAgentForCapabilities.name}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                )}
              </Box>
            } 
            disabled={!selectedAgentForCapabilities}
          />
        </Tabs>

        <Box p={3}>
          {renderTabContent()}
        </Box>
      </Paper>

      {/* Mobile Chat Drawer */}
      <Drawer
        anchor="bottom"
        open={mobileChatOpen}
        onClose={handleCloseMobileChat}
        PaperProps={{
          sx: { 
            height: '80vh',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {selectedAgent?.name}
            </Typography>
            <IconButton onClick={handleCloseMobileChat}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
        {selectedAgent && (
          <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
            <AgentChat 
              agent={selectedAgent} 
              onClose={handleCloseMobileChat}
            />
          </Box>
        )}
      </Drawer>

      {/* Mobile FAB for Chat */}
      {currentConversation && isMobile && !mobileChatOpen && (
        <Box
          position="fixed"
          bottom={24}
          right={24}
          zIndex={theme.zIndex.speedDial}
        >
          <IconButton
            color="primary"
            aria-label="chat"
            onClick={() => setMobileChatOpen(true)}
            sx={{
              width: 56,
              height: 56,
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
              },
              boxShadow: theme.shadows[4],
            }}
          >
            <ChatIcon />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

export default AgentsDashboard;
