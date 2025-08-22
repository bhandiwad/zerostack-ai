import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Button, CircularProgress, Divider, Grid, Chip } from '@mui/material';
import { api } from '../../utils/api';
import UpgradeKubernetesDialog from '../UpgradeKubernetesDialog';

const ClusterDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cluster, setCluster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeInProgress, setUpgradeInProgress] = useState(false);


  useEffect(() => {
    const fetchCluster = async () => {
      try {
        setLoading(true);
        const result = await api.get(`/clusters/${id}`);
        setCluster(result?.data);
      } catch (err) {
        console.error('Error loading cluster:', err);
        setError(err.message || 'Failed to load cluster details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCluster();
    }
  }, [id]);

  const handleUpgradeKubernetes = async (targetVersion) => {
    if (!cluster) return;
    
    setUpgradeInProgress(true);
    try {
      await api.post(`/clusters/${cluster.id}/upgrade`, { version: targetVersion });
      
      // Refresh cluster data
      const updatedCluster = await api.get(`/clusters/${id}`);
      setCluster(updatedCluster?.data);
      setShowUpgradeDialog(false);
    } catch (error) {
      console.error('Error upgrading Kubernetes version:', error);
      setError(`Failed to upgrade Kubernetes: ${error.message}`);
    } finally {
      setUpgradeInProgress(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !cluster) {
    return (
      <Box p={3}>
        <Typography variant="h5" color="error" gutterBottom>
          Error Loading Cluster
        </Typography>
        <Typography variant="body1">
          {error || 'Cluster not found'}
        </Typography>
        <Button variant="contained" onClick={() => navigate('/clusters')} sx={{ mt: 2 }}>
          Back to Clusters
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            {cluster.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <Chip 
              label={cluster.status || 'Unknown'} 
              color={
                cluster.status === 'Running' ? 'success' : 
                cluster.status === 'Provisioning' ? 'info' :
                cluster.status === 'Error' ? 'error' : 'default'
              } 
              size="small" 
              sx={{ mr: 1 }}
            />
            <Typography variant="body2" color="textSecondary">
              Kubernetes v{cluster.version} • {cluster.node_count} {cluster.node_count === 1 ? 'node' : 'nodes'}
            </Typography>
          </Box>
        </Box>
        <Box>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate('/clusters')}
            sx={{ mr: 1 }}
          >
            Back to Clusters
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Cluster Info */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Cluster Information</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Cluster ID</Typography>
                <Typography variant="body1">{cluster.id}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Kubernetes Version</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body1" sx={{ mr: 1 }}>v{cluster.version}</Typography>
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={() => setShowUpgradeDialog(true)}
                    disabled={cluster.maintenance_mode}
                  >
                    Upgrade
                  </Button>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box 
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: cluster.status === 'Running' ? 'success.main' : 
                              cluster.status === 'Provisioning' ? 'info.main' :
                              cluster.status === 'Error' ? 'error.main' : 'grey.500',
                      mr: 1
                    }}
                  />
                  <Typography variant="body1">{cluster.status}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Nodes</Typography>
                <Typography variant="body1">{cluster.node_count} {cluster.node_count === 1 ? 'node' : 'nodes'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Region</Typography>
                <Typography variant="body1">{cluster.region || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Created</Typography>
                <Typography variant="body1">
                  {new Date(cluster.created_at).toLocaleString()}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Actions */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Actions</Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button 
                variant="outlined" 
                fullWidth 
                onClick={() => {}}
                disabled={cluster.maintenance_mode}
                sx={{ justifyContent: 'flex-start' }}
              >
                Manage Nodes
              </Button>
              <Button 
                variant="outlined" 
                fullWidth 
                onClick={() => {}}
                disabled={cluster.maintenance_mode}
                sx={{ justifyContent: 'flex-start' }}
              >
                Scale Cluster
              </Button>
              <Button 
                variant="outlined" 
                fullWidth 
                onClick={() => setShowUpgradeDialog(true)}
                disabled={cluster.maintenance_mode}
                sx={{ justifyContent: 'flex-start' }}
              >
                Upgrade Kubernetes
              </Button>
              <Button 
                variant="outlined" 
                color={cluster.maintenance_mode ? 'primary' : 'inherit'}
                fullWidth 
                onClick={() => {}}
                sx={{ justifyContent: 'flex-start' }}
              >
                {cluster.maintenance_mode ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
              </Button>
              <Button 
                variant="outlined" 
                color="error" 
                fullWidth 
                onClick={() => {}}
                disabled={cluster.maintenance_mode}
                sx={{ justifyContent: 'flex-start', mt: 2 }}
              >
                Delete Cluster
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Upgrade Kubernetes Dialog */}
      {showUpgradeDialog && (
        <UpgradeKubernetesDialog
          cluster={cluster}
          onClose={() => setShowUpgradeDialog(false)}
          onUpgrade={handleUpgradeKubernetes}
          loading={upgradeInProgress}
        />
      )}
    </Box>
  );
};

export default ClusterDetails;

