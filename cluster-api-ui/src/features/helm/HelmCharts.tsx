import React, { useState, useEffect } from 'react';

import {
  Box,
  Tabs,
  Tab,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  GetApp as InstallIcon,
  Code as YamlIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { JSONValue } from '../agents/types';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import * as yaml from 'js-yaml';
import { helmChartsApi } from './helmChartsApi';

// Types
interface Repository {
  name: string;
  url: string;
}

interface Chart {
  name: string;
  version: string;
  description: string;
  app_version: string;
  repository: string;
}

interface Release {
  name: string;
  namespace: string;
  revision: string;
  updated: string;
  status: string;
  chart: string;
  app_version: string;
}

interface HelmChartsProps {
  cluster: {
    id: string;
    name: string;
  };
}

const HelmCharts: React.FC<HelmChartsProps> = ({ cluster }) => {
  const { enqueueSnackbar } = useSnackbar();

  // UI State
  const [activeTab, setActiveTab] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Data State
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);

  // Dialog States
  const [addRepoOpen, setAddRepoOpen] = useState<boolean>(false);
  const [installDialogOpen, setInstallDialogOpen] = useState<boolean>(false);
  const [yamlDialogOpen, setYamlDialogOpen] = useState<boolean>(false);

  // Form States
  const [newRepoName, setNewRepoName] = useState<string>('');
  const [newRepoUrl, setNewRepoUrl] = useState<string>('');
  const [releaseName, setReleaseName] = useState<string>('');
  const [releaseNamespace, setReleaseNamespace] = useState<string>('default');
  const [releaseValues, setReleaseValues] = useState<string>('');

  // Selected Items
  const [selectedChart, setSelectedChart] = useState<Chart | null>(null);
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [yamlContent, setYamlContent] = useState<string>('');

  // Fetch data based on active tab
  const fetchData = async () => {
    if (!cluster || !cluster.id) return;

    setLoading(true);
    try {
      if (activeTab === 0) {
        // Fetch repositories
        const response = await helmChartsApi.listRepositories(cluster.id);
        // Ensure we extract repositories array from the response
        setRepositories(Array.isArray(response.repositories) ? response.repositories : []);
      } else if (activeTab === 1) {
        // Fetch charts
        const response = await helmChartsApi.listCharts(cluster.id);
        // Ensure we extract charts array from the response
        setCharts(Array.isArray(response.charts) ? response.charts : []);
      } else if (activeTab === 2) {
        // Fetch releases
        const response = await helmChartsApi.listReleases(cluster.id);
        // Ensure we extract releases array from the response
        setReleases(Array.isArray(response.releases) ? response.releases : []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      enqueueSnackbar('Failed to fetch data', { variant: 'error' });
      if (activeTab === 0) setRepositories([]);
      if (activeTab === 1) setCharts([]);
      if (activeTab === 2) setReleases([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchData();
  }, [activeTab, cluster]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Repository handlers
  const handleAddRepository = async () => {
    if (!cluster || !cluster.id || !newRepoName || !newRepoUrl) return;

    try {
      await helmChartsApi.addRepository(cluster.id, newRepoName, newRepoUrl);
      setNewRepoName('');
      setNewRepoUrl('');
      setAddRepoOpen(false);
      fetchData();
      enqueueSnackbar('Repository added successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error adding repository:', error);
      enqueueSnackbar('Failed to add repository', { variant: 'error' });
    }
  };

  const handleDeleteRepository = async (name: string) => {
    if (!cluster || !cluster.id) return;
    try {
      await helmChartsApi.deleteRepository(cluster.id, name);
      fetchData();
      enqueueSnackbar('Repository removed successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error deleting repository:', error);
      enqueueSnackbar('Failed to remove repository', { variant: 'error' });
    }
  };

  // Chart handlers
  const handleInstallClick = (chart: Chart) => {
    setSelectedChart(chart);
    setReleaseName(`${chart.name}-release`); // Pre-fill release name
    setReleaseNamespace('default');
    setReleaseValues('');
    setInstallDialogOpen(true);
  };

  const handleInstallChart = async () => {
    if (!cluster || !cluster.id || !selectedChart || !releaseName || !releaseNamespace) return;

    try {
      await helmChartsApi.installChart(
        cluster.id,
        releaseName,
        releaseNamespace,
        selectedChart.name,
        selectedChart.version,
        releaseValues ? (yaml.load(releaseValues) as JSONValue) : {}
      );
      setInstallDialogOpen(false);
      fetchData(); // Refresh releases
      setActiveTab(2); // Switch to releases tab
      enqueueSnackbar('Chart installed successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error installing chart:', error);
      enqueueSnackbar('Failed to install chart', { variant: 'error' });
    }
  };

  // Release handlers
  const handleViewYaml = async (release: Release) => {
    if (!cluster || !cluster.id) return;
    setSelectedRelease(release);
    try {
      const response = await helmChartsApi.getReleaseValues(cluster.id, release.name);
      setYamlContent(yaml.dump(response.data || {}));
    } catch (error) {
      console.error('Error fetching release values:', error);
      setYamlContent('Error fetching release values.');
    } finally {
      setYamlDialogOpen(true);
    }
  };

  const handleDeleteRelease = async (releaseName: string) => {
    if (!cluster || !cluster.id) return;
    try {
      await helmChartsApi.deleteRelease(cluster.id, releaseName);
      fetchData();
      enqueueSnackbar('Release deleted successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error deleting release:', error);
      enqueueSnackbar('Failed to delete release', { variant: 'error' });
    }
  };

  // Render loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Repositories" />
          <Tab label="Charts" />
          <Tab label="Releases" />
        </Tabs>
      </Box>

      {/* Repositories Tab */}
      {activeTab === 0 && (
        <Box>
          <Box display="flex" justifyContent="flex-end" mb={2}>
            <Button
              variant="contained"
              color="primary"
              startIcon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
                </svg>
              }
              onClick={() => setAddRepoOpen(true)}
            >
              Add Repository
            </Button>
          </Box>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>URL</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {repositories.map((repo) => (
                  <TableRow key={repo.name}>
                    <TableCell>{repo.name}</TableCell>
                    <TableCell>{repo.url}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Remove Repository">
                        <IconButton
                          onClick={() => handleDeleteRepository(repo.name)}
                          size="small"
                          color="error"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
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
        </Box>
      )}

      {/* Charts Tab */}
      {activeTab === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>App Version</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {charts.map((chart) => (
                <TableRow key={`${chart.name}-${chart.version}`}>
                  <TableCell>{chart.name}</TableCell>
                  <TableCell>{chart.version}</TableCell>
                  <TableCell>{chart.app_version}</TableCell>
                  <TableCell>{chart.description}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Install">
                      <IconButton
                        onClick={() => handleInstallClick(chart)}
                        size="small"
                        color="primary"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M5,20H19V18H5M19,9H15L13,7H9V9H5L12,16L19,9Z"/>
                        </svg>
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Releases Tab */}
      {activeTab === 2 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Namespace</TableCell>
                <TableCell>Chart</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {releases.map((release) => (
                <TableRow key={release.name}>
                  <TableCell>{release.name}</TableCell>
                  <TableCell>{release.namespace}</TableCell>
                  <TableCell>{release.chart}</TableCell>
                  <TableCell>
                    <Chip
                      label={release.status}
                      color={
                        release.status.toLowerCase() === 'deployed' 
                          ? 'success' 
                          : release.status.toLowerCase() === 'failed' 
                            ? 'error' 
                            : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{new Date(release.updated).toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View YAML">
                      <IconButton
                        onClick={() => handleViewYaml(release)}
                        size="small"
                        color="primary"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14.6,16.6L19.2,12L14.6,7.4L13.2,8.8L16.4,12L13.2,15.2L14.6,16.6M9.4,16.6L10.8,15.2L7.6,12L10.8,8.8L9.4,7.4L4.8,12L9.4,16.6Z"/>
                        </svg>
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        onClick={() => handleDeleteRelease(release.name)}
                        size="small"
                        color="error"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
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
      )}

      {/* Add Repository Dialog */}
      <Dialog open={addRepoOpen} onClose={() => setAddRepoOpen(false)}>
        <DialogTitle>Add Helm Repository</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, minWidth: 400 }}>
            <TextField
              fullWidth
              label="Name"
              value={newRepoName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRepoName(e.target.value)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="URL"
              value={newRepoUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRepoUrl(e.target.value)}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddRepoOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddRepository} 
            variant="contained" 
            color="primary"
            disabled={!newRepoName || !newRepoUrl}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Install Chart Dialog */}
      <Dialog 
        open={installDialogOpen} 
        onClose={() => setInstallDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Install {selectedChart?.name} ({selectedChart?.version})
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Release Name"
              value={releaseName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReleaseName(e.target.value)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Namespace"
              value={releaseNamespace}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReleaseNamespace(e.target.value)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Values (YAML)"
              value={releaseValues}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReleaseValues(e.target.value)}
              margin="normal"
              multiline
              rows={10}
              variant="outlined"
              placeholder="# Enter your values in YAML format\nreplicaCount: 1\nimage:\n  repository: nginx\n  tag: stable"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleInstallChart} 
            variant="contained" 
            color="primary"
            disabled={!releaseName || !releaseNamespace}
          >
            Install
          </Button>
        </DialogActions>
      </Dialog>

      {/* YAML View Dialog */}
      <Dialog 
        open={yamlDialogOpen} 
        onClose={() => setYamlDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedRelease?.name} - YAML
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, maxHeight: '60vh', overflow: 'auto' }}>
            <SyntaxHighlighter 
              language="yaml" 
              style={atomDark}
              showLineNumbers
            >
              {yamlContent}
            </SyntaxHighlighter>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setYamlDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HelmCharts;
