import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Chip, 
  Box, 
  IconButton, 
  Tooltip,
  CardActions,
  Button,
  alpha,
  useTheme,
  Snackbar,
  Alert
} from '@mui/material';
import { motion } from 'framer-motion';
import { 
  Storage as ClusterIcon, 
  Security as SecurityIcon, 
  Speed as SpeedIcon, 
  Chat as ChatIcon,
  PowerSettingsNew as PowerIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { Agent, AgentCapability } from '../types';
import { AgentCapabilitiesModal } from './AgentCapabilitiesModal';
import { useAgentContext } from '../context/AgentContext';

interface AgentCardProps {
  agent: Agent;
  onActivate?: (agentId: string) => void;
    onChat?: (agentId: string) => void;
  onCapabilities?: (agent: Agent) => void;
  onSelect?: (agent: Agent) => void;
  isSelected?: boolean;
  className?: string;
}

const cardVariants = {
  initial: { y: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  hover: { 
    y: -4, 
    boxShadow: '0 6px 12px rgba(0,0,0,0.15)',
    transition: { duration: 0.2 }
  },
  tap: { 
    scale: 0.98,
    transition: { duration: 0.1 }
  }
};

const statusColors = {
  healthy: 'success.main',
  degraded: 'warning.main',
  unhealthy: 'error.main',
  unknown: 'text.secondary'
} as const;

const AgentCard: React.FC<AgentCardProps> = ({
  agent, 
  onActivate, 
  onChat, 
  onSelect,
  onCapabilities,
  isSelected = false,
  className 
}) => {
  const theme = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { loadAvailableCapabilities } = useAgentContext();
  const [isCapabilitiesModalOpen, setCapabilitiesModalOpen] = useState(false);

  React.useEffect(() => {
    loadAvailableCapabilities();
  }, [loadAvailableCapabilities]);

  const handleToggleStatus = async () => {
    try {
      setError(null);
            const currentStatus = typeof agent.status === 'object' ? agent.status.isActive : false;
      const newStatus = !currentStatus;
      setSuccess(`Agent ${newStatus ? 'activated' : 'deactivated'} successfully`);
      if (onActivate) onActivate(agent.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agent status');
    }
  };

  const handleErrorClose = () => {
    setError(null);
  };

  const handleSuccessClose = () => {
    setSuccess(null);
  };

  type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

    const getAgentHealth = (): HealthStatus => {
    if (typeof agent.status !== 'object' || !agent.status) {
      return 'unknown';
    }

    const healthValue: string = agent.status.health || 'unknown';

    const lastPing = agent.status.lastPing ? new Date(agent.status.lastPing).getTime() : 0;
    const isConnected = (Date.now() - lastPing) < 300000; // 5 minutes

    if (!isConnected) return 'unhealthy';
    if (healthValue === 'unknown' && isConnected) return 'healthy';

    if (['healthy', 'degraded', 'unhealthy'].includes(healthValue)) {
      return healthValue as HealthStatus;
    }

    return 'unknown';
  };

  const healthStatus = getAgentHealth();
  const statusColor = statusColors[healthStatus] || 'default';
    const isActive = typeof agent.status === 'object' ? agent.status.isActive : false;

  const getStatusIcon = (health: HealthStatus) => {
    switch (health) {
      case 'healthy': return <CheckCircleIcon color="success" fontSize="small" />;
      case 'degraded': return <WarningIcon color="warning" fontSize="small" />;
      case 'unhealthy': return <ErrorIcon color="error" fontSize="small" />;
      default: return <ErrorIcon color="disabled" fontSize="small" />;
    }
  };

    const getAgentType = (): string => {
    if (typeof agent.metadata?.type === 'string' && agent.metadata.type) {
      return agent.metadata.type;
    }
    return 'monitoring';
  };

  const getAgentIcon = () => {
    const agentType = getAgentType();
    const normalizedType = String(agentType).toLowerCase();
    switch (normalizedType) {
      case 'monitoring': return <SpeedIcon color="primary" />;
      case 'security': return <SecurityIcon color="secondary" />;
      case 'cluster': return <ClusterIcon color="info" />;
      default: return <SpeedIcon color="action" />;
    }
  };

  const handleCardClick = () => {
    onSelect?.(agent);
  };

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChat?.(agent.id);
  };

  const handleActivateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleToggleStatus();
  };

  return (
    <>
      <motion.div
        initial="initial"
        whileHover="hover"
        animate={isSelected ? "selected" : "initial"}
        variants={cardVariants}
        className={className}
        onClick={handleCardClick}
        style={{
          border: isSelected ? `2px solid ${theme.palette.primary.main}` : `2px solid transparent`,
          borderRadius: '16px',
          cursor: 'pointer',
          height: '100%'
        }}
      >
        <Card sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          borderRadius: '14px',
          overflow: 'hidden',
          bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
        }}>
          <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <Box display="flex" alignItems="center" mb={2}>
              {getAgentIcon()}
              <Box ml={2} flexGrow={1}>
                <Typography variant="h6" component="div" fontWeight="600" noWrap>
                  {agent.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {getAgentType()}
                </Typography>
              </Box>
              <Tooltip title={healthStatus} arrow>
                <IconButton size="small" sx={{ color: statusColor }}>
                  {getStatusIcon(healthStatus)}
                </IconButton>
              </Tooltip>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1, minHeight: '40px' }}>
              {agent.description || 'No description available.'}
            </Typography>

            <Box mt="auto">
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Capabilities
              </Typography>
              {agent.capabilities && agent.capabilities.length > 0 ? (
                  <Box
                      display="flex"
                      flexWrap="wrap"
                      gap={0.5}
                      sx={{ 
                          borderTop: `1px solid ${theme.palette.divider}`,
                          pt: 1
                      }}
                  >
                      {agent.capabilities.slice(0, 3).map((capability: AgentCapability) => (
                          <Chip
                              key={capability.name}
                              label={capability.name}
                              size="small"
                              variant="outlined"
                              sx={{ 
                                  fontSize: '0.7rem',
                                  color: 'text.secondary',
                                  borderColor: 'divider',
                              }}
                          />
                      ))}
                      {agent.capabilities.length > 3 && (
                          <Chip
                              label={`+${agent.capabilities.length - 3}`}
                              size="small"
                              sx={{
                                  fontSize: '0.7rem',
                                  color: 'text.secondary',
                                  border: 'none',
                              }}
                          />
                      )}
                  </Box>
              ) : (
                  <Box
                      height={24}
                      display="flex"
                      alignItems="center"
                      color="text.disabled"
                      fontSize="0.75rem"
                      mt="auto"
                      pt={1}
                      sx={{
                          borderTop: `1px solid ${theme.palette.divider}`,
                      }}
                  >
                      No capabilities
                  </Box>
              )}
            </Box>
          </CardContent>

          <CardActions sx={{ 
            p: theme => theme.spacing(0, 1.5, 1.5, 1.5),
            mt: 'auto',
            justifyContent: 'space-between',
            gap: 1,
            '& .MuiButton-root': {
              minWidth: 'auto',
              padding: theme => theme.spacing(0.5, 1),
              fontSize: '0.7rem',
              fontWeight: 500,
              textTransform: 'none',
              letterSpacing: 0.5,
              '& .MuiSvgIcon-root': {
                fontSize: '1rem',
                mr: 0.5,
              }
            }
          }}>
            <Box display="flex" gap={0.5}>
              <Tooltip title="Chat with agent">
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  onClick={handleChatClick}
                  startIcon={<ChatIcon fontSize="inherit" />}
                  sx={{
                    borderColor: 'divider',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                    }
                  }}
                >
                  Chat
                </Button>
              </Tooltip>
              
              <Tooltip title="Configure agent">
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onCapabilities) {
                      onCapabilities(agent);
                    } else {
                      setCapabilitiesModalOpen(true);
                    }
                  }}
                  sx={{
                    borderColor: 'divider',
                    color: 'text.secondary',
                    '&:hover': {
                      borderColor: 'text.primary',
                      bgcolor: 'action.hover',
                    }
                  }}
                >
                  Configure
                </Button>
              </Tooltip>
            </Box>
            
            <Tooltip 
              title={isActive ? 'Deactivate agent' : 'Activate agent'}
              arrow
            >
              <IconButton 
                size="small" 
                onClick={handleActivateClick}
                sx={{
                  bgcolor: isActive 
                    ? alpha(theme.palette.success.main, 0.1) 
                    : 'action.hover',
                  color: isActive 
                    ? theme.palette.success.main 
                    : 'text.secondary',
                  '&:hover': {
                    bgcolor: isActive 
                      ? alpha(theme.palette.error.main, 0.1)
                      : alpha(theme.palette.success.main, 0.2),
                    color: isActive 
                      ? theme.palette.error.main 
                      : theme.palette.success.main,
                  },
                  transition: 'all 0.2s ease-in-out',
                  p: 1,
                  '& .MuiSvgIcon-root': {
                    fontSize: '1.1rem',
                    m: 0,
                  }
                }}
              >
                <PowerIcon 
                  fontSize="inherit" 
                  sx={{
                    transition: 'transform 0.3s ease-in-out',
                    transform: isActive ? 'none' : 'rotate(180deg)',
                  }}
                />
              </IconButton>
            </Tooltip>
          </CardActions>
        </Card>
      </motion.div>
      <AgentCapabilitiesModal
        agent={agent}
        open={isCapabilitiesModalOpen}
        onClose={() => setCapabilitiesModalOpen(false)}
      />
      <Snackbar open={!!error} autoHideDuration={6000} onClose={handleErrorClose}>
        <Alert onClose={handleErrorClose} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={6000} onClose={handleSuccessClose}>
        <Alert onClose={handleSuccessClose} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </>
  );
};

export default AgentCard;
