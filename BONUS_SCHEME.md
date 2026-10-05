# Bonus Scheme functionality ("Binus" assumed to mean "Bonus")

This document summarizes how bonus schemes are modeled, managed, and applied in the current codebase.

## Overview

Bonus Schemes define rules for awarding user credits. They are stored in SQLite, managed via REST APIs, edited in the Growth UI, and applied through credit ledger entries. Bonus awards can be fixed, percentage-based, or tiered. Awards are recorded in the credit ledger, and the ledger view merges bonus credits with promo code redemptions.

## Data model

### Table: bonus_schemes

Fields (see `server/server.js`):
- id (INTEGER PK)
- name (TEXT, required)
- bonus_type (TEXT, required)
  - Commented list includes REFERRAL_CREDIT, LOYALTY_CREDIT, TRANSACTION_THRESHOLD_CREDIT, REQUEST_MONEY
  - UI currently offers LOYALTY_CREDIT, TRANSACTION_THRESHOLD_CREDIT, REQUEST_MONEY
- credit_amount (REAL, required for fixed)
- currency (TEXT, default GBP)
- min_transaction_threshold (REAL, default 0)
- min_transactions (INTEGER, default 0)
- time_period_days (INTEGER, default 0)
- commission_type (TEXT: FIXED or PERCENTAGE, default FIXED)
- commission_percentage (REAL, default 0)
- is_tiered (INTEGER 0/1, default 0)
- tiers (TEXT JSON, default [])
  - Each tier: { min, max, value }
- eligibility_rules (TEXT JSON)
- start_date (TEXT, required)
- end_date (TEXT, required)
- status (TEXT, default ACTIVE)
- created_at, updated_at

### Table: credit_ledger

Fields (see `server/server.js`):
- id (TEXT PK)
- user_id (TEXT)
- amount (REAL; positive for EARNED, negative for APPLIED/EXPIRED/VOIDED)
- type (TEXT: EARNED, APPLIED, EXPIRED, VOIDED)
- scheme_id (INTEGER FK to bonus_schemes)
- reference_id (TEXT; transaction id, promo code id, manual id, etc.)
- reason_code, notes, admin_user, admin_user_id, expires_at
- created_at

### Table: user_segments

Used to categorize users for eligibility rules. Managed in the same UI page (Bonus Scheme Manager) under a separate tab.

## Seed data

On first run, the server seeds sample bonus schemes:
- "High Value Threshold Bonus" (TRANSACTION_THRESHOLD_CREDIT)
- "Loyalty Credit (Expired)" (LOYALTY_CREDIT)
- "Request Money Scheme" (REQUEST_MONEY)

It also seeds credit ledger entries, including one for the Request Money scheme (scheme id 3).

## APIs

### Bonus Schemes CRUD

GET `/api/bonus-schemes`
- Returns all schemes ordered by created_at desc.
- Parses JSON fields: eligibility_rules and tiers.
- Converts is_tiered to boolean.

POST `/api/bonus-schemes`
- Creates a new scheme.
- Validations:
  - name, bonus_type, start_date, end_date are required.
  - start_date must be before end_date.
  - For LOYALTY_CREDIT, min_transactions and time_period_days must be > 0.
- status is always set to ACTIVE on create.
- currency defaults to GBP if missing.

PUT `/api/bonus-schemes/:id`
- Updates a scheme.
- Validation: start_date must be before end_date (when both provided).
- status can be updated here.

DELETE `/api/bonus-schemes/:id`
- Deletes the scheme row.

### Credit Ledger and awarding

GET `/api/credits/:userId`
- Returns:
  - balance (sum of credit_ledger amounts)
  - cost_incurred (sum of absolute amounts from returned history)
  - history (merged ledger entries + promo redemptions)
- Filters supported via query params:
  - startDate, endDate, eventType, schemeId
- For schemeId, credit_ledger uses cl.scheme_id = schemeId.
- Promo redemptions are merged only when eventType is empty or APPLIED.
- Promo filter uses promo_code_id match by id or code to avoid id collision.

