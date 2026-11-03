const { test, expect } = require('@playwright/test');

test('Global End-to-End Flow', async ({ page }) => {
    // 1. Visit the Dashboard
    await page.goto('/');
    await expect(page).toHaveTitle(/Mito/i);
    await expect(page.getByRole('heading', { name: 'Balances' })).toBeVisible();

    // 2. Navigate to Promo Codes
    await page.goto('/financials/promocodes');
    await expect(page).toHaveURL(/.*\/financials\/promocodes/);

    // 3. Check for API response data on Promo Codes page
    await expect(page.getByText('SAVE20')).toBeVisible({ timeout: 10000 });
});
