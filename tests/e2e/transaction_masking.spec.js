const { test, expect } = require('@playwright/test');

test.describe('Transaction PII Masking and Tabs', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page first
    await page.goto('/support/login');
    
    // Perform login
    await page.locator('#support-email').fill('agent@mito.money');
    await page.locator('#support-password').fill('support123');
    await page.locator('#support-login-btn').click();
    
    // Wait for the login process (it has a 600ms timeout) and redirect
    await expect(page).toHaveURL(/\/support\//, { timeout: 10000 });
    
    // Ensure we are not on the login page anymore
    await expect(page.locator('#support-login-btn')).not.toBeVisible();

    // Navigate to the transaction search page
    await page.goto('/support/transactions');
    await page.waitForLoadState('networkidle');
    
    // Verify we are actually on the transaction page
    await expect(page.locator('h1')).toContainText('Transaction Search');
  });

  test('should search and display masked transaction details', async ({ page }) => {
    const searchInput = page.locator('#transaction-search-input');
    const searchBtn = page.locator('#transaction-search-btn');

    // Search for the first mock reference
    await searchInput.fill('05023676980');
    await searchBtn.click();

    // Verify search results container is visible
    await expect(page.locator('#search-results')).toBeVisible();

    // Verify Summary Table Masking (No longer checking balance as it was removed)
    const summaryTable = page.locator('#search-results > div').first();

    // Verify Tabs are present
    await expect(page.getByRole('button', { name: 'Details' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Trail' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'KYC' })).toBeVisible();

    // Verify Masked Details in the 'Details' tab
    const detailsTab = page.locator('#details-tab');
    await expect(detailsTab).toBeVisible();
    
    // Check masked phone numbers
    await expect(detailsTab).toContainText('*********1833'); // Beneficiary phone: 2348136931833
    await expect(detailsTab).toContainText('*******3456'); // Sender phone: 34678123456

    // Check masked emails
    await expect(detailsTab).toContainText('o*******o@example.com'); // ogbeide.o@example.com
    await expect(detailsTab).toContainText('o************r@example.com'); // ogbeide.sender@example.com

    // Check masked addresses
    await expect(detailsTab).toContainText('***, Osayande St, Benin City, Nigeria');
    await expect(detailsTab).toContainText('***, 45, Madrid, Spain');

    // Switch to Trail tab
    await page.getByRole('button', { name: 'Trail' }).click();
    await expect(page.locator('#trail-tab')).toBeVisible();
    await expect(page.locator('#trail-tab')).toContainText('Audit Trail');
    await expect(page.locator('#trail-tab')).toContainText('Transaction Initiated');

    // Switch to KYC tab
    await page.getByRole('button', { name: 'KYC' }).click();
    await expect(page.locator('#kyc-tab')).toBeVisible();
    await expect(page.locator('#kyc-tab')).toContainText('KYC Verification Status');
    await expect(page.locator('#kyc-tab')).toContainText('Passed');
    
    // Take screenshot of KYC tab
    await page.screenshot({ path: 'test-results/kyc_status_view.png' });
  });

  test('should show no result for invalid search', async ({ page }) => {
    const searchInput = page.locator('#transaction-search-input');
    const searchBtn = page.locator('#transaction-search-btn');

    await searchInput.fill('INVALID-REF');
    await searchBtn.click();

    await expect(page.locator('#no-result')).toBeVisible();
    await expect(page.locator('#no-result')).toContainText('No Transaction Found');
  });
});
