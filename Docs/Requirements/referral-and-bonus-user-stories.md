# Referral & Bonus — User Stories & Acceptance Criteria

**Product:** Mito Money Admin (PromoCode) and Rhemito customer app (Rhemito-UI)
**Version:** 2.0 (As built — reflects the delivered Mito Admin and Rhemito functionality)
**Date:** 03 October 2026
**Author:** Mohammad Mumtaz (Business Analyst)

---

## What Changed in Version 2.0

Version 1.2 described the programme as planned. Version 2.0 describes it **as delivered** and adds what was learned while building and testing it.

| Area | Change | Stories |
|------|--------|---------|
| Self-referral by device | Rhemito now sends an anonymous device ID, so a Referee on the same browser as the Referrer is blocked. Previously only email and phone were matched. | US-4.3 (AC-4.3.1, AC-4.3.6 to AC-4.3.12), D18 |
| Refer & Earn card | The separate "Bonus Credit" tile under the card was removed because the dashboard banner already shows the balance. The card now fills its column so the three dashboard cards finish level. | US-2.1 (AC-2.1.7, AC-2.1.10), D19 |
| Loading and error states | The error state is now a centred message with a **Try again** button, and the loading placeholder fills the card. | US-2.1 (AC-2.1.8, AC-2.1.9) |
| Admin approval | Approving a "Not Eligible" referral is open to any signed-in admin. The "Growth Manager" role is not enforced yet; the admin's name and reason are recorded. | US-4.3 (AC-4.3.5), Section 5 |
| Story index and known limits | Added the index below and Section 5, which lists what is not covered yet. | Section 5 |

## Story Index

| Story | Title | Product |
|-------|-------|---------|
| US-1.1 | Create a Referral Rule | Mito Admin |
| US-1.2 | View Referral Rules | Mito Admin |
| US-1.3 | Edit a Referral Rule | Mito Admin |
| US-1.4 | Activate or Deactivate a Referral Rule | Mito Admin |
| US-1.5 | Archive a Referral Rule | Mito Admin |
| US-1.6 | Track Referrals | Mito Admin |
| US-1.7 | Single Source of Referral Rewards | Mito Admin |
| US-1.8 | Referral Programme Performance per Rule | Mito Admin |
| US-1.9 | Referral Details in the User Credit Ledger | Mito Admin |
| US-2.1 | Refer & Earn Card on the Dashboard | Rhemito – Referrer |
| US-2.2 | Copy and Share the Referral Link | Rhemito – Referrer |
| US-2.3 | Track My Referrals | Rhemito – Referrer |
| US-3.1 | Register Through a Referral Link | Rhemito – Referee |
| US-3.2 | Enter a Referral Code Manually | Rhemito – Referee |
| US-4.1 | Award Bonus on a Qualifying Transfer | System (referral engine, triggered from Rhemito) |
| US-4.2 | Expire Unqualified Referrals | System (referral engine, triggered from Rhemito) |
| US-4.3 | Prevent Ineligible and Fraudulent Referrals | System (referral engine, triggered from Rhemito) |
| US-4.4 | Reverse a Bonus When the Qualifying Transfer Is Reversed | System (referral engine, triggered from Rhemito) |
| US-4.5 | Notify Customers About Referral Rewards | System (referral engine, triggered from Rhemito) |
| US-5.1 | View My Bonuses and Referrals (Bonus & Discounts Page) | Rhemito – Customer |
| US-5.2 | Redeem Bonus as Pay Less | Rhemito – Customer |
| US-5.3 | Redeem Bonus as Send More | Rhemito – Customer |
| US-5.4 | Expire Unused Bonus Credit | Rhemito – Customer |
| US-6.1 | Notify Customers When a New Offer Is Available | Mito Admin and Rhemito |
| US-6.2 | In-App Notifications for Bonus Activity | Mito Admin and Rhemito |

---

## 1. Purpose

Introduce a Referral & Bonus programme to increase registrations and money transfers on Rhemito. Mito Money admins configure one referral rule per send currency. An existing customer (the **Referrer**) shares a unique referral link. A new customer (the **Referee**) registers through that link and completes a qualifying transfer. The Referrer, the Referee or both then earn Bonus Credit, as set in the active rule, which they can redeem on a later transfer as **Pay Less** or **Send More**.

## 2. Glossary

| Term | Meaning |
|------|---------|
| Referrer | Existing Rhemito customer who shares their referral link. |
| Referee | New customer who registers through a referral link or code. |
| Referral Rule | Admin configuration for one send currency: who is rewarded, how much, the Floor and the time limits. |
| Floor (Minimum Transaction Amount) | The minimum send amount a Referee's transfer must reach to qualify. The comparison is inclusive (greater than or equal to). |
| Qualifying Transfer | The Referee's first transfer that reaches the Floor, in the rule's currency, reaches **Completed** status and falls inside the Qualification Window. |
| Qualification Window | The number of days after the Referee's registration within which the Qualifying Transfer must be completed. |
| Bonus Credit | Reward value held in the customer's Bonus wallet in a single currency. It can only be redeemed on transfers in that currency. |
| Bonus Validity | The number of days after it is issued that Bonus Credit can be redeemed before it expires. |
| Pay Less | Redemption option that reduces the Total to Pay by the bonus amount. |
| Send More | Redemption option that adds the bonus amount to the amount the recipient receives. |
| Referral Status | Lifecycle of a referral: **Registered → Pending → Rewarded**, or **Expired** / **Not Eligible** / **Reversed**. |

## 3. Business Decisions & Assumptions

These decisions close the gaps found in the original notes. Each one can be overridden; the affected stories are listed.

| # | Decision | Affects |
|---|----------|---------|
| D1 | The Floor is inclusive: a transfer **equal to** the Floor qualifies. | US-4.1 |
| D2 | Only the Referee's **first** transfer that meets the Floor, inside the Qualification Window, triggers the reward. A referral is rewarded **once only**. Earlier transfers below the Floor do not stop a later one from qualifying. | US-4.1 |
| D3 | The rule is selected by the **Referee's send currency** (from their country of registration). Both Referrer and Referee are credited in that currency. | US-3.1, US-4.1 |
| D4 | The rule's values are **locked (snapshotted) at the Referee's registration**. Later edits or deactivation do not change what was promised to referrals already registered. | US-1.3, US-1.4, US-4.1 |
| D5 | The reward is issued only when the Qualifying Transfer reaches **Completed** status, not when it is created or paid. | US-4.1 |
| D6 | A Referee cannot redeem their own reward on the Qualifying Transfer itself (it does not exist yet); they can use it on the next transfer. | US-4.1, US-5.2 |
| D7 | If a Qualifying Transfer is reversed (refund, recall or chargeback) after the reward is issued, any **unused** reward is voided. Credit already redeemed is not clawed back from the customer. | US-4.4 |
| D8 | Both Referrer and Referee must have passed KYC before a reward is issued. Self-referral and duplicate identities are not rewarded. | US-4.3 |
| D9 | New admin settings per rule: **Qualification Window** (default 30 days), **Bonus Validity** (default 90 days), **Max Rewarded Referrals per Referrer** (blank = unlimited), **Minimum Send Amount to Redeem** (default 0) and optional **Start / End dates**. | US-1.1 |
| D10 | Admin labels change from "Commission" to "Bonus" to avoid confusion with merchant or agent commission. | US-1.1, US-1.2 |
| D11 | Rules are **archived**, not deleted, so past rewards keep their audit trail. | US-1.5 |
| D12 | Referral Settings is the single source of truth for referral rewards. The `REFERRAL_CREDIT` type is removed from the Bonus Scheme Manager. | US-1.7 |
| D13 | All customer-facing amounts and wording (Refer & Earn card, banners, toasts) are driven by the active rule and the customer's real Bonus wallet, never hard-coded. | US-2.1, US-5.1 |
| D14 | Bonus Credit and a Promo Code can be used on the same transfer (current Rhemito behaviour). The bonus is applied after the promo discount. | US-5.2, US-5.3 |
| D15 | If a customer's send currency has no active rule, the Refer & Earn card and referral link are hidden. | US-2.1 |
| D16 | Customers get an in-app (bell) notification when a referral offer for their currency goes live or improves; the admin can opt out per change. Push is sent only if the customer allows promotional push. | US-6.1 |
| D17 | Bonus & Discounts shows Available, Total Earned, Used and Expired separately, per currency, all from the credit ledger. Each earned credit shows Unused / Partly used / Used / Expired / Reversed. | US-5.1 |
| D18 | A random, anonymous **device ID** is created once per browser and sent with every Rhemito request. Rhemito hashes it and passes it to the referral engine. A Referee whose device ID matches the Referrer's is treated as a self-referral. The ID is not a hardware fingerprint, so clearing site data or using another browser creates a new one. | US-4.3 |
| D19 | The Refer & Earn card is the only referral tile on the dashboard. The available balance is shown in the dashboard banner and on Bonus & Discounts, not in a second tile. | US-2.1 |

---
## Epic 1: Referral Rule Management (Mito Admin)

### US-1.1: Create a Referral Rule

**Title:** Create a referral rule for a send currency

