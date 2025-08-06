import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Grid, Box, Stepper,
  Step, StepLabel, CircularProgress, Alert, Divider, Paper,
  Typography, IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useSnackbar } from 'notistack';
import apiCall from '../../lib/api';

// Form steps and provider config
const STEPS = ['Provider', 'Credentials', 'Settings'];
const PROVIDERS = [
  { id: 'aws', name: 'AWS', icon: 'aws' },
  { id: 'azure', name: 'Azure', icon: 'azure' },
  { id: 'gcp', name: 'GCP', icon: 'gcp' },
];

const CloudAccountForm = ({ open, onClose, onSave, account }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [regions, setRegions] = useState([]);
  const { enqueueSnackbar } = useSnackbar();

  // Form initialization
  const formik = useFormik({
    initialValues: {
      id: '',
      name: '',
      provider: 'aws',
      auth_type: 'credentials',
      environment: 'development',
      region: '',
      credentials: {},
    },
    validationSchema: Yup.object({
      name: Yup.string().required('Required'),
      provider: Yup.string().required('Required'),
      auth_type: Yup.string().required('Required'),
      environment: Yup.string().required('Required'),
      region: Yup.string().required('Required'),
    }),
        onSubmit: async (values) => {
      try {
        setLoading(true);
        const payload = { ...values };
        if (values.id) {
          await apiCall(`/cloud/accounts/${values.id}`, { method: 'PUT', data: payload });
          enqueueSnackbar('Account updated', { variant: 'success' });
        } else {
          await apiCall('/cloud/accounts', { method: 'POST', data: payload });
          enqueueSnackbar('Account created', { variant: 'success' });
        }
        onSave();
        handleClose();
      } catch (error) {
        console.error('Error:', error);
        setError(error.message || 'Failed to save');
      } finally {
        setLoading(false);
      }
    },
  });

  // Load account data for editing
  useEffect(() => {
    if (account && open) {
      formik.setValues({
        id: account.id,
        name: account.name,
        provider: account.provider,
        auth_type: account.auth_type,
        environment: account.environment || 'development',
        region: account.region || '',
        credentials: account.credentials || {},
      });
      fetchRegions(account.provider);
    } else if (open) {
      formik.resetForm();
      setActiveStep(0);
    }
  }, [account, open]);

  // Fetch regions for provider
    const fetchRegions = async (provider) => {
    try {
      const data = await apiCall(`/cloud/providers/${provider}/regions`);
      setRegions(data);
      if (data.length > 0 && !formik.values.region) {
        formik.setFieldValue('region', data[0].name);
      }
    } catch (error) {
      console.error('Error fetching regions:', error);
      enqueueSnackbar('Failed to load regions', { variant: 'error' });
    }
  };

  // Handle provider change
  const handleProviderChange = (provider) => {
    formik.setValues({
      ...formik.values,
      provider,
      auth_type: 'credentials',
      credentials: {},
    });
    fetchRegions(provider);
  };

  // Navigation handlers
  const handleNext = () => activeStep < STEPS.length - 1 
    ? setActiveStep(activeStep + 1) 
    : formik.handleSubmit();
  
  const handleBack = () => setActiveStep(activeStep - 1);
  const handleClose = () => { formik.resetForm(); onClose(); };

  // Render form steps
  const renderStepContent = (step) => {
    switch (step) {
      case 0: // Provider selection
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Select Provider</Typography>
              <Divider sx={{ my: 2 }} />
            </Grid>
            {PROVIDERS.map((p) => (
              <Grid item xs={4} key={p.id}>
                <Paper
                  elevation={formik.values.provider === p.id ? 3 : 1}
                  onClick={() => handleProviderChange(p.id)}
                  sx={{
                    p: 2, cursor: 'pointer',
                    border: `2px solid ${formik.values.provider === p.id ? 'primary.main' : 'divider'}`,
                    height: '100%', textAlign: 'center',
                  }}
                >
                  <Typography>{p.name}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        );
      
      case 1: // Credentials
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Account Details</Typography>
              <Divider sx={{ my: 2 }} />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Account Name"
                name="name"
                value={formik.values.name}
                onChange={formik.handleChange}
                error={formik.touched.name && Boolean(formik.errors.name)}
                helperText={formik.touched.name && formik.errors.name}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Environment</InputLabel>
                <Select
                  name="environment"
                  value={formik.values.environment}
                  onChange={formik.handleChange}
                  label="Environment"
                >
                  {['development', 'staging', 'production'].map((env) => (
                    <MenuItem key={env} value={env}>{env}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Region</InputLabel>
                <Select
                  name="region"
                  value={formik.values.region}
                  onChange={formik.handleChange}
                  label="Region"
                >
                  {regions.map((region) => (
                    <MenuItem key={region.name} value={region.name}>
                      {region.name} ({region.display_name})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );
      
      case 2: // Review
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Review</Typography>
            <Divider sx={{ my: 2 }} />
            <Typography>Name: {formik.values.name}</Typography>
            <Typography>Provider: {formik.values.provider}</Typography>
            <Typography>Environment: {formik.values.environment}</Typography>
            <Typography>Region: {formik.values.region}</Typography>
          </Box>
        );
      
      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {account ? 'Edit Cloud Account' : 'Add Cloud Account'}
        <IconButton
          onClick={handleClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        {renderStepContent(activeStep)}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleBack} disabled={activeStep === 0}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 
           activeStep === STEPS.length - 1 ? 'Submit' : 'Next'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CloudAccountForm;
