import React, { useState, useEffect } from 'react';
import { AgentInstance } from '../ai/agentOrchestrator';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  Tabs,
  Tab,
  LinearProgress,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Timeline as TimelineIcon,
  History as HistoryIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';

interface MetricData {
  name: string;
  cpu: number;
  memory: number;
  requests: number;
}

// Extend AgentInstance to include properties that might be missing from the core type
interface ExtendedAgentInstance extends AgentInstance {
  status: string; // Assuming status is a simple string like 'running', 'stopped'
  purpose: string;
}

interface AIAgentDetailsProps {
  agent: ExtendedAgentInstance;
  onEdit: (id: string) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const AIAgentDetails: React.FC<AIAgentDetailsProps> = ({ agent, onEdit, onDelete, onClose }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const generateMockMetrics = (): MetricData[] => {
    return Array.from({ length: 12 }, (_, i) => ({
      name: `${i * 5}m`,
      cpu: Math.floor(Math.random() * 100),
      memory: Math.floor(Math.random() * 100),
      requests: Math.floor(Math.random() * 1000),
    }));
  };

  const generateMockLogs = () => {
    const logLevels = ['INFO', 'WARN', 'ERROR'];
    const messages = [
      'Processing request',
      'Task completed successfully',
      'Memory usage high',
      'API call failed',
    ];

    return Array.from({ length: 20 }, (_, i) => {
      const level = logLevels[Math.floor(Math.random() * logLevels.length)];
      const message = messages[Math.floor(Math.random() * messages.length)];
      const timestamp = new Date(Date.now() - i * 60000).toISOString();
      return `${timestamp} [${level}] ${message}`;
    });
  };

  useEffect(() => {
    setMetrics(generateMockMetrics());
    setLogs(generateMockLogs());
  }, [agent.id]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  const handleStartAgent = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const handleStopAgent = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const handleDeleteAgent = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (onDelete) {
      onDelete(agent.id);
    }
    onClose();
    setIsLoading(false);
  };

  const getStatusIcon = () => {
    if (isLoading) return <CircularProgress size={20} />;
    switch (agent.status) {
      case 'running':
        return <SuccessIcon color="success" />;
      case 'stopped':
        return <ErrorIcon color="error" />;
      case 'starting':
        return <WarningIcon color="warning" />;
      default:
        return <InfoIcon color="disabled" />;
    }
  };

  const getStatusText = () => {
    if (isLoading) return 'Updating...';
    return agent.status.charAt(0).toUpperCase() + agent.status.slice(1);
  };

  const renderOverviewTab = () => (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
      <Box sx={{ flex: 2 }}>
        <Paper sx={{ p: 2, height: '100%' }}>
          <Typography variant="h6" gutterBottom>Details</Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography><strong>ID:</strong> {agent.id}</Typography>
          <Typography><strong>Purpose:</strong> {agent.purpose || 'N/A'}</Typography>
          <Typography><strong>Model:</strong> {agent.config?.config?.model || 'N/A'}</Typography>
          <Typography><strong>Created:</strong> {new Date(agent.createdAt).toLocaleString()}</Typography>
          <Typography><strong>Last Active:</strong> {agent.lastActive ? new Date(agent.lastActive).toLocaleString() : 'N/A'}</Typography>
        </Paper>
      </Box>
      <Box sx={{ flex: 1 }}>
        <Paper sx={{ p: 2, height: '100%' }}>
          <Typography variant="h6" gutterBottom>Capabilities</Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {agent.capabilities.map(cap => (
              <Chip key={cap} label={cap} size="small" />
            ))}
          </Box>
        </Paper>
      </Box>
      <Box sx={{ flex: 1 }}>
        <Paper sx={{ p: 2, height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" gutterBottom>Performance</Typography>
            <Button size="small" startIcon={<RefreshIcon />} onClick={() => setMetrics(generateMockMetrics())}>
              Refresh
            </Button>
          </Box>
          <Typography variant="subtitle2" gutterBottom>Recent Activity</Typography>
          <LinearProgress variant="determinate" value={metrics.length > 0 ? (metrics[metrics.length - 1].requests / 10) : 0} />
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {metrics.length > 0 ? metrics[metrics.length - 1].requests : 0} requests in the last hour
          </Typography>
        </Paper>
      </Box>
    </Box>
  );

  const renderMetricsTab = () => (
    <Paper sx={{ p: 2, height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={metrics}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <ChartTooltip />
          <Line type="monotone" dataKey="cpu" stroke="#8884d8" />
          <Line type="monotone" dataKey="memory" stroke="#82ca9d" />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );

  const renderLogsTab = () => (
    <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
      <List dense>
        {logs.map((log, index) => (
          <ListItem key={index}>
            <ListItemText primary={log} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );

  const renderConfigTab = () => (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Configuration</Typography>
      <pre style={{
        backgroundColor: theme.palette.background.default,
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
      case 'overview': return renderOverviewTab();
      case 'metrics': return renderMetricsTab();
      case 'logs': return renderLogsTab();
      case 'config': return renderConfigTab();
      default: return null;
    }
  };

  return (
    <>
      <Box mb={2}>
        <Button startIcon={<ArrowBackIcon />} onClick={onClose} sx={{ mb: 2 }}>
          Back to Agents
        </Button>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h5" component="h2">{agent.name}</Typography>
              <Box display="flex" alignItems="center" mt={0.5}>
                <Chip label={agent.type} size="small" sx={{ bgcolor: `${theme.palette.primary.light}22`, color: 'text.primary', mr: 1 }} />
                <Box display="flex" alignItems="center">
                  {getStatusIcon()}
                  <Typography variant="body2" color="textSecondary" ml={0.5}>{getStatusText()}</Typography>
                </Box>
              </Box>
            </Box>
            <Box>
              <Button variant="outlined" startIcon={<EditIcon />} onClick={() => onEdit(agent.id)} sx={{ mr: 1 }}>Edit</Button>
              <Button variant="contained" color="primary" startIcon={agent.status === 'running' ? <StopIcon /> : <StartIcon />} onClick={agent.status === 'running' ? handleStopAgent : handleStartAgent} disabled={isLoading}>
                {agent.status === 'running' ? 'Stop' : 'Start'}
              </Button>
            </Box>
          </Box>
        </Paper>
        <Paper sx={{ mb: 2 }}>
          <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto" textColor="primary" indicatorColor="primary">
            <Tab label="Overview" value="overview" icon={<InfoIcon />} iconPosition="start" />
            <Tab label="Metrics" value="metrics" icon={<TimelineIcon />} iconPosition="start" />
            <Tab label="Logs" value="logs" icon={<HistoryIcon />} iconPosition="start" />
            <Tab label="Configuration" value="config" icon={<SettingsIcon />} iconPosition="start" />
          </Tabs>
        </Paper>
        {renderTabContent()}
        <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Delete Agent</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete the agent <strong>{agent.name}</strong>? This action cannot be undone.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsDeleteDialogOpen(false)} disabled={isLoading}>Cancel</Button>
            <Button onClick={handleDeleteAgent} color="error" variant="contained" disabled={isLoading} startIcon={isLoading ? <CircularProgress size={20} /> : <DeleteIcon />}>
              {isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
};

export default AIAgentDetails;
