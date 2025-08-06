import React, { useState, useEffect } from 'react';
import { useAIAgentContext } from '../context/AIAgentProvider';
import { AgentType, createAIAgent, AIAgentConfig } from '../ai/aiAgents';
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
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Info as InfoIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { AgentInstance } from '../ai/agentOrchestrator';

interface AIAgentFormProps {
  open: boolean;
  onClose: () => void;
  agentId?: string;
}

// Use a type that represents the form's data structure
interface AgentFormData {
  name: string;
  description: string;
  type: AgentType;
  config: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
}

const AIAgentForm: React.FC<AIAgentFormProps> = ({ open, onClose, agentId }) => {
  const { agents, createAgent, updateAgent, loading, loadAgents } = useAIAgentContext();

  const getInitialFormData = (): AgentFormData => ({
    name: '',
    description: '',
    type: AgentType.MONITORING,
    config: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000,
    },
  });

  const [formData, setFormData] = useState<AgentFormData>(getInitialFormData());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEditMode = !!agentId;

  useEffect(() => {
    if (isEditMode && agentId) {
      const agent = agents.find(a => a.id === agentId);
      if (agent) {
        setFormData({
          name: agent.name,
          description: agent.description,
          type: agent.type,
          config: {
            ...getInitialFormData().config,
            ...agent.config.config,
          },
        });
      }
    } else {
      setFormData(getInitialFormData());
    }
  }, [agentId, isEditMode, agents]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: AgentFormData) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: AgentFormData) => ({
      ...prev,
      config: {
        ...prev.config,
        [name]: name === 'temperature' || name === 'maxTokens' ? parseFloat(value) || 0 : value,
      },
    }));
  };

  const handleTypeChange = (e: SelectChangeEvent<AgentType>) => {
    const type = e.target.value as AgentType;
    const defaultConfig = createAIAgent(type);
    setFormData((prev: AgentFormData) => ({
      ...prev,
      type,
      description: defaultConfig.description,
      config: {
        ...prev.config,
        ...defaultConfig.config,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors: Record<string, string> = {};
    if (!formData.name) validationErrors.name = 'Name is required';
    if (!formData.description) validationErrors.description = 'Description is required';

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      if (isEditMode && agentId) {
        const payload: Partial<AgentInstance> = {
          name: formData.name,
          description: formData.description,
          type: formData.type,
          config: {
            ...createAIAgent(formData.type),
            ...formData,
            config: formData.config,
          },
        };
        await updateAgent(agentId, payload);
      } else {
        const agentData: AIAgentConfig = {
          ...createAIAgent(formData.type),
          name: formData.name,
          description: formData.description,
          type: formData.type,
          config: formData.config,
        };
        await createAgent(formData.type, agentData);
      }

      await loadAgents();
      onClose();
    } catch (error) {
      console.error('Failed to save agent:', error);
      setErrors({ form: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEditMode ? 'Edit AI Agent' : 'Create New AI Agent'}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {errors.form && (
            <Typography color="error" sx={{ mb: 2 }}>
              {errors.form}
            </Typography>
          )}
          <Box display="flex" flexDirection="column" gap={2}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="agent-type-label">Agent Type</InputLabel>
              <Select
                labelId="agent-type-label"
                value={formData.type || ''}
                label="Agent Type"
                onChange={handleTypeChange}
              >
                {Object.values(AgentType).map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Select the agent&apos;s primary function.</FormHelperText>
            </FormControl>

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

            <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
              <Box display="flex" alignItems="center" mb={2}>
                <Typography variant="subtitle2">Configuration</Typography>
                <Tooltip title="Advanced configuration for the AI model">
                  <InfoIcon fontSize="small" color="action" sx={{ ml: 1 }} />
                </Tooltip>
              </Box>

              <Box display="flex" flexDirection="row" flexWrap="wrap" gap={2}>
                <TextField
                  label="Model"
                  name="model"
                  value={formData.config?.model || ''}
                  onChange={handleConfigChange}
                  select
                  size="small"
                  sx={{ flex: '1 1 45%' }}
                >
                  <MenuItem value="gpt-4">GPT-4</MenuItem>
                  <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo</MenuItem>
                  <MenuItem value="claude-2">Claude 2</MenuItem>
                </TextField>

                <TextField
                  label="Temperature"
                  name="temperature"
                  type="number"
                  value={formData.config?.temperature || 0.7}
                  onChange={handleConfigChange}
                  inputProps={{ min: 0, max: 2, step: 0.1 }}
                  size="small"
                  helperText="Higher values = more creative"
                  sx={{ flex: '1 1 45%' }}
                />

                <TextField
                  label="Max Tokens"
                  name="maxTokens"
                  type="number"
                  value={formData.config?.maxTokens || 1000}
                  onChange={handleConfigChange}
                  inputProps={{ min: 100, max: 4000, step: 100 }}
                  size="small"
                  helperText="Maximum response length"
                  sx={{ flex: '1 1 45%' }}
                />
              </Box>
            </Paper>
          </Box>
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
