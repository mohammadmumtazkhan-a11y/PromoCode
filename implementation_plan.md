# Enable Email Search and Expanded Transaction Details

## Proposed Changes

### [Support Portal](client/src/pages/Support)

#### [MODIFY] [TransactionSearch.jsx](file:///c:/Users/Khan1/OneDrive/Desktop/drive%20d%20data/PromoCode/client/src/pages/Support/TransactionSearch.jsx)

- **Email Search**:
  - Update `handleSearch` logic to check `senderEmail` in `MOCK_TRANSACTIONS`.
  - Update search input `placeholder` to include "Sender Email".
  - Add "Sender Email" column to the Summary Highlights (mini table).
  - Update the "Try searching..." hint with an email example.
  - Update empty state description.
- **Expanded Details (Tabs)**:
  - Add "Comments" and "Help Tickets" to the tabs list in the navigation and content rendering.
  - **Comments Tab (Interactive Agent Thread)**:
    - Update `MOCK_TRANSACTIONS` to use a `messageHistory` array with objects including `timestamp`, `user` (e.g., "Agent Smith", "System"), and `message`.
    - Implement a `CommentThread` UI component that displays these messages in a chronological list.
    - Add a "Add Comment" text area that allows the current agent to post new comments, updating the local state to show the message immediately.
  - **Help Tickets Tab (Transaction Context)**:
    - Display only tickets linked to the current transaction MTN/Reference.
    - Implement a "Start Communication" button that opens the "Create Ticket" flow with the transaction reference pre-filled, or links to a new ticket draft.
    - Provide "View Full Thread" links for existing tickets to jump directly to the interactive chat in the Help Tickets module.
- **State Persistence (Navigation Fix)**:
  - Use `useSearchParams` from `react-router-dom` to sync the search query (MTN/Email) and `activeTab` with the URL in `TransactionSearch.jsx`.
  - Implement a `useEffect` hook to automatically perform the search and restore the tab if the parameters are present in the URL on mount.
  - This ensures that `navigate(-1)` from `HelpTickets.jsx` restores the exact UI state (search results + tab) as requested.
- **Rates Table Refinements (Support Portal)**:
  - Add `affiliateSearch` state to `SupportRates.jsx` for predictive affiliate search.
  - Set "Rhemito" as the default/auto-selected affiliate.
  - Update `MOCK_RATES` to include `sendCountry` and `receiveCountry` fields (default "ALL", or specific country if overridden).
  - Add "Send Country" and "Receive Country" columns to the Rates table.
  - Update the table header and row rendering to include the new columns.
  - update export logic (CSV/PDF) to include the new columns.
  - Implement a predictive search UI for Affiliate Name using a filterable dropdown or datalist.
- **Tab Notifications (Transaction Search)**:
  - Add `unreadTabs` state to track notifications for "Comments" and "Help Tickets".
  - Display a red dot/badge on the tab header if the tab has unread items.
  - Clear the notification for a tab when it becomes active.
  - Initialize "Comments" and "Help Tickets" as unread for the demonstration transaction.
- **Escalation Alert System (Support Dashboard)**:
  - Add `recentMetrics` to `SupportDashboard.jsx` to simulate transaction data from the last 30 minutes.
  - Implement a calculation for the combined failure and in-progress rate: `(failed + inProgress) / total`.
  - Trigger a high-priority popup if this rate exceeds **3%**.
  - Create an `EscalationPopup` component with a red alert theme and sound notification.
  - Display the required message: "Escalate to the management and Technical Support."

### [E2E Tests](tests/e2e)

#### [MODIFY] [transaction_masking.spec.js](file:///c:/Users/Khan1/OneDrive/Desktop/drive%20d%20data/PromoCode/tests/e2e/transaction_masking.spec.js)

- Add a test case to verify searching by sender email.
- Add test cases to verify the new "Comments" tab displays the thread correctly.
- Add test cases to verify the "Help Tickets" tab displays linked tickets.

## Verification Plan

### Automated Tests

- Run Playwright tests:

```bash
node_modules\.bin\playwright.cmd test tests/e2e/transaction_masking.spec.js
```

### Manual Verification

1. **Email Search**: Search for `ogbeide.sender@example.com` and verify the summary table.
2. **Comments Tab**: Navigate to the "Comments" tab for any transaction and verify the thread view.
3. **Help Tickets Tab**: Search for `MITO-7721003` and verify that ticket `#2651` is listed in the "Help Tickets" tab.
