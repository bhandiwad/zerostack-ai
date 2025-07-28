import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Chip, 
  Box, 
  IconButton, 
  Tooltip,
  CardActionArea,
  CardActions,
  Button,
  Avatar,
  alpha,
  useTheme,
  Skeleton,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Storage as ClusterIcon, 
  Security as SecurityIcon, 
  Speed as SpeedIcon, 
  Chat as ChatIcon,
  PowerSettingsNew as PowerIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { Agent, AgentCapability } from '../types';
import { agentService } from '../services/AgentService';

// Define a type that can represent either a string or AgentCapability object
type CapabilityItem = string | AgentCapability;

interface AgentCardProps {
  agent: Agent;
  onActivate?: (agentId: string) => void;
  onChat?: (agentId: string) => void;
  onConfigure?: (agentId: string) => void;
  onSelect?: (agent: Agent) => void;
  onCapabilities?: (agent: Agent) => void;
  isSelected?: boolean;
  className?: string;
}

// Animation variants for the card
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

// Status color mapping
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
  onConfigure,
  onSelect,
  onCapabilities,
  isSelected = false,
  className 
}) => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Here you would typically refresh the agent data
      // For example: const updatedAgent = await agentService.getAgent(agent.id);
      setSuccess('Agent data refreshed successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh agent data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get the current active status, defaulting to false if undefined
      const currentStatus = agent.status?.isActive ?? false;
      const newStatus = !currentStatus;
      
      // Here you would typically update the agent status
      // For example: 
      // await agentService.updateAgent(agent.id, { 
      //   ...agent, 
      //   status: { 
      //     ...agent.status, 
      //     isActive: newStatus 
      //   } 
      // });
      
      setSuccess(`Agent ${newStatus ? 'activated' : 'deactivated'} successfully`);
      
      // Refresh the agent list or update the specific agent
      if (onActivate) onActivate(agent.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agent status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleErrorClose = () => {
    setError(null);
  };

  const handleSuccessClose = () => {
    setSuccess(null);
  };

  // Define a type for the health status
  type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

  // Get agent health status with proper typing
  const getAgentHealth = (): HealthStatus => {
    if (!agent.status || !agent.status.health) return 'unknown';
    
    // Convert to lowercase and ensure it's a valid health status
    const health = agent.status.health.toLowerCase() as HealthStatus;
    return ['healthy', 'degraded', 'unhealthy', 'unknown'].includes(health) 
      ? health 
      : 'unknown';
  };

  const healthStatus = getAgentHealth();
  const statusColor = statusColors[healthStatus] || 'default';
  const isActive = agent.status?.isActive !== false;
  const lastPing = agent.status?.lastPing 
    ? new Date(agent.status.lastPing).toLocaleTimeString() 
    : 'Never';

  const getStatusIcon = () => {
    switch (health) {
      case 'healthy':
        return <CheckCircleIcon color="success" fontSize="small" />;
      case 'degraded':
        return <WarningIcon color="warning" fontSize="small" />;
      case 'unhealthy':
        return <ErrorIcon color="error" fontSize="small" />;
      default:
        return <ErrorIcon color="disabled" fontSize="small" />;
    }
  };

  const getAgentType = (): string => {
    // Safely get agent type with fallbacks
    return agent.metadata?.type || 'monitoring'; // Default type
  };

  const getAgentIcon = () => {
    // Safely get agent type with a default value
    const agentType = getAgentType();
    const normalizedType = String(agentType).toLowerCase();
    switch (normalizedType) {
      case 'monitoring':
        return <SpeedIcon color="primary" />;
      case 'security':
        return <SecurityIcon color="secondary" />;
      case 'cluster':
        return <ClusterIcon color="info" />;
      default:
        return <SpeedIcon color="action" />;
    }
  };

  const handleCardClick = () => {
    onSelect?.(agent);
  };

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChat?.(agent.id);
  };

  const handleCapabilitiesClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCapabilities?.(agent);
  };

  const handleActivateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleToggleStatus();
  };

  return (
    <motion.div
      initial="initial"
      whileHover="hover"
      animate={isSelected ? "selected" : "initial"}
      variants={cardVariants}
      className={className}
      style={{ height: '100%' }}
    >
      <Card 
        className={className}
        onClick={handleCardClick}
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.2s ease-in-out',
          border: isSelected 
            ? `2px solid ${theme.palette.primary.main}` 
            : `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          backgroundColor: isSelected 
            ? alpha(theme.palette.primary.light, 0.05)
            : theme.palette.background.paper,
          overflow: 'hidden',
          cursor: 'pointer',
          '&:hover': {
            borderColor: theme.palette.primary.main,
          },
        }}
      >
        {/* Status indicator bar */}
        <Box 
          sx={{ 
            height: 4,
            width: '100%',
            backgroundColor: statusColor,
            opacity: isActive ? 1 : 0.6
          }}
        />
        
        <CardContent sx={{ 
          flexGrow: 1, 
          width: '100%',
          p: 2,
          '&:last-child': {
            pb: 2
          }
        }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center" gap={1.5} width="100%">
            <Avatar 
              sx={{ 
                bgcolor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                width: 40,
                height: 40,
                fontSize: '1rem',
                fontWeight: 500
              }}
            >
              {agent.name.charAt(0).toUpperCase()}
            </Avatar>
            
            <Box flex={1} minWidth={0}>
              <Typography 
                variant="subtitle1" 
                component="div" 
                fontWeight={600}
                noWrap
                sx={{
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
              }}
              >
                {agent.name}
              </Typography>
              
              <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: statusColor,
                    opacity: isActive ? 1 : 0.5
                  }}
                />
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    textTransform: 'capitalize',
                    '& svg': {
                      fontSize: '0.9em'
                    }
                  }}
                >
                  {getStatusIcon()}
                  {health}
                </Typography>
                
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{
                    '&:before': {
                      content: '"•"',
                      mx: 0.5,
                      color: 'text.disabled'
                    }
                  }}
                >
                  {getAgentType()}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <Typography 
          variant="body2" 
          color="text.secondary" 
          paragraph 
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minHeight: 60,
            mb: 2
          }}
        >
          {agent.description || 'No description available'}
        </Typography>

        {Array.isArray(agent.capabilities) && agent.capabilities.length > 0 ? (
          <Box 
            display="flex" 
            flexWrap="wrap" 
            gap={1} 
            mt="auto"
            pt={1}
            sx={{
              borderTop: `1px solid ${theme.palette.divider}`,
              '& .MuiChip-root': {
                fontSize: '0.65rem',
                height: 20,
                '& .MuiChip-label': {
                  px: 0.75,
                }
              }
            }}
          >
            {agent.capabilities.slice(0, 3).map((capability, index) => {
              const capabilityName = typeof capability === 'string' 
                ? capability 
                : capability?.name || 'Unnamed';
              const capabilityId = typeof capability === 'string' 
                ? capability 
                : capability?.id || `capability-${index}`;
              
              return (
                <Chip 
                  key={capabilityId}
                  label={capabilityName}
                  size="small" 
                  variant="outlined"
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.dark,
                    border: 'none',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.15),
                    }
                  }}
                />
              );
            })}
            {agent.capabilities.length > 3 && (
              <Chip 
                label={`+${agent.capabilities.length - 3}`} 
                size="small"
                variant="outlined"
                sx={{
                  bgcolor: 'action.hover',
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
                onConfigure?.(agent.id);
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
  );
};

export default AgentCard;