**As a** Mito Money admin,
**I want** to create a referral rule for a specific send currency that defines who is rewarded, how much, the Floor and the time limits,
**So that** Rhemito customers sending in that currency are rewarded for bringing in new customers who transfer money.

#### Field Specification

| Field | Type | Mandatory | Validation |
|-------|------|-----------|------------|
| Rule Name | Text | Yes | 3–50 characters; letters, numbers, spaces, hyphens (-) and ampersands (&) only; leading and trailing spaces trimmed; must be unique (case-insensitive) across non-archived rules. |
| Status | Dropdown | Yes | Active / Inactive. Default: Active. |
| Who gets a bonus? | Dropdown | Yes | Both Parties (Double-Sided) / Referrer Only / Referee (New User) Only. Default: Both Parties. |
| Send Currency | Dropdown | Yes | One of the supported send currencies (GBP, USD, EUR, NGN, CAD, AUD, JPY, CNY, INR, ZAR, KES, GHS, AED). Only one non-archived rule is allowed per currency. |
| Referrer Bonus | Decimal | Yes, if Referrer is rewarded | Greater than 0; at most 2 decimal places (0 for JPY); maximum 1,000,000. Disabled and saved as 0 when "Referee (New User) Only" is selected. |
| Referee (New User) Bonus | Decimal | Yes, if Referee is rewarded | Greater than 0; at most 2 decimal places (0 for JPY); maximum 1,000,000. Disabled and saved as 0 when "Referrer Only" is selected. |
| Minimum Transaction Amount (Floor) | Decimal | Yes | Greater than 0; at most 2 decimal places (0 for JPY); maximum 10,000,000. |
| Qualification Window (days) | Integer | Yes | Whole number from 1 to 365. Default: 30. |
| Bonus Validity (days) | Integer | Yes | Whole number from 1 to 730. Default: 90. |
| Max Rewarded Referrals per Referrer | Integer | No | Blank = unlimited; otherwise a whole number from 1 to 10,000. |
| Minimum Send Amount to Redeem | Decimal | No | Blank or 0 = no minimum; otherwise greater than 0, at most 2 decimal places. |
| Start Date | Date | No | Today or a later date. Blank = starts immediately. |
| End Date | Date | No | Must be later than the Start Date (or today, if no Start Date). Blank = no end date. |

#### Acceptance Criteria

**AC-1.1.1: Create a double-sided rule successfully**

```gherkin
Given the admin is on the "Referral Scheme Management" page
And no non-archived rule exists for GBP
When the admin enters "UK Standard Programme" in "Rule Name"
And selects "Active" in "Status"
And selects "Both Parties (Double-Sided)" in "Who gets a bonus?"
And selects "GBP (United Kingdom)" in "Send Currency"
And enters 5 in "Referrer Bonus" and 10 in "Referee (New User) Bonus"
And enters 50 in "Minimum Transaction Amount (Floor)"
And leaves the remaining fields at their defaults
And clicks "Create Rule"
Then the rule shall be saved
And a success toast "Referral rule 'UK Standard Programme' created." shall be displayed
And the rule shall appear at the top of the "Existing Rules" table
And the form shall reset to its default values
```

**AC-1.1.2: Labels use "Bonus" instead of "Commission"**

```gherkin
Given the admin is on the "Referral Scheme Management" page
Then the selector shall be labelled "Who gets a bonus?"
And the amount fields shall be labelled "Referrer Bonus" and "Referee (New User) Bonus"
And the word "Commission" shall not appear anywhere on the page
```

**AC-1.1.3: Referrer Only disables and zeroes the Referee Bonus**

```gherkin
Given the admin is creating a rule
When the admin selects "Referrer Only" in "Who gets a bonus?"
Then the "Referee (New User) Bonus" field shall be disabled and set to 0
And the "Referrer Bonus" field shall be enabled and mandatory
```

**AC-1.1.4: Referee Only disables and zeroes the Referrer Bonus**

```gherkin
Given the admin is creating a rule
When the admin selects "Referee (New User) Only" in "Who gets a bonus?"
Then the "Referrer Bonus" field shall be disabled and set to 0
And the "Referee (New User) Bonus" field shall be enabled and mandatory
```

**AC-1.1.5: Changing currency does not refill a disabled bonus**

```gherkin
Given the admin has selected "Referee (New User) Only"
And the "Referrer Bonus" field shows 0
When the admin changes "Send Currency" from "GBP" to "NGN"
Then the "Referrer Bonus" field shall remain 0 and disabled
And only the enabled bonus field and the Floor may be pre-filled with the NGN suggested defaults
```

**AC-1.1.6: Server enforces zero for the unrewarded party**

```gherkin
Given an API request creates a rule with type "REFEREE" and a Referrer Bonus of 2000
When the server processes the request
Then the server shall save the Referrer Bonus as 0
```

**AC-1.1.7: Currency symbol shown on amount fields**

```gherkin
Given the admin has selected "EUR" in "Send Currency"
Then the bonus fields and the Floor field shall show the "€" prefix
```

**AC-1.1.8: Duplicate rule for the same currency**

```gherkin
Given a non-archived rule named "UK Default" exists for GBP
When the admin tries to create another rule for GBP
Then the rule shall not be saved
And an error toast "A referral rule for GBP already exists ('UK Default'). Edit or archive it first." shall be displayed
```

**AC-1.1.9: Duplicate rule name**

```gherkin
Given a non-archived rule named "UK Default" exists
When the admin enters "uk default" in "Rule Name" and clicks "Create Rule"
Then the rule shall not be saved
And the inline error "A rule with this name already exists." shall be shown under "Rule Name"
```

**AC-1.1.10: Mandatory fields missing**

```gherkin
Given the admin is creating a rule
When the admin leaves "Rule Name" empty and clicks "Create Rule"
Then the rule shall not be saved
And the inline error "Enter a rule name." shall be shown under "Rule Name"
And focus shall move to the first field with an error
```

**AC-1.1.11: Rule name length and characters**

```gherkin
Given the admin is creating a rule
When the admin enters a "Rule Name" of fewer than 3 or more than 50 characters
Or the name contains characters other than letters, numbers, spaces, hyphens or ampersands
Then the inline error "Rule name must be 3–50 characters and use letters, numbers, spaces, '-' or '&' only." shall be shown
```

**AC-1.1.12: Bonus amount validation**

```gherkin
Given the admin is creating a rule where the Referrer is rewarded
When the admin enters 0, a negative number, more than 2 decimal places, or a value above 1,000,000 in "Referrer Bonus"
Then the inline error "Enter an amount greater than 0 with up to 2 decimal places." shall be shown
And the rule shall not be saved
```

**AC-1.1.13: Floor validation**

```gherkin
Given the admin is creating a rule
When the admin enters 0, a negative number or a non-numeric value in "Minimum Transaction Amount (Floor)"
Then the inline error "Enter a minimum transaction amount greater than 0." shall be shown
```

**AC-1.1.14: Bonus larger than the Floor needs confirmation**

```gherkin
Given the admin is creating a rule
When the Referrer Bonus or the Referee Bonus is greater than the Floor
And the admin clicks "Create Rule"
Then a confirmation dialog "The bonus is higher than the minimum transaction amount. Customers could earn more than they send. Do you want to continue?" shall be displayed
And the dialog shall have "Cancel" and "Create anyway" buttons
And the rule shall be saved only if the admin clicks "Create anyway"
```

**AC-1.1.15: Qualification Window and Bonus Validity boundaries**

```gherkin
Given the admin is creating a rule
When the admin enters 0, 366 or a decimal value in "Qualification Window (days)"
Then the inline error "Enter a whole number of days from 1 to 365." shall be shown
When the admin enters 0, 731 or a decimal value in "Bonus Validity (days)"
Then the inline error "Enter a whole number of days from 1 to 730." shall be shown
```

**AC-1.1.16: Date range validation**

```gherkin
Given the admin is creating a rule
When the admin selects an End Date earlier than or equal to the Start Date
Then the inline error "End date must be after the start date." shall be shown
When the admin selects a Start Date in the past
Then the inline error "Start date cannot be in the past." shall be shown
```

**AC-1.1.17: Scheduled rule**

```gherkin
Given the admin creates an Active rule with a Start Date of tomorrow
Then the rule shall show the status "Scheduled" in the "Existing Rules" table
And customers shall not see Refer & Earn for that currency until the Start Date
```

**AC-1.1.18: Prevent double submission**

```gherkin
Given the admin has completed the form
When the admin clicks "Create Rule"
Then the button shall show "Creating..." and be disabled until the server responds
```

**AC-1.1.19: Server error**

```gherkin
Given the server is unavailable
When the admin clicks "Create Rule"
Then the error toast "We couldn't save the rule. Please try again." shall be displayed
And all entered values shall be kept in the form
```

---

### US-1.2: View Referral Rules

**Title:** View all referral rules and their key settings

**As a** Mito Money admin,
**I want** to see all referral rules in one table with their status, type, amounts and limits,
**So that** I can quickly understand which referral programmes are live in each currency.

#### Acceptance Criteria

**AC-1.2.1: Table columns**

