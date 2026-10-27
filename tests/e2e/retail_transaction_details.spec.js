const { test, expect } = require('@playwright/test');

test.describe('Retail Transaction Details Layout', () => {
    test('renders standard transaction details layout on retail submission route', async ({ page }) => {
        // Navigate to Retail Submission Details
        await page.goto('/financials/retail-transactions/TXN-90840');

        // 1. Verify Breadcrumb and Title
        await expect(page.locator('h1')).toContainText('Retail Submission Details');
        await expect(page.getByRole('link', { name: 'Retail-transactions' })).toBeVisible();

        // 2. Verify Download details button is present and visible
        await expect(page.getByRole('button', { name: /Download details/i })).toBeVisible();

        // 3. Verify Summary Card has the 13 standard field labels
        const summaryCard = page.locator('.staging-summary-card');
        await expect(summaryCard).toBeVisible();
        await expect(summaryCard.getByText('Summary').first()).toBeVisible();

        const expected13FieldLabels = [
            'Date',
            'Reference',
            'Summary',
            'Send',
            'Receive',
            'Rate',
            'Total paid',
            'Discount received',
            'Commission / charges',
            'Payment method',
            'Channel',
            'Application / Route',
            'Payment reference',
        ];

        for (const label of expected13FieldLabels) {
            await expect(summaryCard.getByText(label, { exact: true }).first()).toBeVisible();
        }

        // 4. Verify 4 Compliance Checkboxes
        const expectedComplianceLabels = ['Verification', 'KYC', 'Thresholds', 'Card postcode'];
        for (const label of expectedComplianceLabels) {
            await expect(summaryCard.getByText(label, { exact: true })).toBeVisible();
        }

        // 5. Verify All 7 Tabs are present
        const tabsContainer = page.locator('.staging-underline-tabs');
        await expect(tabsContainer.getByRole('button', { name: 'Details' })).toBeVisible();
        await expect(tabsContainer.getByRole('button', { name: 'Actions' })).toBeVisible();
        await expect(tabsContainer.getByRole('button', { name: 'Trail & comments' })).toBeVisible();
        await expect(tabsContainer.getByRole('button', { name: 'Edit' })).toBeVisible();
        await expect(tabsContainer.getByRole('button', { name: 'Items' })).toBeVisible();
        await expect(tabsContainer.getByRole('button', { name: 'KYC' })).toBeVisible();
        await expect(tabsContainer.getByRole('button', { name: 'Help tickets' })).toBeVisible();

        // 6. Verify 6 Stacked Detail Cards in Details tab
        const expectedDetailCards = [
            'Overview',
            'Account',
            'Sender',
            'Beneficiary',
            'Service',
            'Cross rates',
        ];

        for (const cardTitle of expectedDetailCards) {
            await expect(page.getByRole('heading', { name: cardTitle })).toBeVisible();
        }

        // 7. Verify Back button points to Retail Transactions
        const backBtn = page.locator('button[title="Back to Retail Submissions"]');
        await expect(backBtn).toBeVisible();
    });
});
