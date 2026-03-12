const { test, expect } = require('@playwright/test');

test.describe('Help Tickets UI Cleanup', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page first
    await page.goto('/support/login');
    
    // Perform login
    await page.locator('#support-email').fill('agent@mito.money');
    await page.locator('#support-password').fill('support123');
    await page.locator('#support-login-btn').click();
    
    // Wait for redirect to the main support portal (stricter check)
    // We expect to be redirected to something that IS NOT the login page
    await page.waitForURL((url) => url.pathname.startsWith('/support/') && !url.pathname.includes('login'), { timeout: 15000 });

    // Verify we are logged in by checking for the sidebar or user name
    await expect(page.locator('aside')).toBeVisible({ timeout: 10000 });

    // Navigate to Help Tickets page
    await page.goto('/support/help-tickets');
    await page.waitForLoadState('networkidle');
  });

  test('should not show Platform field in Create Ticket modal', async ({ page }) => {
    // Click Create Ticket button
    // Ensure button is visible first
    const createBtn = page.locator('button', { hasText: /Create ticket/i });
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    // Verify modal is open
    await expect(page.getByText('Create a new ticket')).toBeVisible();

    // Verify Platform field is NOT visible
    await expect(page.locator('label', { hasText: 'Platform' })).not.toBeVisible();
    
    // Verify other mandatory fields ARE visible
    await expect(page.locator('label', { hasText: 'Select user' })).toBeVisible();
    await expect(page.locator('label', { hasText: 'Subject' })).toBeVisible();
    await expect(page.locator('label', { hasText: 'Message' })).toBeVisible();
  });
});
