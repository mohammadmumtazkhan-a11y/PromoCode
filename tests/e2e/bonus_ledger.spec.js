const { test, expect } = require('@playwright/test');

test.describe('Bonus & Wallet Ledger', () => {

    test('Navigate and Manage Bonus Schemes', async ({ page }) => {
        // Navigate directly to Bonus Schemes
        await page.goto('/growth/bonus-schemes');

        await expect(page.getByRole('heading', { name: 'Bonus Scheme Manager' })).toBeVisible({ timeout: 15000 });

        // Create Scheme - Use REQUEST_MONEY (simpler, no extra fields)
        const schemeName = `Test Scheme ${Date.now()}`;
        await page.fill('input[placeholder="e.g. Transaction Threshold Credit"]', schemeName);

        // Select Bonus Type dropdown - REQUEST_MONEY
        await page.locator('form select').first().selectOption('REQUEST_MONEY');

        // Commission Type - Fixed Amount
        await page.locator('select').filter({ hasText: 'Fixed Amount' }).selectOption('FIXED');

        // Credit Amount (only visible for non-tiered Fixed/Percentage)
        await page.getByPlaceholder('e.g. 10').fill('50');

        // Select Currency via SearchableSelect (clicks the input then the dropdown option)
        await page.getByRole('textbox', { name: /currency/i }).focus();
        await page.getByRole('textbox', { name: /currency/i }).fill('USD');
        await page.getByText('USD - US Dollar').click();

        const today = new Date().toISOString().split('T')[0];
        
        let tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrow = tomorrowDate.toISOString().split('T')[0];

        const dateInputs = await page.locator('input[type="date"]');
        await dateInputs.nth(0).fill(today);
        await dateInputs.nth(1).fill(tomorrow);

        await page.getByRole('button', { name: 'Create Scheme' }).click();
    });

    test('Navigate and Adjust Credit Ledger', async ({ page }) => {
        await page.goto('/growth/credit-ledger');

        await expect(page.getByText('User Credit Ledger')).toBeVisible({ timeout: 15000 });

        // Get the first Ref or Notes instead of specific "#9988" to open modal
        // Find a row and click it to trigger the audit modal
        const firstRowNote = page.locator('table.data-table tbody tr').first().locator('td').nth(5);
        await expect(firstRowNote).toBeVisible({ timeout: 10000 });
        await firstRowNote.click();

        // Verify Modal content
        await expect(page.getByText('Transaction Details')).toBeVisible();
        // Use getByRole to avoid strict mode violation with duplicate text
        await expect(page.getByRole('heading', { name: '📜 Audit History' })).toBeVisible();

        // Close Modal
        await page.getByRole('button', { name: 'Close' }).click();
        await expect(page.getByText('Transaction Details')).not.toBeVisible();
    });

});
