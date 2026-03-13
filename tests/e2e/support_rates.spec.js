const { test, expect } = require('@playwright/test');

test.describe('Support Rates Page', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the login page first
        await page.goto('/support/login');
        
        // Perform login
        await page.locator('#support-email').fill('agent@mito.money');
        await page.locator('#support-password').fill('support123');
        await page.locator('#support-login-btn').click();
        
        // Wait for redirect to dashboard
        await expect(page).toHaveURL(/.*\/support\/?$/, { timeout: 10000 });
        await expect(page.locator('h1')).toContainText('Welcome back');
        
        // Navigate to Rates page
        await page.goto('/support/rates');
        await page.waitForLoadState('networkidle');
    });

    test('should verify table columns are correctly renamed and updated', async ({ page }) => {
        // Verify header "Rates" is present
        const ratesHeader = page.locator('th').filter({ hasText: /^Rates$/ });
        await expect(ratesHeader).toBeVisible();

        // Verify new headers are present
        await expect(page.locator('th:has-text("Send Country")')).toBeVisible();
        await expect(page.locator('th:has-text("Receive Country")')).toBeVisible();
        
        // Verify default affiliate is Rhemito and results are filtered
        const affiliateInput = page.locator('input[placeholder="Search Affiliate..."]');
        await expect(affiliateInput).toHaveValue('Rhemito');
        
        // Verify table content for the first row (Rhemito, EUR-SGD, ALL, ALL)
        const firstRow = page.locator('tbody tr').first();
        await expect(firstRow).toContainText('1246');
        await expect(firstRow).toContainText('EUR - SGD');
        await expect(firstRow).toContainText('ALL'); // Send
        await expect(firstRow).toContainText('ALL'); // Receive
        await expect(firstRow).toContainText('1.0000 / 1.3900');
        
        // Verify affiliate search works - search for BasketMouth
        await affiliateInput.fill('BasketMouth');
        await expect(page.locator('tbody tr')).toHaveCount(1);
        await expect(page.locator('tbody tr')).toContainText('1203'); // ID for BasketMouth row
        await expect(page.locator('tbody tr')).toContainText('Nigeria');
        await expect(page.locator('tbody tr')).toContainText('ALL');
    });
});
