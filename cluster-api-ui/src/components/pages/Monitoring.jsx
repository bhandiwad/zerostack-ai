import React from 'react';
import { Box, Typography } from '@mui/material';

const Monitoring = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
        Monitoring
      </Typography>
      <Typography variant="body1" color="textSecondary">
        This page will show comprehensive monitoring dashboards and metrics for all clusters.
      </Typography>
    </Box>
  );
};

export default Monitoring;

