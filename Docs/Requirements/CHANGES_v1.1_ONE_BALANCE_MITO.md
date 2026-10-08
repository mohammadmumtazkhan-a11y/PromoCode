# Change Note v1.1 — One Customer Balance (Mito Money Admin)

**Applies to:** `REFERRAL_MODULE_SPEC_MITO_ADMIN.md` (v1.0 → v1.1) and `BONUS_MODULE_SPEC_MITO_ADMIN.md` (v1.0 → v1.1).
**Not affected:** `PROMO_MODULE_SPEC_MITO_ADMIN.md` (promo codes are a fee discount, not credit).
**Decision (08/10/2026):** the customer has **one bonus credit balance** per currency. Referral rewards, bonus-scheme rewards and manual/goodwill credits all go into it, are spent together, and every credit records **how it was earned**.

If you have already read the v1.0 specs, read only this note. Everything not listed here is unchanged. The full v1.1 specs are the source of truth if anything here is unclear.

---

## A. Bonus module (`BONUS_MODULE_SPEC_MITO_ADMIN.md`)

### A1. Ownership (§1.1, §1.2)
- The bonus module owns the **single customer wallet** (`credit_ledger`) for **all sources**: bonus schemes, referrals and manual credits.
- The wallet covers every source: balance, breakdown by source, apply, release, expiry, expiry reminders and manual adjustments.

### A2. New public wallet functions (§1.3, added to the "Public functions" table)
| Function | Used by |
|---|---|
| `issueCredit({ customerId, amount, currency, validityDays, creditSource, creditSourceDetail, referralId?, ruleId?, schemeId?, referenceId, notes, actor })` → `{ creditId }` | Referral module (`creditSource: 'REFERRAL'`). Idempotent on `referenceId`. Settles clawback debt like any new credit. |
| `voidCredit(creditId, { reason, notes, eventId, clawback })` → `{ voided, spent }` | Referral module on reversal (`reason: 'REFERRAL_REVERSAL'`, `clawback: false`) |
| `creditSummary({ referralIds?, schemeIds? })` → per currency `{ issued, used, returned, expired, voided }` | Referral performance report |

§1.4: "Referral rewards" is no longer out of scope. Only *deciding* referral rewards is out of scope; the referral module calls `issueCredit`/`voidCredit`.

### A3. New decision D13 (§2.3)
**One balance.** All credit, whatever its source, is one balance per currency and is spent in D9 order (soonest expiry first) regardless of source. Every credit keeps its source.

### A4. New §3.11 Source tracking (after §3.10)
- **BS-80** Every `EARNED` row has `credit_source` and `credit_source_detail`:

| How it was earned | `credit_source` | `credit_source_detail` | Links | Customer label |
|---|---|---|---|---|
| Loyalty scheme | `SCHEME` | `LOYALTY_CREDIT` | `scheme_id` | `Loyalty bonus – <scheme name>` |
| Large transfer scheme | `SCHEME` | `TRANSACTION_THRESHOLD_CREDIT` | `scheme_id` | `Transfer bonus – <scheme name>` |
| Request Money scheme | `SCHEME` | `REQUEST_MONEY` | `scheme_id` | `Request money bonus – <scheme name>` |
| Referral, as referrer | `REFERRAL` | `REFERRER` | `referral_id`, `referral_rule_id` | `Referral bonus – <friend masked name>` |
| Referral, as new customer | `REFERRAL` | `REFEREE` | `referral_id`, `referral_rule_id` | `Welcome bonus – invited by <masked name>` |
| Manual grant | `MANUAL` | `GOODWILL` / `LOYALTY` / `CORRECTION` / `MANUAL_ADJUSTMENT` | `admin_user` | `Goodwill credit from Rhemito` |

