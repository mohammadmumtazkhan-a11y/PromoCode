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
- Awards bonus credit based on a scheme and optional transaction id.
- Validates:
  - scheme exists and is ACTIVE
  - scheme end_date has not passed (string date compare against today)
  - one-time rule: eligibility_rules.oneTimeOnly defaults to true
- Calculation:
  - Tiered: requires transaction_id, matches transaction amount to tier
  - Percentage: requires transaction_id, uses commission_percentage
  - Fixed: uses credit_amount
- Writes an EARNED entry with expires_at = today + 90 days.

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
- Scheme eligibility rules are not fully enforced server-side except for the one-time rule.
- Request Money scheme is a special bonus_type; UI shows a min_transaction_threshold field for it.
- Credit ledger history merges promo redemptions and bonus entries, so filtering by schemeId can match both scheme ids and promo code ids.

## Related tests

- `server/tests/test_tiered_calculation.js` covers tiered bonus calculation.
- `server/tests/test_cost_incurred.js` covers cost_incurred calculation.
- `tests/e2e/tiered_bonus.spec.js` and `tests/e2e/bonus_ledger.spec.js` cover UI flows.