```gherkin
Given at least one referral rule exists
When the admin opens the "Referral Scheme Management" page
Then the "Existing Rules" table shall show the columns: Rule Name, Status, Type, Referrer Bonus, Referee Bonus, Min Amount (Floor), Currency, Qualification Window, Bonus Validity, Dates, Actions
And amounts shall be formatted with the currency symbol and 2 decimal places (0 for JPY)
```

**AC-1.2.2: Unrewarded party shown as a dash**

```gherkin
Given a rule of type "Referee Only"
Then the Referrer Bonus column shall show "—" in grey
And it shall not show any amount
```

**AC-1.2.3: Status values**

```gherkin
Given rules exist in different states
Then each rule shall show one of: "Active", "Inactive", "Scheduled" (Active with a future Start Date) or "Ended" (End Date has passed)
```

**AC-1.2.4: Archived rules hidden by default**

```gherkin
Given archived rules exist
Then they shall not appear in the table by default
When the admin turns on "Show archived"
Then archived rules shall appear as read-only with an "Archived" label
```

**AC-1.2.5: Empty state**

```gherkin
Given no non-archived referral rules exist
Then the table shall show "No referral rules yet. Create your first rule above."
```

**AC-1.2.6: Loading and error states**

```gherkin
Given the rules are loading
Then a loading indicator shall be shown in the table
Given the rules fail to load
Then the message "We couldn't load referral rules. Please refresh the page." shall be shown with a "Retry" button
```

---

### US-1.3: Edit a Referral Rule

**Title:** Edit an existing referral rule

**As a** Mito Money admin,
**I want** to change the settings of an existing referral rule,
**So that** I can adjust the programme without affecting rewards already promised to registered referrals.

#### Acceptance Criteria

**AC-1.3.1: Open a rule for editing**

```gherkin
Given a non-archived rule exists
When the admin clicks "Edit" for that rule
Then the form shall be filled with the rule's current values
And the form title shall change to "Edit Rule"
And the primary button shall read "Save Changes"
And a "Cancel" button shall be shown
```

**AC-1.3.2: Save changes**

```gherkin
Given the admin is editing a rule
When the admin changes the Referrer Bonus from 5 to 8 and clicks "Save Changes"
Then the rule shall be updated
And the success toast "Referral rule updated. Changes apply to new referrals only." shall be displayed
```

**AC-1.3.3: Changes apply only to new referrals**

```gherkin
Given Referee B registered while the GBP rule had a Referee Bonus of £10
When the admin changes the Referee Bonus to £15
And B later completes a qualifying transfer
Then B shall receive £10
And Referees who register after the change shall receive £15
```

**AC-1.3.4: Warning when pending referrals exist**

```gherkin
Given the rule has 12 referrals in "Pending" status
When the admin clicks "Save Changes"
Then a confirmation dialog "12 pending referrals will keep their original reward. Only new referrals will use these changes. Continue?" shall be displayed
```

**AC-1.3.5: Same validations as Create**

```gherkin
Given the admin is editing a rule
When any field breaks a validation in US-1.1
Then the same inline error shall be shown
And the rule shall not be saved
```

**AC-1.3.6: Currency clash on edit**

```gherkin
Given rules exist for GBP and EUR
When the admin edits the EUR rule and changes its currency to GBP
Then the error toast "A referral rule for GBP already exists ('UK Default'). Edit or archive it first." shall be displayed
```

**AC-1.3.7: Cancel editing**

```gherkin
Given the admin has changed fields while editing
When the admin clicks "Cancel"
Then no changes shall be saved
And the form shall return to "Create New Rule" mode with default values
```

**AC-1.3.8: Audit trail**

```gherkin
Given the admin saves changes to a rule
Then the system shall record the admin user, the date and time, and each field's old and new values
```

---

### US-1.4: Activate or Deactivate a Referral Rule

**Title:** Turn a referral rule on or off

**As a** Mito Money admin,
**I want** to switch a referral rule between Active and Inactive,
**So that** I can pause or resume a programme quickly without losing its settings.

#### Acceptance Criteria

**AC-1.4.1: Deactivate a rule**

```gherkin
Given the GBP rule is Active
When the admin switches its status toggle off
Then a confirmation dialog "Deactivate 'UK Default'? New customers will not be able to join through referral links. Pending referrals will still be rewarded." shall be displayed
When the admin clicks "Deactivate"
Then the rule status shall change to "Inactive"
And the success toast "Rule deactivated." shall be displayed
```

**AC-1.4.2: Effect of deactivation on customers**

```gherkin
Given the GBP rule has been deactivated
Then GBP customers shall no longer see the Refer & Earn card
And new registrations through a GBP referral link shall not be linked to a reward
And referrals already in "Pending" status shall keep their snapshotted reward until their Qualification Window ends
```

**AC-1.4.3: Activate a rule**

```gherkin
Given the GBP rule is Inactive
When the admin switches its status toggle on
Then the rule status shall change to "Active"
And the success toast "Rule activated." shall be displayed
```

**AC-1.4.4: Cannot activate an ended rule**

```gherkin
Given a rule whose End Date has passed
When the admin tries to switch it on
Then the error toast "This rule has ended. Update the end date before activating it." shall be displayed
```

**AC-1.4.5: Toggle failure**

```gherkin
Given the server returns an error
When the admin switches a status toggle
Then the toggle shall return to its previous position
And the error toast "We couldn't update the rule status. Please try again." shall be displayed
```

---

### US-1.5: Archive a Referral Rule

**Title:** Archive a referral rule instead of deleting it

**As a** Mito Money admin,
**I want** to archive a referral rule I no longer need,
**So that** it is removed from active use while its history and the rewards linked to it stay available for audit.

#### Acceptance Criteria

**AC-1.5.1: Archive button replaces Delete**

```gherkin
Given a non-archived rule exists
Then its Actions column shall show "Edit" and "Archive"
And no "Delete" action shall be available
```

**AC-1.5.2: Archive a rule**

```gherkin
Given the admin clicks "Archive" for "UK Default"
Then a confirmation dialog "Archive 'UK Default'? It will stop accepting new referrals. Pending referrals will still be rewarded. This cannot be undone." shall be displayed
When the admin clicks "Archive"
Then the rule shall be marked as archived and inactive
And it shall be removed from the default table view
And the success toast "Rule archived." shall be displayed
```

**AC-1.5.3: Currency becomes available again**

```gherkin
Given the GBP rule has been archived
When the admin creates a new rule for GBP
Then the new rule shall be saved successfully
```

**AC-1.5.4: Archived rules are read-only**

```gherkin
Given "Show archived" is on
Then archived rules shall have no "Edit", toggle or "Archive" actions
```

---

### US-1.6: Track Referrals

**Title:** View referral activity and status

**As a** Mito Money admin,
**I want** to see every referral with its Referrer, Referee, status and reward,
**So that** I can monitor the programme, answer customer queries and spot misuse.

#### Acceptance Criteria

**AC-1.6.1: Referral tracking table**

```gherkin
Given referrals exist
When the admin opens "Growth > Referral Tracking"
Then a table shall show: Referral ID, Referrer (name and customer ID), Referee (name and customer ID), Rule, Currency, Registered On, Qualification Deadline, Qualifying Transfer ID, Status, Referrer Bonus, Referee Bonus, Rewarded On
```

**AC-1.6.2: Filter and search**

```gherkin
Given the admin is on "Referral Tracking"
When the admin filters by Status, Currency, Rule or a registration date range
Or searches by customer name, customer ID, email or referral code
Then only matching referrals shall be shown
And the message "No referrals match your filters." shall be shown when there are no results
```

**AC-1.6.3: Status reasons**

```gherkin
Given a referral is "Not Eligible", "Expired" or "Reversed"
When the admin hovers over or opens the status
Then the reason shall be shown, for example "Self-referral: same device", "Qualification window ended on 02/11/2026" or "Qualifying transfer refunded"
```

**AC-1.6.4: Link to the credit ledger**

```gherkin
Given a referral has status "Rewarded"
When the admin clicks the bonus amount
Then the related entry in the User Credit Ledger shall open
```

**AC-1.6.5: Summary figures**

```gherkin
Given the admin is on "Referral Tracking"
Then summary cards shall show, for the selected filters: Total referrals, Pending, Rewarded, Conversion rate (Rewarded ÷ Registered) and Total bonus issued per currency
```

**AC-1.6.6: Export**

```gherkin
Given the admin has applied filters
When the admin clicks "Export CSV"
Then a CSV file of the filtered referrals shall be downloaded
```

**AC-1.6.7: Pagination**

```gherkin
Given more than 25 referrals match the filters
Then the table shall show 25 rows per page with page controls
```

---

### US-1.7: Single Source of Referral Rewards

**Title:** Remove the duplicate referral bonus type from the Bonus Scheme Manager

**As a** Mito Money admin,
**I want** referral rewards to be configured only in Referral Settings,
**So that** there is no conflicting setup and customers are never rewarded twice for the same referral.

#### Acceptance Criteria

**AC-1.7.1: Referral Credit removed from new bonus schemes**

