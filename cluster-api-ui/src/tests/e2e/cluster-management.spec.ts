import { test, expect } from '@playwright/test';

test.describe('Cluster Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/clusters', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          json: [
            {
              id: '1',
              name: 'production-cluster',
              status: 'running',
              provider: 'aws',
              region: 'us-east-1',
              kubernetes_version: '1.28.0',
              node_count: 5,
              created_at: '2024-01-01T00:00:00Z'
            },
            {
              id: '2',
              name: 'staging-cluster',
              status: 'creating',
              provider: 'gcp',
              region: 'us-central1',
              kubernetes_version: '1.27.0',
              node_count: 3,
              created_at: '2024-01-02T00:00:00Z'
            }
          ]
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          json: { id: '3', status: 'creating', message: 'Cluster creation initiated' }
        });
      }
    });

    await page.route('**/api/clusters/*/scale', async route => {
      await route.fulfill({
        json: { success: true, message: 'Scaling initiated' }
      });
    });

    await page.route('**/api/clusters/*/maintenance-mode', async route => {
      await route.fulfill({
        json: { success: true, message: 'Maintenance mode updated' }
      });
    });

    await page.goto('/clusters');
  });

  test('displays cluster management page correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Cluster Management');
    await expect(page.locator('text=Manage your Kubernetes clusters with AI-powered intelligence')).toBeVisible();
  });

  test('shows cluster statistics cards', async ({ page }) => {
    await expect(page.locator('text=Total Clusters')).toBeVisible();
    await expect(page.locator('text=Running')).toBeVisible();
    await expect(page.locator('text=Nodes')).toBeVisible();
    await expect(page.locator('text=Providers')).toBeVisible();
  });

  test('displays cluster table with data', async ({ page }) => {
    await expect(page.locator('text=production-cluster')).toBeVisible();
    await expect(page.locator('text=staging-cluster')).toBeVisible();
    await expect(page.locator('text=running')).toBeVisible();
    await expect(page.locator('text=creating')).toBeVisible();
  });

  test('create cluster workflow', async ({ page }) => {
    // Click Create Cluster button
    await page.click('text=Create Cluster');
    
    // Verify dialog opens
    await expect(page.locator('text=Create New Cluster')).toBeVisible();
    
    // Fill form
    await page.fill('input[name="name"]', 'test-cluster');
    await page.selectOption('select[name="provider"]', 'aws');
    await page.selectOption('select[name="region"]', 'us-east-1');
    await page.selectOption('select[name="kubernetes_version"]', '1.28.0');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify success message
    await expect(page.locator('text=Cluster creation initiated')).toBeVisible();
  });

  test('cluster scaling workflow', async ({ page }) => {
    // Click Scale button for first cluster
    await page.click('button:has-text("Scale"):first');
    
    // Verify scale dialog opens
    await expect(page.locator('text=Scale Cluster')).toBeVisible();
    
    // Set target node count
    await page.fill('input[name="targetNodes"]', '7');
    
    // Submit scaling
    await page.click('text=Scale Cluster');
    
    // Verify success message
    await expect(page.locator('text=Scaling initiated')).toBeVisible();
  });

  test('maintenance mode workflow', async ({ page }) => {
    // Click Maintenance button
    await page.click('button:has-text("Maintenance"):first');
    
    // Verify maintenance dialog opens
    await expect(page.locator('text=Maintenance Mode')).toBeVisible();
    
    // Fill maintenance details
    await page.fill('textarea[name="reason"]', 'Scheduled maintenance');
    await page.fill('input[name="duration"]', '60');
    
    // Enable maintenance mode
    await page.click('button:has-text("Enable Maintenance")');
    
    // Verify success message
    await expect(page.locator('text=Maintenance mode updated')).toBeVisible();
  });

  test('cluster search functionality', async ({ page }) => {
    // Search for specific cluster
    await page.fill('input[placeholder*="Search clusters"]', 'production');
    
    // Verify filtered results
    await expect(page.locator('text=production-cluster')).toBeVisible();
    await expect(page.locator('text=staging-cluster')).not.toBeVisible();
    
    // Clear search
    await page.fill('input[placeholder*="Search clusters"]', '');
    
    // Verify all clusters shown again
    await expect(page.locator('text=production-cluster')).toBeVisible();
    await expect(page.locator('text=staging-cluster')).toBeVisible();
  });

  test('cluster status filtering', async ({ page }) => {
    // Filter by running status
    await page.selectOption('select[name="statusFilter"]', 'running');
    
    // Verify only running clusters shown
    await expect(page.locator('text=production-cluster')).toBeVisible();
    await expect(page.locator('text=staging-cluster')).not.toBeVisible();
    
    // Reset filter
    await page.selectOption('select[name="statusFilter"]', 'all');
    
    // Verify all clusters shown
    await expect(page.locator('text=production-cluster')).toBeVisible();
    await expect(page.locator('text=staging-cluster')).toBeVisible();
  });

  test('refresh functionality', async ({ page }) => {
    // Click refresh button
    await page.click('button:has-text("Refresh")');
    
    // Verify loading state briefly appears
    await expect(page.locator('[data-testid="loading"]')).toBeVisible();
    
    // Verify data reloads
    await expect(page.locator('text=production-cluster')).toBeVisible();
  });
});
