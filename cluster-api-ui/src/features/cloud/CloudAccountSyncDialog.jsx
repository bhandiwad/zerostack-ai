import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Typography,
  Divider,
  Box,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import { Sync as SyncIcon } from '@mui/icons-material';


const CloudAccountSyncDialog = ({ 
  open, 
  onClose, 
  account,
  onConfirm,
  loading = false
}) => {
  const [syncOptions, setSyncOptions] = useState({
    syncResources: true,
    syncCosts: true,
    checkCompliance: true,
    forceRefresh: false,
    resourceTypes: [],
  });
  
  const [resourceTypes, setResourceTypes] = useState([
    { id: 'compute', name: 'Compute', checked: true },
    { id: 'storage', name: 'Storage', checked: true },
    { id: 'network', name: 'Network', checked: true },
    { id: 'database', name: 'Database', checked: true },
    { id: 'kubernetes', name: 'Kubernetes', checked: true },
  ]);

  const handleCheckboxChange = (event) => {
    const { name, checked } = event.target;
    setSyncOptions(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleResourceTypeChange = (index) => (event) => {
    const newResourceTypes = [...resourceTypes];
    newResourceTypes[index].checked = event.target.checked;
    setResourceTypes(newResourceTypes);
    
    setSyncOptions(prev => ({
      ...prev,
      resourceTypes: newResourceTypes
        .filter(rt => rt.checked)
        .map(rt => rt.id)
    }));
  };

  const handleSubmit = () => {
    onConfirm(syncOptions);
  };

  if (!account) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <SyncIcon sx={{ mr: 1 }} />
          <span>Synchronize Cloud Account</span>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <Typography variant="body1" gutterBottom>
          Synchronize data for <strong>{account.name}</strong> ({account.provider.toUpperCase()})
        </Typography>
        
        <Box mt={3} mb={2}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            SYNC OPTIONS
          </Typography>
          <Divider />
          
          <FormGroup sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox 
                  name="syncResources"
                  checked={syncOptions.syncResources}
                  onChange={handleCheckboxChange}
                  color="primary"
                />
              }
              label="Synchronize Resources"
            />
            
            {syncOptions.syncResources && (
              <Box pl={4} mt={1} mb={2}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Resource Types:
                </Typography>
                <Grid container spacing={1}>
                  {resourceTypes.map((type, index) => (
                    <Grid item xs={6} key={type.id}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={type.checked}
                            onChange={handleResourceTypeChange(index)}
                            size="small"
                          />
                        }
                        label={type.name}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
            
            <FormControlLabel
              control={
                <Checkbox 
                  name="syncCosts"
                  checked={syncOptions.syncCosts}
                  onChange={handleCheckboxChange}
                  color="primary"
                />
              }
              label="Synchronize Cost Data"
            />
            
            <FormControlLabel
              control={
                <Checkbox 
                  name="checkCompliance"
                  checked={syncOptions.checkCompliance}
                  onChange={handleCheckboxChange}
                  color="primary"
                />
              }
              label="Check Compliance"
            />
            
            <FormControlLabel
              control={
                <Checkbox 
                  name="forceRefresh"
                  checked={syncOptions.forceRefresh}
                  onChange={handleCheckboxChange}
                  color="primary"
                />
              }
              label="Force Refresh (ignore cache)"
            />
          </FormGroup>
        </Box>
        
        {account.last_sync && (
          <Box mt={2}>
            <Typography variant="body2" color="textSecondary">
              Last synchronized: {new Date(account.last_sync).toLocaleString()}
            </Typography>
          </Box>
        )}
        
        <Alert severity="info" sx={{ mt: 2 }}>
          Note: Synchronization may take several minutes to complete depending on the amount of data.
        </Alert>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          startIcon={loading ? <CircularProgress size={20} /> : <SyncIcon />}
          disabled={loading}
        >
          {loading ? 'Synchronizing...' : 'Start Sync'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CloudAccountSyncDialog;