```gherkin
Given the admin is creating a new scheme in the Bonus Scheme Manager
Then "Referral Credit" shall not be listed in "Bonus Type"
And a hint "Referral rewards are managed in Growth > Referral Settings." shall be shown under "Bonus Type"
```

**AC-1.7.2: Existing referral schemes**

```gherkin
Given a bonus scheme of type "Referral Credit" already exists
Then it shall be shown as read-only with the label "Legacy – managed in Referral Settings"
And it shall not award any new credit
```

---
### US-1.8: Referral Programme Performance per Rule

**Title:** See how well each referral rule is performing

**As a** Mito Money admin,
**I want** to see registrations from referral links, qualified referrals, bonuses issued, used and expired, and the conversion rate for each rule,
**So that** I can judge whether each scheme is successful and decide whether to keep, change or stop it.

#### Acceptance Criteria

**AC-1.8.1: Performance view**

```gherkin
Given referral rules exist
When the admin opens "Growth > Referral Performance"
Then one row per rule (including archived rules when "Show archived" is on) shall show:
  | Column                  | Definition                                                              |
  | Rule / Currency / Status| Rule name, send currency and current status                             |
  | Link visits             | Number of times a referral link for this currency was opened            |
  | Registrations           | Referees who verified their email through a referral link or code       |
  | Pending                 | Referrals in "Registered" or "Pending" status                            |
  | Rewarded                | Referrals in "Rewarded" status                                           |
  | Expired / Not eligible  | Referrals in "Expired", "Not Eligible" or "Reversed" status              |
  | Conversion rate         | Rewarded ÷ Registrations, as a percentage to 1 decimal place             |
  | Bonus issued            | Total referral bonus credited (Referrer + Referee)                       |
  | Bonus used              | Referral bonus redeemed on transfers                                     |
  | Bonus unused            | Referral bonus still available (issued − used − expired − voided)        |
  | Bonus expired           | Referral bonus that expired or was voided                                |
  | Referred volume         | Total send amount of Referees' completed transfers                       |
```

**AC-1.8.2: Date range filter**

```gherkin
Given the admin is on "Referral Performance"
When the admin selects "Last 7 days", "Last 30 days", "This month" or a custom start and end date
Then all figures shall be recalculated for referrals registered in that range
And the default range shall be "Last 30 days"
```

**AC-1.8.3: Figures in the rule's currency**

```gherkin
Given rules exist for GBP and NGN
Then each rule's amounts shall be shown in its own currency
And amounts in different currencies shall never be added together
```

**AC-1.8.4: Drill down**

```gherkin
Given the admin clicks a number in the "Registrations", "Pending", "Rewarded" or "Expired / Not eligible" column
Then "Referral Tracking" (US-1.6) shall open filtered by that rule and status
```

**AC-1.8.5: Top referrers**

```gherkin
Given the admin clicks a rule name
Then a panel shall show the top 10 Referrers for that rule by rewarded referrals, with customer ID, name, registrations, rewarded and bonus earned
```

**AC-1.8.6: Empty state**

```gherkin
Given a rule has no referrals in the selected range
Then its counts shall show 0 and amounts 0.00
And the conversion rate shall show "—"
```

**AC-1.8.7: Export**

```gherkin
Given the admin clicks "Export CSV"
Then a CSV with the visible performance rows and the selected date range shall be downloaded
```

---

### US-1.9: Referral Details in the User Credit Ledger

**Title:** Show referral rewards correctly in the User Credit Ledger

**As a** Mito Money admin,
**I want** referral bonus entries in the User Credit Ledger to show the referral rule, the referral and the correct currency,
**So that** I can audit every bonus issued, used and expired without guessing where it came from.

#### Acceptance Criteria

**AC-1.9.1: Referral entries linked to their rule**

```gherkin
Given a referral bonus has been credited
Then its ledger row shall show Scheme "<Rule name> (Referral)", reason "REFERRAL_REWARD", the referral ID as reference
And the notes shall read "Referrer reward – referred Sarah S." or "Referee reward – invited by Olayinka A."
```

**AC-1.9.2: Filter by referral rule**

```gherkin
Given the admin is on "User Credit Ledger"
Then the "Bonus Scheme" filter shall also list each referral rule under a "Referral rules" group
When the admin selects a referral rule
Then only ledger entries for that rule shall be shown
```

**AC-1.9.3: Correct currency per entry**

```gherkin
Given ledger entries exist in GBP and NGN
Then each amount shall be shown in its own currency
And the "Cost Incurred" card shall show one total per currency
```

**AC-1.9.4: Correct column naming**

```gherkin
Given the ledger table is displayed
Then the amount column shall be labelled "Amount"
And a separate "Running balance" column shall show the customer's balance after each entry when a single customer is selected
```

**AC-1.9.5: Real customer names**

```gherkin
Given ledger entries exist for different customers
Then each row shall show that customer's own name and ID
```

**AC-1.9.6: Used and expired referral entries**

```gherkin
Given a referral bonus is used on a transfer or expires
Then the "APPLIED" or "EXPIRED" ledger entry shall reference the original referral credit
And the scheme shall show the same referral rule as the original credit
```

---

## Epic 2: Share a Referral Link (Rhemito – Referrer)

### US-2.1: Refer & Earn Card on the Dashboard

**Title:** Show the Refer & Earn offer from the active rule

**As a** registered Rhemito customer,
**I want** to see on my dashboard what I and my friends can earn by referring them,
**So that** I am encouraged to invite friends and know exactly what we will each get.

#### Acceptance Criteria

**AC-2.1.1: Card shown when an active rule exists**

```gherkin
Given the customer is logged in with send currency GBP
And an Active GBP rule exists within its Start and End dates
When the customer opens the Overview (dashboard)
Then the "Refer & Earn" card shall be displayed
And it shall show the customer's unique referral link and a "Copy" button
```

**AC-2.1.2: Double-sided wording**

```gherkin
Given the active GBP rule is "Both Parties" with Referrer Bonus £5, Referee Bonus £10 and Floor £50
Then the card shall read "Invite friends with your link. You get £5.00 and your friend gets £10.00 in bonus credit when they send £50.00 or more within 30 days of joining."
```

**AC-2.1.3: Referrer-only wording**

```gherkin
Given the active GBP rule is "Referrer Only" with Referrer Bonus £10 and Floor £50
Then the card shall read "Invite friends with your link and get £10.00 bonus credit when they send £50.00 or more within 30 days of joining."
```

**AC-2.1.4: Referee-only wording**

```gherkin
Given the active GBP rule is "Referee Only" with Referee Bonus £10 and Floor £50
Then the card shall read "Give your friends £10.00 bonus credit when they join with your link and send £50.00 or more within 30 days."
```

**AC-2.1.5: Card hidden when no active rule exists**

```gherkin
Given the customer's send currency is EUR
And no Active EUR rule exists, or it is Scheduled or Ended
When the customer opens the dashboard
Then the "Refer & Earn" card shall not be displayed
And no referral link shall be shown anywhere in the app
```

**AC-2.1.6: Referral cap reached**

```gherkin
Given the rule has "Max Rewarded Referrals per Referrer" set to 10
And the customer already has 10 rewarded referrals
Then the card shall read "You've reached the maximum referral rewards for this programme. Thank you for spreading the word!"
And the "Copy" button shall be hidden
```

**AC-2.1.7: No separate bonus tile on the card or dashboard**

```gherkin
Given the customer has £50.00 available Bonus Credit in GBP
When the customer opens the dashboard
Then the "Refer & Earn" card shall not show a separate "Bonus credit ready to use" box
And the dashboard banner shall read "You have earned £50.00 Referral Bonus Credit. Create a Transaction to use it."
And the banner shall link to Send Money
And the full list of credits, their balances and expiry dates shall be on the "Bonus & Discounts" page
```

**AC-2.1.8: Loading state**

```gherkin
Given the referral details are loading
When the customer opens the dashboard
Then placeholder bars shall be shown inside the "Refer & Earn" card
And the card shall be the same height as the cards beside it so the layout does not jump when the data arrives
```

**AC-2.1.9: Failure state with retry**

```gherkin
Given the referral details fail to load
When the customer opens the dashboard
Then the card shall keep the "Refer & Earn" title
And it shall show an icon, the message "We couldn't load your referral details. Please check your connection and try again." and a "Try again" button
And the message and button shall be centred in the card
When the customer clicks "Try again"
Then the details shall be requested again
And the card shall show the offer if the request succeeds
```

**AC-2.1.10: Card height matches the other dashboard cards**

```gherkin
Given the customer is on a screen wide enough to show three dashboard cards in a row
Then "Quick Services", "Refer & Earn" and "Account Summary" shall finish at the same height
And none of them shall show an empty block above or between its contents
Given the customer is on a phone
Then the three cards shall stack one under the other at full width
```

---

### US-2.2: Copy and Share the Referral Link

**Title:** Copy or share my unique referral link

**As a** registered Rhemito customer,
**I want** to copy or share my personal referral link in one tap,
**So that** I can send it to friends through any channel.

#### Acceptance Criteria

**AC-2.2.1: Unique referral code generated**

