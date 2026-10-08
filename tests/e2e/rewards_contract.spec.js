const { test, expect } = require('@playwright/test');

// Rewards contract (admin UI). Companion to server/tests/contracts/*: only rules that are visible in the admin panel and
// not already covered by promo_admin, bonus_admin, bonus_ledger, referral_admin or tiered_bonus.
//   RC-UI-01  Referral Settings: "Who gets a bonus?" has exactly REFERRER / REFEREE / BOTH and each shows the right required fields
//   RC-UI-02  Referral Settings: the form blocks saving a rule that pays someone no amount, and never sends an amount for the unpaid side
//   RC-UI-03  Referral Tracking: a paid reward links to the Credit Ledger already filtered to REFERRAL and that referral
//   RC-UI-04  Credit Ledger: every credit shows its source label (Referrals / Bonus offers / From Rhemito) and detail
// Requires the API server on :5000 (see referral_admin.spec.js). If you change a rule here, change the matching server contract too.
const API = 'http://localhost:5000';
const unique = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

test.describe('Rewards contract: Referral Settings form', () => {
    test('RC-UI-01 reward type offers exactly Referrer / Referee / Both and each requires only the side it pays', async ({ page }) => {
        // WHY: the choice decides who is paid (server contract REFERRAL-03). The form must make the unpaid side impossible to fill in.
        await page.goto('/growth/referral-settings');
        const type = page.getByLabel('Who gets a bonus?');
        const options = await type.locator('option').evaluateAll((els) => els.map((o) => [o.value, o.textContent.trim()]));
        expect(options).toEqual([
            ['BOTH', 'Both Parties (Double-Sided)'],
            ['REFERRER', 'Referrer Only'],
            ['REFEREE', 'Referee (New User) Only'],
        ]);
        const referrer = page.locator('#rf-referrer_reward');
        const referee = page.locator('#rf-referee_reward');
        const asterisk = (id) => page.locator(`label[for="${id}"] .rf-req`);

        // Both: both amounts are required and editable
        await expect(type).toHaveValue('BOTH');
        await expect(referrer).toBeEnabled();
        await expect(referee).toBeEnabled();
        await expect(asterisk('rf-referrer_reward')).toHaveCount(1);
        await expect(asterisk('rf-referee_reward')).toHaveCount(1);

        // Referrer only: the referee amount is locked at 0 and not required
        await type.selectOption('REFERRER');
        await expect(referee).toBeDisabled();
        await expect(referee).toHaveValue('0');
        await expect(referrer).toBeEnabled();
        await expect(asterisk('rf-referee_reward')).toHaveCount(0);
        await expect(asterisk('rf-referrer_reward')).toHaveCount(1);
        await expect(page.getByText('Not used for Referrer Only rules.')).toBeVisible();

        // Referee only: the referrer amount is locked at 0 and not required
        await type.selectOption('REFEREE');
        await expect(referrer).toBeDisabled();
        await expect(referrer).toHaveValue('0');
        await expect(referee).toBeEnabled();
        await expect(asterisk('rf-referrer_reward')).toHaveCount(0);
        await expect(page.getByText('Not used for Referee Only rules.')).toBeVisible();

        // Back to Both: a locked 0 is replaced by a usable suggested amount, never left at 0
        await type.selectOption('BOTH');
        await expect(referrer).toBeEnabled();
        await expect(referee).toBeEnabled();
        expect(Number(await referrer.inputValue())).toBeGreaterThan(0);
        expect(Number(await referee.inputValue())).toBeGreaterThan(0);
    });

    test('RC-UI-02 the form refuses a rule whose paid side has no amount, and sends 0 for the unpaid side', async ({ page }) => {
        // WHY: an inconsistent rule would promise a reward nobody can fund, or fund the party the rule says should not be paid.
        const posts = [];
        await page.route('**/api/referral-rules', async (route) => {
            if (route.request().method() !== 'POST') return route.continue();
            posts.push(route.request().postDataJSON());
            // Answer as the server would for a valid rule, so no rule is really created in the shared database
            return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, id: 999999, data: {}, notification: null }) });
        });
        await page.goto('/growth/referral-settings');
        await page.getByLabel('Rule Name').fill(`Contract Form ${unique()}`);
        await page.getByLabel('Send Currency').selectOption('GBP');
        await page.getByLabel('Receive Currency').selectOption('KES');

        // Both parties, but the referee amount is 0
        await page.locator('#rf-referee_reward').fill('0');
        await page.getByRole('button', { name: 'Create Rule' }).click();
        await expect(page.locator('#rf-referee_reward-error')).toHaveText(/Enter an amount greater than 0/);
        await expect(page.locator('#rf-referee_reward')).toHaveAttribute('aria-invalid', 'true');

        // Referrer only, but the referrer amount is blank
        await page.getByLabel('Who gets a bonus?').selectOption('REFERRER');
        await page.locator('#rf-referrer_reward').fill('');
        await page.getByRole('button', { name: 'Create Rule' }).click();
        await expect(page.locator('#rf-referrer_reward-error')).toHaveText(/Enter an amount greater than 0/);
        await expect(page.locator('#rf-referee_reward-error')).toHaveCount(0); // the unpaid side is never validated or required
        expect(posts).toHaveLength(0); // nothing reached the server

        // Fix it: the request carries the paid amount and exactly 0 for the unpaid side
        await page.locator('#rf-referrer_reward').fill('7');
        await page.getByRole('button', { name: 'Create Rule' }).click();
        await expect.poll(() => posts.length).toBe(1);
        expect(posts[0]).toMatchObject({ reward_type: 'REFERRER', base_currency: 'GBP', receive_currency: 'KES' });
        expect(Number(posts[0].referrer_reward)).toBe(7);
        expect(Number(posts[0].referee_reward)).toBe(0);
    });
});

