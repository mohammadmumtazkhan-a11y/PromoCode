const { test, expect } = require('@playwright/test');

// Growth > Bonus Scheme Manager, Bonus Wallet / Ledger (BONUS_MODULE_SPEC_MITO_ADMIN.md §5). Requires the API server on :5000.
const API = 'http://localhost:5000';
const uid = (p) => `${p} ${Date.now().toString(36)}`;
const day = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

test.describe('Bonus Scheme Manager', () => {
    test('AC-5.2.1 shows field errors, the live summary, and creates a scheme (AC-5.2.2)', async ({ page }) => {
        await page.goto('/growth/bonus-schemes');
        await expect(page.getByRole('heading', { name: 'Bonus Scheme Manager' })).toBeVisible();

        await page.locator('#bs-credit_amount').fill('0');
        await page.getByRole('button', { name: 'Create Scheme' }).click();
        await expect(page.getByText('Enter a bonus name.')).toBeVisible();
        await expect(page.getByText('Enter an amount greater than 0.')).toBeVisible();
        await expect(page.getByText('Choose a start date.')).toBeVisible();
        await expect(page.getByText('Please correct the highlighted fields.')).toBeVisible();
        await expect(page.locator('#bs-name')).toBeFocused();

        const name = uid('Big Sender');
        await page.locator('#bs-name').fill(name);
        await page.locator('#bs-type').selectOption('TRANSACTION_THRESHOLD_CREDIT');
        await page.locator('#bs-method').selectOption('PERCENTAGE');
        await page.locator('#bs-commission_percentage').fill('5');
        await page.locator('#bs-max_award').fill('20');
        await page.locator('#bs-min_transaction_threshold').fill('500');
        await page.locator('#bs-validityDays').fill('30');
        await page.getByLabel('Every time they qualify').check();
        await expect(page.getByTestId('scheme-summary')).toHaveText('Customers who send £500.00 or more in one transfer earn 5% of the amount (up to £20.00) as bonus credit, valid for 30 days, every time they qualify.');
        await page.locator('#bs-start_date').fill(day(-1));
        await page.locator('#bs-end_date').fill(day(60));
        await page.getByRole('button', { name: 'Create Scheme' }).click();
        await expect(page.getByText('Bonus scheme created.')).toBeVisible();

        const row = page.getByRole('row').filter({ hasText: name });
        await expect(row).toContainText('5% (max £20.00)');
        await expect(row).toContainText('Min £500.00');
        await expect(row).toContainText('valid 30d · repeat');
        await expect(row).toContainText('Active');
    });

    test('deactivates, shows history and archives with confirmations (§5.3)', async ({ page, request }) => {
        const name = uid('Archive Me');
        const created = await request.post(`${API}/api/bonus-schemes`, { data: { name, bonus_type: 'REQUEST_MONEY', credit_amount: 2, currency: 'GBP', min_transaction_threshold: 0, start_date: day(-1), end_date: day(30) } });
        expect(created.ok()).toBeTruthy();
        await page.goto('/growth/bonus-schemes');
        const row = page.getByRole('row').filter({ hasText: name });
        await row.getByRole('button', { name: 'Deactivate' }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'Deactivate' }).click();
        await expect(page.getByText(`'${name}' deactivated.`)).toBeVisible();
        await expect(row).toContainText('Inactive');

        await row.getByRole('button', { name: 'History' }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toContainText(`History – ${name}`);
        await expect(dialog).toContainText('INACTIVE');
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();

        await row.getByRole('button', { name: 'Archive' }).click();
        await expect(page.getByText('It will stop paying new bonuses. Bonuses already paid are not affected.')).toBeVisible();
        await page.getByRole('dialog').getByRole('button', { name: 'Archive' }).click();
        await expect(page.getByText('Scheme archived.')).toBeVisible();
        await expect(page.getByRole('row').filter({ hasText: name })).toHaveCount(0); // archived schemes are under the Archived filter
        await page.locator('#bf-status').selectOption('Archived');
        await expect(page.getByRole('row').filter({ hasText: name })).toContainText('Archived');
    });

    test('§5.4 segments: validation, preview, and a segment in use cannot be deleted', async ({ page, request }) => {
        const segName = uid('Seg');
        const seg = await (await request.post(`${API}/api/user-segments`, { data: { name: segName, criteria: { type: 'TRANSACTION_COUNT', min: 1 } } })).json();
        await request.post(`${API}/api/bonus-schemes`, { data: { name: uid('Uses Seg'), bonus_type: 'REQUEST_MONEY', credit_amount: 1, currency: 'GBP', start_date: day(-1), end_date: day(30), eligibility_rules: { segments: [String(seg.id)] } } });
        await page.goto('/growth/bonus-schemes');
        await page.getByRole('tab', { name: 'User Segments' }).click();
        await page.locator('#sg-name').fill('ab');
        await page.locator('#sg-min').fill('5');
        await page.locator('#sg-max').fill('2');
        await page.getByRole('button', { name: 'Create Segment' }).click();
        await expect(page.getByText('Use 3–60 characters.')).toBeVisible();
        await expect(page.getByText('Max must be at least Min.')).toBeVisible();

        const row = page.getByRole('row').filter({ hasText: segName });
        await row.getByRole('button', { name: 'Preview' }).click();
        await expect(row).toContainText('customers match today.');
        await row.getByRole('button', { name: 'Delete' }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'Delete segment' }).click();
        await expect(page.getByText('This segment is used by 1 scheme(s). Remove it from them first.')).toBeVisible();
    });
});

