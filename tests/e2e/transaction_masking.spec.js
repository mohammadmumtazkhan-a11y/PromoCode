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

    // Check masked names
    await expect(detailsTab).toContainText('OG***** OS******'); // Beneficiary/Sender: OGBEIDE OSAYANDE

    // Check masked emails
    await expect(detailsTab).toContainText('o*******o@example.com'); // ogbeide.o@example.com
    await expect(detailsTab).toContainText('o************r@example.com'); // ogbeide.sender@example.com

    // Check masked addresses
    await expect(detailsTab).toContainText('***, Osayande St, Benin City, Nigeria');
    await expect(detailsTab).toContainText('***, 45, Madrid, Spain');

    // Check masked account number
    await expect(detailsTab).toContainText('******8819'); // Account: 2086208819

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

  test('should search by sender email', async ({ page }) => {
    const searchInput = page.locator('#transaction-search-input');
    const searchBtn = page.locator('#transaction-search-btn');

    // Search by sender email
    await searchInput.fill('ogbeide.sender@example.com');
    await searchBtn.click();

    // Verify search results container is visible
    await expect(page.locator('#search-results')).toBeVisible();

    // Verify correct reference/transaction is shown
    await expect(page.locator('#search-results')).toContainText('05023676980');
    
    // Verify Sender Email is visible in the summary table (masked)
    await expect(page.locator('#search-results')).toContainText('o************r@example.com');
  });

  test('should show no result for invalid search', async ({ page }) => {
    const searchInput = page.locator('#transaction-search-input');
    const searchBtn = page.locator('#transaction-search-btn');

    await searchInput.fill('INVALID-REF');
    await searchBtn.click();

    await expect(page.locator('#no-result')).toBeVisible();
    await expect(page.locator('#no-result')).toContainText('No Transaction Found');
  });

  test('should verify Comments tab and interactive thread', async ({ page }) => {
    await page.fill('#transaction-search-input', '05023676980');
    await page.click('#transaction-search-btn');
    
    // Verify Comments tab exists and click it
    const commentsTab = page.locator('#tab-comments');
    await expect(commentsTab).toBeVisible();
    await commentsTab.click();
    
    // Check existing comments
    await expect(page.locator('text=[FTP] New Transaction added')).toBeVisible();
    await expect(page.locator('text=Verifying payout status with partner.')).toBeVisible();
    
    // Add a new comment
    await page.fill('#new-comment-input', 'Follow-up with partner complete.');
    await page.click('#post-comment-btn');
    
    // Verify new comment appears
    await expect(page.locator('text=Follow-up with partner complete.')).toBeVisible();
  });

  test('should verify Help Tickets tab and linked ticket', async ({ page }) => {
    await page.fill('#transaction-search-input', 'MITO-7721003');
    await page.click('#transaction-search-btn');
    
    // Verify Help Tickets tab exists and click it
    const ticketsTab = page.locator('#tab-help-tickets');
    await expect(ticketsTab).toBeVisible();
    await ticketsTab.click();
    
    // Check linked ticket data
    await expect(page.locator('#linked-ticket-2651')).toBeVisible();
    await expect(page.locator('text=Transaction stuck in processing for 6 hours')).toBeVisible();
    
    // Check Start Communication button
    await expect(page.locator('#start-communication-btn')).toBeVisible();
  });

  test('should verify back button restores search state and tab', async ({ page }) => {
    await page.fill('#transaction-search-input', 'MITO-7721003');
    await page.click('#transaction-search-btn');
    
    // Switch to Help Tickets tab
    const ticketsTab = page.locator('#tab-help-tickets');
    await ticketsTab.click();
    
    // Click on a linked ticket to navigate away
    await page.click('#linked-ticket-2651');
    
    // Verify we are on the ticket detail page
    await expect(page.locator('h2').filter({ hasText: '#2651' })).toBeVisible();
    
    // Click "Back to list"
    await page.click('text=Back to list');
    
    // Verify we are back on Transaction Search with the correct results and tab
    await expect(page.locator('h1')).toContainText('Transaction Search');
    await expect(page.locator('#search-results')).toContainText('MITO-7721003');
    await expect(page.locator('#tickets-tab')).toBeVisible(); // Help Tickets tab should be active
  });

  test('should verify Create a New Ticket popup opens with reference', async ({ page }) => {
    await page.fill('#transaction-search-input', 'MITO-7721003');
    await page.click('#transaction-search-btn');
    
    // Switch to Help Tickets tab
    const ticketsTab = page.locator('#tab-help-tickets');
    await ticketsTab.click();
    
    // Click "Create a New Ticket" (renamed button)
    await page.click('#start-communication-btn');
    
    // Verify modal is visible
    await expect(page.locator('#create-ticket-modal')).toBeVisible();
    await expect(page.locator('#modal-txn-ref')).toHaveValue('MITO-7721003');
    
    // Close modal
    await page.click('#close-modal-btn');
    await expect(page.locator('#create-ticket-modal')).not.toBeVisible();
  });

  test('should verify tab notification dots', async ({ page }) => {
    await page.fill('#transaction-search-input', 'MITO-7721003');
    await page.click('#transaction-search-btn');
    
    // Verify notification dots are visible on Comments and Help Tickets tabs
    await expect(page.locator('#notifier-comments')).toBeVisible();
    await expect(page.locator('#notifier-help-tickets')).toBeVisible();
    
    // Click Comments tab
    await page.click('#tab-comments');
    // Notification dot for Comments should disappear
    await expect(page.locator('#notifier-comments')).not.toBeVisible();
    // Notification dot for Help Tickets should still be there
    await expect(page.locator('#notifier-help-tickets')).toBeVisible();
    
    // Click Help Tickets tab
    await page.click('#tab-help-tickets');
    // Notification dot for Help Tickets should disappear
    await expect(page.locator('#notifier-help-tickets')).not.toBeVisible();
  });
});
