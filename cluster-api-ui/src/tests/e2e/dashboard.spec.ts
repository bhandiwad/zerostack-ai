import { test, expect } from '@playwright/test';

test.describe('ZeroStack AI Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/clusters', async route => {
      await route.fulfill({
        json: [
          {
            id: '1',
            name: 'test-cluster-1',
            status: 'running',
            provider: 'aws',
            region: 'us-east-1',
            kubernetes_version: '1.28.0',
            node_count: 3
          }
        ]
      });
    });

    await page.route('**/api/agents', async route => {
      await route.fulfill({
        json: [
          {
            id: '1',
            name: 'Support Agent L1',
            type: 'support_l1',
            status: 'active'
          }
        ]
      });
    });

    await page.goto('/');
  });

  test('displays ZeroStack AI branding', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('ZeroStack AI – Zero Ops. Full Stack.');
    await expect(page.locator('text=Intelligent Kubernetes management with AI-powered automation')).toBeVisible();
  });

  test('shows cluster statistics', async ({ page }) => {
    await expect(page.locator('text=Total Clusters')).toBeVisible();
    await expect(page.locator('text=Active Nodes')).toBeVisible();
    await expect(page.locator('text=Monthly Cost')).toBeVisible();
  });

  test('displays AI Agent Hub', async ({ page }) => {
    await expect(page.locator('text=ZeroStack AI Agent Hub')).toBeVisible();
    await expect(page.locator('text=Intelligent automation at your fingertips')).toBeVisible();
  });

  test('navigation works correctly', async ({ page }) => {
    // Test navigation to AI Agents
    await page.click('text=AI Agents');
    await expect(page).toHaveURL(/.*\/agents/);

    // Test navigation to Cluster Management
    await page.click('text=Cluster Management');
    await expect(page).toHaveURL(/.*\/clusters/);

    // Test navigation back to Home
    await page.click('text=Home');
    await expect(page).toHaveURL('/');
  });

  test('sidebar collapse functionality', async ({ page }) => {
    const sidebar = page.locator('[data-testid="navigation"]');
    const collapseButton = page.locator('[data-testid="nav-collapse-toggle"]');

    // Initially expanded
    await expect(sidebar).not.toHaveClass(/collapsed/);

    // Click to collapse
    await collapseButton.click();
    await expect(sidebar).toHaveClass(/collapsed/);

    // Click to expand
    await collapseButton.click();
    await expect(sidebar).not.toHaveClass(/collapsed/);
  });

  test('responsive design on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Total Clusters')).toBeVisible();
  });
});
