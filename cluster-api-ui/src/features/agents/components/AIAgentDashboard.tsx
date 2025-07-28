import React, { useEffect, useState } from 'react';
import { useAIAgentContext } from '../context/AIAgentProvider';
import { AgentType } from '../ai/aiAgents';
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Monitor as MonitorIcon,
  AutoFixHigh as AutomationIcon,
  Security as SecurityIcon,
  Analytics as AnalyticsIcon,
  SupportAgent as SupportIcon,
  Refresh as RefreshIcon,
  PlayArrow as ActiveIcon,
  Stop as InactiveIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';

const AgentTypeIcons = {
  [AgentType.MONITORING]: MonitorIcon,
  [AgentType.AUTOMATION]: AutomationIcon,
  [AgentType.SECURITY]: SecurityIcon,
  [AgentType.ANALYTICS]: AnalyticsIcon,
  [AgentType.SUPPORT]: SupportIcon,
};

const AgentTypeColors = {
  [AgentType.MONITORING]: '#4caf50', // Green
  [AgentType.AUTOMATION]: '#2196f3', // Blue
  [AgentType.SECURITY]: '#f44336', // Red
  [AgentType.ANALYTICS]: '#9c27b0', // Purple
  [AgentType.SUPPORT]: '#ff9800', // Orange
};

// Mock data for the charts
const generateMockMetrics = (count = 10) => {
  return Array.from({ length: count }, (_, i) => ({
    name: `${i * 5}m`,
    value: Math.floor(Math.random() * 100),
  }));
};

const AIAgentDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { agents, loading, error, refreshAgents, activeAgent } = useAIAgentContext();
  const [metrics, setMetrics] = useState<Record<string, any[]>>({});
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  useEffect(() => {
    loadMetrics();
    // Set up interval to refresh metrics every 30 seconds
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, [agents]);

  const loadMetrics = async () => {
    // In a real app, this would fetch metrics from your backend
    const newMetrics: Record<string, any[]> = {};
    
    agents.forEach(agent => {
      newMetrics[agent.id] = generateMockMetrics();
    });
    
    setMetrics(newMetrics);
    setLastRefreshed(new Date());
  };

  const handleRefresh = async () => {
    await refreshAgents();
    await loadMetrics();
  };

  const getAgentStatus = (agent: any) => {
    if (!agent.isActive) return 'inactive';
    return agent.status?.health || 'healthy';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <SuccessIcon color="success" fontSize="small" />;
      case 'degraded':
        return <WarningIcon color="warning" fontSize="small" />;
      case 'unhealthy':
        return <ErrorIcon color="error" fontSize="small" />;
      default:
        return <InactiveIcon color="disabled" fontSize="small" />;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading && agents.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
        <IconButton onClick={handleRefresh} color="primary" sx={{ mt: 1 }}>
          <RefreshIcon />
        </IconButton>
      </Paper>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          AI Agent Dashboard
        </Typography>
        <Box>
          <Tooltip title="Last refreshed">
            <Typography variant="caption" color="textSecondary" sx={{ mr: 2 }}>
              {lastRefreshed ? `Last updated: ${lastRefreshed.toLocaleTimeString()}` : 'Loading...'}
            </Typography>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} size="small" disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Agent Status Cards */}
        {agents.map((agent) => {
          const status = getAgentStatus(agent);
          const Icon = AgentTypeIcons[agent.type as AgentType] || InfoIcon;
          
          return (
            <Grid item xs={12} sm={6} md={4} key={agent.id}>
              <Paper
                elevation={2}
                sx={{
                  p: 2,
                  height: '100%',
                  borderLeft: `4px solid ${AgentTypeColors[agent.type as AgentType]}`,
                  opacity: agent.isActive ? 1 : 0.7,
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box display="flex" alignItems="center">
                    <Icon
                      style={{
                        color: AgentTypeColors[agent.type as AgentType],
                        marginRight: 8,
                      }}
                    />
                    <Typography variant="h6" component="h3">
                      {agent.name}
                    </Typography>
                  </Box>
                  <Chip
                    label={getStatusLabel(status)}
                    size="small"
                    icon={getStatusIcon(status)}
                    sx={{
                      bgcolor: `${AgentTypeColors[agent.type as AgentType]}22`,
                      color: 'text.primary',
                      '& .MuiChip-icon': {
                        color: status === 'healthy' ? 'success.main' : 
                               status === 'degraded' ? 'warning.main' :
                               status === 'unhealthy' ? 'error.main' : 'text.disabled',
                      },
                    }}
                  />
                </Box>
                
                <Typography variant="body2" color="textSecondary" paragraph>
                  {agent.config.description}
                </Typography>
                
                <Divider sx={{ my: 1 }} />
                
                <Box mt={2}>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Activity
                  </Typography>
                  <Box height={80} mt={1}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metrics[agent.id] || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" hide />
                        <YAxis domain={[0, 100]} hide />
                        <ChartTooltip />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={AgentTypeColors[agent.type as AgentType]}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
                
                <Box mt={1} display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="textSecondary">
                    {agent.type}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {agent.lastActive ? `Active ${new Date(agent.lastActive).toLocaleTimeString()}` : 'Never active'}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default AIAgentDashboard;
