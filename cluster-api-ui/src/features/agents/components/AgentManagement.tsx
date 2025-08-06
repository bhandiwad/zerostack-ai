import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemButton,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useAgentContext } from '../context/AgentContext';
import { Agent } from '../types';

interface AgentManagementProps {
  onAgentSelect?: (agentId: string) => void;
  selectedAgentId?: string;
}

const AgentManagement: React.FC<AgentManagementProps> = ({ onAgentSelect, selectedAgentId }) => {
    const { agents, createAgent, updateAgent, deleteAgent, loading, error } = useAgentContext();
  const [openDialog, setOpenDialog] = React.useState(false);
  const [currentAgent, setCurrentAgent] = React.useState<Partial<Agent> | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const handleOpenDialog = (agent: Partial<Agent> | null = null) => {
    setCurrentAgent(agent || { name: '', description: '' });
    setFormError(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentAgent(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
        setCurrentAgent((prev) => (
      prev ? { ...prev, [name]: value } : { [name]: value }
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentAgent?.name?.trim()) {
      setFormError('Agent name is required');
      return;
    }

    // Guard against null currentAgent, though the check above should prevent it.
    if (!currentAgent) {
      setFormError('An unexpected error occurred.');
      return;
    }

    try {
      if (currentAgent.id) {
        await updateAgent(currentAgent.id, {
          name: currentAgent.name,
          description: currentAgent.description || '',
        });
      } else {
        await createAgent({
          name: currentAgent.name,
          description: currentAgent.description || '',
          capabilities: [],
          config: { enabled: true },
        });
      }
      handleCloseDialog();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save agent');
    }
  };

  const handleDelete = async (agentId: string) => {
    if (window.confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
      try {
        await deleteAgent(agentId);
      } catch (err) {
        console.error('Failed to delete agent:', err);
      }
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Agents</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Agent
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && !agents.length ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <List>
          {agents.map((agent: Agent) => (
            <React.Fragment key={agent.id}>
              <ListItem
                disablePadding
                secondaryAction={
                  <ListItemSecondaryAction>
                    <Tooltip title="Edit">
                      <IconButton 
                        edge="end" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDialog(agent);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(agent.id);
                        }}
                        disabled={loading}
                      >
                        <DeleteIcon fontSize="small" color={loading ? 'disabled' : 'error'} />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                }
              >
                <ListItemButton
                  selected={selectedAgentId === agent.id}
                  onClick={() => onAgentSelect?.(agent.id)}
                >
                  <ListItemText
                    primary={agent.name}
                    secondary={agent.description || 'No description'}
                    primaryTypographyProps={{
                      fontWeight: selectedAgentId === agent.id ? 'bold' : 'normal',
                    }}
                  />
                </ListItemButton>
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{currentAgent?.id ? 'Edit Agent' : 'Create New Agent'}</DialogTitle>
          <DialogContent>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}
            <TextField
              autoFocus
              margin="dense"
              name="name"
              label="Agent Name"
              type="text"
              fullWidth
              variant="outlined"
              value={currentAgent?.name || ''}
              onChange={handleInputChange}
              disabled={loading}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="description"
              label="Description"
              type="text"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={currentAgent?.description || ''}
              onChange={handleInputChange}
              disabled={loading}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              color="primary" 
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {currentAgent?.id ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default AgentManagement;
