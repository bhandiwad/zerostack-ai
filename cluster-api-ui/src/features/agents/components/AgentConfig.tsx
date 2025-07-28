import React, { useState, useEffect } from 'react';
import { useTheme, Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel, Button, Paper, Divider, Grid, Alert } from '@mui/material';
import { Save as SaveIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { Agent, AgentConfig, AgentCapability } from '../types';

interface AgentConfigProps {
  agent: Agent;
  onSave: (config: AgentConfig) => Promise<void>;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

const AgentConfig: React.FC<AgentConfigProps> = ({ agent, onSave, onRefresh, disabled = false }) => {
  const theme = useTheme();
  const [config, setConfig] = useState<AgentConfig>({ ...agent.config });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setConfig({ ...agent.config });
  }, [agent]);

  const handleChange = (field: string, value: any) => {
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
    } catch (err) {
      setError('Failed to refresh configuration');
    }
  };

  // Get agent-specific configuration fields based on agent type
  const getAgentSpecificFields = () => {
    switch (agent.metadata?.type) {
      case 'monitoring':
        return (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Metrics Collection Interval (seconds)"
                type="number"
                value={config.metricsInterval || 60}
                onChange={(e) => handleChange('metricsInterval', parseInt(e.target.value) || 60)}
                disabled={disabled || isSaving}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
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
            </Grid>
          </Grid>
        );
      
      case 'security':
        return (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
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
            </Grid>
            <Grid item xs={12} sm={6}>
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
            </Grid>
          </Grid>
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
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
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
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Polling Interval (seconds)"
              type="number"
              value={config.pollingInterval || 60}
              onChange={(e) => handleChange('pollingInterval', parseInt(e.target.value) || 60)}
              disabled={disabled || isSaving}
              margin="normal"
            />
          </Grid>
        </Grid>
        
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
