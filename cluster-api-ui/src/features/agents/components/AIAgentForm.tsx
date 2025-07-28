import React, { useState, useEffect } from 'react';
import { useAIAgentContext } from '../context/AIAgentProvider';
import { AgentType, AIAgentConfig, createAIAgent } from '../ai/aiAgents';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  FormHelperText,
  Typography,
  Paper,
  Grid,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Info as InfoIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface AIAgentFormProps {
  open: boolean;
  onClose: () => void;
  agentId?: string;
}

const AIAgentForm: React.FC<AIAgentFormProps> = ({ open, onClose, agentId }) => {
  const { agents, createAgent, updateAgent, loading } = useAIAgentContext();
  
  const [formData, setFormData] = useState<Partial<AIAgentConfig>>({
    type: AgentType.MONITORING,
    name: '',
    description: '',
    config: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000,
    },
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEditMode = !!agentId;

  useEffect(() => {
    if (isEditMode && agentId) {
      const agent = agents.find(a => a.id === agentId);
      if (agent) {
        setFormData({
          type: agent.type as AgentType,
          name: agent.name,
          description: agent.config.description,
          config: {
            ...agent.config,
          },
        });
      }
    } else {
      // Reset form for new agent
      setFormData({
        type: AgentType.MONITORING,
        name: '',
        description: '',
        config: {
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 1000,
        },
      });
    }
  }, [agentId, isEditMode, agents]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [name]: name === 'temperature' || name === 'maxTokens' 
          ? parseFloat(value) || 0 
          : value,
      },
    }));
  };

  const handleTypeChange = (e: SelectChangeEvent<AgentType>) => {
    const type = e.target.value as AgentType;
    const defaultConfig = createAIAgent(type);
    
    setFormData(prev => ({
      ...prev,
      type,
      description: defaultConfig.description,
      config: {
        ...defaultConfig.config,
        ...prev.config, // Keep any existing config overrides
      },
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      if (isEditMode && agentId) {
        await updateAgent(agentId, {
          name: formData.name || '',
          config: {
            ...formData.config,
            description: formData.description || '',
          },
        });
      } else {
        await createAgent(formData.type || AgentType.MONITORING, {
          name: formData.name || '',
          description: formData.description || '',
          config: formData.config,
        });
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving agent:', error);
      // Error handling would be handled by the context
    }
  };

  const agentTypeOptions = Object.values(AgentType).map(type => ({
    value: type,
    label: type.charAt(0).toUpperCase() + type.slice(1),
  }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            {isEditMode ? 'Edit Agent' : 'Create New Agent'}
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal" error={!!errors.type}>
                <InputLabel id="agent-type-label">Agent Type</InputLabel>
                <Select
                  labelId="agent-type-label"
                  id="type"
                  name="type"
                  value={formData.type || ''}
                  onChange={handleTypeChange}
                  label="Agent Type"
                  disabled={isEditMode}
                >
                  {agentTypeOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                {errors.type && <FormHelperText>{errors.type}</FormHelperText>}
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                margin="normal"
                label="Agent Name"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                error={!!errors.name}
                helperText={errors.name}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                margin="normal"
                label="Description"
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                error={!!errors.description}
                helperText={errors.description}
                multiline
                rows={3}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <Typography variant="subtitle2">Configuration</Typography>
                  <Tooltip title="Advanced configuration for the AI model">
                    <InfoIcon fontSize="small" color="action" sx={{ ml: 1 }} />
                  </Tooltip>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Model"
                      name="model"
                      value={formData.config?.model || ''}
                      onChange={handleConfigChange}
                      select
                      size="small"
                    >
                      <MenuItem value="gpt-4">GPT-4</MenuItem>
                      <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo</MenuItem>
                      <MenuItem value="claude-2">Claude 2</MenuItem>
                    </TextField>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Temperature"
                      name="temperature"
                      type="number"
                      value={formData.config?.temperature || 0.7}
                      onChange={handleConfigChange}
                      inputProps={{
                        min: 0,
                        max: 2,
                        step: 0.1,
                      }}
                      size="small"
                      helperText="Higher values = more creative, lower = more focused"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Max Tokens"
                      name="maxTokens"
                      type="number"
                      value={formData.config?.maxTokens || 1000}
                      onChange={handleConfigChange}
                      inputProps={{
                        min: 100,
                        max: 4000,
                        step: 100,
                      }}
                      size="small"
                      helperText="Maximum length of the response"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            disabled={loading}
          >
            {isEditMode ? 'Update' : 'Create'} Agent
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AIAgentForm;
