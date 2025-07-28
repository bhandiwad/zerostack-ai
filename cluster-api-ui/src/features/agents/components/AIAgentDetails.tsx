import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgentInstance } from '../ai/agentOrchestrator';
import { AgentType } from '../ai/aiAgents';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Button,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  Grid,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Code as CodeIcon,
  Settings as SettingsIcon,
  Timeline as TimelineIcon,
  History as HistoryIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface AIAgentDetailsProps {
  agent: AgentInstance;
  onEdit: (id: string) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const AIAgentDetails: React.FC<AIAgentDetailsProps> = ({ 
  agent, 
  onEdit, 
  onDelete, 
  onClose 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  // Mock data for charts
  const generateMockMetrics = () => {
    return Array.from({ length: 12 }, (_, i) => ({
      name: `${i * 5}m`,
      cpu: Math.floor(Math.random() * 100),
      memory: Math.floor(Math.random() * 100),
      requests: Math.floor(Math.random() * 1000),
    }));
  };

  // Mock logs
  const generateMockLogs = () => {
    const logLevels = ['INFO', 'WARN', 'ERROR'];
    const messages = [
      'Processing request',
      'Task completed successfully',
      'Memory usage high',
      'API call failed',
      'Connected to cluster',
      'Disconnected from cluster',
      'Starting health check',
      'Health check passed',
      'Error in processing',
    ];
    
    return Array.from({ length: 20 }, (_, i) => {
      const level = logLevels[Math.floor(Math.random() * logLevels.length)];
      const message = messages[Math.floor(Math.random() * messages.length)];
      const timestamp = new Date(Date.now() - i * 60000).toISOString();
      return `${timestamp} [${level}] ${message}`;
    });
  };

  useEffect(() => {
    // In a real app, this would fetch actual metrics and logs
    setMetrics(generateMockMetrics());
    setLogs(generateMockLogs());
  }, [agent.id]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  const handleStartAgent = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would call the API to start the agent
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Refresh agent status
    } catch (error) {
      console.error('Failed to start agent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopAgent = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would call the API to stop the agent
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Refresh agent status
    } catch (error) {
      console.error('Failed to stop agent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAgent = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would call the API to delete the agent
      await new Promise(resolve => setTimeout(resolve, 1000));
      onClose();
      if (onDelete) {
        onDelete(agent.id);
      }
    } catch (error) {
      console.error('Failed to delete agent:', error);
    } finally {
      setIsLoading(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const getStatusIcon = () => {
    if (!agent.isActive) return <ErrorIcon color="disabled" />;
    
    switch (agent.status?.health) {
      case 'healthy':
        return <SuccessIcon color="success" />;
      case 'degraded':
        return <WarningIcon color="warning" />;
      case 'unhealthy':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getStatusText = () => {
    if (!agent.isActive) return 'Inactive';
    return agent.status?.health ? agent.status.health.charAt(0).toUpperCase() + agent.status.health.slice(1) : 'Unknown';
  };

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>Agent Information</Typography>
          <Divider sx={{ mb: 2 }} />
          
          <List dense>
            <ListItem>
              <ListItemText 
                primary="Name" 
                secondary={agent.name} 
                primaryTypographyProps={{ variant: 'subtitle2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Type" 
                secondary={agent.type} 
                primaryTypographyProps={{ variant: 'subtitle2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Status" 
                primaryTypographyProps={{ variant: 'subtitle2' }}
                secondary={
                  <Box display="flex" alignItems="center">
                    {getStatusIcon()}
                    <Box ml={1}>{getStatusText()}</Box>
                  </Box>
                }
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Last Active" 
                secondary={agent.lastActive ? new Date(agent.lastActive).toLocaleString() : 'Never'} 
                primaryTypographyProps={{ variant: 'subtitle2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Description" 
                secondary={agent.config.description || 'No description provided'} 
                primaryTypographyProps={{ variant: 'subtitle2' }}
              />
            </ListItem>
          </List>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Quick Actions</Typography>
          <Divider sx={{ mb: 2 }} />
          <Box display="flex" flexWrap="wrap" gap={2}>
            {agent.isActive ? (
              <Button
                variant="contained"
                color="secondary"
                startIcon={<StopIcon />}
                onClick={handleStopAgent}
                disabled={isLoading}
              >
                Stop Agent
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                startIcon={<StartIcon />}
                onClick={handleStartAgent}
                disabled={isLoading}
              >
                Start Agent
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {}}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => onEdit(agent.id)}
              disabled={isLoading}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isLoading}
            >
              Delete
            </Button>
          </Box>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, height: '100%' }}>
          <Typography variant="h6" gutterBottom>Resource Usage</Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Box mb={4}>
            <Typography variant="subtitle2" gutterBottom>CPU Usage</Typography>
            <Box display="flex" alignItems="center" mb={1}>
              <Box width="100%" mr={1}>
                <LinearProgress 
                  variant="determinate" 
                  value={metrics[0]?.cpu || 0} 
                  color={metrics[0]?.cpu > 80 ? 'error' : metrics[0]?.cpu > 50 ? 'warning' : 'primary'}
                />
              </Box>
              <Typography variant="body2" color="textSecondary">
                {metrics[0]?.cpu || 0}%
              </Typography>
            </Box>
          </Box>
          
          <Box mb={4}>
            <Typography variant="subtitle2" gutterBottom>Memory Usage</Typography>
            <Box display="flex" alignItems="center" mb={1}>
              <Box width="100%" mr={1}>
                <LinearProgress 
                  variant="determinate" 
                  value={metrics[0]?.memory || 0} 
                  color={metrics[0]?.memory > 80 ? 'error' : metrics[0]?.memory > 50 ? 'warning' : 'primary'}
                />
              </Box>
              <Typography variant="body2" color="textSecondary">
                {metrics[0]?.memory || 0}%
              </Typography>
            </Box>
          </Box>
          
          <Box>
            <Typography variant="subtitle2" gutterBottom>Requests (per minute)</Typography>
            <Box height={200}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip />
                  <Bar dataKey="requests" fill={theme.palette.primary.main} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderMetricsTab = () => (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Box mb={4}>
        <Typography variant="h6" gutterBottom>CPU Usage</Typography>
        <Box height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <ChartTooltip />
              <Line 
                type="monotone" 
                dataKey="cpu" 
                stroke={theme.palette.primary.main} 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Box>
      
      <Box>
        <Typography variant="h6" gutterBottom>Memory Usage</Typography>
        <Box height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <ChartTooltip />
              <Line 
                type="monotone" 
                dataKey="memory" 
                stroke={theme.palette.secondary.main} 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    </Paper>
  );

  const renderLogsTab = () => (
    <Paper sx={{ p: 2, height: '600px', overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom>Agent Logs</Typography>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
        {logs.map((log, index) => {
          let logColor = theme.palette.text.primary;
          if (log.includes('[ERROR]')) logColor = theme.palette.error.main;
          else if (log.includes('[WARN]')) logColor = theme.palette.warning.main;
          
          return (
            <div key={index} style={{ color: logColor, marginBottom: '4px' }}>
              {log}
            </div>
          );
        })}
      </Box>
    </Paper>
  );

  const renderConfigTab = () => (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Agent Configuration</Typography>
      <Divider sx={{ mb: 2 }} />
      
      <pre style={{ 
        backgroundColor: theme.palette.background.paper, 
        padding: theme.spacing(2),
        borderRadius: theme.shape.borderRadius,
        overflow: 'auto',
        maxHeight: '600px',
      }}>
        <code>
          {JSON.stringify(agent.config, null, 2)}
        </code>
      </pre>
    </Paper>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'metrics':
        return renderMetricsTab();
      case 'logs':
        return renderLogsTab();
      case 'config':
        return renderConfigTab();
      default:
        return null;
    }
  };

  return (
    <>
      <Box mb={2}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onClose}
          sx={{ mb: 2 }}
        >
          Back to Agents
        </Button>
        
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h5" component="h2">
                {agent.name}
              </Typography>
              <Box display="flex" alignItems="center" mt={0.5}>
                <Chip
                  label={agent.type}
                  size="small"
                  sx={{
                    bgcolor: `${theme.palette.primary.light}22`,
                    color: 'text.primary',
                    mr: 1,
                  }}
                />
                <Box display="flex" alignItems="center">
                  {getStatusIcon()}
                  <Typography variant="body2" color="textSecondary" ml={0.5}>
                    {getStatusText()}
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            <Box>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => onEdit(agent.id)}
                sx={{ mr: 1 }}
              >
                Edit
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={agent.isActive ? <StopIcon /> : <StartIcon />}
                onClick={agent.isActive ? handleStopAgent : handleStartAgent}
                disabled={isLoading}
              >
                {agent.isActive ? 'Stop' : 'Start'}
              </Button>
            </Box>
          </Box>
        </Paper>
        
        <Paper sx={{ mb: 2 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab label="Overview" value="overview" icon={<InfoIcon />} iconPosition="start" />
            <Tab label="Metrics" value="metrics" icon={<TimelineIcon />} iconPosition="start" />
            <Tab label="Logs" value="logs" icon={<HistoryIcon />} iconPosition="start" />
            <Tab label="Configuration" value="config" icon={<SettingsIcon />} iconPosition="start" />
          </Tabs>
        </Paper>
      </Box>
      
      {renderTabContent()}
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Agent</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the agent <strong>{agent.name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteAgent} 
            color="error" 
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AIAgentDetails;
