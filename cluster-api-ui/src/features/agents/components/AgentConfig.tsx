import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel, Button, Paper, Divider, Alert } from '@mui/material';
import { Save as SaveIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { Agent, AgentConfig as AgentConfigType } from '../types';

interface AgentConfigProps {
  agent: Agent;
  onSave: (config: AgentConfigType) => Promise<void>;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

const AgentConfig: React.FC<AgentConfigProps> = ({ agent, onSave, onRefresh, disabled = false }) => {
  
  const [config, setConfig] = useState<AgentConfigType>({ ...agent.config });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setConfig({ ...agent.config });
  }, [agent]);

    const handleChange = (field: string, value: string | number | boolean) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      await onSave(config);
      setSuccess('Configuration saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = async () => {
    setError(null);
    setSuccess(null);
    try {
      await onRefresh();
      setSuccess('Configuration refreshed');
      setTimeout(() => setSuccess(null), 2000);
    } catch {
      setError('Failed to refresh configuration');
    }
  };

  // Get agent-specific configuration fields based on agent type
  const getAgentSpecificFields = () => {
    switch (agent.metadata?.type) {
      case 'monitoring':
        return (
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                label="Metrics Collection Interval (seconds)"
                type="number"
                value={config.metricsInterval || 60}
                onChange={(e) => handleChange('metricsInterval', parseInt(e.target.value) || 60)}
                disabled={disabled || isSaving}
                margin="normal"
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Log Level</InputLabel>
                <Select
                  value={config.logLevel || 'info'}
                  onChange={(e) => handleChange('logLevel', e.target.value)}
                  disabled={disabled || isSaving}
                  label="Log Level"
                >
                  {['debug', 'info', 'warn', 'error'].map((level) => (
                    <MenuItem key={level} value={level}>
                      {level.toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        );
      
      case 'security':
        return (
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <Box sx={{ flex: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.enableComplianceChecks !== false}
                    onChange={(e) => handleChange('enableComplianceChecks', e.target.checked)}
                    disabled={disabled || isSaving}
                  />
                }
                label="Enable Compliance Checks"
                sx={{ mt: 2 }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.enableVulnerabilityScans !== false}
                    onChange={(e) => handleChange('enableVulnerabilityScans', e.target.checked)}
                    disabled={disabled || isSaving}
                  />
                }
                label="Enable Vulnerability Scans"
                sx={{ mt: 2 }}
              />
            </Box>
          </Box>
        );
      
      // Add more agent types as needed
      
      default:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No specific configuration options available for this agent type.
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" component="h2">
          Agent Configuration
        </Typography>
        <Box>
          <Button
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={disabled || isSaving}
            size="small"
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.enabled !== false}
                  onChange={(e) => handleChange('enabled', e.target.checked)}
                  disabled={disabled || isSaving}
                />
              }
              label="Agent Enabled"
              sx={{ mb: 2 }}
            />
          </Box>
          
          <Box sx={{ flex: 1 }}>
            <TextField
              fullWidth
              label="Polling Interval (seconds)"
              type="number"
              value={config.pollingInterval || 60}
              onChange={(e) => handleChange('pollingInterval', parseInt(e.target.value) || 60)}
              disabled={disabled || isSaving}
              margin="normal"
            />
          </Box>
        </Box>
        
        {getAgentSpecificFields()}
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            disabled={disabled || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default AgentConfig;
