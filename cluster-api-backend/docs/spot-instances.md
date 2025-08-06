# Spot Instance Management

This document provides an overview of the spot instance management feature in the Cluster API Console, including architecture, API endpoints, and usage examples.

## Overview

Spot instances allow you to take advantage of unused cloud capacity at a significant discount compared to on-demand instances. This feature provides:

- Configuration of spot instances for clusters
- Real-time monitoring of spot instance savings
- Interruption history and notifications
- Optimization recommendations
- Multi-cloud support (AWS, Azure, GCP)

## Architecture

### Backend Components

1. **Database Models**
   - `SpotInstanceConfig`: Stores spot instance configuration per cluster
   - `SpotInstanceHistory`: Tracks spot instance events (interruptions, price changes)
   - `SpotInstanceSavings`: Aggregates cost savings data

2. **Service Layer**
   - `SpotInstanceManager`: Abstract base class for spot instance operations
   - `AWSSpotInstanceManager`: AWS-specific implementation
   - `AzureSpotInstanceManager`: Azure-specific implementation (stub)
   - `GCPSpotInstanceManager`: GCP-specific implementation (stub)

3. **API Endpoints**
   - `GET /api/cloud/accounts/{account_id}/clusters/{cluster_id}/spot`: Get spot config
   - `PUT /api/cloud/accounts/{account_id}/clusters/{cluster_id}/spot`: Update spot config
   - `GET /api/cloud/accounts/{account_id}/clusters/{cluster_id}/spot/savings`: Get savings report
   - `GET /api/cloud/accounts/{account_id}/clusters/{cluster_id}/spot/history`: Get interruption history
   - `GET /api/cloud/accounts/{account_id}/clusters/{cluster_id}/spot/recommendations`: Get optimization recommendations
   - `POST /api/cloud/accounts/{account_id}/clusters/{cluster_id}/spot/apply-recommendation`: Apply a recommendation

## Setup

### Prerequisites

- Python 3.8+
- PostgreSQL 12+
- AWS/Azure/GCP credentials with appropriate permissions

### Database Migration

Run the following command to apply the database migrations for spot instance support:

```bash
# Apply migrations
alembic upgrade head

# Verify the new tables were created
psql -d your_database_name -c "\dt spot_*"
```

### Environment Variables

Add the following environment variables to your `.env` file:

```env
# AWS Spot Instance Settings (if using AWS)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_DEFAULT_REGION=us-west-2

# Azure Spot Instance Settings (if using Azure)
AZURE_TENANT_ID=your_tenant_id
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
AZURE_SUBSCRIPTION_ID=your_subscription_id

# GCP Spot Instance Settings (if using GCP)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
GCP_PROJECT_ID=your_project_id
GCP_ZONE=us-central1-a
```

## Usage Examples

### Configure Spot Instances for a Cluster

```bash
# Enable spot instances with custom configuration
curl -X PUT http://localhost:8000/api/cloud/accounts/account-123/clusters/cluster-456/spot \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "allocation_strategy": "lowest-price",
    "interruption_behavior": "terminate",
    "max_price": 0.05,
    "instance_types": ["m5.large", "m5.xlarge"]
  }'
```

### Get Spot Instance Savings Report

```bash
# Get daily savings for the last 30 days
curl "http://localhost:8000/api/cloud/accounts/account-123/clusters/cluster-456/spot/savings?\
  start_date=2025-06-01T00:00:00Z&\
  end_date=2025-07-01T00:00:00Z&\
  granularity=daily"
```

### Get Optimization Recommendations

```bash
# Get spot instance optimization recommendations
curl http://localhost:8000/api/cloud/accounts/account-123/clusters/cluster-456/spot/recommendations
```

## Monitoring and Alerts

Spot instance interruptions and significant price changes are automatically logged and can trigger alerts. Configure alert notifications in the Alerts section of the UI.

## Best Practices

1. **Use Multiple Instance Types**: Increase the chance of getting spot capacity by specifying multiple instance types.
2. **Set Reasonable Max Price**: Set a maximum price that balances cost savings with reliability.
3. **Monitor Interruption Rates**: Check the interruption history to identify instance types with high interruption rates.
4. **Use Spot Fleets**: For production workloads, consider using spot fleets for better availability.
5. **Implement Checkpointing**: Ensure your applications can handle interruptions gracefully.

## Troubleshooting

### Common Issues

1. **Permission Errors**
   - Verify that the cloud provider credentials have the necessary permissions.
   - For AWS, ensure the IAM role has `ec2:DescribeSpotPriceHistory` and related permissions.

2. **No Spot Capacity**
   - Try different instance types or availability zones.
   - Check the cloud provider's spot instance advisor for current capacity.

3. **Configuration Not Applied**
   - Verify that the cluster is in a supported state (running).
   - Check the application logs for any errors during configuration.

## Support

For additional help, please contact support@example.com or open an issue in our [GitHub repository](https://github.com/yourorg/your-repo/issues).
