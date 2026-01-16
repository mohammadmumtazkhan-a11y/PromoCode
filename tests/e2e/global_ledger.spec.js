
const { test, expect } = require('@playwright/test');

test('Global Ledger View Test', async ({ page }) => {
    // 1. Navigate to Credit Ledger
    await page.goto('http://localhost:5173/growth/credit-ledger');

    // 2. Verify Page Title
    await expect(page.getByRole('heading', { name: 'User Credit Ledger' })).toBeVisible();

    // 3. Verify Global View Button exists
    const globalBtn = page.getByRole('button', { name: 'Global View' });
    await expect(globalBtn).toBeVisible();

    // 4. Click Global View
    await globalBtn.click();

    // 5. Verify Input value updates to 'all'
    const searchInput = page.getByPlaceholder(/Search by User ID/);
    await expect(searchInput).toHaveValue('all');

    // 6. Verify Table loads (checking for entries)
    // We assume seed data exists (user_123).
    // Wait for table rows.
    // The table body row count should be > 0.
    // Note: The table row usually contains Date/Customer.
    // We can just wait for a row.
    const tableRows = page.locator('tbody tr');
    await expect(tableRows).not.toHaveCount(0);

    console.log('Global Ledger E2E Test Passed');
});