// A rewarded referral and its credits, created through the real APIs (a free corridor so the shared database is not disturbed)
async function rewardedReferral(request) {
    const u = unique();
    const existing = await (await request.get(`${API}/api/referral-rules`)).json();
    for (const r of existing.data.filter((x) => x.base_currency === 'ZAR' && x.receive_currency === 'GHS')) await request.post(`${API}/api/referral-rules/${r.id}/archive`);
    const rule = await request.post(`${API}/api/referral-rules`, { data: { name: `E2E Contract ${u}`, reward_type: 'BOTH', base_currency: 'ZAR', receive_currency: 'GHS', referrer_reward: 5, referee_reward: 10, min_transaction_threshold: 50, notify: false } });
    expect(rule.status()).toBe(201);
    const referrerId = `e2e_ref_${u}`;
    const refereeId = `e2e_new_${u}`;
    const a = await (await request.post(`${API}/api/referral/customers`, { data: { id: referrerId, first_name: 'Tola', last_name: 'Bello', email: `${referrerId}@example.com`, phone: `+4478${u.replace(/\D/g, '').padEnd(7, '1').slice(0, 7)}`, send_currency: 'ZAR', kyc_status: 'PASSED', device_id: `dev-${referrerId}` } })).json();
    const reg = await (await request.post(`${API}/api/referral/referrals`, { data: { code: a.data.referral_code, referee: { id: refereeId, first_name: 'Chidi', last_name: 'Eze', email: `${refereeId}@example.com`, phone: `+4479${u.replace(/\D/g, '').padEnd(7, '2').slice(0, 7)}`, send_currency: 'ZAR', receive_currency: 'GHS', kyc_status: 'PASSED', device_id: `dev-${refereeId}` } } })).json();
    const transfer = { transfer_id: `e2e_tx_${u}`, customer_id: refereeId, amount: 200, currency: 'ZAR', receive_currency: 'GHS' };
    await request.post(`${API}/api/referral/transfer-events`, { data: { ...transfer, status: 'PAID' } });
    const done = await (await request.post(`${API}/api/referral/transfer-events`, { data: { ...transfer, status: 'COMPLETED' } })).json();
    expect(done.referral.status).toBe('REWARDED');
    return { referralId: reg.data.id, referrerId, refereeId };
}

