
const { test, expect } = require('@playwright/test');

test('Global Ledger View Test', async ({ page }) => {
    // 1. Navigate to Credit Ledger
    await page.goto('http://localhost:5173/growth/credit-ledger');

    // 2. Verify Page Title
    await expect(page.getByRole('heading', { name: 'User Credit Ledger' })).toBeVisible();

    // 3. Verify Data Loads Automatically (Global View)
    // Wait for table rows.
    const tableRows = page.locator('tbody tr');
    await expect(tableRows).not.toHaveCount(0);

    // 4. Verify Search Bar is GONE
    const searchInput = page.getByPlaceholder(/Search by User ID/);
    await expect(searchInput).not.toBeVisible();

    // 5. Verify Admin Column is GONE
    const adminHeader = page.getByRole('columnheader', { name: 'Admin' });
    await expect(adminHeader).not.toBeVisible();

    console.log('Global Ledger E2E Test Passed');
});
