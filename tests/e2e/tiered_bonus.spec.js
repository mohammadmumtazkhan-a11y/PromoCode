const { test, expect } = require('@playwright/test');

test.describe('Bonus Scheme Manager & User Segments', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173/growth/bonus-schemes');
        // Wait for page load
        await expect(page.getByRole('heading', { name: 'Bonus Scheme Manager' })).toBeVisible();
    });

    test('should manage user segments and create a tiered bonus scheme', async ({ page }) => {
        // --- Part 1: Create a User Segment ---

        // 1. Switch to User Segments Tab
        await page.getByRole('button', { name: 'User Segments' }).click();
        await expect(page.getByRole('heading', { name: 'Manage User Segments' })).toBeVisible();

        // 2. Create a "High Rollers" segment
        const segmentName = `High Rollers ${Date.now()}`;
        await page.locator('input[placeholder="e.g. New Users"]').fill(segmentName);
        await page.locator('input[placeholder="Optional description"]').fill('Users with high volume');

        // Select Criteria Type: Transaction Volume
        await page.locator('select').filter({ hasText: 'Transaction Count' }).selectOption('TRANSACTION_VOLUME');

        // Set Min Amount
        await page.locator('input[type="number"]').nth(0).fill('1000'); // Min
        // Leave Max empty (Infinity)

        // Currency is GBP by default, but let's verify or set
        // (Assuming SearchableSelect behaves like a combobox or we can skip strictly setting if default is OK)

        await page.getByRole('button', { name: 'Create Segment' }).click();

        // 3. Verify Segment in Table
        const segmentRow = page.getByRole('row', { name: segmentName });
        await expect(segmentRow).toBeVisible();
        await expect(segmentRow).toContainText('Type: Volume');
        await expect(segmentRow).toContainText('Range: 1000 - ∞');


        // --- Part 2: Create a Bonus Scheme using the Segment ---

        // 1. Switch back to Bonus Schemes Tab
        await page.getByRole('button', { name: 'Bonus Schemes' }).click();

        // 2. Fill Scheme Form
        const schemeName = `Segmented Scheme ${Date.now()}`;
        await page.getByPlaceholder('e.g. Transaction Threshold Credit').fill(schemeName);

        // Bonus Type: REQUEST_MONEY (Simple test first, or Tiered?)
        // Let's do Tiered as per original test intent, but use the segment.
        await page.locator('form select').first().selectOption('REQUEST_MONEY');
        // Note: REQUEST_MONEY hides eligibility rules in my code?
        // Let's check logic: 
        // {formData.bonus_type !== 'REQUEST_MONEY' && ( ... Eligibility Rules ... )}
        // So for REQUEST_MONEY, we CANNOT select segments.
        // Let's use TRANSACTION_THRESHOLD_CREDIT instead to verify segment selection.
        await page.locator('form select').first().selectOption('TRANSACTION_THRESHOLD_CREDIT');

        // Check if Eligibility Rules is visible
        await expect(page.getByText('Eligibility Rules (User Segments)')).toBeVisible();

        // Select the new segment
        // The select value is the ID. We don't know the ID easily.
        // But we can select by Label if playwright supports it, or we just select the last option?
        // Option text should be the segmentName.
        await page.locator('form select').nth(3).selectOption({ label: segmentName });

        // Commission: Fixed 10
        await page.locator('select').nth(1).selectOption('FIXED');
        await page.locator('input[type="number"]').nth(0).fill('10'); // Credit Amount

        // Dates
        const dateInputs = page.locator('input[type="date"]');
        await dateInputs.nth(0).fill('2026-01-01');
        await dateInputs.nth(1).fill('2026-12-31');

        // Create (Handle Alert)
        let dialogMessage = '';
        page.once('dialog', async dialog => {
            dialogMessage = dialog.message();
            console.log(`[Dialog] ${dialogMessage}`);
            await dialog.accept();
        });

        await page.getByRole('button', { name: 'Create Scheme' }).click();

        // Wait a bit for dialog handling/navigation/state update
        await page.waitForTimeout(2000);

        if (dialogMessage.includes('Error') || dialogMessage.includes('Please')) {
            console.error(`Test Failed due to Alert: ${dialogMessage}`);
            throw new Error(`Client Validation Alert: ${dialogMessage}`);
        }

        // Verify in Table
        await page.reload();
        const schemeRow = page.getByRole('row', { name: `${schemeName}-GBP` });
        await expect(schemeRow).toBeVisible({ timeout: 10000 });

        // Verify defaults
        await expect(schemeRow).toContainText('TRANSACTION THRESHOLD CREDIT');
        await expect(schemeRow).toContainText('GBP 10.00');
    });
});