```gherkin
Given a customer completes email verification
Then the system shall generate a unique referral code for the customer
And the code shall be 6–12 uppercase letters and numbers, based on the first name followed by 4 digits (for example "OLAYINKA2025")
And the code shall never change for that customer
```

**AC-2.2.2: Code clash**

```gherkin
Given another customer already has the code "JOHN1234"
When a new customer called John is assigned a code
Then the system shall generate a different 4-digit suffix until the code is unique
```

**AC-2.2.3: Copy link**

```gherkin
Given the "Refer & Earn" card is displayed
When the customer clicks "Copy"
Then "https://rhemito.com/ref/<CODE>" shall be copied to the clipboard
And the button shall change to "Copied" with a tick icon for 2.5 seconds
And the toast "Referral link copied! Share it with friends to earn bonus credit." shall be displayed
```

**AC-2.2.4: Clipboard not available**

```gherkin
Given the browser blocks clipboard access
When the customer clicks "Copy"
Then the toast "We couldn't copy the link. Please copy it manually." shall be displayed
And the link text shall be selected so that the customer can copy it
```

**AC-2.2.5: Native share on mobile**

```gherkin
Given the customer is on a device that supports the native share sheet
When the customer clicks "Share"
Then the device share sheet shall open with the message "Join me on Rhemito and get bonus credit on your first transfer: https://rhemito.com/ref/<CODE>"
Given the device does not support native sharing
Then the "Share" button shall not be shown
```

**AC-2.2.6: Account not eligible to refer**

```gherkin
Given the customer's account is suspended or blocked
Then the "Refer & Earn" card shall not be displayed
```

---

### US-2.3: Track My Referrals

**Title:** See the status of friends I have referred

**As a** Referrer,
**I want** to see which friends joined with my link and whether my reward is pending or earned,
**So that** I know what I will receive and can remind friends to complete their first transfer.

#### Acceptance Criteria

**AC-2.3.1: My Referrals section**

```gherkin
Given the customer has referred at least one friend
When the customer opens "Bonus & Discounts"
Then a "My Referrals" section shall list each referral with: Friend's first name and last-name initial (for example "Sarah S."), Joined On, Status, Reward
And full names, emails and phone numbers of Referees shall never be shown
```

**AC-2.3.2: Customer-friendly statuses**

```gherkin
Given referrals exist in different states
Then they shall be shown as:
  | System status | Customer label | Help text |
  | Registered    | Joined         | Waiting for their first transfer of £50.00 or more |
  | Pending       | In progress    | Transfer in progress – reward on completion |
  | Rewarded      | Earned         | £5.00 added to your bonus credit |
  | Expired       | Expired        | They didn't send £50.00 or more within 30 days |
  | Not Eligible  | Not eligible   | This referral didn't meet the programme terms |
  | Reversed      | Reversed       | The qualifying transfer was refunded |
```

**AC-2.3.3: Summary counts**

```gherkin
Given the customer has referrals
Then the section header shall show "Joined: X · Earned: Y · Total earned: £Z"
```

**AC-2.3.4: Empty state**

```gherkin
Given the customer has not referred anyone
Then the section shall show "No referrals yet. Share your link to start earning." with a "Copy link" button
```

---

## Epic 3: Join Through a Referral (Rhemito – Referee)

### US-3.1: Register Through a Referral Link

**Title:** Attribute a new registration to the Referrer's link

**As a** new customer who received a referral link,
**I want** my sign-up to be linked to the friend who invited me,
**So that** we both receive the bonus we were promised.

#### Acceptance Criteria

**AC-3.1.1: Valid link opens registration with the offer**

```gherkin
Given Referrer A's code "OLAYINKA2025" is valid and an Active rule exists
When a visitor opens "https://rhemito.com/ref/OLAYINKA2025"
Then the visitor shall be taken to the Registration page
And a banner shall read "Olayinka invited you to Rhemito. Join and send £50.00 or more within 30 days to get £10.00 bonus credit."
And the "Referral code" field shall be pre-filled with "OLAYINKA2025" and read-only, with a "Remove" link
```

**AC-3.1.2: Referral remembered across pages**

```gherkin
Given a visitor opened a valid referral link
When the visitor browses other public pages and returns to Registration within 30 days on the same browser
Then the referral code shall still be pre-filled
```

**AC-3.1.3: Invalid or unknown code**

```gherkin
Given no customer has the code "ABC999"
When a visitor opens "https://rhemito.com/ref/ABC999"
Then the visitor shall be taken to the Registration page without a referral banner
And the toast "This referral link isn't valid. You can still sign up." shall be displayed
```

**AC-3.1.4: Referrer no longer eligible**

```gherkin
Given Referrer A's account is suspended or closed
When a visitor opens A's referral link
Then the visitor shall be taken to Registration without a referral banner
And the toast "This referral link is no longer active. You can still sign up." shall be displayed
```

**AC-3.1.5: Referral created on email verification**

```gherkin
Given the visitor registers with a referral code and verifies their email
Then a referral record shall be created with status "Registered"
And it shall store the Referrer, the Referee, the registration date and the Referee's hashed device ID
```

**AC-3.1.6: Rule chosen by the Referee's send currency**

```gherkin
Given Referrer A sends in GBP
And Referee B selects Nigeria as their country at registration, so their send currency is NGN
When B's referral record is created
Then the Active NGN rule shall be linked to the referral
And its values (type, bonuses, Floor, Qualification Window, Bonus Validity) shall be snapshotted on the referral
And both A's and B's rewards shall be paid in NGN
```

**AC-3.1.7: No active rule for the Referee's currency**

```gherkin
Given Referee B's send currency is EUR
And no Active EUR rule exists
When B registers through A's link
Then the registration shall complete normally
And the referral shall be recorded with status "Not Eligible" and reason "No active referral programme for EUR"
And no referral banner shall be shown to B after registration
```

**AC-3.1.8: Existing customer opens a referral link**

```gherkin
Given a logged-in customer opens a referral link
Then the customer shall be taken to their dashboard
And the toast "Referral links are for new customers only." shall be displayed
And no referral record shall be created
```

**AC-3.1.9: Own link**

```gherkin
Given the logged-in customer opens their own referral link
Then the customer shall be taken to their dashboard
And no referral record shall be created
```

**AC-3.1.10: Link visits recorded**

```gherkin
Given a visitor opens a valid referral link
Then a link visit shall be recorded with the referral code, the currency of the Referrer's rule, the date and time, and an anonymous visitor ID
And repeat visits from the same visitor ID within 24 hours shall count once
```

---

### US-3.2: Enter a Referral Code Manually

**Title:** Add a referral code during registration

**As a** new customer whose friend gave me a code rather than a link,
**I want** to type the referral code when I register,
**So that** I still receive the referral bonus.

#### Field Specification

| Field | Type | Mandatory | Validation |
|-------|------|-----------|------------|
| Referral code | Text | No | 6–12 characters; letters and numbers only; converted to uppercase; leading and trailing spaces trimmed. |

#### Acceptance Criteria

**AC-3.2.1: Optional field on registration**

```gherkin
Given the visitor is on the Registration page without a referral link
Then a collapsed link "Have a referral code?" shall be shown
When the visitor clicks it
Then the optional "Referral code" field shall be displayed
```

**AC-3.2.2: Valid code entered**

```gherkin
Given the visitor enters "olayinka2025" in "Referral code"
When the field loses focus
Then the code shall be converted to "OLAYINKA2025"
And the system shall validate it
And the message "Code applied – invited by Olayinka" shall be shown under the field with a tick icon
```

**AC-3.2.3: Invalid format**

```gherkin
Given the visitor enters "AB-12" in "Referral code"
When the field loses focus
Then the inline error "Referral codes are 6–12 letters and numbers." shall be shown
```

**AC-3.2.4: Code not found**

```gherkin
Given the visitor enters a well-formed code that does not exist
When the field loses focus
Then the inline error "We couldn't find this referral code. Check it or leave the field blank." shall be shown
And the visitor shall still be able to register with the field cleared
```

**AC-3.2.5: Code cannot be added after registration**

```gherkin
Given a customer has completed email verification without a referral code
Then the customer shall not be able to add a referral code later
```

---
## Epic 4: Qualify and Award Referral Bonus (System)

### US-4.1: Award Bonus on a Qualifying Transfer

**Title:** Credit the Referrer and/or Referee when the Referee's qualifying transfer completes

**As a** Referrer or Referee,
**I want** our bonus credit to be added automatically when the Referee's first qualifying transfer completes,
**So that** we receive the reward we were promised without contacting support.

#### Acceptance Criteria

**AC-4.1.1: Referral moves to Pending**

```gherkin
Given Referee B has a referral in status "Registered" with a Floor of £50
When B creates and pays for a transfer of £60 in GBP within the Qualification Window
Then the referral status shall change to "Pending"
And the transfer ID shall be stored on the referral
```

**AC-4.1.2: Double-sided reward on completion**

```gherkin
Given B's referral is "Pending" on a "Both Parties" rule with Referrer Bonus £5 and Referee Bonus £10
When the qualifying transfer reaches "Completed" status
Then £5.00 GBP shall be credited to Referrer A's Bonus wallet
And £10.00 GBP shall be credited to Referee B's Bonus wallet
And each credit shall be recorded in the User Credit Ledger as type "EARNED", reason "REFERRAL_REWARD", with the referral ID and an expiry date of issue date + Bonus Validity
And the referral status shall change to "Rewarded"
```

