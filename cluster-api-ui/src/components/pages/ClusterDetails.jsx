import React from 'react';
import { Box, Typography } from '@mui/material';

const ClusterDetails = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
        Cluster Details
      </Typography>
      <Typography variant="body1" color="textSecondary">
        This page will show detailed information about a specific cluster.
      </Typography>
    </Box>
  );
};

export default ClusterDetails;

