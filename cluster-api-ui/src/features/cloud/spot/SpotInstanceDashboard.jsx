import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  LinearProgress,
  Card,
  CardContent,
  Chip,
  useTheme,
} from '@mui/material';
import {
  AttachMoney as SavingsIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const SpotInstanceDashboard = () => {
  const theme = useTheme();
  
  // Mock data - replace with actual API calls
  const spotData = {
    savings: {
      monthly: 1245.67,
      ytd: 8765.43,
      percentage: 72,
    },
    instances: {
      total: 24,
      running: 18,
      interrupted: 3,
      pending: 3,
    },
    history: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      savings: [450, 620, 780, 890, 1040, 1120, 1245],
      interruptions: [12, 8, 5, 7, 6, 4, 3],
    },
    recommendations: [
      { id: 1, type: 'scale-up', instance: 'm5.large', potentialSavings: 120 },
      { id: 2, type: 'schedule', when: 'weekends', potentialSavings: 85 },
    ],
  };

  const savingsChartData = {
    labels: spotData.history.labels,
    datasets: [
      {
        label: 'Monthly Savings ($)',
        data: spotData.history.savings,
        borderColor: theme.palette.success.main,
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const interruptionsChartData = {
    labels: spotData.history.labels,
    datasets: [
      {
        label: 'Monthly Interruptions',
        data: spotData.history.interruptions,
        borderColor: theme.palette.warning.main,
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const StatCard = ({ title, value, icon, color, subtext }) => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography color="textSecondary" variant="subtitle2">
              {title}
            </Typography>
            <Typography variant="h5" color={color}>
              {value}
            </Typography>
            {subtext && (
              <Typography variant="caption" color="textSecondary">
                {subtext}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}20`,
              borderRadius: '50%',
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {React.cloneElement(icon, { style: { color, fontSize: 28 } })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const InstanceStatusCard = () => (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" gutterBottom>
          Instance Status
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h4">{spotData.instances.running}</Typography>
              <Typography variant="caption" color="textSecondary">
                Running
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(spotData.instances.running / spotData.instances.total) * 100}
                color="success"
                sx={{ mt: 1 }}
              />
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h4">{spotData.instances.interrupted}</Typography>
              <Typography variant="caption" color="textSecondary">
                Interrupted
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(spotData.instances.interrupted / spotData.instances.total) * 100}
                color="warning"
                sx={{ mt: 1 }}
              />
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h4">{spotData.instances.pending}</Typography>
              <Typography variant="caption" color="textSecondary">
                Pending
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(spotData.instances.pending / spotData.instances.total) * 100}
                sx={{ mt: 1 }}
              />
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h4">{spotData.instances.total}</Typography>
              <Typography variant="caption" color="textSecondary">
                Total
              </Typography>
              <LinearProgress
                variant="determinate"
                value={100}
                color="info"
                sx={{ mt: 1 }}
              />
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const RecommendationCard = () => (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" gutterBottom>
          Optimization Recommendations
        </Typography>
        <Grid container spacing={2}>
          {spotData.recommendations.map((rec) => (
            <Grid item xs={12} key={rec.id}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2">
                      {rec.type === 'scale-up' && `Scale up to ${rec.instance} instances`}
                      {rec.type === 'schedule' && `Schedule instances for ${rec.when}`}
                    </Typography>
                    <Chip
                      size="small"
                      label={`Potential savings: $${rec.potentialSavings}/mo`}
                      color="success"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <Chip
                    label="Apply"
                    color="primary"
                    variant="outlined"
                    size="small"
                    onClick={() => console.log('Apply recommendation:', rec.id)}
                  />
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Spot Instance Dashboard
      </Typography>
      <Typography color="textSecondary" paragraph>
        Monitor and optimize your spot instance usage and savings
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Monthly Savings"
            value={`$${spotData.savings.monthly.toFixed(2)}`}
            icon={<SavingsIcon />}
            color={theme.palette.success.main}
            subtext={`${spotData.savings.percentage}% vs on-demand`}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            title="YTD Savings"
            value={`$${spotData.savings.ytd.toFixed(2)}`}
            icon={<TrendingUpIcon />}
            color={theme.palette.info.main}
            subtext="Year to date"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            title="Interruption Rate"
            value={`${((spotData.instances.interrupted / spotData.instances.total) * 100).toFixed(1)}%`}
            icon={<WarningIcon />}
            color={theme.palette.warning.main}
            subtext={`${spotData.instances.interrupted} interruptions`}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Monthly Savings Trend
            </Typography>
            <Box height={300}>
              <Line data={savingsChartData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <RecommendationCard />
        </Grid>
        <Grid item xs={12}>
          <InstanceStatusCard />
        </Grid>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Interruption History
            </Typography>
            <Box height={300}>
              <Line data={interruptionsChartData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SpotInstanceDashboard;