test.describe('Rewards contract: referral rewards in the Credit Ledger', () => {
    test.describe.configure({ mode: 'serial' }); // both tests use the ZAR → GHS corridor
    test('RC-UI-03 a paid reward in Referral Tracking opens the Credit Ledger filtered to REFERRAL and that referral', async ({ page, request }) => {
        // WHY: finance traces every referral reward to its wallet credit. The link must carry customer, source and referral id.
        const { referralId, referrerId, refereeId } = await rewardedReferral(request);
        await page.goto(`/growth/referral-tracking?q=${referralId}`);
        const row = page.getByRole('row').filter({ hasText: referralId });
        await expect(row).toHaveCount(1);
        await expect(row).toContainText('Rewarded');

        await row.locator('button.rf-link').first().click(); // the Referrer bonus amount
        await expect(page).toHaveURL(/\/growth\/credit-ledger\?/);
        const url = new URL(page.url());
        expect(url.searchParams.get('creditSource')).toBe('REFERRAL');
        expect(url.searchParams.get('referralId')).toBe(referralId);
        expect(url.searchParams.get('customerId')).toBe(referrerId);

        await expect(page.locator('#lf-source')).toHaveValue('REFERRAL');
        await expect(page.locator('#ledger-customer')).toHaveValue(referrerId);
        const rows = page.locator('table.data-table tbody tr');
        await expect(rows.first()).toContainText('Referrals');
        await expect(rows.first()).toContainText('Referrer');
        await expect(rows.first()).toContainText(referralId);
        const texts = await rows.allInnerTexts();
        for (const t of texts) expect(t).not.toContain('Bonus offers'); // only this source, only this referral
        expect(texts.join('\n')).not.toContain(refereeId);
    });

    test('RC-UI-04 every credit in the ledger carries its source label and detail (Referrals, Bonus offers, From Rhemito)', async ({ page, request }) => {
        // WHY: one balance, three tagged sources (server contract INDEP-01). An untagged row means cost that cannot be attributed.
        const u = unique();
        const customer = `e2e_src_${u}`;
        const { refereeId } = await rewardedReferral(request); // a REFERRAL credit for the referee
        await request.post(`${API}/api/credits/manual`, { data: { user_id: customer, amount: 3, type: 'EARNED', reason_code: 'GOODWILL', notes: 'Contract test goodwill credit', currency: 'GBP' } });
        // A SCHEME credit, awarded manually to this customer so no transfer event is needed
        const schemeRes = await request.post(`${API}/api/bonus-schemes`, { data: { name: `E2E Source ${u}`, bonus_type: 'TRANSACTION_THRESHOLD_CREDIT', credit_amount: 4, currency: 'GBP', min_transaction_threshold: 0, eligibility_rules: { oneTimeOnly: true }, start_date: '2024-01-01', end_date: '2099-12-31' } });
        const schemeId = (await schemeRes.json()).id;
        try {
            const awarded = await request.post(`${API}/api/credits/award-bonus`, { data: { user_id: customer, scheme_id: schemeId, amount: 10, currency: 'GBP' } });
            expect(awarded.status()).toBe(200);
        } finally {
            await request.patch(`${API}/api/bonus-schemes/${schemeId}/status`, { data: { status: 'INACTIVE' } });
        }

        await page.goto(`/growth/credit-ledger?customerId=${customer}`);
        const rows = page.locator('table.data-table tbody tr');
        await expect(rows).toHaveCount(2);
        const text = (await rows.allInnerTexts()).join('\n');
        expect(text).toContain('From Rhemito');
        expect(text).toContain('Goodwill');
        expect(text).toContain('Bonus offers');
        expect(text).toContain('Large transfer');
        await expect(page.getByTestId('balance-by-source')).toContainText('Bonus offers · GBP');
        await expect(page.getByTestId('balance-by-source')).toContainText('From Rhemito · GBP');

        // The referral credit of the referee is tagged too
        await page.goto(`/growth/credit-ledger?customerId=${refereeId}`);
        const refRow = page.locator('table.data-table tbody tr').first();
        await expect(refRow).toContainText('Referrals');
        await expect(refRow).toContainText('Referee');
        await expect(page.getByTestId('balance-by-source')).toContainText('Referrals · ZAR');
    });
});