- **BS-81** Credit returned after a cancelled/failed/refunded transfer (`BONUS_RETURNED`) keeps the source of the credit it came from: one returned row per original credit used, with `returned_from_credit_id`.
- **BS-82** Negative rows (APPLIED, EXPIRED, VOIDED) always carry `source_credit_id`, so used, expired and removed amounts are known per source.
- **BS-83** Customer source groups: `REFERRAL` → **Referrals**, `SCHEME` → **Bonus offers**, `MANUAL` → **From Rhemito**.
- **BS-84** Breakdown per currency and source group: `earned` (Σ EARNED excl. returned), `used` (Σ|APPLIED| − Σ returned), `expired`, `removed` (voided), `available`. The groups add up exactly to the currency totals.
- **BS-85** Clawback debt and settlement rows are not a source; they reduce the credits they are taken from (shown as `removed`).

> **Naming:** the existing admin-ledger field `source_type` (`BONUS` / `PROMO` row kind) is **unchanged**. The new fields are `credit_source*`. Do not confuse the two.

### A5. Expiry job (BS-65)
The bonus module's daily job is now the **only** credit-expiry job, for every source. Remove the credit-expiry part of `referral.js runJobs` in the same PR. Keep the "skip if already EXPIRED" check so a run of the old job during deployment does no harm.

### A6. Data model (§4)
- `credit_ledger`: **add** `credit_source TEXT`, `credit_source_detail TEXT`, `returned_from_credit_id TEXT`; index `(user_id, currency, credit_source)`.
- Backfill `bonus_v1` additionally tags every existing EARNED row:
  - `REFERRAL_REWARD` → `REFERRAL` + `REFERRER` (reference ends `:referrer`), otherwise `REFEREE`.
  - `SCHEME_BONUS` → `SCHEME` + the scheme's `bonus_type`.
  - Manual reason codes → `MANUAL` + the reason.
  - `BONUS_RETURNED` → the source of the credit its matching APPLIED row came from. If unknown, use `MANUAL`/`CORRECTION` and log it.
  - `LOYALTY` seed rows → `MANUAL`/`LOYALTY`.
  - Log counts per source.

### A7. Admin ledger UI (§5.5)
- Filters: add **Source** (`All`, `Referrals`, `Bonus offers`, `From Rhemito`).
- Table: add a **Source** column (group + detail, e.g. `Referrals · Referrer`).
- KPI: **Outstanding bonus** shows a per-source split.
- When one customer is selected: a **Balance by source** strip (BS-84) above the table.

### A8. Feed (§8)
- `BONUS_EARNED` payload adds `credit_source`, `credit_source_detail`, `credit_source_label`.
- `BONUS_USED`, `BONUS_RETURNED`, `BONUS_EXPIRING` and `BONUS_EXPIRED` cover the whole balance (every source); payloads add `by_source: [{ credit_source, amount }]`.
- `BONUS_EARNED` and `BONUS_REVERSED` are **not** emitted for `REFERRAL` credits, because the referral feed announces them. This stops duplicate notifications.

### A9. API (§9)
- **API-S3** `GET /api/wallet/:customerId`: same shape, **new fields only**:
  - `by_source: [{ credit_source, label, earned, used, expired, removed, available }]` on each balance;
  - `credit_source`, `credit_source_detail`, `credit_source_label` on every `unused`, `credits` and `history` row (negative rows take them from their source credit);
  - optional `?credit_source=REFERRAL|SCHEME|MANUAL` filters the lists, never the balance totals.
- **API-A8** `GET /api/credits/:userId`: new filters `creditSource`, `referralId`; rows add the `credit_source*` fields.

### A10. Must-not-break (§11) and open items (§15)
- **C5:** referral credits stay in `credit_ledger` (one balance). They are issued/voided through `issueCredit`/`voidCredit` once the referral module is refactored. Until then `referral.js` keeps writing them directly and the backfill tags them.
- **C8:** all credits still expire daily, and the bonus module's job is the only expiry job.
- **O3:** closed. Decided one balance, trackable by source.

---