**AC-4.1.3: Single-sided rewards**

```gherkin
Given the snapshotted rule is "Referrer Only"
When the qualifying transfer completes
Then only Referrer A shall be credited
Given the snapshotted rule is "Referee Only"
When the qualifying transfer completes
Then only Referee B shall be credited
```

**AC-4.1.4: Floor boundary – equal qualifies**

```gherkin
Given the Floor is £50.00
When B completes a transfer with a send amount of exactly £50.00
Then the transfer shall qualify
```

**AC-4.1.5: Floor boundary – below does not qualify**

```gherkin
Given the Floor is £50.00
When B completes a transfer with a send amount of £49.99
Then the transfer shall not qualify
And the referral shall stay "Registered"
And a later transfer of £50.00 or more within the Qualification Window shall still qualify
```

**AC-4.1.6: Floor compares the send amount only**

```gherkin
Given the Floor is £50.00
When B sends £45.00 with a £5.00 fee (Total to Pay £50.00)
Then the transfer shall not qualify, because the send amount excludes fees, promo discounts and bonus credit
```

**AC-4.1.7: Transfer in a different currency**

```gherkin
Given B's referral is linked to the NGN rule
When B completes a transfer sent in GBP
Then the transfer shall not count towards the referral
```

**AC-4.1.8: Rewarded once only**

```gherkin
Given B's referral is "Rewarded"
When B completes further transfers
Then no further referral bonus shall be credited for this referral
```

**AC-4.1.9: Snapshotted values used**

```gherkin
Given B registered when the Referee Bonus was £10
And the admin has since changed it to £15 or deactivated the rule
When B's qualifying transfer completes within the Qualification Window
Then B shall receive £10.00
```

**AC-4.1.10: Bonus not usable on the qualifying transfer**

```gherkin
Given B has no Bonus Credit before the qualifying transfer
When B is paying for the qualifying transfer
Then the "Referral Bonus Available" section shall not be shown for B's own pending reward
```

**AC-4.1.11: Idempotent award**

```gherkin
Given the "Completed" event for the qualifying transfer is received more than once
Then the bonus shall be credited only once to each party
```

**AC-4.1.12: Referrer cap reached**

```gherkin
Given Referrer A has already reached "Max Rewarded Referrals per Referrer"
When B's qualifying transfer completes on a "Both Parties" rule
Then Referee B shall still be credited
And Referrer A shall not be credited
And the referral record shall note "Referrer cap reached"
```

---

### US-4.2: Expire Unqualified Referrals

**Title:** Close referrals that miss the Qualification Window

**As a** Mito Money admin,
**I want** referrals that do not qualify within the Qualification Window to expire automatically,
**So that** rewards are only paid for timely activity and liabilities stay predictable.

#### Acceptance Criteria

**AC-4.2.1: Expiry after the window**

```gherkin
Given B registered on 01/10/2026 with a 30-day Qualification Window
And B has not completed a qualifying transfer by 23:59:59 UK time on 31/10/2026
When the daily expiry job runs
Then the referral status shall change to "Expired"
And no bonus shall be credited
```

**AC-4.2.2: Last-day boundary**

```gherkin
Given B's window ends at 23:59:59 UK time on 31/10/2026
When B's qualifying transfer was created at 23:50 on 31/10/2026 and completes on 01/11/2026
Then the transfer shall qualify, because qualification is based on the transfer creation time
```

**AC-4.2.3: Reminder to the Referee**

```gherkin
Given B's referral is "Registered" and 7 days remain in the Qualification Window
Then B shall receive an email and push notification: "Only 7 days left to get your £10.00 bonus. Send £50.00 or more before 31/10/2026."
```

---

### US-4.3: Prevent Ineligible and Fraudulent Referrals

**Title:** Block self-referrals and ineligible rewards

**As a** Mito Money admin,
**I want** the system to stop rewards for self-referrals, duplicate identities and customers who have not passed KYC,
**So that** the programme is not abused and only genuine new customers are rewarded.

#### Acceptance Criteria

**AC-4.3.1: Same identity details**

```gherkin
Given Referee B shares an email, phone number, device ID, payment card or bank account with Referrer A
When B's referral would otherwise qualify
Then the referral status shall be "Not Eligible" with reason "Self-referral: <matching detail>"
And no bonus shall be credited to either party
```

**AC-4.3.2: Returning customer**

```gherkin
Given B's email or phone number belongs to a closed Rhemito account
When B registers through a referral link
Then the referral shall be "Not Eligible" with reason "Returning customer"
```

**AC-4.3.3: KYC required before award**

```gherkin
Given the qualifying transfer completes
And Referrer A has not passed KYC
Then the referral shall stay "Pending" with reason "Awaiting referrer KYC"
When A passes KYC within the Referee's Qualification Window + 30 days
Then the reward shall be credited
Otherwise the referral shall change to "Expired"
```

**AC-4.3.4: Suspended accounts**

```gherkin
Given Referrer A's account is suspended when B's qualifying transfer completes
Then A shall not be credited
And B shall be credited if B's own checks pass
```

**AC-4.3.5: Admin override**

```gherkin
Given a referral is "Not Eligible"
When a signed-in admin clicks "Approve reward" on the referral and enters a reason of 10–250 characters
Then the reward shall be credited
And the ledger entry shall record the admin user and reason
```

**AC-4.3.6: Device ID is created and sent**

```gherkin
Given a visitor opens Rhemito in a browser for the first time
Then the app shall create a random device ID and keep it in that browser
And every request the app makes to Rhemito's own API shall carry the device ID
And requests to any other website shall not carry it
```

**AC-4.3.7: Same device is treated as self-referral**

```gherkin
Given Referrer A is signed in on a browser
And a new visitor opens A's referral link in the same browser and registers as Referee B
When B verifies their email
Then the referral shall be "Not Eligible" with reason "Self-referral: same device"
And B shall still be able to use Rhemito normally
And no bonus shall be credited to either party
```

**AC-4.3.8: Different device is not blocked**

```gherkin
Given Referrer A uses one browser
And Referee B registers through A's link from a different browser or device
And B shares no email, phone number or payment method with A
When B verifies their email
Then the referral shall be "Registered"
```

**AC-4.3.9: Missing or invalid device ID**

```gherkin
Given a request arrives without a device ID, or with one that is not 16 to 64 letters, numbers and hyphens
Then the request shall be processed normally
And the device ID shall be ignored
And the customer's last known device shall not be erased
```

**AC-4.3.10: Device ID privacy**

```gherkin
Given a customer's device ID is passed to the referral engine
Then it shall be sent only in hashed form
And the raw device ID shall not leave Rhemito's server
And the device ID shall not be shown to customers
```

**AC-4.3.11: Shared devices can be approved**

```gherkin
Given two family members share one browser and one is blocked as "Self-referral: same device"
When an admin checks the details and clicks "Approve reward" with a reason
Then the reward shall be credited as in AC-4.3.5
```

**AC-4.3.12: Device recorded on each sign-in**

```gherkin
Given a customer signs in, verifies their email, or uses Rhemito while signed in
Then the device they are using shall be recorded as their latest device
And only the latest device shall be compared
```

---

### US-4.4: Reverse a Bonus When the Qualifying Transfer Is Reversed

**Title:** Void unused referral bonus after a refund, recall or chargeback

**As a** Mito Money admin,
**I want** unused referral bonus to be voided when the qualifying transfer is reversed,
**So that** we do not pay for referrals that did not result in a genuine transfer.

#### Acceptance Criteria

**AC-4.4.1: Reversal before completion**

```gherkin
Given B's referral is "Pending"
When the qualifying transfer is cancelled, failed or refunded before reaching "Completed"
Then the referral status shall return to "Registered"
And a later qualifying transfer within the window shall still qualify
```

**AC-4.4.2: Reversal after reward – unused credit**

```gherkin
Given A and B were rewarded and neither has used the credit
When the qualifying transfer is refunded, recalled or charged back
Then a "VOIDED" ledger entry shall remove the referral credit from each wallet
And the referral status shall change to "Reversed"
And each customer shall receive the notification "Your referral bonus of £X.XX has been removed because the related transfer was reversed."
```

**AC-4.4.3: Reversal after reward – partly used credit**

```gherkin
Given A was credited £5.00 and has since used £3.00
When the qualifying transfer is reversed
Then only the remaining £2.00 shall be voided
And A's Bonus wallet shall not go below £0.00
```

---

### US-4.5: Notify Customers About Referral Rewards

**Title:** Tell customers when they earn referral bonus

**As a** Referrer or Referee,
**I want** to be notified when I earn a referral bonus,
**So that** I know I have credit and can use it on my next transfer.

#### Acceptance Criteria

**AC-4.5.1: Referrer notification**

```gherkin
Given Referrer A has been credited £5.00
Then A shall receive a bell notification, a push notification and an email: "Sarah S. completed their first transfer. You've earned £5.00 bonus credit – use it on your next transfer by 01/01/2027."
```

