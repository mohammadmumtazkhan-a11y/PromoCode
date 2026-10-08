const { test, expect } = require('@playwright/test');

// Financials > Promo Codes (PROMO_MODULE_SPEC_MITO_ADMIN.md §5). Requires the API server on :5000.
const API = 'http://localhost:5000';
const uid = () => `E2E${Date.now().toString(36).toUpperCase()}`.slice(0, 14);
const inDays = (d) => new Date(Date.now() + d * 86400000).toISOString();

async function createViaApi(request, over = {}) {
    const code = over.code || uid();
    const res = await request.post(`${API}/api/promocodes`, { data: { code, type: 'Fixed', value: 2, currency: 'GBP', start_date: inDays(-1), end_date: inDays(20), ...over } });
    expect(res.ok()).toBeTruthy();
    return { code, id: (await res.json()).id };
}

test.describe('Promo Codes admin', () => {
    test('AC-5.2.1 shows field errors and the preview line, then creates a code', async ({ page }) => {
        await page.goto('/financials/promocodes');
        await expect(page.getByRole('heading', { name: 'Promo Codes' })).toBeVisible();
        await page.getByRole('button', { name: '+ Create New' }).click();
        await page.getByRole('button', { name: 'Create Promo Code' }).click();
        await expect(page.getByText('Enter a promo code.')).toBeVisible();
        await expect(page.getByText('Choose an end date.')).toBeVisible();
        await expect(page.getByText('Please correct the highlighted fields.')).toBeVisible();

        const code = uid();
        await page.locator('#pf-code').fill(code);
        await page.locator('#pf-type').selectOption('Percentage');
        await page.locator('#pf-value').fill('20');
        await page.locator('#pf-max_discount').fill('5');
        await page.locator('#pf-start_date').fill(inDays(-1).slice(0, 16));
        await page.locator('#pf-end_date').fill(inDays(10).slice(0, 16));
        await expect(page.getByText(/Customers sending GBP get 20% off the fee \(max £5.00\)/)).toBeVisible();
        await page.getByRole('button', { name: 'Create Promo Code' }).click();
        await expect(page.getByText(`Promo code ${code} created.`)).toBeVisible();
        const row = page.getByTestId(`promo-row-${code}`);
        await expect(row).toContainText('20% (max £5.00)');
        await expect(row).toContainText('Active');
    });

    test('AC-5.3.1 disable asks for confirmation; usage and history open', async ({ page, request }) => {
        const { code, id } = await createViaApi(request);
        await request.post(`${API}/api/promocodes/redeem`, { data: { code, transactionId: `T-${code}`, userId: 'E2E-U1', amount: 100, fee: 3, currency: 'GBP', sourceCurrency: 'GBP', destCurrency: 'NGN' } });
        await page.goto(`/financials/promocodes?q=${code}`);
        const row = page.getByTestId(`promo-row-${code}`);
        await expect(row.getByRole('button', { name: 'Edit' })).toHaveCount(0); // used codes cannot be edited
        await row.getByRole('button', { name: 'Usage' }).click();
        await expect(page.getByText(`T-${code}`)).toBeVisible();
        await expect(page.getByText('Redeemed: 1 · Discount given: £2.00')).toBeVisible();
        await page.getByRole('button', { name: 'Close' }).first().click();
        await row.getByRole('button', { name: 'Disable' }).click();
        await expect(page.getByText(`Disable ${code}?`)).toBeVisible();
        await page.getByRole('button', { name: 'Disable' }).last().click();
        await expect(page.getByText(`${code} disabled.`)).toBeVisible();
        await expect(row).toContainText('Disabled');
        await row.getByRole('button', { name: 'History' }).click();
        await expect(page.getByText(`Change history – ${code}`)).toBeVisible();
        expect(id).toBeTruthy();
    });

    test('filters by status through the URL', async ({ page, request }) => {
        const { code } = await createViaApi(request, { start_date: inDays(3), end_date: inDays(9) });
        await page.goto('/financials/promocodes?status=Scheduled');
        await expect(page.getByTestId(`promo-row-${code}`)).toContainText('Scheduled');
    });
});
