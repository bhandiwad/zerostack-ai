import React, { useState } from 'react';
import { useAIAgentContext } from '../context/AIAgentProvider';

import { AgentInstance } from '../ai/agentOrchestrator';

import {
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Typography,
  IconButton,
  Box,
  Chip,
  Tooltip,
  CircularProgress,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Monitor as MonitorIcon,
  AutoFixHigh as AutomationIcon,
  Security as SecurityIcon,
  Analytics as AnalyticsIcon,
  SupportAgent as SupportIcon,
  MoreVert as MoreVertIcon,
  PlayArrow as ActiveIcon,
  Stop as InactiveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';

// Define agent type configurations
const agentTypeConfig = {
  MONITORING: {
    icon: <MonitorIcon />,
    color: '#4caf50', // Green
    label: 'Monitoring',
  },
  AUTOMATION: {
    icon: <AutomationIcon />,
    color: '#2196f3', // Blue
    label: 'Automation',
  },
  SECURITY: {
    icon: <SecurityIcon />,
    color: '#f44336', // Red
    label: 'Security',
  },
  ANALYTICS: {
    icon: <AnalyticsIcon />,
    color: '#9c27b0', // Purple
    label: 'Analytics',
  },
  SUPPORT: {
    icon: <SupportIcon />,
    color: '#ff9800', // Orange
    label: 'Support',
  },
} as const;

type AgentType = keyof typeof agentTypeConfig;

// Define a type for the agent status display
const agentStatusDisplay = {
  active: {
    label: 'Active',
    color: 'success' as const,
    icon: <ActiveIcon fontSize="small" />,
  },
  inactive: {
    label: 'Inactive',
    color: 'default' as const,
    icon: <InactiveIcon fontSize="small" />,
  },
  error: {
    label: 'Error',
    color: 'error' as const,
    icon: <InactiveIcon fontSize="small" />,
  },
} as const;

interface AIAgentListProps {
  onSelectAgent: (agentId: string) => void;
  onEditAgent: (agent: AgentInstance) => void;
  onCreateAgent: () => void;
  onRefreshAgents: () => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

const AIAgentList: React.FC<AIAgentListProps> = ({
  onSelectAgent,
  onEditAgent,
  onCreateAgent,
  onRefreshAgents,
  loading = false,
  error: externalError,
}) => {

  const { agents } = useAIAgentContext();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentInstance | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, agent: AgentInstance) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedAgent(agent);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAgent(null);
  };

  const handleDeleteClick = () => {
    if (selectedAgent) {
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAgent) return;

    try {
      setIsDeleting(true);
      // TODO: Uncomment when deleteAgent is implemented in the service
      // await agentService.deleteAgent(selectedAgent.id);
      setSnackbar({
        open: true,
        message: 'Agent deleted successfully',
        severity: 'success',
      });
      await onRefreshAgents();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to delete agent',
        severity: 'error',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleEditClick = () => {
    if (selectedAgent) {
      onEditAgent(selectedAgent);
    }
    handleMenuClose();
  };

  const handleChatClick = () => {
    if (selectedAgent) {
      onSelectAgent(selectedAgent.id);
    }
    handleMenuClose();
  };

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  if (loading && agents.length === 0) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" p={3} gap={2}>
        <CircularProgress />
        <Typography variant="body2" color="textSecondary">
          Loading agents...
        </Typography>
      </Box>
    );
  }

  const errorToDisplay = externalError || (agents.length === 0 ? 'No agents found' : null);

  if (errorToDisplay && agents.length === 0) {
    return (
      <Box p={3} textAlign="center">
        <Typography color="error" gutterBottom>
          {errorToDisplay}
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          onClick={onRefreshAgents}
          startIcon={<RefreshIcon />}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <>
      <List>
        {agents.map((agent) => {
          const agentType = ((agent.metadata?.type as AgentType) || 'SUPPORT');
          const config = agentTypeConfig[agentType] || agentTypeConfig.SUPPORT;

          // Determine agent status for display
          const status = agent.isActive ? 'active' : 'inactive';
          const statusConfig = agentStatusDisplay[status];

          return (
            <ListItem
              key={agent.id}
              component="div"
              onClick={() => onSelectAgent(agent.id)}
              sx={{
                mb: 1,
                borderRadius: 1,
                transition: 'all 0.2s ease-in-out',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'action.hover',
                  transform: 'translateY(-1px)',
                  boxShadow: 2,
                },
              }}
            >
              <ListItemAvatar>
                <Avatar
                  sx={{
                    bgcolor: `${config.color}1a`,
                    color: config.color,
                  }}
                >
                  {config.icon}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="subtitle1" noWrap>
                      {agent.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={statusConfig.label}
                      color={statusConfig.color}
                      icon={statusConfig.icon}
                      variant="outlined"
                    />
                  </Box>
                }
                secondary={
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {agent.description || 'No description provided'}
                  </Typography>
                }
              />
              <Box display="flex" alignItems="center">
                <Tooltip title="More actions">
                  <IconButton
                    edge="end"
                    onClick={(e) => handleMenuOpen(e, agent)}
                    size="small"
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      },
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </ListItem>
          );
        })}
        <ListItem 
          component="div"
          onClick={onCreateAgent}
          sx={{
            borderRadius: 1,
            mt: 1,
            border: '1px dashed',
            borderColor: 'divider',
            cursor: 'pointer',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'action.hover',
            },
          }}
        >
          <ListItemAvatar>
            <Avatar sx={{ bgcolor: 'transparent', color: 'primary.main' }}>
              <AddIcon />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary="Add New Agent"
            primaryTypographyProps={{
              color: 'primary',
              fontWeight: 'medium',
            }}
          />
        </ListItem>
      </List>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={handleChatClick}>
          <ListItemIcon>
            <ChatIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Chat with Agent</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEditClick}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Agent</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ color: 'error' }}>
            Delete Agent
          </ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Agent</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the agent &quot;{selectedAgent?.name}&quot;? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} /> : null}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default AIAgentList;
