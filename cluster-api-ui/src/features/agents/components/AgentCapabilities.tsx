import React, { useState, useEffect, FC } from 'react';
import { useAgents } from '../context/AgentContext';
import { 
  Card, CardContent, Typography, Button, Box, Grid, Chip, 
  CircularProgress, Alert, Collapse, IconButton, Tooltip,
  TextField, FormControl, InputLabel, Select, MenuItem, 
  FormHelperText, Divider, FormControlLabel, Switch
} from '@mui/material';
import { 
  ExpandMore, ExpandLess, Settings as SettingsIcon,
  PlayArrow as ExecuteIcon, CheckCircle as SuccessIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { 
  AgentCapability as BaseAgentCapability, 
  AgentAction
} from '../types';

// Local type definitions since these interfaces are not exported from the types file
export interface ParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'integer';
  description?: string;
  required?: boolean;
  default?: any;
  enum?: any[];
  items?: ParameterSchema;
  properties?: Record<string, ParameterSchema>;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
}

export interface ActionSchema {
  name: string;
  description: string;
  parameters: Record<string, ParameterSchema>;
}

// Extend the base AgentCapability type to include UI-specific properties
interface AgentCapability extends Omit<BaseAgentCapability, 'actions'> {
  id: string;
  enabled: boolean;
  actions?: ActionSchema[];
  actionConfigs?: Record<string, {
    description: string;
    parameters: Record<string, ParameterSchema>;
  }>;
}

type ParamValue = string | number | boolean | string[] | null;
type ParamsState = Record<string, ParamValue>;

// Type guard to check if a value is an array
const isArray = (value: unknown): value is unknown[] => {
  return Array.isArray(value);
};

// Type guard to check if a value is an object (and not null or array)
const isObject = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

interface CapabilityActionProps {
  agentId: string;
  capabilityName: string;
  action: ActionSchema;
  onExecute: (capability: string, action: string, params: Record<string, unknown>) => Promise<void>;
}

interface CapabilityCardProps {
  agentId: string;
  capability: CapabilityInfo;
  onExecuteAction: (capability: string, action: string, params: Record<string, unknown>) => Promise<void>;
  onConfigure?: (capability: CapabilityInfo) => void;
}

interface AgentCapabilitiesProps {
  agentId: string;
  onConfigureCapability?: (capability: AgentCapability) => void;
}

