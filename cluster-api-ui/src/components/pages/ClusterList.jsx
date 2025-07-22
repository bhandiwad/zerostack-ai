import React from 'react';
import { Box, Typography } from '@mui/material';

const ClusterList = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
        Cluster List
      </Typography>
      <Typography variant="body1" color="textSecondary">
        This page will show a comprehensive list of all clusters with filtering and management options.
      </Typography>
    </Box>
  );
};

export default ClusterList;

