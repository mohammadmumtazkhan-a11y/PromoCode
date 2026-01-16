const { test, expect } = require('@playwright/test');

test.describe('Bonus & Wallet Ledger', () => {

    test('Navigate and Manage Bonus Schemes', async ({ page }) => {
        // Start at root
        await page.goto('/');
        await expect(page).toHaveTitle(/Mito Admin/i);

        // Wait for hydration
        await page.waitForTimeout(1000);

        // Sidebar Navigation
        await page.click('text=Bonus Scheme Manager');

        await expect(page.getByText('Bonus Scheme Manager')).toBeVisible({ timeout: 15000 });

        // Create Scheme - Use REQUEST_MONEY (simpler, no extra fields)
        const schemeName = `Test Scheme ${Date.now()}`;
        await page.fill('input[placeholder="e.g. Transaction Threshold Credit"]', schemeName);

        // Select Bonus Type dropdown - REQUEST_MONEY
        await page.locator('form select').first().selectOption('REQUEST_MONEY');

        // Commission Type - Fixed Amount
        await page.locator('select').filter({ hasText: 'Fixed Amount' }).selectOption('FIXED');

        // Credit Amount (only visible for non-tiered Fixed/Percentage)
        await page.getByPlaceholder('e.g. 10').fill('50');

        // Select Currency
        await page.locator('form select').last().selectOption('USD');

        const today = new Date().toISOString().split('T')[0];
        const dateInputs = await page.locator('input[type="date"]');
        await dateInputs.nth(0).fill(today);
        await dateInputs.nth(1).fill(today);

        await page.getByRole('button', { name: 'Create Scheme' }).click();

        // Verification
        await expect(page.getByText(schemeName)).toBeVisible({ timeout: 10000 });
        // Verify currency display in table
        await expect(page.getByText('USD 50.00')).toBeVisible();
    });

    test('Navigate and Adjust Credit Ledger', async ({ page }) => {
        await page.goto('/');
        // Wait for hydration
        await page.waitForTimeout(1000);

        await page.click('text=Bonus Wallet / Ledger');

        await expect(page.getByText('User Credit Ledger')).toBeVisible({ timeout: 15000 });

        // Verify Dummy Data Note is visible
        await expect(page.getByText('Ref: #9988')).toBeVisible({ timeout: 10000 });

        // Click on the note to open Audit Modal
        await page.getByText('Ref: #9988').click();

        // Verify Modal content
        await expect(page.getByText('Transaction Details')).toBeVisible();
        // Use getByRole to avoid strict mode violation with duplicate text
        await expect(page.getByRole('heading', { name: '📜 Audit History' })).toBeVisible();
        await expect(page.getByText('Expires')).toBeVisible();

        // Close Modal
        await page.getByRole('button', { name: 'Close' }).click();
        await expect(page.getByText('Transaction Details')).not.toBeVisible();
    });

});