const CapabilityAction: React.FC<CapabilityActionProps & { executionStatus?: { status: string; message?: string } }> = ({ 
  agentId, 
  capabilityName, 
  action,
  onExecute,
  executionStatus 
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  type ParamValue = string | number | boolean | string[] | null;
  type ParamsState = Record<string, ParamValue>;
  
  const [params, setParams] = useState<ParamsState>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Initialize form with default values
    if (action?.parameters) {
      const defaults: ParamsState = {};
      Object.entries(action.parameters).forEach(([paramName, paramConfig]) => {
        if (paramConfig.default !== undefined) {
          defaults[paramName] = paramConfig.default as ParamValue;
        } else if (paramConfig.required) {
          // Set empty defaults for required fields
          switch (paramConfig.type) {
            case 'string':
              defaults[paramName] = '';
              break;
            case 'number':
            case 'integer':
              defaults[paramName] = 0;
              break;
            case 'boolean':
              defaults[paramName] = false;
              break;
            case 'array':
              defaults[paramName] = '[]'; // Store as string to handle in form
              break;
            case 'object':
              defaults[paramName] = '{}'; // Store as string to handle in form
              break;
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
        // Type-specific validation
        switch (paramConfig.type) {
          case 'string':
            if (typeof value !== 'string') {
              errors[paramName] = 'Must be a string';
              isValid = false;
            } else if (paramConfig.minLength !== undefined && value.length < paramConfig.minLength) {
              errors[paramName] = `Must be at least ${paramConfig.minLength} characters`;
              isValid = false;
            } else if (paramConfig.maxLength !== undefined && value.length > paramConfig.maxLength) {
              errors[paramName] = `Must be at most ${paramConfig.maxLength} characters`;
              isValid = false;
            } else if (paramConfig.pattern && !new RegExp(paramConfig.pattern).test(value)) {
              errors[paramName] = 'Invalid format';
              isValid = false;
            }
            break;
            
          case 'number':
          case 'integer':
            const numValue = Number(value);
            if (isNaN(numValue)) {
              errors[paramName] = 'Must be a number';
              isValid = false;
            } else {
              if (paramConfig.minimum !== undefined && numValue < paramConfig.minimum) {
                errors[paramName] = `Must be at least ${paramConfig.minimum}`;
                isValid = false;
              }
              if (paramConfig.maximum !== undefined && numValue > paramConfig.maximum) {
                errors[paramName] = `Must be at most ${paramConfig.maximum}`;
                isValid = false;
              }
            }
            break;
            
          case 'array':
            try {
              const arrayValue = typeof value === 'string' ? JSON.parse(value) : value;
              if (!Array.isArray(arrayValue)) {
                throw new Error('Not an array');
              }
              
              if (paramConfig.minItems !== undefined && arrayValue.length < paramConfig.minItems) {
                errors[paramName] = `Must have at least ${paramConfig.minItems} items`;
                isValid = false;
              }
              if (paramConfig.maxItems !== undefined && arrayValue.length > paramConfig.maxItems) {
                errors[paramName] = `Must have at most ${paramConfig.maxItems} items`;
                isValid = false;
              }
            } catch (e) {
              errors[paramName] = 'Must be a valid JSON array';
              isValid = false;
            }
            break;
            
          case 'object':
            if (typeof value === 'string') {
              try {
                JSON.parse(value);
              } catch (e) {
                errors[paramName] = 'Must be a valid JSON object';
                isValid = false;
              }
            } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
              // Valid object
            } else {
              errors[paramName] = 'Must be an object';
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
    setParams(prev => ({
      ...prev,
      [paramName]: value
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[paramName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[paramName];
        return newErrors;
      });
    }
  };

  const handleExecute = async () => {
    if (!validateParams()) return;
    
    try {
      // Convert stringified JSON back to objects if needed
      const processedParams: Record<string, any> = { ...params };
      
      if (action.parameters) {
        Object.entries(action.parameters).forEach(([paramName, paramConfig]) => {
          if (paramConfig.type === 'array' || paramConfig.type === 'object') {
            try {
              const paramValue = processedParams[paramName];
              if (typeof paramValue === 'string') {
                processedParams[paramName] = JSON.parse(paramValue);
              }
            } catch (e) {
              console.error(`Error parsing ${paramName}:`, e);
              throw new Error(`Invalid ${paramConfig.type} format for ${paramName}`);
            }
          }
        });
      }
      
      setIsExecuting(true);
      setError(null);
      setSuccess(null);
      
      const handleExecuteAction = async (actionName: string, actionParams: Record<string, unknown>) => {
        try {
          await onExecute(capabilityName, actionName, actionParams);
        } catch (error) {
          console.error('Error executing action:', error);
          throw error; // Re-throw to allow error handling in parent
        }
      };
      
      await handleExecuteAction(action.name, processedParams);
      setSuccess(`Action "${action.name}" executed successfully`);
    } catch (err) {
      console.error('Error executing action:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute action');
    } finally {
      setIsExecuting(false);
    }
  };

  const renderParameterInput = (paramName: string, paramConfig: ParameterSchema) => {
    const error = validationErrors[paramName];
    const value = params[paramName] ?? '';
    const isRequired = paramConfig.required || false;
    const description = paramConfig.description || '';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { value: unknown }>) => {
      const newValue = 'target' in e ? e.target.value : e.value;
      handleParamChange(paramName, newValue as ParamValue);
    };
    
    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleParamChange(paramName, e.target.checked);
    };
    
    const handleSelectChange = (e: React.ChangeEvent<{ value: unknown }>) => {
      handleParamChange(paramName, e.target.value as ParamValue);
    };
    
    // Handle boolean type
    if (paramConfig.type === 'boolean') {
      return (
        <FormControlLabel
          control={
            <Switch
              checked={!!value}
              onChange={handleCheckboxChange}
              color="primary"
            />
          }
          label={
            <Box>
              <Typography variant="body2">{paramName}{isRequired ? ' *' : ''}</Typography>
              {description && (
                <Typography variant="caption" color="textSecondary">
                  {description}
                </Typography>
              )}
            </Box>
          }
          sx={{ mt: 1, mb: 1, alignItems: 'flex-start' }}
        />
      );
    }
    
    // Handle array type (comma-separated input)
    if (paramConfig.type === 'array') {
      return (
        <TextField
          fullWidth
          label={`${paramName}${isRequired ? ' *' : ''}`}
          placeholder={description}
          value={Array.isArray(value) ? value.join(', ') : value}
          onChange={(e) => {
            const val = e.target.value;
            const arrayValue = val.split(',').map((item: string) => item.trim()).filter(Boolean);
            handleParamChange(paramName, arrayValue);
          }}
          margin="normal"
          size="small"
          error={!!error}
          helperText={error || description}
          InputLabelProps={{
            shrink: true,
          }}
        />
      );
    }
    
    // Handle number and integer types
    // Handle number type
    if (paramConfig.type === 'number' || paramConfig.type === 'integer') {
      return (
        <TextField
          fullWidth
          label={`${paramName}${isRequired ? ' *' : ''}`}
          placeholder={description}
          value={value}
          onChange={handleChange}
          type="number"
          margin="normal"
          size="small"
          error={!!error}
          helperText={error || description}
          inputProps={{
            min: paramConfig.minimum,
            max: paramConfig.maximum,
            step: paramConfig.type === 'integer' ? '1' : 'any'
          }}
          InputLabelProps={{
            shrink: true,
          }}
        />
      );
    }
    
    // Default to text input
    return (
      <TextField
        fullWidth
        label={`${paramName}${isRequired ? ' *' : ''}`}
        placeholder={description}
        value={value}
        onChange={handleChange}
        type={paramConfig.format === 'password' ? 'password' : 'text'}
        margin="normal"
        size="small"
        error={!!error}
        helperText={error || description}
        inputProps={{
          maxLength: paramConfig.maxLength,
          minLength: paramConfig.minLength,
          pattern: paramConfig.pattern
        }}
        InputLabelProps={{
          shrink: true,
        }}
      />
    );
  };

  const hasParameters = action?.parameters && Object.keys(action.parameters).length > 0;

  return (
    <Box sx={{ mb: 2, p: 2, border: '1px solid #eee', borderRadius: 1, bgcolor: 'background.paper' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Box>
          <Typography variant="subtitle2">{action.name}</Typography>
          {action.description && (
            <Typography variant="body2" color="text.secondary">
              {action.description}
            </Typography>
          )}
        </Box>
        <Box>
          {hasParameters && (
            <Tooltip title="Configure action">
              <IconButton 
                size="small" 
                onClick={() => setIsConfigOpen(!isConfigOpen)}
                color={isConfigOpen ? 'primary' : 'default'}
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Button 
            variant="contained" 
            size="small"
            onClick={handleExecute}
            disabled={isExecuting}
            startIcon={
              isExecuting ? 
                <CircularProgress size={16} /> : 
                success ? 
                  <SuccessIcon color="success" /> : 
                  <ExecuteIcon />
            }
            color={success ? 'success' : 'primary'}
            sx={{ ml: 1 }}
          >
            {isExecuting ? 'Executing...' : success ? 'Success' : 'Execute'}
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mt: 1, mb: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mt: 1, mb: 1 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      <Collapse in={isConfigOpen && hasParameters}>
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
          <Typography variant="subtitle2" gutterBottom>
            Action Parameters
          </Typography>
          {action.parameters && 
            Object.entries(action.parameters).map(([paramName, paramConfig]) => (
              <Box key={paramName} mb={2}>
                {renderParameterInput(paramName, paramConfig)}
              </Box>
            ))
          }
        </Box>
      </Collapse>
    </Box>
  );
};

// Extend AgentCapability but override the actions type to be more specific
// Extend the base AgentCapability type to include our UI-specific fields
interface CapabilityInfo extends Omit<AgentCapability, 'id' | 'enabled'> {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  version?: string;
  metadata?: {
    type: string;
    icon: string;
    color: string;
  };
  actions?: ActionSchema[];
  actionConfigs?: Record<string, {
    description: string;
    parameters: Record<string, ParameterSchema>;
  }>;
  config?: Record<string, unknown>;
  error?: string;
}

interface AgentParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  required?: boolean;
  default?: string | number | boolean | null;
  enum?: Array<string | number | boolean>;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  items?: AgentParameter;
  properties?: Record<string, AgentParameter>;
}

interface CapabilityCardProps {
  agentId: string;
  capability: CapabilityInfo;
  onExecuteAction: (capability: string, action: string, params: Record<string, unknown>) => Promise<void>;
  onConfigure?: (capability: CapabilityInfo) => void;
}

const CapabilityCard: React.FC<CapabilityCardProps> = ({ 
  agentId, 
  capability, 
  onExecuteAction,
  onConfigure 
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const [loadingDetails, setLoadingDetails] = React.useState(false);
  const [capabilityDetails, setCapabilityDetails] = React.useState<CapabilityInfo | null>(null);
  const { getCapabilityDetails } = useAgents();

  const handleToggleExpand = () => {
    if (!expanded && !capabilityDetails) {
      setLoadingDetails(true);
      // Simulate loading capability details
      setTimeout(() => {
        setCapabilityDetails({
          ...capability,
          id: capability.id || capability.name, // Ensure id is always defined
          enabled: capability.enabled !== false, // Default to true if not set
          actions: capability.actions || [],
          actionConfigs: capability.actionConfigs || {}
        });
        setLoadingDetails(false);
      }, 500);
    }
    setExpanded(!expanded);
  };

  const handleConfigure = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onConfigure) {
      onConfigure(capability);
    }
  };

  const displayDetails = capabilityDetails || capability;
  const hasActions = (displayDetails.actions && displayDetails.actions.length > 0) || false;

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6">{displayDetails.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {displayDetails.description}
            </Typography>
          </Box>
          <Box>
            {onConfigure && (
              <IconButton onClick={handleConfigure} size="small" sx={{ mr: 1 }}>
                <SettingsIcon fontSize="small" />
              </IconButton>
            )}
            <IconButton
              onClick={handleToggleExpand}
              aria-expanded={expanded}
              aria-label="show more"
              size="small"
            >
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        </Box>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box sx={{ mt: 2 }}>
            {loadingDetails ? (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={24} />
              </Box>
            ) : hasActions ? (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Available Actions
                </Typography>
                {displayDetails.actions?.map((action) => (
                  <Box key={action.name} mb={2}>
                    <CapabilityAction
                      agentId={agentId}
                      capabilityName={displayDetails.name}
                      action={action}
                      onExecute={onExecuteAction}
                    />
                  </Box>
                ))}
              </Box>
            ) : (
              <Alert severity="info" sx={{ mt: 1 }}>
                No actions available for this capability.
              </Alert>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

const AgentCapabilities: React.FC<AgentCapabilitiesProps> = ({
  agentId,
  onConfigureCapability,
}) => {
  const { getAgentCapabilities, getAvailableCapabilities, loadAgentCapabilities } = useAgents();
  const [capabilities, setCapabilities] = React.useState<CapabilityInfo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [availableCapabilities, setAvailableCapabilities] = React.useState<AgentCapability[]>([]);

  const loadCapabilities = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load agent's capabilities
      const agentCaps = await getAgentCapabilities(agentId);
      setCapabilities(agentCaps);

      // Load available capabilities
      const availableCaps = await getAvailableCapabilities();
      setAvailableCapabilities(availableCaps);

      // If no capabilities loaded, try to load them
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
  }, [agentId, getAgentCapabilities, getAvailableCapabilities, loadAgentCapabilities]);

  React.useEffect(() => {
    loadCapabilities();
  }, [loadCapabilities]);

  const [executionStatus, setExecutionStatus] = React.useState<{
    [key: string]: {
      status: 'idle' | 'pending' | 'success' | 'error';
      message?: string;
      timestamp?: number;
    };
  }>({});

  const handleExecuteAction = async (
    capabilityName: string, 
    action: string, 
    params: Record<string, unknown>
  ) => {
    const actionKey = `${capabilityName}-${action}`;
    
    try {
      setExecutionStatus(prev => ({
        ...prev,
        [actionKey]: { 
          status: 'pending',
          message: 'Executing action...',
          timestamp: Date.now()
        }
      }));

      // Call the agent service to execute the action
      const response = await fetch(`/api/agents/${agentId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          capability: capabilityName,
          action,
          parameters: params,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to execute action');
      }

      const result = await response.json();
      
      setExecutionStatus(prev => ({
        ...prev,
        [actionKey]: {
          status: 'success',
          message: result.message || 'Action executed successfully',
          timestamp: Date.now()
        }
      }));

      // Refresh capabilities to reflect any changes
      await loadCapabilities();
      
      return result;
    } catch (err) {
      console.error('Error executing action:', err);
      
      setExecutionStatus(prev => ({
        ...prev,
        [actionKey]: {
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to execute action',
          timestamp: Date.now()
        }
      }));
      
      throw err;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h5" gutterBottom>
          Agent Capabilities
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          These are the capabilities available for this agent. Click on a capability to see available actions.
        </Typography>
      </Box>

      {capabilities.length > 0 ? (
        <Grid container spacing={2}>
          {capabilities.map((capability) => (
            <Grid item xs={12} key={capability.id}>
              <CapabilityCard
                agentId={agentId}
                capability={capability}
                onExecuteAction={handleExecuteAction}
                onConfigure={onConfigureCapability}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Alert severity="info">
          No capabilities found for this agent. Try refreshing the list or check back later.
        </Alert>
      )}
    </Box>
  );
};

export default AgentCapabilities;
