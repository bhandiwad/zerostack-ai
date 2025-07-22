import React from 'react';
import { Box, Typography } from '@mui/material';

const ClusterCreation = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
        Create Cluster
      </Typography>
      <Typography variant="body1" color="textSecondary">
        This page will contain the comprehensive cluster creation wizard with all the advanced options.
      </Typography>
    </Box>
  );
};

export default ClusterCreation;

