const { test, expect } = require('@playwright/test');

test.describe('Dashboard Escalation Alert', () => {
    test.beforeEach(async ({ page }) => {
        // Login to support portal
        await page.goto('/support/login');
        await page.fill('input[type="email"]', 'agent@mito.money');
        await page.fill('input[type="password"]', 'support123');
        await page.click('button:has-text("Sign In")');
        
        // Wait for redirect to dashboard
        await expect(page).toHaveURL(/.*\/support\/?$/, { timeout: 10000 });
        await expect(page.locator('h1')).toContainText('Welcome back');
    });

    test('should trigger escalation popup when recent failure rate is high', async ({ page }) => {
        // The dashboard has a 1.5s delay before showing the alert
        // We wait for the popup to appear
        const popup = page.locator('text=Escalation Required!');
        await expect(popup).toBeVisible({ timeout: 10000 });
        
        // Verify the message contains the instructions
        await expect(page.locator('text=Escalate to the management and Technical Support immediately.')).toBeVisible();
        
        // Verify the rate is displayed (4.0% based on MOCK_RATES.recent)
        await expect(page.locator('text=4.0%')).toBeVisible();
        
        // Acknowledge the alert
        await page.click('button:has-text("Acknowledge")');
        
        // Verify the popup is closed
        await expect(popup).not.toBeVisible();
    });
});