test.describe('Bonus Wallet / Ledger', () => {
    test('§5.5 manual grant, source column and filter, balance by source', async ({ page }) => {
        const customer = `e2e_${Date.now().toString(36)}`;
        await page.goto('/growth/credit-ledger');
        await expect(page.getByRole('heading', { name: 'User Credit Ledger' })).toBeVisible();

        await page.getByRole('button', { name: 'Manual adjustment' }).click();
        const dialog = page.getByRole('dialog');
        await dialog.locator('#adj-user').fill(customer);
        await dialog.locator('#adj-amount').fill('12.50');
        await dialog.locator('#adj-notes').fill('short');
        await dialog.getByRole('button', { name: 'Grant credit' }).click();
        await expect(dialog.getByText('Enter notes of 10–500 characters.')).toBeVisible();
        await dialog.locator('#adj-notes').fill('Ticket #1234 – compensation for a delayed payout');
        await dialog.getByRole('button', { name: 'Grant credit' }).click();
        await expect(page.getByText(`Credit of £12.50 granted to ${customer}.`)).toBeVisible();

        await page.locator('#ledger-customer').fill(customer);
        await expect(page.getByTestId('balance-by-source')).toContainText('From Rhemito · GBP');
        await expect(page.getByTestId('balance-by-source')).toContainText('£12.50');
        const row = page.locator('table.data-table tbody tr').first();
        await expect(row).toContainText('From Rhemito');
        await expect(row).toContainText('Goodwill');
        await expect(row).toContainText('Unused');

        await page.getByRole('button', { name: 'Manual adjustment' }).click();
        await dialog.locator('#adj-type').selectOption('VOIDED');
        await expect(dialog.getByTestId('adj-available')).toContainText('£12.50');
        await dialog.locator('#adj-amount').fill('20');
        await dialog.locator('#adj-notes').fill('Removing an over-grant by mistake');
        await dialog.getByRole('button', { name: 'Remove credit' }).click();
        await expect(dialog.getByText('You can remove at most £12.50.')).toBeVisible();
        await dialog.locator('#adj-amount').fill('2.50');
        await dialog.getByRole('button', { name: 'Remove credit' }).click();
        await expect(page.getByText(`£2.50 removed from ${customer}.`)).toBeVisible();
        await expect(page.getByTestId('balance-by-source')).toContainText('£10.00');

        await page.locator('#lf-source').selectOption('REFERRAL');
        await expect(page.getByText('No history found for these filters')).toBeVisible();
    });
});