## B. Referral module (`REFERRAL_MODULE_SPEC_MITO_ADMIN.md`)

### B1. What is removed
- The referral module's **own wallet** is gone. Removed:
  - table `referral_credit_ledger` (§4.7);
  - wallet rules BR-50…BR-58 (old content);
  - endpoints **API-S9/S10/S11** (`/api/referral/wallet/...`, `/apply`, `/release`);
  - the admin page **Referral Credit Ledger** (§5.6, route `/referrals/ledger`) and **API-A12** (`/api/referral/ledger`);
  - feed events `CREDIT_USED`, `CREDIT_EXPIRING`, `CREDIT_EXPIRED`;
  - the `Wallet` type in §9.1.
- The §10.1 migration step that **moved** referral rows out of `credit_ledger` is removed. Referral rows **stay** in `credit_ledger` and are tagged by the bonus backfill (A6).
- §10 item 3 is reversed: `GET /api/wallet/:customerId` **keeps** referral credits (one balance) and adds `by_source`.

### B2. New required port `rewardWallet` (§1.3)
| Port | Signature | Default |
|---|---|---|
| `rewardWallet` (**required**) | `issueCredit(...)`, `voidCredit(...)`, `creditSummary(...)` as in A2 | Bonus module's public wallet functions (in-process) |

The module no longer depends on `credit_ledger` directly; it only calls `rewardWallet`. Every other port stays optional.

### B3. Rules changed
- **BR-36** Each credit is issued with `rewardWallet.issueCredit`:
  - currency = referral currency; `validityDays` = BV;
  - `creditSource: 'REFERRAL'`, `creditSourceDetail: 'REFERRER'|'REFEREE'`;
  - `referralId`, `ruleId`, `referenceId: '<referralId>:referrer|referee'`;
  - notes unchanged; the wallet stores reason `REFERRAL_REWARD`.
- **BR-41** Reversal calls `rewardWallet.voidCredit` with reason `REFERRAL_REVERSAL` and `clawback: false`.
- **BR-43** Returning spent credit on a failed or reversed transfer is the bonus module's job.
- **D9:** unchanged meaning, now via `voidCredit` (`clawback: false`).
- **D12:** spending is handled by the bonus wallet.
- **New §3.8 "Referral credits in the customer wallet":**
  - **BR-50** The module never writes ledger rows itself; it only calls `issueCredit` and `voidCredit`.
  - **BR-51** `issueCredit` and the referral status update run in one DB transaction. If issuing fails, the referral stays `PENDING` with reason `Reward could not be issued – will retry`, and the daily job retries it.
  - **BR-52** Spending, returning, expiry, reminders, credit status and the balance belong to the bonus module, for every source.
  - **BR-53** Referral report figures (issued, used, expired, unused) come from `rewardWallet.creditSummary`.
- **BR-65** offer sentence: "referral credit" → **"bonus credit"**, in all three variants.

### B4. Other small changes
- Tracking (§5.4): bonus amounts link to **Growth > Bonus Wallet / Ledger** filtered by referral (`/api/credits/all?creditSource=REFERRAL&referralId=`).
- **API-A13** run-jobs returns `{ referrals_expired, rewards_retried, ending_notifications }`.
- NFR-2: idempotency now covers API-S6 and S8, plus `issueCredit` on `referenceId`.
- §10 item 4 (host wiring):
  - `rewardWallet` → bonus wallet (**required**);
  - `eligibilityGuard` → Bonus Blocks, with strike recording on reversal (recommended);
  - `onSpentCreditReversed` → Bonus Debt (optional, off by default).
- Tests (§13):
  - replace the apply/release/credit-expiry tests with: credits issued through `rewardWallet` with source and links, and idempotent on retry; reversal calls `voidCredit` with clawback off;
  - the migration test now checks that referral credits are still in the wallet with source `REFERRAL`.
- Definition of done: the module's only dependency is the `rewardWallet` port.
