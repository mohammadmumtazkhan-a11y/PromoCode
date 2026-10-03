const { test, expect } = require('@playwright/test');

// Referral & Bonus admin pages (US-1.1 – US-1.9). Requires the API server on :5000.
const API = 'http://localhost:5000';
const unique = () => `${Date.now()}`.slice(-6);

test.describe('Referral Settings', () => {
    test('uses Bonus wording and shows validation errors', async ({ page }) => {
        await page.goto('/growth/referral-settings');
        await expect(page.getByRole('heading', { name: 'Referral Scheme Management' })).toBeVisible();
        await expect(page.getByText('Who gets a bonus?')).toBeVisible();
        await expect(page.getByText(/Commission/)).toHaveCount(0);

        await page.getByLabel('Rule Name').fill('ab');
        await page.getByRole('button', { name: 'Create Rule' }).click();
        await expect(page.getByText("Rule name must be 3–50 characters and use letters, numbers, spaces, '-' or '&' only.")).toBeVisible();
    });

    test('Referee Only disables the Referrer Bonus and keeps it at 0 when the currency changes', async ({ page }) => {
        await page.goto('/growth/referral-settings');
        await page.getByLabel('Who gets a bonus?').selectOption('REFEREE');
        const referrer = page.locator('#rf-referrer_reward');
        await expect(referrer).toBeDisabled();
        await expect(referrer).toHaveValue('0');
        await page.getByLabel('Send Currency').selectOption('NGN');
        await expect(referrer).toHaveValue('0');
        await expect(page.locator('#rf-referee_reward')).toHaveValue('5000');
    });

    test('creates, deactivates and archives a rule', async ({ page, request }) => {
        // Free up AUD so the test can create a rule for it
        const existing = await (await request.get(`${API}/api/referral-rules`)).json();
        for (const r of existing.data.filter((x) => x.base_currency === 'AUD')) await request.post(`${API}/api/referral-rules/${r.id}/archive`);

        const name = `E2E AUD ${unique()}`;
        await page.goto('/growth/referral-settings');
        await page.getByLabel('Rule Name').fill(name);
        await page.getByLabel('Send Currency').selectOption('AUD');
        await page.locator('#rf-referrer_reward').fill('5');
        await page.locator('#rf-referee_reward').fill('10');
        await page.locator('#rf-min_transaction_threshold').fill('50');
        await page.getByRole('button', { name: 'Create Rule' }).click();
        await expect(page.getByText(`Referral rule '${name}' created.`)).toBeVisible();

        const row = page.getByRole('row', { name: new RegExp(name) });
        await expect(row.getByText('Active')).toBeVisible();
        await row.getByRole('button', { name: `Deactivate ${name}` }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'Deactivate' }).click();
        await expect(page.getByText('Rule deactivated.')).toBeVisible();
        await expect(row.getByText('Inactive')).toBeVisible();

        await row.getByRole('button', { name: 'Archive' }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'Archive' }).click();
        await expect(page.getByText('Rule archived.')).toBeVisible();
        await expect(page.getByRole('row', { name: new RegExp(name) })).toHaveCount(0);
    });
});

test.describe('Referral reporting', () => {
    test('performance and tracking pages load from the sidebar', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('link', { name: 'Referral Performance' }).click();
        await expect(page.getByRole('heading', { name: 'Referral Performance' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Conversion' })).toBeVisible();

        await page.getByRole('link', { name: 'Referral Tracking' }).click();
        await expect(page.getByRole('heading', { name: 'Referral Tracking' })).toBeVisible();
        await expect(page.getByPlaceholder('Name, customer ID, email or referral code')).toBeVisible();
    });

    test('credit ledger shows real customer names and an Amount column', async ({ page }) => {
        await page.goto('/growth/credit-ledger');
        await expect(page.getByRole('columnheader', { name: 'Amount' })).toBeVisible();
        await expect(page.getByText('Olayinka Adebayo').first()).toBeVisible();
        await expect(page.getByText('Totals are shown per currency and never added together.')).toBeVisible();
    });
});
