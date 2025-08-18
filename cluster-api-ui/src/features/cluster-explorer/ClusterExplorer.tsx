import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { clusterExplorerApi } from './clusterExplorerApi';

// Types
type ResourceType = 'pods' | 'services' | 'configmaps' | 'secrets' | 'namespaces' | 'nodes';

interface Resource {
  metadata: {
    name: string;
    namespace?: string;
    creationTimestamp: string;
    labels?: Record<string, string>;
  };
  kind: string;
  // Add other resource properties as needed
}

const ClusterExplorer: React.FC = () => {
  const { clusterId } = useParams<{ clusterId: string }>();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [namespace, setNamespace] = useState<string>('default');
  const [namespaces, setNamespaces] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [yamlDialogOpen, setYamlDialogOpen] = useState<boolean>(false);
  const { enqueueSnackbar } = useSnackbar();

  const resourceTypes: ResourceType[] = [
    'pods',
    'services',
    'configmaps',
    'secrets',
    'namespaces',
    'nodes',
  ];

  const fetchResources = async (resourceType: ResourceType) => {
    if (!clusterId) return;
    
    setLoading(true);
    try {
      const response = await clusterExplorerApi.getResources(
        clusterId,
        {
          resource_type: resourceType,
          namespace: resourceType !== 'namespaces' && resourceType !== 'nodes' ? namespace : undefined,
        }
      );
      setResources(response.data.items || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
      enqueueSnackbar('Failed to fetch resources', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch namespaces first
    const fetchNamespaces = async () => {
      if (!clusterId) return;
      
      try {
        const response = await clusterExplorerApi.getResources(clusterId, {
          resource_type: 'namespaces',
        });
        setNamespaces(response.data.items || []);
      } catch (error) {
        console.error('Error fetching namespaces:', error);
      }
    };

    fetchNamespaces();
  }, [clusterId]);

  useEffect(() => {
    if (clusterId && resourceTypes[activeTab]) {
      fetchResources(resourceTypes[activeTab]);
    }
  }, [clusterId, activeTab, namespace]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setPage(0);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleNamespaceChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setNamespace(event.target.value as string);
    setPage(0);
  };

  const handleViewYaml = (resource: Resource) => {
    setSelectedResource(resource);
    setYamlDialogOpen(true);
  };

  const handleCloseYamlDialog = () => {
    setYamlDialogOpen(false);
    setSelectedResource(null);
  };

  const renderResourceTable = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      );
    }

    if (resources.length === 0) {
      return (
        <Box p={4} textAlign="center">
          <Typography variant="body1">No resources found</Typography>
        </Box>
      );
    }

    const currentResourceType = resourceTypes[activeTab];
    const currentResources = resources.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
      <>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                {currentResourceType !== 'namespaces' && currentResourceType !== 'nodes' && (
                  <TableCell>Namespace</TableCell>
                )}
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentResources.map((resource) => (
                <TableRow key={`${resource.metadata.namespace || ''}-${resource.metadata.name}`}>
                  <TableCell>{resource.metadata.name}</TableCell>
                  {currentResourceType !== 'namespaces' && currentResourceType !== 'nodes' && (
                    <TableCell>{resource.metadata.namespace}</TableCell>
                  )}
                  <TableCell>
                    {new Date(resource.metadata.creationTimestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View YAML">
                      <IconButton onClick={() => handleViewYaml(resource)} size="small">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
                        </svg>
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
                        </svg>
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" color="error">
                          <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                        </svg>
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={resources.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </>
    );
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: '8px'}}>
            <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/>
          </svg>
          Cluster Explorer
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
              </svg>
            }
            sx={{ mr: 1 }}
          >
            Create
          </Button>
          <Button
            variant="outlined"
            startIcon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"/>
              </svg>
            }
            onClick={() => fetchResources(resourceTypes[activeTab])}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          {resourceTypes.map((type) => (
            <Tab key={type} label={type.charAt(0).toUpperCase() + type.slice(1)} />
          ))}
        </Tabs>

        <Box p={2} display="flex" alignItems="center">
          {resourceTypes[activeTab] !== 'namespaces' && resourceTypes[activeTab] !== 'nodes' && (
            <TextField
              select
              label="Namespace"
              value={namespace}
              onChange={handleNamespaceChange}
              size="small"
              sx={{ minWidth: 200, mr: 2 }}
            >
              <MenuItem value="_all">All Namespaces</MenuItem>
              {namespaces.map((ns) => (
                <MenuItem key={ns.metadata.name} value={ns.metadata.name}>
                  {ns.metadata.name}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            sx={{ minWidth: 300 }}
          />
        </Box>
      </Paper>

      {renderResourceTable()}

      {/* YAML View Dialog */}
      <Dialog
        open={yamlDialogOpen}
        onClose={handleCloseYamlDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedResource?.metadata.name} - YAML
        </DialogTitle>
        <DialogContent>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(selectedResource, null, 2)}
          </pre>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseYamlDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClusterExplorer;
