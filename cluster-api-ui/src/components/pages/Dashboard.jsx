import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Storage as StorageIcon,
  Computer as ComputerIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';

const Dashboard = () => {
  // Mock data for demonstration
  const clusterStats = {
    total: 12,
    running: 9,
    pending: 2,
    failed: 1,
  };

  const resourceUsage = {
    cpu: 68,
    memory: 74,
    storage: 45,
  };

  const recentClusters = [
    {
      name: 'prod-cluster-01',
      provider: 'AWS',
      status: 'Running',
      nodes: 5,
      created: '2 hours ago',
    },
    {
      name: 'staging-cluster-02',
      provider: 'GCP',
      status: 'Pending',
      nodes: 3,
      created: '1 hour ago',
    },
    {
      name: 'dev-cluster-03',
      provider: 'Azure',
      status: 'Running',
      nodes: 2,
      created: '30 minutes ago',
    },
  ];

  const alerts = [
    {
      type: 'error',
      message: 'Cluster creation failed for prod-cluster-04',
      time: '5 minutes ago',
    },
    {
      type: 'warning',
      message: 'High CPU usage on dev-cluster-01',
      time: '15 minutes ago',
    },
    {
      type: 'info',
      message: 'Scheduled maintenance for staging-cluster-01',
      time: '1 hour ago',
    },
  ];

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'running':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      default:
        return <CheckCircleIcon color="info" />;
    }
  };

  const StatCard = ({ title, value, subtitle, icon, color = 'primary' }) => (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="overline">
              {title}
            </Typography>
            <Typography variant="h3" component="div" sx={{ fontWeight: 600, color: `${color}.main` }}>
              {value}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {subtitle}
            </Typography>
          </Box>
          <Avatar
            sx={{
              backgroundColor: `${color}.main`,
              color: `${color}.contrastText`,
              width: 56,
              height: 56,
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const ResourceCard = ({ title, usage, color }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">{title}</Typography>
          <Typography variant="h4" sx={{ fontWeight: 600, color: `${color}.main` }}>
            {usage}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={usage}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: `${color}.main`,
              borderRadius: 4,
            },
          }}
        />
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            Dashboard
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Overview of your Kubernetes clusters and infrastructure
          </Typography>
        </Box>
        <IconButton
          sx={{
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
          }}
        >
          <RefreshIcon />
        </IconButton>
      </Box>

      <Grid container spacing={3}>
        {/* Cluster Statistics */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Clusters"
            value={clusterStats.total}
            subtitle="Across all providers"
            icon={<StorageIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Running"
            value={clusterStats.running}
            subtitle="Healthy clusters"
            icon={<CheckCircleIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending"
            value={clusterStats.pending}
            subtitle="Being provisioned"
            icon={<TrendingUpIcon />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Failed"
            value={clusterStats.failed}
            subtitle="Need attention"
            icon={<ErrorIcon />}
            color="error"
          />
        </Grid>

        {/* Resource Usage */}
        <Grid item xs={12} md={4}>
          <ResourceCard title="CPU Usage" usage={resourceUsage.cpu} color="primary" />
        </Grid>
        <Grid item xs={12} md={4}>
          <ResourceCard title="Memory Usage" usage={resourceUsage.memory} color="secondary" />
        </Grid>
        <Grid item xs={12} md={4}>
          <ResourceCard title="Storage Usage" usage={resourceUsage.storage} color="success" />
        </Grid>

        {/* Recent Clusters */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Recent Clusters</Typography>
                <IconButton size="small">
                  <MoreVertIcon />
                </IconButton>
              </Box>
              <List>
                {recentClusters.map((cluster, index) => (
                  <ListItem
                    key={cluster.name}
                    sx={{
                      borderRadius: 2,
                      mb: 1,
                      backgroundColor: 'rgba(0, 0, 0, 0.02)',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      },
                    }}
                  >
                    <ListItemIcon>
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          backgroundColor: 'primary.main',
                          fontSize: '0.875rem',
                        }}
                      >
                        {cluster.provider.charAt(0)}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                            {cluster.name}
                          </Typography>
                          <Chip
                            label={cluster.status}
                            size="small"
                            color={getStatusColor(cluster.status)}
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="textSecondary">
                          {cluster.provider} • {cluster.nodes} nodes • Created {cluster.created}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Alerts */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Recent Alerts
              </Typography>
              <List>
                {alerts.map((alert, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      borderRadius: 2,
                      mb: 1,
                      backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    }}
                  >
                    <ListItemIcon>
                      {getAlertIcon(alert.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {alert.message}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="textSecondary">
                          {alert.time}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;