POST `/api/credits/manual`
- Manual grant/void adjustments.
- Requires user_id, amount, type, reason_code, notes.
- Optional idempotency_key uses reference_id = idem_<key> to prevent duplicates.

POST `/api/credits/award-bonus`
- Awards bonus credit for one scheme and one customer. Used by admins; the same rules run when Rhemito events trigger an award.
- Validates (all enforced on the server, in `server/bonusEngine.js`):
  - scheme exists and is ACTIVE, and today is inside its start and end dates
  - currency: activity in another currency than the scheme's is refused (`CURRENCY_MISMATCH`)
  - minimum amount: threshold and request-money schemes need an amount at or above `min_transaction_threshold` (`BELOW_THRESHOLD`)
  - loyalty: the customer needs `min_transactions` completed transfers inside `time_period_days` (`LOYALTY_NOT_MET`); loyalty is always for existing customers
  - user segments: "All users", "Existing customers" (at least one earlier completed transfer), or a saved segment (signup dates, transaction count or volume, evaluated from Rhemito's completed transfers) (`USER_INELIGIBLE`)
  - one-time rule: `eligibility_rules.oneTimeOnly` defaults to true (`ALREADY_EARNED`)
- Calculation:
  - Tiered: needs the transfer amount (from the event, or `transaction_id`), matches a tier
  - Percentage: needs the transfer amount
  - Fixed: uses credit_amount
- Writes an EARNED entry in the scheme's currency (so the customer can use it as bonus on a transfer), expiring after `eligibility_rules.validityDays` (default 90).

### How and when Rhemito triggers non-referral schemes

Rhemito reports what happened; Mito Admin decides which schemes pay.

| Rhemito event | Call | Schemes evaluated |
|---------------|------|-------------------|
| Send Money transfer completed | `POST /api/referral/transfer-events` with status COMPLETED (the same call that drives referrals). The response lists `bonuses`. | LOYALTY_CREDIT, TRANSACTION_THRESHOLD_CREDIT |
| Money request paid | `POST /api/bonus/events` with `type: MONEY_REQUEST_PAID`, `customer_id` (the requester), `event_id` (request number), `amount`, `currency`. | REQUEST_MONEY |

- Every ACTIVE scheme of the matching type is evaluated. Ineligible schemes come back as `SKIPPED` with a reason; they are not errors.
- Each award is tied to the event (`evt:<scheme>:<event id>`), so a repeated event never pays twice, even when sent at the same time.
- A failure while evaluating bonus schemes never fails the transfer event itself.

### Cancelled, failed and refunded transfers

When `POST /api/referral/transfer-events` reports CANCELLED, FAILED, REFUNDED, RECALLED or CHARGEBACK, Mito Admin (a) releases the promo code use recorded for that transfer (`POST /api/promocodes/release` does the same on its own) and (b) voids the unused part of every scheme bonus the transfer earned (ledger type VOIDED, reason SCHEME_REVERSAL). Repeated events do nothing. Bonus the customer already spent is clawed back as a debt (ledger type CLAWBACK): it never makes the usable balance negative, but the next bonus credits the customer earns are first used to repay it (CLAWBACK_SETTLED). The wallet shows `outstanding_debt` per currency. The same applies to referral rewards. Set `BONUS_CLAWBACK=off` to void only the unused part. A paid money request that is refunded reaches the same reversal: Rhemito handles a `payment.refunded` webhook (request status becomes "refunded") and sends `POST /api/bonus/events` with `type: MONEY_REQUEST_REFUNDED` and the request number as `event_id`.

### Blocking customers who keep losing Mito its bonus

A bonus that is removed because its transfer was cancelled, refunded, recalled or charged back is a loss for Mito, so each such transfer counts as a **strike** against the customer who made it (`server/bonusBlocks.js`). A failed transfer is not the customer's doing and does not count, and neither does a transfer that never earned a bonus.
- After 3 strikes (`BONUS_BLOCK_STRIKES`) the customer is **blocked**: scheme bonuses are refused (`BONUS_BLOCKED`) and referral rewards are held. A held referral becomes "Not eligible" with the reason, and the existing "Approve reward" step pays it once an admin is satisfied.
- The block stores its **reason**, naming every transfer behind it, the outcome, the date and the bonus lost. Admins see it in Growth > Blocked Customers and in a banner in Growth > Bonus Wallet / Ledger when that customer is selected.
- Only a Growth Manager can approve the customer (`POST /api/bonus-blocks/:customerId/lift`, reason of 10 to 250 characters; approver recorded from the access token). Approval clears the block and restarts the strike count at zero.
- The customer is told only: "You're not qualified to get bonus. Please contact support for more information." Mito Admin's wallet response carries `bonus_blocked: true` (never the reason) and Rhemito shows the message on the Dashboard and the Bonus & Discounts page.
- `GET /api/bonus-blocks?status=ACTIVE|LIFTED|ALL` lists blocks; `GET /api/bonus-blocks/:customerId` gives the current block, open strikes and past blocks.
- Blocking stops new bonus being earned. It does not remove bonus the customer already holds, does not affect promo codes, and does not stop manual credits made by an admin.

### Promo codes

Promo codes are validated and redeemed only on Mito Admin (`server/promoEngine.js`). Rhemito holds no codes.
- `POST /api/promocodes/validate`: checks status, dates, global and budget caps, currency, minimum amount, corridor, payment method, personal (targeted) codes, user segment and the per-customer limit, and returns `appliedDiscount` (capped at the fee) and `displayText`.
- `POST /api/promocodes/redeem`: re-checks the code, recomputes the discount and records one redemption per transfer (`transaction_id`). A repeated call for the same transfer returns the same result and counts once.
- Demo codes are only seeded outside production.

### Admin roles

`server/auth.js` protects "Approve reward" (`POST /api/referral/referrals/:id/approve`): the caller must send `Authorization: Bearer <token>` for a user with the GROWTH_MANAGER role. Users are set in the `ADMIN_USERS` environment variable:

`ADMIN_USERS=[{"name":"Aisha Bello","role":"GROWTH_MANAGER","token":"<long random string>"},{"name":"Tunde Ade","role":"ADMIN","token":"<another>"}]`

- **Prototype mode (default):** when `ADMIN_USERS` is not set, there is no sign-in. Every caller acts as "Demo Growth Manager", so the prototype works without logging in and no setting is needed on Render.
- Once `ADMIN_USERS` is set, the token check is on: no token or an unknown token gives 401, and a token without the role gives 403.
- The approver's name is taken from the token.
- `ADMIN_AUTH_DISABLED=true` (local development only) skips the token check even when `ADMIN_USERS` is set. It is ignored when `NODE_ENV=production`.

## UI behavior (Growth -> Bonus Scheme Manager)

Location: `client/src/pages/Growth/BonusSchemeManager.jsx`

- Provides two tabs:
  - Bonus Schemes (create/edit/list)
  - User Segments (create/edit/list)
- Bonus Scheme form:
  - Bonus type selection (loyalty, threshold, request money)
  - Commission type (fixed or percentage)
  - Optional tiered structure with min/max/value tiers
  - Date range required
  - Status field editable in UI (persisted on update only)
  - Eligibility rules limited to user segments (loyalty is forced to existing_customers)
- Table filters:
  - Search by scheme name
  - Filter by type, status, and date range

## Key behaviors and quirks

- Create endpoint always sets status to ACTIVE, even if UI submits a different status.
- award-bonus percentage and tiered modes require transaction_id; otherwise request fails.
- Scheme eligibility rules are enforced server-side (see the award rules above). A saved segment of type "New user" with no count range only checks the signup dates.
- Request Money scheme is a special bonus_type; UI shows a min_transaction_threshold field for it.
- Credit ledger history merges promo redemptions and bonus entries, so filtering by schemeId can match both scheme ids and promo code ids.

## Related tests

- `server/tests/test_tiered_calculation.js` covers tiered bonus calculation.
- `server/tests/test_cost_incurred.js` covers cost_incurred calculation.
- `tests/e2e/tiered_bonus.spec.js` and `tests/e2e/bonus_ledger.spec.js` cover UI flows.
