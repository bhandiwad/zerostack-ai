import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Button, Card, CardContent, Typography, Grid, Tabs, Tab, Switch, 
  TextField, Divider, CircularProgress, Alert, Breadcrumbs, Link
} from '@mui/material';
import { 
  Home as HomeIcon, 
  Build as MaintenanceIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import './styles.css';

const ClusterDetail = ({ apiCall, showNotification }) => {
  const { clusterId } = useParams();
  const navigate = useNavigate();
  const [cluster, setCluster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [maintenanceMode, setMaintenanceMode] = useState({
    enabled: false,
    reason: '',
    duration: 60,
    isSaving: false
  });

  useEffect(() => {
    const fetchCluster = async () => {
      try {
        const data = await apiCall(`/multitenant/clusters/${clusterId}`);
        setCluster(data);
        setMaintenanceMode(prev => ({
          ...prev,
          enabled: data.maintenance_mode || false,
          reason: data.maintenance_reason || '',
          duration: data.maintenance_duration || 60
        }));
      } catch (error) {
        showNotification('Failed to load cluster details', 'error');
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCluster();
  }, [clusterId]);

  const handleMaintenanceToggle = async () => {
    if (maintenanceMode.enabled && !maintenanceMode.reason.trim()) {
      showNotification('Please provide a reason for maintenance mode', 'error');
      return;
    }

    setMaintenanceMode(prev => ({ ...prev, isSaving: true }));
    
    try {
      const result = await apiCall(`/multitenant/clusters/${clusterId}/maintenance-mode`, {
        method: 'POST',
        body: JSON.stringify({
          enabled: !maintenanceMode.enabled,
          reason: maintenanceMode.reason,
          duration_minutes: maintenanceMode.duration
        })
      });

      if (result.success) {
        const action = maintenanceMode.enabled ? 'disabled' : 'enabled';
        showNotification(`Maintenance mode ${action} successfully`, 'success');
        setCluster(prev => ({
          ...prev,
          maintenance_mode: !maintenanceMode.enabled,
          maintenance_reason: maintenanceMode.reason,
          maintenance_duration: maintenanceMode.duration
        }));
        setMaintenanceMode(prev => ({
          ...prev,
          enabled: !prev.enabled,
          isSaving: false
        }));
      }
    } catch (error) {
      showNotification('Failed to update maintenance mode', 'error');
      console.error('Error:', error);
      setMaintenanceMode(prev => ({ ...prev, isSaving: false }));
    }
  };

  const handleDeleteCluster = async () => {
    if (window.confirm('Are you sure you want to delete this cluster? This action cannot be undone.')) {
      try {
        await apiCall(`/multitenant/clusters/${clusterId}`, { method: 'DELETE' });
        showNotification('Cluster deleted successfully', 'success');
        navigate('/clusters');
      } catch (error) {
        showNotification('Failed to delete cluster', 'error');
        console.error('Error:', error);
      }
    }
  };

  if (loading) {
    return (
      <Box className="loading-container">
        <CircularProgress />
      </Box>
    );
  }

  if (!cluster) {
    return (
      <Alert severity="error" className="error-alert">
        Cluster not found
      </Alert>
    );
  }

  return (
    <Box className="cluster-detail">
      <Breadcrumbs aria-label="breadcrumb" className="breadcrumbs">
        <Link color="inherit" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Home
        </Link>
        <Link color="inherit" href="/clusters" onClick={(e) => { e.preventDefault(); navigate('/clusters'); }}>
          Clusters
        </Link>
        <Typography color="text.primary">{cluster.name}</Typography>
      </Breadcrumbs>

      <Box className="cluster-header">
        <Box>
          <Typography variant="h4" className="cluster-name">
            {cluster.name}
            {cluster.maintenance_mode && (
              <span className="maintenance-badge">
                <MaintenanceIcon fontSize="small" /> Maintenance Mode
              </span>
            )}
          </Typography>
          <Typography variant="body1" color="textSecondary">
            {cluster.provider} • {cluster.region} • {cluster.status}
          </Typography>
        </Box>
        
        <Box className="cluster-actions">
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<SettingsIcon />}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </Button>
          <Button 
            variant="outlined" 
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteCluster}
            disabled={cluster.maintenance_mode}
          >
            Delete Cluster
          </Button>
        </Box>
      </Box>

      <Tabs 
        value={activeTab} 
        onChange={(e, newValue) => setActiveTab(newValue)}
        className="cluster-tabs"
      >
        <Tab label="Overview" value="overview" />
        <Tab label="Nodes" value="nodes" />
        <Tab label="Maintenance" value="maintenance" />
        <Tab label="Settings" value="settings" />
        <Tab label="Activity" value="activity" />
      </Tabs>

      <Box className="tab-content">
        {activeTab === 'overview' && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card className="info-card">
                <CardContent>
                  <Typography variant="h6" gutterBottom>Cluster Information</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2">Kubernetes Version</Typography>
                      <Typography variant="body1">{cluster.kubernetes_version || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2">Created</Typography>
                      <Typography variant="body1">
                        {new Date(cluster.created_at).toLocaleDateString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2">Nodes</Typography>
                      <Typography variant="body1">
                        {cluster.node_count || 0} nodes
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2">Status</Typography>
                      <Box display="flex" alignItems="center">
                        <Box 
                          className={`status-dot ${cluster.status?.toLowerCase()}`}
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="body1">
                          {cluster.status}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card className="maintenance-card">
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">Maintenance Mode</Typography>
                    <Switch
                      checked={maintenanceMode.enabled}
                      onChange={handleMaintenanceToggle}
                      disabled={maintenanceMode.isSaving}
                      color="primary"
                    />
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  {maintenanceMode.enabled && cluster.maintenance_reason && (
                    <Alert 
                      severity="warning" 
                      icon={<WarningIcon />}
                      className="maintenance-alert"
                    >
                      <Typography variant="subtitle2">Maintenance Active</Typography>
                      <Typography variant="body2">{cluster.maintenance_reason}</Typography>
                      {cluster.maintenance_ends_at && (
                        <Typography variant="caption" display="block">
                          Ends: {new Date(cluster.maintenance_ends_at).toLocaleString()}
                        </Typography>
                      )}
                    </Alert>
                  )}
                  <Typography variant="body2" color="textSecondary">
                    Enable maintenance mode to perform maintenance tasks on this cluster. 
                    This will prevent accidental modifications during maintenance.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {activeTab === 'maintenance' && (
          <Card className="maintenance-tab">
            <CardContent>
              <Typography variant="h6" gutterBottom>Maintenance Settings</Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Box mb={4}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography variant="subtitle1">Maintenance Mode</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {maintenanceMode.enabled 
                        ? 'Maintenance mode is currently active.' 
                        : 'Enable to put this cluster in maintenance mode.'}
                    </Typography>
                  </Box>
                  <Switch
                    checked={maintenanceMode.enabled}
                    onChange={handleMaintenanceToggle}
                    disabled={maintenanceMode.isSaving}
                    color="primary"
                  />
                </Box>

                {maintenanceMode.enabled && (
                  <Box className="maintenance-form">
                    <TextField
                      fullWidth
                      label="Reason for Maintenance"
                      value={maintenanceMode.reason}
                      onChange={(e) => setMaintenanceMode(prev => ({
                        ...prev,
                        reason: e.target.value
                      }))}
                      margin="normal"
                      required
                      helperText="Please provide a reason for enabling maintenance mode"
                    />
                    
                    <TextField
                      select
                      fullWidth
                      label="Duration (minutes)"
                      value={maintenanceMode.duration}
                      onChange={(e) => setMaintenanceMode(prev => ({
                        ...prev,
                        duration: e.target.value
                      }))}
                      margin="normal"
                      SelectProps={{ native: true }}
                    >
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={240}>4 hours</option>
                      <option value={720}>12 hours</option>
                      <option value={1440}>24 hours</option>
                    </TextField>

                    <Box className="maintenance-notice">
                      <Typography variant="subtitle2" gutterBottom>
                        <WarningIcon fontSize="small" className="notice-icon" />
                        Important Notes
                      </Typography>
                      <ul>
                        <li>New workloads cannot be scheduled during maintenance</li>
                        <li>Existing workloads continue to run</li>
                        <li>Cluster modifications are restricted</li>
                        <li>Maintenance mode will automatically expire after the selected duration</li>
                      </ul>
                    </Box>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        )}

        {activeTab === 'nodes' && (
          <Card className="nodes-tab">
            <CardContent>
              <Typography variant="h6" gutterBottom>Cluster Nodes</Typography>
              <Divider sx={{ mb: 3 }} />
              <Alert severity="info">Node management will be implemented here</Alert>
            </CardContent>
          </Card>
        )}

        {activeTab === 'settings' && (
          <Card className="settings-tab">
            <CardContent>
              <Typography variant="h6" gutterBottom>Cluster Settings</Typography>
              <Divider sx={{ mb: 3 }} />
              <Alert severity="info">Cluster settings will be implemented here</Alert>
            </CardContent>
          </Card>
        )}

        {activeTab === 'activity' && (
          <Card className="activity-tab">
            <CardContent>
              <Typography variant="h6" gutterBottom>Activity Log</Typography>
              <Divider sx={{ mb: 3 }} />
              <Alert severity="info">Activity log will be implemented here</Alert>
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
};

export default ClusterDetail;
