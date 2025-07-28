# Helm Applications Management

This document provides an overview of the Helm Applications feature in the Cluster API UI, including setup, usage, and development guidelines.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [API Endpoints](#api-endpoints)
- [Component Structure](#component-structure)
- [Development Guidelines](#development-guidelines)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Overview

The Helm Applications feature allows users to manage Helm charts and releases on their Kubernetes clusters through a user-friendly interface. It provides the following capabilities:

- List installed Helm releases
- Browse available Helm charts
- Install new Helm charts
- Uninstall existing Helm releases
- View release status and details

## Features

### Installed Applications View
- Displays all Helm releases in the cluster
- Shows release status, version, and last update time
- Provides quick actions for each application

### Chart Browser
- Browse available Helm charts by category
- Search for specific charts
- View chart details and documentation

### Installation Wizard
- Step-by-step chart installation
- Form validation for required fields
- Support for custom values and configurations

## API Endpoints

The component interacts with the following backend API endpoints:

### List Installed Applications
```
GET /clusters/{clusterId}/applications
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "prometheus",
      "namespace": "monitoring",
      "status": "deployed",
      "version": "25.8.0",
      "chart": "prometheus-25.8.0",
      "updated": "2025-01-15T10:30:00Z"
    }
  ]
}
```

### Install a Chart
```
POST /clusters/{clusterId}/applications
```

**Request Body:**
```json
{
  "name": "my-release",
  "namespace": "default",
  "chart": "nginx",
  "version": "13.2.0",
  "repository": "https://charts.bitnami.com/bitnami",
  "values": {
    "replicaCount": 1
  }
}
```

### Uninstall a Release
```
DELETE /clusters/{clusterId}/namespaces/{namespace}/releases/{release}
```

### List Available Charts
```
GET /clusters/{clusterId}/charts
```

## Component Structure

```
HelmApplications/
├── index.jsx           # Main component
├── HelmApplications.css # Component styles
└── README.md           # This documentation
```

## Development Guidelines

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| cluster | Object | Yes | The currently selected cluster |
| apiCall | Function | Yes | Function to make authenticated API calls |
| showNotification | Function | Yes | Function to display notifications |

### State Management

The component uses React's `useState` hook to manage the following state:

- `applications`: Array of installed Helm releases
- `availableCharts`: Array of available Helm charts
- `loading`: Boolean indicating if data is being loaded
- `selectedChart`: Currently selected chart for installation
- `installConfig`: Configuration for the installation form
- `formErrors`: Validation errors for the form
- `uninstallingApp`: Name of the application being uninstalled

### Form Validation

The installation form includes the following validations:

- Application name:
  - Required field
  - Must be a valid DNS subdomain name (lowercase alphanumeric characters and hyphens)
- Namespace: Required field
- Version: Must be a valid semantic version

## Testing

### Unit Tests

Run the test suite with:
```bash
npm test HelmApplications
```

### Manual Testing

1. **Installation Flow**
   - Select a chart from the available charts
   - Fill in the installation form
   - Verify the installation completes successfully
   - Check the application appears in the installed applications list

2. **Uninstallation Flow**
   - Click the uninstall button on an installed application
   - Confirm the uninstallation
   - Verify the application is removed from the list

3. **Error Handling**
   - Test with invalid form inputs
   - Simulate API failures
   - Verify error messages are displayed correctly

## Troubleshooting

### Common Issues

1. **Charts not loading**
   - Verify the backend API is running and accessible
   - Check the network tab for failed requests
   - Ensure the cluster ID is valid

2. **Installation fails**
   - Check the browser console for error messages
   - Verify the chart name and version exist in the repository
   - Ensure the target namespace exists

3. **Permissions issues**
   - Verify the service account has the necessary RBAC permissions
   - Check cluster role bindings

### Debugging

To enable debug logging, add the following to your browser's console:

```javascript
localStorage.setItem('debug', 'HelmApplications:*');
```

Then refresh the page to see detailed debug logs in the console.
