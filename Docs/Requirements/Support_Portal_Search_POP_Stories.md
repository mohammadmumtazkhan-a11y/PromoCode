# User Stories & Acceptance Criteria: Support Portal Enhancements

## Feature 1: Advanced Transaction Search & Filtering

**User Story**
As a Customer Support Agent,
I want to be able to search for transactions using multiple criteria (e.g., Reference, Payer Name, Bank Account, Affiliate, or Sender Email) and apply date/status filters,
So that I can quickly and accurately locate specific transactions when assisting customers.

**Acceptance Criteria**
1. **Search Type Selector:**
   - The search interface MUST include a dropdown to select the type of search query (Ref/MTN, Payer Name, Bank Account, Affiliate, Sender Email).
   - The default selection MUST be "Ref/MTN".
   - The search input placeholder MUST dynamically update to reflect the selected search type.
2. **Dynamic Advanced Filters:**
   - When searching by "Payer Name", "Bank Account", "Affiliate", or "Sender Email", the "Start Date", "End Date", and "Status" filters MUST be visible.
   - When searching by "Ref/MTN", the "Start Date", "End Date", and "Status" filters MUST be hidden.
3. **Search Results Header:**
   - The search results container MUST display a clear header showing the exact query string used for the search (e.g., `Search Results for: "ogbeide.sender@example.com"`).
   - The header MUST display the total count of transactions found matching the criteria.
4. **Search Execution:**
   - The system MUST return transactions matching the selected type, keyword, date range (if applicable), and status (if applicable).

---

## Feature 2: Proof of Payment (POP) Management

**User Story**
As a Customer Support Agent,
I want to view, download, or email the Proof of Payment (POP) for completed or processed transactions,
So that I can provide beneficiaries and affiliates with official confirmation of funds settlement.

**Acceptance Criteria**
1. **Conditional Tab Visibility:**
   - A dedicated "POP" tab MUST be visible in the Transaction Details view ONLY IF the transaction status is "Processed" or "Completed".
   - If the transaction is "Failed" or "In Progress", the POP tab MUST NOT be visible.
2. **Tab Layout & Navigation:**
   - The POP tab MUST contain a two-column layout: a left-hand navigation listbox and a right-hand content area.
   - The listbox MUST allow the user to toggle between "Download" and "Send" actions.
3. **Download POP Action:**
   - When "Download" is selected, the system MUST display the transaction reference and provide a "Download POP_{reference}.pdf" button.
   - Clicking the download button MUST initiate the download of the mock PDF document.
4. **Send POP via Email Action:**
   - When "Send" is selected, the system MUST display an email composition form.
   - The form MUST include mandatory fields: "Send to", "Subject", and "Message".
   - The fields MUST be pre-populated where applicable (e.g., sender's email address).
   - Clicking the "Send Email" button MUST change the button state to a green "Sent Successfully ✓" for 3 seconds before reverting to its original state to provide visual confirmation to the agent.
