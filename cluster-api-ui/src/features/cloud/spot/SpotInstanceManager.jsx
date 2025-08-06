import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Switch, FormControlLabel, TextField, Grid,
  Paper, Button, MenuItem, FormControl, InputLabel, Select, Alert
} from '@mui/material';
import { useSnackbar } from 'notistack';
import api from '../../../api';

const SpotInstanceManager = ({ accountId, clusterId }) => {
  const [enabled, setEnabled] = useState(false);
  const [config, setConfig] = useState({
    maxPrice: '',
    instanceTypes: [],
    allocationStrategy: 'lowest-price',
    interruptionBehavior: 'terminate',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      if (!accountId || !clusterId) return;
      try {
        const { data } = await api.get(`/api/cloud/accounts/${accountId}/clusters/${clusterId}/spot`);
        setEnabled(data.enabled || false);
        setConfig(prev => ({ ...prev, ...data }));
      } catch (error) {
        console.error('Error loading spot config:', error);
        enqueueSnackbar('Failed to load spot configuration', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, [accountId, clusterId, enqueueSnackbar]);

  // Save configuration
  const handleSave = async () => {
    if (!accountId || !clusterId) return;
    
    setSaving(true);
    try {
      await api.put(
        `/api/cloud/accounts/${accountId}/clusters/${clusterId}/spot`,
        { enabled, ...config }
      );
      enqueueSnackbar('Spot instance configuration saved', { variant: 'success' });
    } catch (error) {
      console.error('Error saving spot config:', error);
      enqueueSnackbar('Failed to save spot configuration', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading spot instance configuration...</div>;

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Spot Instance Configuration</Typography>
        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              color="primary"
            />
          }
          label={enabled ? 'Spot Instances Enabled' : 'Spot Instances Disabled'}
        />
      </Box>

      {enabled && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Allocation Strategy</InputLabel>
              <Select
                value={config.allocationStrategy}
                onChange={(e) => setConfig({...config, allocationStrategy: e.target.value})}
                label="Allocation Strategy"
              >
                <MenuItem value="lowest-price">Lowest Price</MenuItem>
                <MenuItem value="diversified">Diversified</MenuItem>
                <MenuItem value="capacity-optimized">Capacity Optimized</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Interruption Behavior</InputLabel>
              <Select
                value={config.interruptionBehavior}
                onChange={(e) => setConfig({...config, interruptionBehavior: e.target.value})}
                label="Interruption Behavior"
              >
                <MenuItem value="terminate">Terminate</MenuItem>
                <MenuItem value="stop">Stop</MenuItem>
                <MenuItem value="hibernate">Hibernate</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              margin="normal"
              label="Maximum Price (leave empty for on-demand price)"
              value={config.maxPrice}
              onChange={(e) => setConfig({...config, maxPrice: e.target.value})}
              placeholder="0.05"
              type="number"
              InputProps={{ inputProps: { min: 0, step: 0.001 } }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Instance Types (leave empty for all)</InputLabel>
              <Select
                multiple
                value={config.instanceTypes}
                onChange={(e) => setConfig({...config, instanceTypes: e.target.value})}
                label="Instance Types"
                renderValue={(selected) => selected.join(', ')}
              >
                {['t3.micro', 't3.small', 'm5.large', 'm5.xlarge', 'c5.large', 'r5.large'].map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Spot instances can significantly reduce costs but may be interrupted with short notice.
              We recommend using spot instances for stateless, fault-tolerant workloads.
            </Alert>
          </Grid>
          
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </Grid>
        </Grid>
      )}
    </Paper>
  );
};

export default SpotInstanceManager;
