import React, { useState, useEffect, useCallback } from 'react';
import { useAgents } from '../hooks/useAgents';
import {
  Card, CardContent, Typography, Button, Box,
  CircularProgress, Alert, Collapse, IconButton, Tooltip,
  TextField, FormControlLabel, Switch, Select, MenuItem, InputLabel, FormControl, FormHelperText
} from '@mui/material';
import {
  ExpandMore, ExpandLess, Settings as SettingsIcon,
  PlayArrow as ExecuteIcon, CheckCircle as SuccessIcon
} from '@mui/icons-material';
import {
  AgentCapability,
  AgentAction,
  ParameterSchema
} from '../types/index';

type ParamValue = string | number | boolean | string[] | null;
type ParamsState = Record<string, ParamValue>;

interface CapabilityActionProps {
  capabilityName: string;
  action: AgentAction;
  onExecute: (capability: string, action: string, params: Record<string, unknown>) => Promise<void>;
}

interface AgentCapabilitiesProps {
  agentId: string;
  onConfigureCapability?: (capability: AgentCapability) => void;
}

const CapabilityAction: React.FC<CapabilityActionProps> = ({ 
  capabilityName, 
  action,
  onExecute
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [params, setParams] = useState<ParamsState>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (action?.parameters) {
      const defaults: ParamsState = {};
      Object.entries(action.parameters).forEach(([paramName, paramConfig]) => {
        if (paramConfig.default !== undefined) {
          defaults[paramName] = paramConfig.default as ParamValue;
        } else if (paramConfig.required) {
          switch (paramConfig.type) {
            case 'string': defaults[paramName] = ''; break;
            case 'number': defaults[paramName] = 0; break;
            case 'boolean': defaults[paramName] = false; break;
            case 'array': defaults[paramName] = '[]'; break;
            case 'object': defaults[paramName] = '{}'; break;
          }
        }
      });
      setParams(defaults);
    }
  }, [action]);

  const validateParams = (): boolean => {
    if (!action.parameters) return true;
    const errors: Record<string, string> = {};
    let isValid = true;
    Object.entries(action.parameters).forEach(([paramName, paramConfig]) => {
      const value = params[paramName];
      if (paramConfig.required && (value === undefined || value === null || value === '')) {
        errors[paramName] = 'This field is required';
        isValid = false;
      } else if (value !== undefined && value !== null) {
        switch (paramConfig.type) {
          case 'string':
            if (typeof value !== 'string') {
              errors[paramName] = 'Must be a string';
              isValid = false;
            } else if (paramConfig.pattern && !new RegExp(paramConfig.pattern).test(value)) {
              errors[paramName] = 'Invalid format';
              isValid = false;
            }
            break;
          case 'number': {
            const numValue = Number(value);
            if (isNaN(numValue)) {
              errors[paramName] = 'Must be a number';
              isValid = false;
            } else if (paramConfig.minimum !== undefined && numValue < paramConfig.minimum) {
              errors[paramName] = `Must be at least ${paramConfig.minimum}`;
              isValid = false;
            } else if (paramConfig.maximum !== undefined && numValue > paramConfig.maximum) {
              errors[paramName] = `Must be at most ${paramConfig.maximum}`;
              isValid = false;
            }
            break;
          }
          case 'array':
            try {
              const arrayValue = typeof value === 'string' ? JSON.parse(value) : value;
              if (!Array.isArray(arrayValue)) {
                errors[paramName] = 'Must be an array';
                isValid = false;
              }
            } catch {
              errors[paramName] = 'Invalid JSON for array';
              isValid = false;
            }
            break;
          case 'object':
            try {
              const objectValue = typeof value === 'string' ? JSON.parse(value) : value;
              if (typeof objectValue !== 'object' || Array.isArray(objectValue)) {
                errors[paramName] = 'Must be an object';
                isValid = false;
              }
            } catch {
              errors[paramName] = 'Invalid JSON for object';
              isValid = false;
            }
            break;
        }
      }
    });
    setValidationErrors(errors);
    return isValid;
  };

  const handleParamChange = (paramName: string, value: ParamValue) => {
    setParams(prev => ({ ...prev, [paramName]: value }));
    if (validationErrors[paramName]) {
      const newErrors = { ...validationErrors };
      delete newErrors[paramName];
      setValidationErrors(newErrors);
    }
  };

  const handleExecute = async () => {
    if (!validateParams()) return;

    setIsExecuting(true);
    setError(null);
    setSuccess(null);

    try {
      const finalParams: Record<string, unknown> = {};
      if (action.parameters) {
        Object.entries(action.parameters).forEach(([paramName, paramConfig]) => {
          let value = params[paramName];
          if (paramConfig.type === 'number') {
            value = Number(value);
          } else if (paramConfig.type === 'array' || paramConfig.type === 'object') {
            if (typeof value === 'string') {
              try { value = JSON.parse(value); } catch { /* ignore */ }
            }
          }
          finalParams[paramName] = value;
        });
      }
      await onExecute(capabilityName, action.name, finalParams);
      setSuccess('Action executed successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsExecuting(false);
    }
  };

  const renderParameterInput = (paramName: string, paramConfig: ParameterSchema) => {
    const value = params[paramName];
    const error = validationErrors[paramName];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      handleParamChange(paramName, e.target.value);
    };
    
    const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleParamChange(paramName, e.target.checked);
    };

    if (paramConfig.enum) {
      return (
        <FormControl fullWidth error={!!error} margin="normal">
          <InputLabel>{paramConfig.description || paramName}</InputLabel>
          <Select
            value={value ?? ''}
            label={paramConfig.description || paramName}
            onChange={(e) => handleParamChange(paramName, e.target.value as ParamValue)}
          >
            {(paramConfig.enum as (string | number)[]).map((option) => (
              <MenuItem key={String(option)} value={option as string | number}>
                {String(option)}
              </MenuItem>
            ))}
          </Select>
          {error && <FormHelperText>{error}</FormHelperText>}
        </FormControl>
      );
    }

    switch (paramConfig.type) {
      case 'boolean':
        return (
          <FormControlLabel
            control={<Switch checked={!!value} onChange={handleSwitchChange} />}
            label={paramConfig.description || paramName}
          />
        );
      case 'number':
        return (
          <TextField
            fullWidth
            type="number"
            label={paramConfig.description || paramName}
            value={value ?? ''}
            onChange={handleChange}
            required={paramConfig.required}
            error={!!error}
            helperText={error}
            margin="normal"
          />
        );
      case 'array':
      case 'object':
        return (
          <TextField
            fullWidth
            multiline
            rows={3}
            label={`${paramConfig.description || paramName} (JSON)`}
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={handleChange}
            required={paramConfig.required}
            error={!!error}
            helperText={error}
            margin="normal"
            variant="outlined"
            InputProps={{ style: { fontFamily: 'monospace' } }}
          />
        );
      case 'string':
      default:
        return (
          <TextField
            fullWidth
            label={paramConfig.description || paramName}
            value={value ?? ''}
            onChange={handleChange}
            required={paramConfig.required}
            error={!!error}
            helperText={error}
            margin="normal"
          />
        );
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{action.name}</Typography>
          <Tooltip title={isConfigOpen ? 'Hide Parameters' : 'Show Parameters'}>
            <IconButton onClick={() => setIsConfigOpen(!isConfigOpen)} size="small">
              {isConfigOpen ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Tooltip>
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>{action.description}</Typography>
        
        <Collapse in={isConfigOpen} timeout="auto" unmountOnExit>
          <Box sx={{ mt: 2 }}>
            {action.parameters && Object.keys(action.parameters).length > 0 ? (
              Object.entries(action.parameters).map(([paramName, paramConfig]) => (
                <div key={paramName}>{renderParameterInput(paramName, paramConfig)}</div>
              ))
            ) : (
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>No parameters required.</Typography>
            )}
            <Button
              variant="contained"
              color="primary"
              onClick={handleExecute}
              disabled={isExecuting}
              startIcon={isExecuting ? <CircularProgress size={20} /> : <ExecuteIcon />}
              sx={{ mt: 2 }}
            >
              {isExecuting ? 'Executing...' : 'Execute'}
            </Button>
          </Box>
        </Collapse>

        <Collapse in={!!error || !!success}>
          <Box mt={2}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success" icon={<SuccessIcon fontSize="inherit" />}>{success}</Alert>}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

interface CapabilityCardProps {
  capability: AgentCapability;
  onExecuteAction: (capability: string, action: string, params: Record<string, unknown>) => Promise<void>;
  onConfigure?: (capability: AgentCapability) => void;
}

const CapabilityCard: React.FC<CapabilityCardProps> = ({ capability, onExecuteAction, onConfigure }) => {
  const [expanded, setExpanded] = useState(false);
  const hasActions = capability.actions && capability.actions.length > 0;

  const handleConfigure = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onConfigure) {
      onConfigure(capability);
    }
  };

  return (
    <Card elevation={2}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" component="div">{capability.name}</Typography>
            <Typography variant="body2" color="text.secondary">{capability.description}</Typography>
          </Box>
          <Box>
            {onConfigure && (
              <Tooltip title="Configure Capability">
                <IconButton onClick={handleConfigure} size="small" sx={{ mr: 1 }}>
                  <SettingsIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={expanded ? 'Collapse' : 'Expand'}>
              <IconButton onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} aria-expanded={expanded} aria-label="show more" size="small">
                {expanded ? <ExpandLess /> : <ExpandMore />} 
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box sx={{ mt: 2 }}>
            {hasActions ? (
              <Box>
                <Typography variant="subtitle2" gutterBottom>Available Actions</Typography>
                {capability.actions?.map((action) => (
                  <Box key={action.name} mb={2}>
                    <CapabilityAction
                      capabilityName={capability.name}
                      action={action}
                      onExecute={onExecuteAction}
                    />
                  </Box>
                ))}
              </Box>
            ) : (
              <Alert severity="info" sx={{ mt: 1 }}>No actions available for this capability.</Alert>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

const AgentCapabilities: React.FC<AgentCapabilitiesProps> = ({ agentId, onConfigureCapability }) => {
  const { getAgentCapabilities, loadAgentCapabilities } = useAgents();
  const [capabilities, setCapabilities] = useState<AgentCapability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCapabilities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const agentCaps = await getAgentCapabilities(agentId);
      setCapabilities(agentCaps);
      if (agentCaps.length === 0) {
        await loadAgentCapabilities(agentId);
        const updatedCaps = await getAgentCapabilities(agentId);
        setCapabilities(updatedCaps);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load capabilities');
      console.error('Error loading capabilities:', err);
    } finally {
      setLoading(false);
    }
  }, [agentId, getAgentCapabilities, loadAgentCapabilities]);

  useEffect(() => {
    loadCapabilities();
  }, [loadCapabilities]);

  const handleExecuteAction = async (capabilityName: string, action: string, params: Record<string, unknown>) => {
    // This is a placeholder. In a real app, you'd call the agent service.
    console.log(`Executing ${action} on ${capabilityName} with params:`, params);
    // Re-load capabilities to reflect any state changes.
    await loadCapabilities();
  };

  if (loading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h5" gutterBottom>Agent Capabilities</Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          These are the capabilities available for this agent. Click on a capability to see available actions.
        </Typography>
      </Box>
      {capabilities.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {capabilities.map((capability) => (
            <CapabilityCard
              key={capability.id || capability.name}
              capability={capability}
              onExecuteAction={handleExecuteAction}
              onConfigure={onConfigureCapability}
            />
          ))}
        </Box>
      ) : (
        <Alert severity="info">No capabilities found for this agent.</Alert>
      )}
    </Box>
  );
};

export default AgentCapabilities;