**AC-4.5.2: Referee notification**

```gherkin
Given Referee B has been credited £10.00
Then B shall receive a bell notification, a push notification and an email: "Welcome bonus unlocked! You've earned £10.00 bonus credit – use it on your next transfer by 01/01/2027."
```

**AC-4.5.3: Friend joined notification**

```gherkin
Given B has verified their email through A's link
Then A shall receive a bell notification: "Sarah S. joined Rhemito with your link. You'll earn £5.00 when they send £50.00 or more."
```

**AC-4.5.4: Notification preferences respected**

```gherkin
Given A has turned off promotional push notifications
Then A shall not receive referral push notifications
And A shall still see the bell notification
```

---

## Epic 5: Use Bonus Credit (Rhemito)

### US-5.1: View My Bonuses and Referrals (Bonus & Discounts Page)

**Title:** See my used, unused and expired bonuses and my referrals in one place

**As a** Rhemito customer,
**I want** to see how much bonus I have available, how much I have used, what has expired and which referrals earned it,
**So that** I understand my rewards and can use my credit before it runs out.

#### Acceptance Criteria

**AC-5.1.1: Dashboard banner**

```gherkin
Given the customer has £5.00 available Bonus Credit in GBP
When the customer opens the dashboard
Then the banner "You have earned £5.00 Referral Bonus Credit. Create a Transaction to use it." shall be displayed
And "Create a Transaction" shall open Send Money
Given the customer has no available Bonus Credit
Then the banner shall not be displayed
```

**AC-5.1.2: Summary cards**

```gherkin
Given the customer opens "Bonus & Discounts"
Then four summary cards shall be displayed:
  | Card                     | Value                                                        | Sub-text                                  |
  | Available Bonus Balance  | Sum of unused, unexpired bonus credit                        | "Ready to use on your next transfer"      |
  | Total Earned             | Sum of all bonus credit ever earned (referral and other)     | "From X referrals and Y other bonuses"    |
  | Used                     | Sum of bonus credit redeemed on transfers                    | "Across X transfers"                      |
  | Expired                  | Sum of bonus credit that expired or was voided               | "Use your bonus before it expires"        |
And all values shall be calculated from the User Credit Ledger
And Available shall equal Total Earned − Used − Expired
```

**AC-5.1.3: Total Saved shown separately**

```gherkin
Given the customer has used bonus credit and promo codes
Then a line under the summary cards shall read "You've saved £Z in total with bonuses and promo codes"
And Z shall equal bonus credit used + promo code discounts applied
```

**AC-5.1.4: Send Money call to action**

```gherkin
Given the Available Bonus Balance is greater than £0.00
Then the "Available Bonus Balance" card shall show a "Send Money" button that opens Send Money
Given the Available Bonus Balance is £0.00
Then the button shall read "Refer a friend" and copy the customer's referral link
```

**AC-5.1.5: Multiple currencies**

```gherkin
Given the customer has £5.00 GBP and ₦2,000.00 NGN bonus credit
Then a currency selector shall be shown above the summary cards, defaulting to the customer's send currency
And the cards and history shall show values for the selected currency only
And amounts in different currencies shall never be added together
```

**AC-5.1.6: Unused credit with expiry**

```gherkin
Given the customer has unused bonus credit
Then an "Unused bonus" list shall show each credit with: Source (for example "Referral – Sarah S."), Amount, Remaining, Earned On, Expires On
And a credit expiring within 14 days shall show an amber "Expires in X days" label
And the list shall be sorted by Expires On, soonest first
```

**AC-5.1.7: History with filters**

```gherkin
Given the customer opens "Bonus & Discounts"
Then the "History" table shall list every entry from the User Credit Ledger and every promo code redemption, newest first
And it shall show: Date (DD/MM/YYYY), Description, Type, Status, Amount
And filter tabs "All", "Earned", "Used", "Expired", "Promo codes" shall be available
When the customer selects "Used"
Then only redeemed entries shall be shown
```

**AC-5.1.8: Entry types and statuses**

```gherkin
Given history entries exist
Then each earned entry shall show one of these statuses:
  | Status       | Meaning                                         |
  | Unused       | Not used at all and not expired                 |
  | Partly used  | Some, but not all, of the amount has been used  |
  | Used         | Fully redeemed                                  |
  | Expired      | Validity ended before it was fully used         |
  | Reversed     | Removed because the qualifying transfer was reversed |
And each used entry shall link to the related transfer, for example "Used on transfer TX-104 to Mum"
```

**AC-5.1.9: Referee names protected**

```gherkin
Given a history entry relates to a referral
Then the description shall show the Referee's first name and last-name initial only, for example "Referral bonus – Sarah S."
```

**AC-5.1.10: My Referrals tab**

```gherkin
Given the customer opens "Bonus & Discounts"
Then a "My Referrals" tab shall show the list and statuses defined in US-2.3
```

**AC-5.1.11: Empty state**

```gherkin
Given the customer has no bonus or promo history
Then the page shall show "No rewards yet. Invite friends or use a promo code to start saving." with a "Copy referral link" button
And all summary cards shall show £0.00
```

**AC-5.1.12: Sidebar badge**

```gherkin
Given the customer has available Bonus Credit or an unread offer
Then the sidebar "Bonus & Discounts" item shall show the "NEW" badge and "Rewards waiting!"
Given the customer has neither
Then the badge shall not be shown
```

**AC-5.1.13: No sample data**

```gherkin
Given the customer opens "Bonus & Discounts"
Then no hard-coded or sample entries shall be shown
And the page shall show a loading skeleton while data loads
And the message "We couldn't load your rewards. Please try again." with a "Retry" button if loading fails
```

---

### US-5.2: Redeem Bonus as Pay Less

**Title:** Use bonus credit to reduce the amount I pay

**As a** Rhemito customer with bonus credit,
**I want** to apply my bonus to reduce my Total to Pay,
**So that** my transfer costs me less.

#### Acceptance Criteria

**AC-5.2.1: Bonus section shown on the Payment step**

```gherkin
Given the customer has £5.00 available Bonus Credit in GBP
And the transfer is sent in GBP
And the send amount is at least the rule's "Minimum Send Amount to Redeem"
When the customer reaches step 4 "Payment"
Then the "Referral Bonus Available" section shall be displayed with "Redeem your £5.00 bonus"
And neither "Pay Less" nor "Send More" shall be selected by default
```

**AC-5.2.2: Apply Pay Less**

```gherkin
Given the send amount is £500.00 and the fee is £5.00
When the customer selects "Pay Less"
Then the Amount Summary shall add the line "Referral Bonus  − 5.00 GBP"
And "Total to Pay" shall change from 505.00 GBP to 500.00 GBP
And "They Receive" shall remain unchanged
And the toast "£5.00 bonus applied. You'll pay £5.00 less." shall be displayed
```

**AC-5.2.3: Bonus larger than the send amount**

```gherkin
Given the customer has £20.00 Bonus Credit and the send amount is £10.00
When the customer selects "Pay Less"
Then only £10.00 shall be applied
And the label shall read "Save £10.00 now. £10.00 will stay in your bonus credit."
```

**AC-5.2.4: Remove the bonus**

```gherkin
Given "Pay Less" is selected
When the customer clicks "Remove bonus"
Then the bonus line shall be removed and the totals restored
```

**AC-5.2.5: Different currency**

```gherkin
Given the customer has only GBP Bonus Credit
When the transfer is sent in EUR
Then the bonus section shall not be shown
```

**AC-5.2.6: Below the minimum send amount to redeem**

```gherkin
Given the rule's Minimum Send Amount to Redeem is £20.00
When the send amount is £19.99
Then the bonus section shall show "Send £20.00 or more to use your £5.00 bonus." with the options disabled
```

**AC-5.2.7: Bonus and promo code together**

```gherkin
Given a promo code giving £3.00 off has been applied
And the customer selects "Pay Less" with £5.00 bonus
Then the Amount Summary shall show the promo discount first and the bonus second
And Total to Pay shall equal send amount + fee − promo − bonus, and never below 0.00
```

**AC-5.2.8: Bonus deducted only on successful payment**

```gherkin
Given "Pay Less" is applied
When the customer's payment succeeds
Then a "APPLIED" ledger entry of −£5.00 shall be recorded against the transfer
When the payment fails or is abandoned
Then no bonus shall be deducted
```

**AC-5.2.9: Balance changed during checkout**

```gherkin
Given the customer applied £5.00 bonus
And the credit expired or was used in another session before payment
When the customer confirms payment
Then the payment shall not be taken
And the message "Your bonus balance has changed. Please review your transfer." shall be shown with updated totals
```

**AC-5.2.10: Refunded transfer returns the bonus**

```gherkin
Given a transfer paid with £5.00 bonus is cancelled or refunded
Then £5.00 shall be returned to the customer's Bonus wallet with its original expiry date
And if that date has already passed, the returned credit shall be valid for 14 more days
```

---

### US-5.3: Redeem Bonus as Send More

**Title:** Use bonus credit to increase what my recipient receives

