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
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small">
                        <DeleteIcon fontSize="small" color="error" />
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
        <Typography variant="h4">Cluster Explorer</Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            sx={{ mr: 1 }}
          >
            Create
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
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
