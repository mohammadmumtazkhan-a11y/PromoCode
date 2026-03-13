const { test, expect } = require('@playwright/test');

test.describe('Transaction PII Masking and Tabs', () => {
  test.beforeEach(async ({ page }) => {
    // Suppress escalation alerts for E2E tests
    await page.addInitScript(() => {
      window.localStorage.setItem('disableAlerts', 'true');
    });

    // Navigate to the login page first
    await page.goto('http://localhost:5173/support/login');

    // Perform login using IDs
    await page.locator('#support-email').fill('agent@mito.money');
    await page.locator('#support-password').fill('support123');
    await page.locator('#support-login-btn').click();

    // Wait for the login process and redirect to dashboard
    await expect(page).toHaveURL(/\/support\/$/, { timeout: 10000 });

    // Verify we are on the dashboard
    await expect(page.locator('h1')).toContainText('Welcome back');

    // Navigate to the transaction search page
    await page.goto('/support/transactions');

    // Verify we are actually on the transaction page
    await expect(page.locator('h1')).toContainText('Transaction Search');
  });

  test('should search and display masked transaction details', async ({ page }) => {
    const searchInput = page.locator('#transaction-search-input');
    const searchBtn = page.locator('#transaction-search-btn');

    // Search for the first mock reference
    await searchInput.fill('05023676980');
    await searchBtn.click();

    // Click the result in the table to navigate to details
    await page.locator('#search-results').getByText('05023676980').click();

    // Verify Tabs are present
    await expect(page.getByRole('button', { name: 'Details' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Trail' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'KYC' })).toBeVisible();

    // Verify Sender Info is masked
    const summaryTable = page.locator('table').first();
    await expect(summaryTable).toContainText('OG***DE'); // Sender First Name Masked
    await expect(summaryTable).toContainText('OS****DE'); // Sender Last Name Masked
    await expect(summaryTable).toContainText('*******3456'); // Sender Phone Masked
  });

  test('should verify Trail tab content', async ({ page }) => {
    await page.fill('#transaction-search-input', '05023676980');
    await page.click('#transaction-search-btn');

    // Click result
    await page.locator('#search-results').getByText('05023676980').click();

    // Switch to Trail tab
    await page.getByRole('button', { name: 'Trail' }).click();

    // Verify audit trail entries exist
    await expect(page.locator('text=Transaction Initiated')).toBeVisible();
    await expect(page.locator('text=Partner Payout Confirmed')).toBeVisible();
  });

  test('should verify KYC tab status', async ({ page }) => {
    await page.fill('#transaction-search-input', '05023676980');
    await page.click('#transaction-search-btn');

    // Click result
    await page.locator('#search-results').getByText('05023676980').click();

    // Switch to KYC tab
    await page.getByRole('button', { name: 'KYC' }).click();

    // Verify KYC status is visible
    await expect(page.locator('text=KYC Verification Status')).toBeVisible();
    await expect(page.locator('text=Passed')).toBeVisible();
  });

  test('should search by sender email', async ({ page }) => {
    const searchInput = page.locator('#transaction-search-input');
    const searchBtn = page.locator('#transaction-search-btn');

    // Search for the sender email
    await searchInput.fill('ogbeide.sender@example.com');
    await searchBtn.click();

    // Verify search results container is visible
    await expect(page.locator('#search-results')).toBeVisible();

    // Verify the reference and masked email are in results
    await expect(page.locator('#search-results')).toContainText('05023676980');
    await expect(page.locator('#search-results')).toContainText('o************r@example.com');
  });

  test('should show no result for invalid search', async ({ page }) => {
    const searchInput = page.locator('#transaction-search-input');
    const searchBtn = page.locator('#transaction-search-btn');

    await searchInput.fill('INVALID_REF_999');
    await searchBtn.click();

    await expect(page.locator('#no-result')).toBeVisible();
    await expect(page.locator('#no-result')).toContainText('No Transaction Found');
  });

  test('should verify Comments tab and interactive thread', async ({ page }) => {
    await page.fill('#transaction-search-input', '05023676980');
    await page.click('#transaction-search-btn');

    // Click the result in the table to navigate to details
    await page.locator('#search-results').getByText('05023676980').click();

    // Verify Comments tab exists and click it
    const commentsTab = page.locator('#tab-comments');
    await expect(commentsTab).toBeVisible();
    await commentsTab.click();

    // Add a new comment
    await page.fill('#new-comment-input', 'Follow-up with partner complete.');
    await page.click('#post-comment-btn');

    // Verify comment appeared
    await expect(page.locator('text=Follow-up with partner complete.')).toBeVisible();
  });

  test('should verify Help Tickets tab and linked ticket', async ({ page }) => {
    await page.fill('#transaction-search-input', 'MITO-7721003');
    await page.click('#transaction-search-btn');

    // Click the result in the table to navigate to details
    await page.locator('#search-results').getByText('MITO-7721003').click();

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

    // Click the result in the table to navigate to details
    await page.locator('#search-results').getByText('MITO-7721003').click();

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
  });

  test('should verify Create a New Ticket popup opens with reference', async ({ page }) => {
    await page.fill('#transaction-search-input', 'MITO-7721003');
    await page.click('#transaction-search-btn');

    // Click the result in the table to navigate to details
    await page.locator('#search-results').getByText('MITO-7721003').click();

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

    // Click the result in the table to navigate to details
    await page.locator('#search-results').getByText('MITO-7721003').click();

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