**As a** Rhemito customer with bonus credit,
**I want** to add my bonus to the amount my recipient gets,
**So that** my family or friends receive more money.

#### Acceptance Criteria

**AC-5.3.1: Apply Send More**

```gherkin
Given the send amount is £500.00, the fee is £5.00 and the rate is 1 GBP = 2,025.50 NGN
When the customer selects "Send More" with £5.00 bonus
Then the Amount Summary shall add "Referral Bonus (Recipient)  + 5.00 GBP"
And "Amount Sent" shall show 505.00 GBP
And "They Receive" shall show 1,022,877.50 NGN
And "Total to Pay" shall remain 505.00 GBP
And the toast "£5.00 bonus added. Your recipient will get more." shall be displayed
```

**AC-5.3.2: Fee not increased by the bonus**

```gherkin
Given "Send More" is selected
Then the fee shall be calculated on the customer's send amount only, not on the bonus
```

**AC-5.3.3: Corridor limits**

```gherkin
Given adding the bonus would take the amount above the corridor's maximum payout
When the customer selects "Send More"
Then the option shall be disabled with the message "Send More isn't available because it would exceed the maximum payout for this corridor. Choose Pay Less instead."
```

**AC-5.3.4: Switch between options**

```gherkin
Given "Send More" is selected
When the customer selects "Pay Less"
Then the totals shall update immediately to the Pay Less calculation
And only one option shall be selected at a time
```

**AC-5.3.5: Receipt and transaction details**

```gherkin
Given a transfer was completed with bonus
Then the receipt and Transaction details shall show the bonus type ("Pay Less" or "Send More") and amount
```

---

### US-5.4: Expire Unused Bonus Credit

**Title:** Expire bonus credit after its validity period

**As a** Mito Money admin,
**I want** unused bonus credit to expire at the end of its validity period,
**So that** outstanding liabilities are controlled.

#### Acceptance Criteria

**AC-5.4.1: Expiry**

```gherkin
Given the customer has £5.00 credit with an expiry date of 01/01/2027
And it has not been used by 23:59:59 UK time on 01/01/2027
When the daily expiry job runs
Then an "EXPIRED" ledger entry of −£5.00 shall be recorded
And the available balance shall reduce by £5.00
```

**AC-5.4.2: Oldest credit used first**

```gherkin
Given the customer has two credits expiring on 01/12/2026 and 01/01/2027
When the customer redeems part of the balance
Then the credit expiring first shall be used first
```

**AC-5.4.3: Expiry reminder**

```gherkin
Given credit will expire in 7 days
Then the customer shall receive a push notification and email: "Your £5.00 bonus credit expires on 01/01/2027. Use it on your next transfer."
```

---

## Epic 6: Offers and In-App Notifications

### US-6.1: Notify Customers When a New Offer Is Available

**Title:** Send an in-app notification when a referral offer goes live or improves

**As a** Rhemito customer,
**I want** to be told in the app when there is a new or better referral offer for my currency,
**So that** I don't miss the chance to earn bonus credit.

#### Acceptance Criteria

**AC-6.1.1: Offer goes live**

```gherkin
Given no referral offer is live for GBP
When an admin activates a GBP rule, or a scheduled GBP rule reaches its Start Date
Then every active GBP customer shall receive a bell notification titled "New offer: Refer & Earn"
And the message shall be built from the rule, for example "Invite friends and get £5.00 each time they send £50.00 or more. Your friend gets £10.00 too."
And the bell counter shall increase by 1
```

**AC-6.1.2: Offer improved**

```gherkin
Given a GBP rule is live
When an admin increases the Referrer Bonus or the Referee Bonus, or lowers the Floor
Then GBP customers shall receive the notification "Better offer: you now get £8.00 for every friend who sends £50.00 or more."
Given the admin lowers a bonus or raises the Floor
Then no offer notification shall be sent
```

**AC-6.1.3: Admin chooses whether to notify**

```gherkin
Given the admin activates or improves a rule
Then the confirmation dialog shall include a "Notify customers" checkbox, ticked by default
When the admin unticks it
Then no offer notification shall be sent
```

**AC-6.1.4: Opening the notification**

```gherkin
Given the customer has an unread offer notification
When the customer clicks it in the bell panel
Then the notification shall be marked as read
And the customer shall be taken to the dashboard with the "Refer & Earn" card highlighted for 2 seconds
```

**AC-6.1.5: Offer banner on the dashboard**

```gherkin
Given a live offer has been announced in the last 7 days
And the customer has not dismissed it
Then a dismissible banner "New offer: Refer & Earn – earn £5.00 per friend" with a "View offer" button shall show on the dashboard
When the customer clicks the close (X) icon
Then the banner shall not appear again for this offer
```

**AC-6.1.6: Push notification respects preferences**

```gherkin
Given the customer has turned on promotional push notifications
Then the offer shall also be sent as a push notification
Given the customer has turned them off
Then only the in-app bell notification shall be sent
```

**AC-6.1.7: Who receives offer notifications**

```gherkin
Given an offer goes live for GBP
Then notifications shall be sent only to customers whose send currency is GBP and whose account is active
And customers who have reached their referral cap shall not be notified
```

**AC-6.1.8: No repeat notifications**

```gherkin
Given a customer has already been notified about a rule
When the admin deactivates and reactivates the same rule within 7 days without improving it
Then the customer shall not be notified again
```

**AC-6.1.9: Offer ending soon**

```gherkin
Given a live rule has an End Date in 3 days
Then GBP customers shall receive the bell notification "Refer & Earn ends on 31/10/2026. Share your link now."
```

---

### US-6.2: In-App Notifications for Bonus Activity

**Title:** Show every referral and bonus event in the notification bell

**As a** Rhemito customer,
**I want** all referral and bonus events to appear in my notification bell,
**So that** I always know when I have earned, used, lost or am about to lose bonus credit.

#### Acceptance Criteria

**AC-6.2.1: Bonus events in the bell**

```gherkin
Given any of these events happens for the customer
Then a bell notification shall be created with the matching message:
  | Event                          | Message                                                                   |
  | Friend joined with your link   | "Sarah S. joined Rhemito with your link. You'll earn £5.00 when they send £50.00 or more." |
  | Referral bonus earned          | "You've earned £5.00 bonus credit from Sarah S.'s first transfer."        |
  | Welcome bonus earned (Referee) | "Welcome bonus unlocked! £10.00 bonus credit is ready to use."            |
  | Bonus used                     | "£5.00 bonus credit was used on transfer TX-104."                         |
  | Bonus expiring in 7 days       | "Your £5.00 bonus credit expires on 01/01/2027."                          |
  | Bonus expired                  | "£5.00 bonus credit expired on 01/01/2027."                              |
  | Bonus reversed                 | "Your £5.00 referral bonus was removed because the related transfer was reversed." |
```

**AC-6.2.2: Deep links**

```gherkin
Given the customer clicks a bonus notification
Then the customer shall be taken to "Bonus & Discounts" with the related entry highlighted
And notifications about a transfer shall open that transfer's details
```

**AC-6.2.3: Notification category**

```gherkin
Given bonus and offer notifications exist
Then they shall be grouped under the "Rewards" category in the Notification Archive
And the customer shall be able to filter the archive by "Rewards"
```

---

## 4. Out of Scope

- Percentage-based or tiered referral rewards.
- Paying referral rewards as cash to a bank account or wallet.
- Referral leaderboards and social media integrations beyond the native share sheet.

## 5. Known Limits and Open Items

These are not covered by the delivered functionality. Each is a candidate for a future story.

| # | Item | Impact | Suggested next step |
|---|------|--------|---------------------|
| L1 | The device ID lives in the browser. Clearing site data, private browsing or another browser creates a new ID. | A determined customer can avoid the device check. Email, phone and payment-method checks still apply. | Add device intelligence from the payment provider or a fraud service. |
| L2 | The referral engine stores one device per customer: the latest. | A Referrer who used another device last is not matched against an earlier device. | Store a short history of devices per customer. |
| L3 | Rhemito does not yet send payment-method fingerprints (card or bank account). | The "same payment method" check in AC-4.3.1 cannot trigger. | Send a hashed payment fingerprint when a payment is made. |
| L4 | The Send Money flow is GBP only, so only GBP bonus can be redeemed there. | Bonus in other currencies shows on Bonus & Discounts but cannot yet be used. | Extend Send Money to all supported send currencies. |
| L5 | The "Growth Manager" role is not enforced for "Approve reward". | Any signed-in admin can approve. The admin name and reason are recorded. | Add roles to Mito Admin and check them on approval. |
| L6 | When a customer's currency has no active rule, the Refer & Earn card is hidden but its column stays empty on wide screens. | A blank space appears in the dashboard's middle column. | Let the other cards reflow when the card is hidden. |
| L7 | The dashboard welcome message and the account summary figures are placeholders, not the signed-in customer's data. | "Welcome Olayinka" shows for every customer. | Use the signed-in customer's name and real balances. |
| L8 | The live Rhemito site needs the address of the live Mito Admin engine (setting `MITO_API_URL`). | Without it the Refer & Earn card shows the failure state. | Set `MITO_API_URL` in the Rhemito hosting settings and redeploy. |


