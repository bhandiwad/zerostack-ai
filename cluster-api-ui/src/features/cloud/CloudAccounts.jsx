import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,

  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Cloud as CloudIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Sync as SyncIcon,
  Security as SecurityIcon,
  MonetizationOn as CostIcon,
  Storage as ResourceIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import CloudAccountForm from './CloudAccountForm';
import CloudAccountSyncDialog from './CloudAccountSyncDialog';
import api from '../../api';

const CloudAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // Fetch cloud accounts
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/cloud/accounts');
      setAccounts(response.data);
    } catch (error) {
      console.error('Error fetching cloud accounts:', error);
      enqueueSnackbar('Failed to load cloud accounts', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Handle menu open
  const handleMenuOpen = (event, accountId) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedAccountId(accountId);
  };

  // Handle menu close
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedAccountId(null);
  };

  // Handle sync account
  const handleSyncAccount = (account) => {
    setSelectedAccount(account);
    setSyncDialogOpen(true);
    handleMenuClose();
  };

  // Handle sync confirmation
  const handleConfirmSync = async (syncOptions) => {
    try {
      setSyncing(true);
      await api.post(`/api/cloud/accounts/${selectedAccount.id}/sync`, syncOptions);
      enqueueSnackbar('Sync started successfully', { variant: 'success' });
      fetchAccounts(); // Refresh accounts to update last sync time
    } catch (error) {
      console.error('Error syncing account:', error);
      enqueueSnackbar('Failed to start sync', { variant: 'error' });
    } finally {
      setSyncing(false);
      setSyncDialogOpen(false);
    }
  };

  // Handle delete account
  const handleDeleteAccount = async () => {
    if (!selectedAccountId) return;
    
    try {
      await api.delete(`/api/cloud/accounts/${selectedAccountId}`);
      enqueueSnackbar('Cloud account deleted successfully', { variant: 'success' });
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting cloud account:', error);
      enqueueSnackbar('Failed to delete cloud account', { variant: 'error' });
    } finally {
      handleMenuClose();
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Get provider icon
  const getProviderIcon = (provider) => {
    switch (provider) {
      case 'aws':
        return <CloudIcon color="warning" />;
      case 'azure':
        return <CloudIcon color="primary" />;
      case 'gcp':
        return <CloudIcon color="success" />;
      default:
        return <CloudIcon />;
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'error':
        return 'error';
      case 'validating':
        return 'info';
      default:
        return 'default';
    }
  };

  // Columns for the data grid
  const columns = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      renderCell: (params) => (
        <Box display="flex" alignItems="center">
          {getProviderIcon(params.row.provider)}
          <Box ml={1}>
            <Typography variant="body1">{params.row.name}</Typography>
            <Typography variant="caption" color="textSecondary">
              {params.row.provider.toUpperCase()}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'environment',
      headerName: 'Environment',
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.row.environment} 
          size="small" 
          color={params.row.environment === 'production' ? 'error' : 'default'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.row.status} 
          size="small" 
          color={getStatusColor(params.row.status)}
        />
      ),
    },
    {
      field: 'lastSyncedAt',
      headerName: 'Last Synced',
      width: 160,
      valueFormatter: (params) => 
        params.value ? format(new Date(params.value), 'PPpp') : 'Never',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          size="small"
          onClick={(e) => handleMenuOpen(e, params.row.id)}
        >
          <MoreVertIcon />
        </IconButton>
      ),
    },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Cloud Accounts</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setFormOpen(true)}
        >
          Add Cloud Account
        </Button>
      </Box>

      <Paper>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="All Accounts" />
          <Tab label="AWS" />
          <Tab label="Azure" />
          <Tab label="GCP" />
        </Tabs>
        <Divider />
        
        <Box p={2}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <Box height={500} width="100%">
                <DataGrid
                  rows={accounts.filter(account => {
                    if (tabValue === 0) return true;
                    const providers = ['aws', 'azure', 'gcp'];
                    return account.provider === providers[tabValue - 1];
                  })}
                  columns={columns}
                  pageSize={10}
                  rowsPerPageOptions={[10, 25, 50]}
                  loading={loading}
                  disableSelectionOnClick
                  onRowClick={(params) => navigate(`/cloud/accounts/${params.row.id}`)}
                  components={{
                    LoadingOverlay: LinearProgress,
                  }}
                />
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Grid container spacing={2} direction="column">
                <Grid item>
                  <Card>
                    <CardHeader 
                      title="Quick Actions" 
                      action={
                        <Tooltip title="Refresh">
                          <IconButton onClick={fetchAccounts}>
                            <RefreshIcon />
                          </IconButton>
                        </Tooltip>
                      }
                    />
                    <Divider />
                    <CardContent>
                      <List>
                        <ListItem 
                          button 
                          onClick={() => setFormOpen(true)}
                        >
                          <ListItemText primary="Add Cloud Account" />
                        </ListItem>
                        <ListItem 
                          button 
                          onClick={() => navigate('/cloud/resources')}
                        >
                          <ListItemText primary="View All Resources" />
                        </ListItem>
                        <ListItem 
                          button 
                          onClick={() => navigate('/cloud/costs')}
                        >
                          <ListItemText primary="View Cost Analysis" />
                        </ListItem>
                        <ListItem 
                          button 
                          onClick={() => navigate('/cloud/compliance')}
                        >
                          <ListItemText primary="Check Compliance" />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item>
                  <Card>
                    <CardHeader title="Cloud Summary" />
                    <Divider />
                    <CardContent>
                      <List>
                        <ListItem>
                          <ListItemText 
                            primary={accounts.length} 
                            secondary="Total Accounts" 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary={accounts.filter(a => a.status === 'active').length} 
                            secondary="Active" 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary={accounts.filter(a => a.status === 'error').length} 
                            secondary="With Errors" 
                            primaryTypographyProps={{ color: 'error.main' }}
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Account Form Dialog */}
      <CloudAccountForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={() => {
          setFormOpen(false);
          fetchAccounts();
        }}
      />

      {/* Sync Dialog */}
      <CloudAccountSyncDialog
        open={syncDialogOpen}
        account={selectedAccount}
        onClose={() => setSyncDialogOpen(false)}
        onConfirm={handleConfirmSync}
        loading={syncing}
      />

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          const account = accounts.find(a => a.id === selectedAccountId);
          if (account) {
            handleSyncAccount(account);
          }
        }}>
          <SyncIcon fontSize="small" style={{ marginRight: 8 }} />
          Sync Now
        </MenuItem>
        <MenuItem onClick={() => {
          navigate(`/cloud/accounts/${selectedAccountId}`);
          handleMenuClose();
        }}>
          <CloudIcon fontSize="small" style={{ marginRight: 8 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={() => {
          navigate(`/cloud/accounts/${selectedAccountId}/resources`);
          handleMenuClose();
        }}>
          <ResourceIcon fontSize="small" style={{ marginRight: 8 }} />
          View Resources
        </MenuItem>
        <MenuItem onClick={() => {
          navigate(`/cloud/accounts/${selectedAccountId}/costs`);
          handleMenuClose();
        }}>
          <CostIcon fontSize="small" style={{ marginRight: 8 }} />
          View Costs
        </MenuItem>
        <MenuItem onClick={() => {
          navigate(`/cloud/accounts/${selectedAccountId}/compliance`);
          handleMenuClose();
        }}>
          <SecurityIcon fontSize="small" style={{ marginRight: 8 }} />
          Check Compliance
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={handleDeleteAccount}
          style={{ color: 'red' }}
        >
          Delete Account
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default CloudAccounts;
