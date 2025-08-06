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
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Dashboard as DashboardIcon,
  Chat as ChatIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useAgents } from './hooks/useAgents';
import AgentCard from './components/AgentCard';
import AgentChat from './components/AgentChat';
import { Agent, AgentCapability } from './types';
import AgentCapabilities from './components/AgentCapabilities';


const AgentsDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  

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



  const handleAgentChat = async (agentId: string) => {
    try {
      const agent = agents.find((a: Agent) => a.id === agentId);
      if (!agent) return;
      
      setSelectedAgent(agent);
      
      if (isMobile) {
        setMobileChatOpen(true);
      } else {
        setActiveTab(1);
      }
      
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

  const handleConfigureCapability = (capability: AgentCapability) => {
    // Placeholder for future implementation
    console.log('Configuring capability:', capability);
  };

  const handleAgentAction = async (agentId: string) => {
    try {
      const agent = agents.find((a: Agent) => a.id === agentId);
      if (!agent) return;

      console.log(`Toggling status for agent: ${agent.name}`);
      // Here you would typically call a service to update the agent's status
      // For now, we'll just log it.
    } catch (err) {
      console.error('Error toggling agent status:', err);
    }
  };



  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
                    <Grid container spacing={3}>
            {agents.map((agent: Agent) => (
              <Grid item xs={12} sm={6} md={4} key={agent.id}>
                <AgentCard
                  agent={agent}
                  onSelect={() => handleAgentSelect(agent)}
                  onChat={() => handleAgentChat(agent.id)}
                  onActivate={() => handleAgentAction(agent.id)}
                  onCapabilities={() => handleAgentCapabilities(agent)}
                />
              </Grid>
            ))}
          </Grid>
        );
      case 1:
        return (
          <Box sx={{ height: '65vh', minHeight: '400px' }}>
            {selectedAgent ? (
              <AgentChat agent={selectedAgent} />
            ) : (
              <Alert severity="info">Select an agent to start a chat</Alert>
            )}
          </Box>
        );
      case 2:
        return (
          <Box>
            {selectedAgentForCapabilities ? (
              <Box>
                <Box mb={2}>
                  <Typography variant="h6">
                    {selectedAgentForCapabilities.name}&apos;s Capabilities
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
