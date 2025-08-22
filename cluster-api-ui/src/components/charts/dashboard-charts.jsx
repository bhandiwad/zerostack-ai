import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Icon } from '../ui/icons';

// Sample data - in real app, this would come from props or API
const clusterMetricsData = [
  { time: '00:00', cpu: 45, memory: 62, network: 23 },
  { time: '04:00', cpu: 52, memory: 58, network: 31 },
  { time: '08:00', cpu: 78, memory: 75, network: 45 },
  { time: '12:00', cpu: 85, memory: 82, network: 52 },
  { time: '16:00', cpu: 72, memory: 68, network: 38 },
  { time: '20:00', cpu: 58, memory: 55, network: 28 },
];

const providerDistribution = [
  { name: 'AWS', value: 45, color: '#FF9500' },
  { name: 'GCP', value: 30, color: '#4285F4' },
  { name: 'Azure', value: 25, color: '#00BCF2' },
];

const costTrendData = [
  { month: 'Jan', cost: 2400, budget: 3000 },
  { month: 'Feb', cost: 2800, budget: 3000 },
  { month: 'Mar', cost: 3200, budget: 3500 },
  { month: 'Apr', cost: 2900, budget: 3500 },
  { month: 'May', cost: 3400, budget: 4000 },
  { month: 'Jun', cost: 3800, budget: 4000 },
];

const nodeStatusData = [
  { status: 'Running', count: 24, color: '#10B981' },
  { status: 'Pending', count: 3, color: '#F59E0B' },
  { status: 'Failed', count: 1, color: '#EF4444' },
  { status: 'Stopped', count: 2, color: '#6B7280' },
];

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
            {entry.name === 'cost' || entry.name === 'budget' ? '$' : '%'}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Resource Usage Chart
export const ResourceUsageChart = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Icon name="chart-line" size="sm" className="text-indigo-600" />
        Resource Usage (24h)
      </CardTitle>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={clusterMetricsData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="time" 
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
            domain={[0, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="cpu" 
            stroke="#3b82f6" 
            strokeWidth={2}
            name="CPU"
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="memory" 
            stroke="#10b981" 
            strokeWidth={2}
            name="Memory"
            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="network" 
            stroke="#f59e0b" 
            strokeWidth={2}
            name="Network"
            dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

// Provider Distribution Chart
export const ProviderDistributionChart = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Icon name="cloud" size="sm" className="text-indigo-600" />
        Provider Distribution
      </CardTitle>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={providerDistribution}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
          >
            {providerDistribution.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => [`${value}%`, 'Usage']}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry) => (
              <span style={{ color: entry.color }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

// Cost Trend Chart
export const CostTrendChart = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Icon name="currency-dollar" size="sm" className="text-indigo-600" />
        Cost Trends
      </CardTitle>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={costTrendData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="month" 
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip 
            formatter={(value, name) => [`$${value}`, name === 'cost' ? 'Actual Cost' : 'Budget']}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="budget"
            stackId="1"
            stroke="#e5e7eb"
            fill="#f3f4f6"
            name="Budget"
          />
          <Area
            type="monotone"
            dataKey="cost"
            stackId="2"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.6}
            name="Actual Cost"
          />
        </AreaChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

// Node Status Chart
export const NodeStatusChart = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Icon name="server" size="sm" className="text-indigo-600" />
        Node Status
      </CardTitle>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={nodeStatusData} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            type="number" 
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            type="category" 
            dataKey="status" 
            stroke="#6b7280"
            fontSize={12}
            width={80}
          />
          <Tooltip 
            formatter={(value) => [value, 'Nodes']}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {nodeStatusData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

// Main Dashboard Charts Component
export const DashboardCharts = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <ResourceUsageChart />
    <ProviderDistributionChart />
    <CostTrendChart />
    <NodeStatusChart />
  </div>
);

export default DashboardCharts;
