# Customer Support Portal â€” User Stories & Acceptance Criteria

---

## Epic 1: Support Agent Authentication

### US-1.1: Support Agent Login

**Title:** Support Agent Login with Email and Password

**As a** support agent,
**I want** to log in to the Customer Support Portal using my email address and password,
**So that** I can securely access the support tools and begin assisting customers.

#### Acceptance Criteria

**AC-1.1.1: Successful login with valid credentials**

```gherkin
Given the support agent is on the Support Login page
When the agent enters a valid registered email address in the "Email Address" field
And the agent enters the correct password in the "Password" field
And the agent clicks the "Sign In" button
Then the system shall authenticate the agent
And the system shall redirect the agent to the Support Dashboard
And the system shall store the agent session in session storage
```

**AC-1.1.2: Login button loading state**

```gherkin
Given the support agent has entered valid credentials
When the agent clicks the "Sign In" button
Then the button text shall change to "Signing in..."
And the button shall be disabled to prevent duplicate submissions
And the system shall display the loading state until authentication completes
```

**AC-1.1.3: Login failure with invalid email**

```gherkin
Given the support agent is on the Support Login page
When the agent enters an unregistered email address in the "Email Address" field
And the agent enters any password in the "Password" field
And the agent clicks the "Sign In" button
Then the system shall display an error message indicating invalid credentials
And the agent shall remain on the Login page
And the password field shall be cleared
```

**AC-1.1.4: Login failure with incorrect password**

```gherkin
Given the support agent is on the Support Login page
When the agent enters a valid registered email address in the "Email Address" field
And the agent enters an incorrect password in the "Password" field
And the agent clicks the "Sign In" button
Then the system shall display an error message indicating invalid credentials
And the agent shall remain on the Login page
And the password field shall be cleared
```

**AC-1.1.5: Email field validation**

```gherkin
Given the support agent is on the Support Login page
When the agent enters a value that is not a valid email format (e.g. missing "@" or domain)
And the agent clicks the "Sign In" button
Then the system shall display a validation error for the email field
And the form shall not be submitted
```

**AC-1.1.6: Required fields validation**

```gherkin
Given the support agent is on the Support Login page
When the agent leaves the "Email Address" field empty
Or the agent leaves the "Password" field empty
And the agent clicks the "Sign In" button
Then the system shall display a validation error indicating the required fields
And the form shall not be submitted
```

**AC-1.1.7: Both fields empty submission**

```gherkin
Given the support agent is on the Support Login page
When the agent clicks the "Sign In" button without entering any credentials
Then the system shall display validation errors for both the "Email Address" and "Password" fields
And the form shall not be submitted
```

---

### US-1.2: Support Agent Logout

**Title:** Support Agent Logout and Session Termination

**As a** support agent,
**I want** to log out of the Customer Support Portal,
**So that** my session is securely terminated and no unauthorised user can access the portal from my device.

#### Acceptance Criteria

**AC-1.2.1: Successful logout**

```gherkin
Given the support agent is logged in and viewing any page in the Support Portal
When the agent clicks the "Logout" button in the sidebar footer
Then the system shall clear the agent session from session storage
And the system shall redirect the agent to the Support Login page
```

**AC-1.2.2: Accessing protected pages after logout**

```gherkin
Given the support agent has logged out of the portal
When the agent attempts to navigate to any protected page (e.g. /support/, /support/transactions)
Then the system shall redirect the agent to the Support Login page
And no support portal content shall be displayed
```

---

### US-1.3: Protected Route Access

**Title:** Restrict Unauthorised Access to Support Portal Pages

**As a** system administrator,
**I want** all Support Portal pages (except Login) to be accessible only to authenticated agents,
**So that** unauthorised users cannot view sensitive customer or transaction data.

#### Acceptance Criteria

**AC-1.3.1: Unauthenticated access to protected routes**

```gherkin
Given a user is not authenticated (no valid session exists)
When the user attempts to navigate to any protected Support Portal route
Then the system shall redirect the user to the Support Login page
And no protected content shall be rendered
```

**AC-1.3.2: Authenticated access to protected routes**

```gherkin
Given the support agent is authenticated with a valid session
When the agent navigates to any Support Portal route
Then the system shall render the requested page with full content
And the sidebar navigation shall be visible
```

---

## Epic 2: Navigation & Sidebar

### US-2.1: Sidebar Navigation

**Title:** Navigate Between Support Portal Pages via Sidebar

**As a** support agent,
**I want** to navigate between all sections of the Support Portal using a persistent sidebar,
**So that** I can quickly access any tool I need without losing my place.

#### Acceptance Criteria

**AC-2.1.1: Sidebar displays all navigation links**

```gherkin
Given the support agent is logged in to the Support Portal
When any page is loaded
Then the sidebar shall display the following navigation links:
  | Link               | Icon |
  | Dashboard Home      | chart icon |
  | Transaction Search  | search icon |
  | Help Tickets        | ticket icon |
  | Rates               | currency icon |
And each link shall navigate to its corresponding page when clicked
```

**AC-2.1.2: Active page highlighting**

```gherkin
Given the support agent is viewing a page in the Support Portal
When the sidebar is rendered
Then the navigation link corresponding to the current page shall be visually highlighted
And all other links shall appear in their default inactive style
```

**AC-2.1.3: Sidebar footer displays agent profile**

```gherkin
Given the support agent is logged in
When the sidebar is rendered
Then the sidebar footer shall display the agent's initials in an avatar circle
And the agent's full name shall be displayed
And the agent's role shall be displayed
And a "Logout" button shall be visible
And a "Change Password" link shall be visible
```

**AC-2.1.4: Sidebar branding**

```gherkin
Given the support agent is logged in
When the sidebar is rendered
Then the sidebar header shall display the MITO logo
And the text "Support Portal" shall be displayed beneath the logo
```

**AC-2.1.5: Mobile responsive sidebar toggle**

```gherkin
Given the support agent is accessing the portal on a mobile device or narrow screen
When the page is loaded
Then a hamburger menu button (â˜°) shall be displayed
When the agent clicks the hamburger menu button
Then the sidebar shall expand and become visible
When the agent clicks the hamburger menu button again or navigates to a page
Then the sidebar shall collapse and be hidden
```

---

## Epic 3: Dashboard & Operational Overview

### US-3.1: View Transaction KPIs

**Title:** View Transaction Key Performance Indicators on Dashboard

**As a** support agent,
**I want** to view key transaction performance indicators on the Dashboard,
**So that** I can quickly assess the operational health of the money transfer service.

#### Acceptance Criteria

**AC-3.1.1: KPI cards display on dashboard load**

```gherkin
Given the support agent is logged in
When the agent navigates to the Support Dashboard
Then the system shall display four KPI cards:
  | Card            | Colour |
  | Total Transactions | Blue   |
  | Successful         | Green  |
  | Failed             | Red    |
  | In Progress        | Amber  |
And each card shall display the corresponding count for the selected time period
```

**AC-3.1.2: Time period filter for KPIs**

```gherkin
Given the support agent is on the Support Dashboard
When the agent selects a time period filter button
Then the following options shall be available: "Day", "Week", "Month", "Year"
And when a period is selected, the KPI card values shall update to reflect data for that period
And the selected period button shall be visually highlighted
```

**AC-3.1.3: Default time period on load**

```gherkin
Given the support agent navigates to the Support Dashboard
When the page loads for the first time
Then the default time period filter shall be "Day"
And the KPI cards shall display data for the current day
```

---

### US-3.2: View Help Ticket Distribution Chart

**Title:** View Help Ticket Status Distribution on Dashboard

**As a** support agent,
**I want** to see a visual breakdown of help ticket statuses on the Dashboard,
**So that** I can quickly understand the current workload and prioritise my efforts.

#### Acceptance Criteria

**AC-3.2.1: Donut chart displays ticket distribution**

```gherkin
Given the support agent is on the Support Dashboard
When the Help Tickets section is rendered
Then a donut chart shall be displayed showing the distribution of tickets by status
And the chart shall include the following status categories with their respective colours:
  | Status   | Colour |
  | Resolved | Green  |
  | Open     | Blue   |
  | New      | Orange |
  | Spam     | Grey   |
```

**AC-3.2.2: Ticket chart time period filter**

```gherkin
Given the support agent is viewing the Help Tickets section on the Dashboard
When the agent selects a time period filter (Day, Week, Month, Year)
Then the donut chart shall update to reflect the ticket distribution for the selected period
```

---

### US-3.3: Escalation Alert System

**Title:** Receive Escalation Alerts for High Failure Rates

**As a** support agent,
**I want** to receive an automatic audio and visual alert when the transaction failure or in-progress rate exceeds a critical threshold,
**So that** I can immediately investigate and respond to potential service issues.

#### Acceptance Criteria

**AC-3.3.1: Escalation alert triggers on threshold breach**

```gherkin
Given the support agent is on the Support Dashboard
When the combined transaction failure and in-progress rate exceeds 3% in the last 30 minutes
Then the system shall play an audio alert (a short beep tone)
And a modal overlay shall appear with a warning icon and red banner
And the modal shall display a message describing the escalation condition
And an "Acknowledge" button shall be displayed on the modal
```

**AC-3.3.2: Dismissing the escalation alert**

```gherkin
Given the escalation alert modal is displayed
When the support agent clicks the "Acknowledge" button
Then the modal shall close
And the audio alert shall stop
And the agent shall be returned to the Dashboard view
```

**AC-3.3.3: No alert when threshold is not breached**

```gherkin
Given the support agent is on the Support Dashboard
When the combined transaction failure and in-progress rate is at or below 3% in the last 30 minutes
Then no escalation alert modal shall be displayed
And no audio alert shall play
```

---

## Epic 4: Transaction Search

### US-4.1: Search Transactions

**Title:** Search Transactions by Reference or Email

**As a** support agent,
**I want** to search for transactions by transaction reference number or sender email address,
**So that** I can quickly locate a specific transaction to assist a customer.

#### Acceptance Criteria

**AC-4.1.1: Search by transaction reference**

```gherkin
Given the support agent is on the Transaction Search page
When the agent enters a valid transaction reference (e.g. "MITO-7721003") in the search input field
And the agent clicks the "Search" button
Then the system shall display matching transactions in a results table
And the results table shall show columns: Reference, Date, Beneficiary, Sender, Status, Payout, Action
```

**AC-4.1.2: Search by sender email**

```gherkin
Given the support agent is on the Transaction Search page
When the agent enters a valid sender email address (e.g. "ogbeide.sender@example.com") in the search input field
And the agent clicks the "Search" button
Then the system shall display all transactions associated with that email address
And date range filters and status filter shall become visible
```

**AC-4.1.3: Search button loading state**

```gherkin
Given the support agent has entered a search query
When the agent clicks the "Search" button
Then the button text shall change to "Searching..."
And the button shall be disabled until results are returned
```

**AC-4.1.4: No results found**

```gherkin
Given the support agent is on the Transaction Search page
When the agent enters a search query that does not match any transaction
And the agent clicks the "Search" button
Then the system shall display an empty state with a search icon
And the message "No Transaction Found" shall be shown
```

**AC-4.1.5: Empty search query**

```gherkin
Given the support agent is on the Transaction Search page
When the search input field is empty
Then the system shall display a placeholder message: "Enter search criteria above to find transactions."
And no results table shall be shown
```

**AC-4.1.6: Demo search tips**

```gherkin
Given the support agent is on the Transaction Search page
When the page is loaded
Then demo tip buttons shall be displayed (e.g. "MITO-7721003", "ogbeide.sender@example.com")
When the agent clicks a demo tip button
Then the search input shall be populated with the tip value
```

**AC-4.1.7: PII masking in search results**

```gherkin
Given the search results table is displayed
When the agent views the Beneficiary column
Then the beneficiary name shall be masked (showing first letter of each word plus asterisks)
And the beneficiary phone number shall be masked (showing only the last 4 digits)
When the agent views the Sender column
Then the sender name shall be masked
And the sender phone number shall be masked (showing only the last 4 digits)
And the sender email shall be masked (showing first character, asterisks, last character before @, and full domain)
```

---

### US-4.2: Filter Transaction Search Results

**Title:** Filter Transaction Search Results by Date Range and Status

**As a** support agent,
**I want** to filter transaction search results by date range and transaction status when searching by email,
**So that** I can narrow down results and find the exact transaction I need.

#### Acceptance Criteria

**AC-4.2.1: Date range filters appear for email search**

```gherkin
Given the support agent has searched by sender email address
When the results are displayed
Then a "Start Date" date picker field shall be visible
And an "End Date" date picker field shall be visible
And the default date range shall cover the last 30 days
```

**AC-4.2.2: Filter by date range**

```gherkin
Given the support agent has search results displayed from an email search
When the agent selects a "Start Date" and an "End Date"
Then the results table shall update to show only transactions within the selected date range
```

**AC-4.2.3: Filter by transaction status**

```gherkin
Given the support agent has search results displayed from an email search
When the agent selects a status from the Status dropdown
Then the following options shall be available: "All Statuses", "Processed", "Completed", "Failed", "In Progress"
And the results table shall update to show only transactions matching the selected status
```

**AC-4.2.4: Filters hidden for reference search**

```gherkin
Given the support agent has searched by transaction reference number
When the results are displayed
Then the date range filters and status dropdown shall not be visible
```

---

### US-4.3: Navigate to Transaction Details from Search Results

**Title:** View Transaction Details from Search Results

**As a** support agent,
**I want** to click on a transaction in the search results to view its full details,
**So that** I can investigate the transaction thoroughly and assist the customer.

#### Acceptance Criteria

**AC-4.3.1: Navigate via row click**

```gherkin
Given the support agent is viewing transaction search results
When the agent clicks on any row in the results table
Then the system shall navigate to the Transaction Details page for that transaction
And the search context shall be stored in session storage so the agent can return to their results
```

**AC-4.3.2: Navigate via View button**

```gherkin
Given the support agent is viewing transaction search results
When the agent clicks the "View" button in the Action column of a transaction row
Then the system shall navigate to the Transaction Details page for that transaction
```

---

## Epic 5: Transaction Details

### US-5.1: View Transaction Details

**Title:** View Complete Transaction Information

**As a** support agent,
**I want** to view the complete details of a transaction including sender, beneficiary, and service information,
**So that** I can fully understand the transaction and resolve any customer queries.

#### Acceptance Criteria

**AC-5.1.1: Transaction details tab displays all fields**

```gherkin
Given the support agent is on the Transaction Details page
When the "Details" tab is active (default)
Then the following transaction information shall be displayed:
  | Field             | Description                        |
  | MTN               | Money Transfer Number              |
  | Affiliate         | Affiliate partner name             |
  | Status            | Current transaction status (colour-coded badge) |
  | Type              | Transaction type (e.g. MONEYTRANSFER) |
  | Sending Country   | Country code of origin             |
```

**AC-5.1.2: Beneficiary section with masked PII**

```gherkin
Given the support agent is viewing the Details tab
When the Beneficiary section is rendered
Then the following fields shall be displayed with PII masking:
  | Field         | Masking Rule                              |
  | Name          | First letter of each word plus asterisks  |
  | Contact Phone | Only last 4 digits visible                |
  | Email         | First char, asterisks, last char before @ |
  | Address       | Only country/state visible after first comma |
```

**AC-5.1.3: Sender section with masked PII**

```gherkin
Given the support agent is viewing the Details tab
When the Sender section is rendered
Then the following fields shall be displayed with PII masking:
  | Field         | Masking Rule                              |
  | Name          | First letter of each word plus asterisks  |
  | Contact Phone | Only last 4 digits visible                |
  | Email         | First char, asterisks, last char before @ |
  | Address       | Only country/state visible after first comma |
```

**AC-5.1.4: Service and financial section**

```gherkin
Given the support agent is viewing the Details tab
When the Service section is rendered
Then the following fields shall be displayed:
  | Field            | Format                         |
  | Service Name     | Full name (e.g. "ZENITH BANK PLC") |
  | Service Code     | Monospace font (e.g. "1011")   |
  | Collection Method| e.g. "BANKACCOUNT"             |
  | Account Number   | Masked (only last 4 digits)    |
  | Rate             | Exchange rate number           |
  | Payout           | Local currency amount (green text) |
  | Settle Amount    | Intermediate currency amount   |
  | Total Paid       | Final amount paid              |
```

**AC-5.1.5: Transaction not found**

```gherkin
Given the support agent navigates to a Transaction Details page
When the transaction reference does not match any known transaction
Then the system shall display a "Transaction Not Found" message
And a "Back to Search" button shall be displayed
When the agent clicks the "Back to Search" button
Then the agent shall be redirected to the Transaction Search page
```

**AC-5.1.6: Back navigation to search results**

```gherkin
Given the support agent navigated to Transaction Details from the search results
When the agent clicks the "Back" link at the top of the page
Then the agent shall be returned to the Transaction Search page
And the previous search query shall be restored
```

---

### US-5.2: View Transaction Audit Trail

**Title:** View Transaction Audit Trail Timeline

**As a** support agent,
**I want** to view the audit trail of a transaction as a visual timeline,
**So that** I can trace the transaction's journey through each processing step and identify where issues occurred.

#### Acceptance Criteria

**AC-5.2.1: Audit trail tab displays timeline**

```gherkin
Given the support agent is on the Transaction Details page
When the agent clicks the "Trail" tab
Then a vertical timeline shall be displayed showing each processing step
And each step shall show the event name and timestamp
```

**AC-5.2.2: Colour-coded status indicators on timeline**

```gherkin
Given the audit trail timeline is displayed
When the agent views the timeline steps
Then each step shall have a colour-coded status dot:
  | Status   | Dot Colour |
  | Complete | Green      |
  | Current  | Amber      |
  | Failed   | Red        |
And completed steps shall appear above current or failed steps in chronological order
```

---

### US-5.3: View Transaction KYC Status

**Title:** View KYC Verification Status for a Transaction

**As a** support agent,
**I want** to view the KYC verification status associated with a transaction,
**So that** I can inform the customer of their verification outcome and escalate if needed.

#### Acceptance Criteria

**AC-5.3.1: KYC tab displays verification status**

```gherkin
Given the support agent is on the Transaction Details page
When the agent clicks the "KYC" tab
Then the KYC verification status shall be displayed prominently with a large icon
And a colour-coded status badge shall indicate the result:
  | Status  | Colour | Icon |
  | Passed  | Green  | tick mark  |
  | Pending | Amber  | hourglass  |
  | Failed  | Red    | cross mark |
And the last updated timestamp shall be displayed beneath the status
```

---

### US-5.4: Add Comments to a Transaction

**Title:** Add and View Agent Comments on a Transaction

**As a** support agent,
**I want** to add comments to a transaction and view the existing comment thread,
**So that** I can document my actions and communicate with other agents handling the same case.

#### Acceptance Criteria

**AC-5.4.1: View existing comment thread**

```gherkin
Given the support agent is on the Transaction Details page
When the agent clicks the "Comments" tab
Then the system shall display all existing comments in a scrollable thread
And system messages shall be displayed in italic, centred text with a grey background
And agent messages shall be displayed left-aligned with a white background and border
And each message shall show the sender name and timestamp
```

**AC-5.4.2: Post a new comment**

```gherkin
Given the support agent is viewing the Comments tab
When the agent enters text in the comment input field (placeholder: "Add a comment to this transaction...")
And the agent clicks the "Post" button
Then the new comment shall be appended to the thread immediately
And the comment shall display the agent's name and the current timestamp
And the input field shall be cleared
```

**AC-5.4.3: Empty comment prevention**

```gherkin
Given the support agent is viewing the Comments tab
When the comment input field is empty or contains only whitespace
And the agent clicks the "Post" button
Then no comment shall be added to the thread
And the input field shall remain unchanged
```

**AC-5.4.4: Unread comment notification indicator**

```gherkin
Given a transaction has new comments that the agent has not viewed
When the agent is on any tab other than the "Comments" tab
Then a red notification dot shall appear on the "Comments" tab label
When the agent clicks the "Comments" tab
Then the red notification dot shall be cleared
```

---

### US-5.5: View and Create Linked Help Tickets from Transaction

**Title:** View and Create Help Tickets Linked to a Transaction

**As a** support agent,
**I want** to view help tickets linked to a transaction and create new linked tickets,
**So that** I can track all customer issues related to a specific transaction in one place.

#### Acceptance Criteria

**AC-5.5.1: View linked tickets list**

```gherkin
Given the support agent is on the Transaction Details page
When the agent clicks the "Help Tickets" tab
Then the system shall display a list of help tickets linked to this transaction
And each ticket shall show: Ticket ID, Subject, Customer Name, Created Date, Status
```

**AC-5.5.2: Filter linked tickets by status**

```gherkin
Given the support agent is viewing the Help Tickets tab on Transaction Details
When the agent clicks a status filter tab (New, Open, In Progress, Resolved)
Then only tickets matching the selected status shall be displayed
```

**AC-5.5.3: Search linked tickets**

```gherkin
Given the support agent is viewing the Help Tickets tab on Transaction Details
When the agent enters text in the ticket search field
Then the ticket list shall be filtered to show only tickets matching the search query
And the search shall match against ticket ID, subject, or customer name
```

**AC-5.5.4: Create new linked ticket via modal**

```gherkin
Given the support agent is viewing the Help Tickets tab on Transaction Details
When the agent clicks the button to create a new linked ticket
Then a modal dialogue shall appear with the following fields:
  | Field       | Type     | Required |
  | Subject     | Text     | Yes      |
  | Message     | Textarea | Yes      |
  | Attachments | File     | No       |
When the agent fills in the required fields and submits
Then the new ticket shall be created and linked to the current transaction
And the modal shall close
And the new ticket shall appear in the linked tickets list
```

**AC-5.5.5: Unread ticket notification indicator**

```gherkin
Given a transaction has new linked tickets that the agent has not viewed
When the agent is on any tab other than the "Help Tickets" tab
Then a red notification dot shall appear on the "Help Tickets" tab label
When the agent clicks the "Help Tickets" tab
Then the red notification dot shall be cleared
```

---

### US-5.6: Navigate Between Transaction Detail Tabs

**Title:** Switch Between Transaction Detail Tabs

**As a** support agent,
**I want** to switch between the Details, Trail, KYC, Comments, and Help Tickets tabs on the Transaction Details page,
**So that** I can view different aspects of the transaction without navigating away.

#### Acceptance Criteria

**AC-5.6.1: Tab navigation and persistence**

```gherkin
Given the support agent is on the Transaction Details page
When the agent clicks on any of the following tabs: "Details", "Trail", "KYC", "Comments", "Help Tickets"
Then the content area shall update to display the corresponding section
And the selected tab shall be visually highlighted
And the tab selection shall be reflected in the URL query parameter (e.g. ?tab=Comments)
```

**AC-5.6.2: Default tab on page load**

```gherkin
Given the support agent navigates to the Transaction Details page without a tab query parameter
When the page loads
Then the "Details" tab shall be active by default
And the transaction detail information shall be displayed
```

---

## Epic 6: Help Tickets Management

### US-6.1: View Help Tickets List

**Title:** View and Browse Help Tickets by Status Category

**As a** support agent,
**I want** to view all help tickets organised by status category in a tabular list,
**So that** I can prioritise and manage my ticket workload effectively.

#### Acceptance Criteria

**AC-6.1.1: Ticket list table structure**

```gherkin
Given the support agent is on the Help Tickets page
When the page loads
Then a table shall be displayed with the following columns:
  | Column    | Description                     |
  | Ticket no | Unique ticket identifier        |
  | Date      | Ticket creation date and time   |
  | Name      | Customer name                   |
  | Subject   | Brief description of the issue  |
  | Status    | Colour-coded status badge       |
And each row shall be clickable to navigate to the ticket detail view
```

**AC-6.1.2: Status tab navigation with counts**

```gherkin
Given the support agent is on the Help Tickets page
When the page loads
Then the following status tabs shall be displayed with their respective ticket counts:
  | Tab     |
  | New     |
  | Open    |
  | Resolved|
  | Spam    |
  | Blocked |
  | All     |
And the "New" tab shall be active by default
And clicking a tab shall filter the list to show only tickets of that status
And the "All" tab shall display tickets across all statuses
```

**AC-6.1.3: Status badge colours**

```gherkin
Given the support agent is viewing the ticket list
When ticket status badges are rendered
Then each status shall have a distinct colour scheme:
  | Status   | Badge Background | Text Colour |
  | New      | Light red        | Red         |
  | Open     | Light blue       | Blue        |
  | Resolved | Light green      | Green       |
  | Spam     | Light yellow     | Amber       |
  | Blocked  | Light purple     | Purple      |
  | Reopened | Light amber      | Brown       |
```

**AC-6.1.4: Empty state for no tickets**

```gherkin
Given the support agent is on the Help Tickets page
When a status tab is selected that has no matching tickets
Then the message "No tickets in this category" shall be displayed
And no table rows shall be rendered
```

**AC-6.1.5: Tab count updates after status change**

```gherkin
Given the support agent changes the status of a ticket (e.g. from "New" to "Resolved")
When the agent returns to the Help Tickets list
Then the counts on the status tabs shall be updated to reflect the change
```

---

### US-6.2: Search and Filter Help Tickets

**Title:** Search and Filter Help Tickets Using Quick Search and Advanced Filters

**As a** support agent,
**I want** to search tickets by keyword and apply advanced filters,
**So that** I can quickly find specific tickets from a potentially large list.

#### Acceptance Criteria

**AC-6.2.1: Quick search by keyword**

```gherkin
Given the support agent is on the Help Tickets page
When the agent enters text in the search input field
Then the ticket list shall filter in real time to show only tickets where the search query matches:
  | Searchable Field |
  | Ticket ID        |
  | Customer name    |
  | Subject          |
  | Email address    |
And the filtering shall be case-insensitive
```

**AC-6.2.2: Open advanced filter panel**

```gherkin
Given the support agent is on the Help Tickets page
When the agent clicks the "Filter" button
Then an expandable filter panel shall appear with the following fields:
  | Field        | Type | Placeholder      |
  | Ticket no    | Text | Enter ticket no  |
  | Email        | Text | Enter email      |
  | Name         | Text | Enter name       |
  | Subject      | Text | Enter subject    |
  | Created From | Text | Created From     |
  | Created Till | Text | Created Till     |
```

**AC-6.2.3: Apply advanced filters**

```gherkin
Given the support agent has entered values in one or more advanced filter fields
When the agent clicks the "Apply" button
Then the ticket list shall be filtered to show only tickets matching all applied filter criteria
And the filters shall work in combination with the currently active status tab
```

**AC-6.2.4: Clear all filters**

```gherkin
Given the support agent has applied one or more advanced filters
When the agent clicks the "Clear all" button
Then all advanced filter fields shall be emptied
And the ticket list shall revert to showing all tickets for the active status tab
```

**AC-6.2.5: Close filter panel**

```gherkin
Given the advanced filter panel is open
When the agent clicks the "Filter" button again
Then the filter panel shall collapse and be hidden
And any entered filter values shall be retained
```

---

### US-6.3: View Help Ticket Detail

**Title:** View Complete Help Ticket Information and Conversation Thread

**As a** support agent,
**I want** to view the full details and conversation thread of a help ticket,
**So that** I can understand the customer's issue and provide an informed response.

#### Acceptance Criteria

**AC-6.3.1: Ticket detail view displays all information**

```gherkin
Given the support agent is on the Help Tickets page
When the agent clicks on a ticket row in the list
Then the system shall navigate to the ticket detail view
And the following ticket information shall be displayed in a structured grid:
  | Field           | Description                       |
  | Ticket No.      | Unique ticket identifier          |
  | Request date    | Date and time the ticket was created |
  | Name            | Customer name                     |
  | Email           | Customer email address            |
  | User type       | e.g. "Registered user", "Unregistered user", "Affiliate", "Blocked user" |
  | Transaction Ref#| Associated order number or "N/A"  |
  | Platform        | Source platform (e.g. "Mito.Money (iOS)", "Cokobar (Web (Mobile))") |
  | Ticket status   | Colour-coded status badge         |
  | Subject         | Issue summary                     |
```

**AC-6.3.2: Conversation thread display**

```gherkin
Given the support agent is viewing a ticket detail
When the conversation thread is rendered
Then each message shall be displayed with:
  | Element        | Description                        |
  | Avatar         | Circular avatar with sender's initial |
  | Sender name    | "Support Agent" for agents, customer name for customers |
  | Timestamp      | Time the message was sent          |
  | Message body   | Full text of the message           |
And agent messages shall have a purple left border and light purple background
And customer messages shall have a grey left border and light grey background
And messages shall appear in chronological order (oldest first)
```

**AC-6.3.3: Back navigation from ticket detail**

```gherkin
Given the support agent is viewing a ticket detail
When the agent clicks the "â† Back to list" button
Then the agent shall be returned to the Help Tickets list page
And the previously active status tab shall be preserved
```

**AC-6.3.4: Ticket not found**

```gherkin
Given the support agent navigates to a ticket detail URL with an invalid ticket ID
When the page loads
Then the message "Ticket not found" shall be displayed
And a "Back to help tickets" button shall be provided
```

---

### US-6.4: Reply to a Help Ticket

**Title:** Reply to a Customer Help Ticket with Rich Text and Attachments

**As a** support agent,
**I want** to compose and send a reply to a customer's help ticket with formatting and file attachments,
**So that** I can communicate clearly and provide supporting documents to resolve the customer's issue.

#### Acceptance Criteria

**AC-6.4.1: Initiate reply**

```gherkin
Given the support agent is viewing a ticket detail
When the agent clicks the "Reply" button
Or the agent clicks the placeholder text "Click 'Reply' or type here to start replying..."
Then the rich text reply editor shall expand and become visible
And the editor shall include a formatting toolbar with: Bold, Italic, Underline, Strikethrough, Quote, Link, Ordered list, Unordered list, Subscript, Superscript, Text style selector, Font colour options
```

**AC-6.4.2: Send a reply**

```gherkin
Given the support agent has typed a message in the reply editor
When the agent clicks the "Send" button
Then the reply shall be appended to the conversation thread as an agent message
And the reply editor shall collapse
And the reply text shall be cleared
And the timestamp of the reply shall reflect the current time
```

**AC-6.4.3: Auto-update ticket status on first reply**

```gherkin
Given the support agent is replying to a ticket with status "New"
When the agent sends the reply
Then the ticket status shall automatically change from "New" to "Open"
```

**AC-6.4.4: Empty reply prevention**

```gherkin
Given the support agent has the reply editor open
When the reply text area is empty or contains only whitespace
And the agent clicks the "Send" button
Then no reply shall be sent
And the reply editor shall remain open
```

**AC-6.4.5: Cancel reply**

```gherkin
Given the support agent has the reply editor open
When the agent clicks the close button (âœ•) on the reply editor
Then the reply editor shall collapse
And any typed text shall be discarded
```

**AC-6.4.6: Add attachment to reply**

```gherkin
Given the support agent has the reply editor open
When the agent clicks the "Add Attachment" button
Then a file selection dialogue shall appear
And the agent shall be able to select one or more files to attach to the reply
```

---

### US-6.5: Change Help Ticket Status

**Title:** Change the Status of a Help Ticket

**As a** support agent,
**I want** to change the status of a help ticket based on the resolution progress,
**So that** the ticket lifecycle is accurately tracked and other agents can see the current state.

#### Acceptance Criteria

**AC-6.5.1: Available actions for New/Open/Reopened tickets**

```gherkin
Given the support agent is viewing a ticket with status "New", "Open", or "Reopened"
When the ticket detail action bar is rendered
Then the following action buttons shall be available:
  | Button            | Action                          |
  | Reply             | Opens the reply editor           |
  | Mark as resolved  | Changes status to "Resolved"    |
  | Mark as spam      | Changes status to "Spam"        |
```

**AC-6.5.2: Mark ticket as resolved**

```gherkin
Given the support agent is viewing a ticket with status "New", "Open", or "Reopened"
When the agent clicks the "Mark as resolved" button
Then the ticket status shall change to "Resolved"
And the status badge shall update to show "Resolved" in green
```

**AC-6.5.3: Available actions for Resolved tickets**

```gherkin
Given the support agent is viewing a ticket with status "Resolved"
When the ticket detail action bar is rendered
Then the following action buttons shall be available:
  | Button    | Action                        |
  | Reply     | Opens the reply editor         |
  | Re-Open   | Changes status to "Reopened"  |
```

**AC-6.5.4: Re-open a resolved ticket**

```gherkin
Given the support agent is viewing a ticket with status "Resolved"
When the agent clicks the "Re-Open" button
Then the ticket status shall change to "Reopened"
And the status badge shall update to show "Reopened" in amber
```

**AC-6.5.5: Available actions for Spam tickets**

```gherkin
Given the support agent is viewing a ticket with status "Spam"
When the ticket detail action bar is rendered
Then the following action buttons shall be available:
  | Button      | Action                        |
  | Reply       | Opens the reply editor         |
  | Re-Open     | Changes status to "Reopened"  |
  | Block user  | Changes status to "Blocked"   |
```

**AC-6.5.6: Block a user from a spam ticket**

```gherkin
Given the support agent is viewing a ticket with status "Spam"
When the agent clicks the "Block user" button
Then the ticket status shall change to "Blocked"
And the status badge shall update to show "Blocked" in purple
```

**AC-6.5.7: Available actions for Blocked tickets**

```gherkin
Given the support agent is viewing a ticket with status "Blocked"
When the ticket detail action bar is rendered
Then the following action buttons shall be available:
  | Button   | Action                       |
  | Reply    | Opens the reply editor        |
  | Unblock  | Changes status to "Open"     |
```

**AC-6.5.8: Unblock a user**

```gherkin
Given the support agent is viewing a ticket with status "Blocked"
When the agent clicks the "Unblock" button
Then the ticket status shall change to "Open"
And the status badge shall update to show "Open" in blue
```

---

### US-6.6: Create a New Help Ticket

**Title:** Create a New Help Ticket on Behalf of a Customer

**As a** support agent,
**I want** to create a new help ticket on behalf of a customer,
**So that** I can log customer issues received through channels outside the self-service portal (e.g. phone or email).

#### Acceptance Criteria

**AC-6.6.1: Open create ticket modal**

```gherkin
Given the support agent is on the Help Tickets list page
When the agent clicks the "âŠ• Create ticket" button
Then a modal dialogue shall appear with the title "Create a new ticket"
And a close button (âœ•) shall be displayed at the top right of the modal
```

**AC-6.6.2: Create ticket form fields**

```gherkin
Given the create ticket modal is open
Then the following form fields shall be displayed:
  | Field        | Type      | Required | Validation                      |
  | Select user  | Dropdown  | Yes      | Must select a user from the list |
  | Subject      | Text      | Yes      | Must not be empty; maximum 200 characters |
  | Message      | Rich text | Yes      | Must not be empty                |
  | Attachments  | File      | No       | Optional file upload             |
And the "Select user" dropdown shall list existing users
And the Message field shall include a rich text toolbar with formatting options (Bold, Italic, Underline, Strikethrough, Quote, Link, Lists, Sub/Superscript, Text style, Font colour)
```

**AC-6.6.3: Submit new ticket**

```gherkin
Given the support agent has filled in all required fields in the create ticket form
When the agent clicks the "Create ticket" button
Then the new ticket shall be created with status "New"
And the modal shall close
And the new ticket shall appear in the Help Tickets list under the "New" tab
And the ticket count on the "New" tab shall increment by one
```

**AC-6.6.4: Required field validation on create**

```gherkin
Given the support agent has the create ticket modal open
When the agent clicks "Create ticket" without selecting a user
Or without entering a subject
Or without entering a message
Then the system shall display validation errors on the empty required fields
And the ticket shall not be created
```

**AC-6.6.5: Close create ticket modal**

```gherkin
Given the create ticket modal is open
When the agent clicks the close button (âœ•)
Then the modal shall close
And no ticket shall be created
And any entered data shall be discarded
```

---

## Epic 7: Exchange Rates & Corridors

### US-7.1: View Exchange Rates and Corridors

**Title:** View Exchange Rate Corridors in Read-Only Mode

**As a** support agent,
**I want** to view the current exchange rate corridors in a read-only table,
**So that** I can verify rates for customers and identify any rate-related issues.

#### Acceptance Criteria

**AC-7.1.1: Rates page header and read-only indicator**

```gherkin
Given the support agent navigates to the Rates page
When the page loads
Then the page header shall display the title "Exchange Rates & Corridors"
And a "Read Only" badge shall be prominently displayed in orange
And the description text shall read: "Review the exact table currently on screen, then export the filtered result set in CSV or PDF format."
```

**AC-7.1.2: Corridor table structure**

```gherkin
Given the support agent is on the Rates page
When the corridor data is loaded
Then a table shall be displayed with the following columns:
  | Column          | Description                          |
  | Ref             | Corridor reference ID (orange, bold)  |
  | Send Country    | Sending country or "ALL"              |
  | Receive Country | Receiving country or "ALL"            |
  | From-To         | Currency pair (e.g. "EUR - SGD")      |
  | Rates           | Exchange rate in monospace format      |
  | Status          | Active (green badge) or Inactive (red badge) |
```

**AC-7.1.3: Rate override indicator**

```gherkin
Given the support agent is viewing the corridor table
When a corridor has an overridden rate
Then a small amber "Override" badge shall be displayed next to the rate value
```

**AC-7.1.4: Filter summary display**

```gherkin
Given the support agent has applied filters on the Rates page
When the filter summary bar is rendered
Then it shall display the current filter selections in the format:
  "Affiliate: [value] | From: [value] | To: [value] | Status: [value]"
And a count shall be displayed: "Showing X of Y corridors"
```

---

### US-7.2: Filter Exchange Rate Corridors

**Title:** Filter Exchange Rate Corridors by Affiliate, Currency, and Status

**As a** support agent,
**I want** to filter the corridor table by affiliate, sending currency, receiving currency, and status,
**So that** I can quickly find the specific rate information I need.

#### Acceptance Criteria

**AC-7.2.1: Affiliate filter dropdown**

```gherkin
Given the support agent is on the Rates page
When the agent clicks the "Affiliate" dropdown
Then the following options shall be available:
  | Option        |
  | All Affiliates|
  | Rhemito       |
  | BasketMouth   |
  | Sika          |
  | FastPay       |
  | GlobalSend    |
And the default selection shall be "Rhemito"
And a search input shall be available within the dropdown for typeahead filtering
```

**AC-7.2.2: From Currency filter dropdown**

```gherkin
Given the support agent is on the Rates page
When the agent clicks the "From Currency" dropdown
Then the dropdown shall display currency options with:
  | Element     | Example              |
  | Country flag| ðŸ‡¬ðŸ‡§                  |
  | Currency name| British Pound       |
  | ISO 4217 code| GBP                 |
  | Symbol      | Â£                    |
And a search input shall allow filtering by currency name, code, or symbol
And the selected option shall be highlighted with a checkmark
```

**AC-7.2.3: To Currency filter dropdown**

```gherkin
Given the support agent is on the Rates page
When the agent clicks the "To Currency" dropdown
Then the dropdown shall display the same currency options as the "From Currency" dropdown
And the agent shall be able to search and select a receiving currency
```

**AC-7.2.4: Status filter**

```gherkin
Given the support agent is on the Rates page
When the agent interacts with the Status filter
Then the following options shall be available: "All Status", "Active", "Inactive"
And selecting a status shall filter the table to show only corridors matching that status
```

**AC-7.2.5: Combined filter application**

```gherkin
Given the support agent has selected values in multiple filter dropdowns
When the filters are applied
Then the corridor table shall update to show only corridors matching all selected criteria
And the filter summary shall update to reflect the current selections
And the corridor count shall update to show "Showing X of Y corridors"
```

**AC-7.2.6: Searchable dropdown interaction**

```gherkin
Given the support agent has opened a searchable dropdown (Affiliate, From Currency, or To Currency)
When the agent types in the search input within the dropdown
Then the options shall be filtered in real time based on the entered text
When the agent clicks an option
Then the dropdown shall close and the selected value shall be displayed
When the agent clicks outside the dropdown
Then the dropdown shall close without changing the selection
```

---

### US-7.3: Export Exchange Rate Corridors

**Title:** Export Filtered Exchange Rate Corridors as CSV or PDF

**As a** support agent,
**I want** to export the currently filtered corridor data as a CSV or branded PDF file,
**So that** I can share rate information with customers or internal teams.

#### Acceptance Criteria

**AC-7.3.1: Export as CSV**

```gherkin
Given the support agent is on the Rates page with filtered corridor data displayed
When the agent clicks the "Download CSV" button
Then a CSV file shall be downloaded with the filename "exchange-rates-corridors.csv"
And the CSV shall contain the following columns: Ref, Send Country, Receive Country, From-To, Rates, Status
And only the currently filtered corridors shall be included in the export
And values shall be properly quoted with escaped special characters
```

**AC-7.3.2: Export as PDF**

```gherkin
Given the support agent is on the Rates page with filtered corridor data displayed
When the agent clicks the "Download PDF" button
Then a PDF file shall be downloaded with the filename "exchange-rates-corridors.pdf"
And the PDF shall be in landscape orientation
And the PDF header shall include:
  | Element             | Description                       |
  | MITO logo           | Brand logo image                  |
  | Title               | "MITO | Exchange Rates & Corridors"|
  | Generated timestamp | Date and time of export           |
  | Filter summary      | Currently applied filter values   |
And the PDF shall contain a formatted table with alternating row colours
And only the currently filtered corridors shall be included
```

**AC-7.3.3: Export reflects current filters**

```gherkin
Given the support agent has applied specific filters on the Rates page
When the agent exports data as CSV or PDF
Then the exported file shall contain exactly the same rows visible in the on-screen table
And no additional or omitted rows shall be present
```

---

## Epic 8: Change Password

### US-8.1: Change Agent Password

**Title:** Change Support Agent Account Password

**As a** support agent,
**I want** to change my account password from within the Support Portal,
**So that** I can maintain the security of my account by updating my credentials periodically.

#### Acceptance Criteria

**AC-8.1.1: Change password form fields**

```gherkin
Given the support agent navigates to the Change Password page
When the page loads
Then the following form fields shall be displayed:
  | Field                 | Type     | Placeholder            | Required |
  | Current Password      | Password | Enter current password | Yes      |
  | New Password          | Password | Min 8 characters       | Yes      |
  | Confirm New Password  | Password | Re-enter new password  | Yes      |
And an "Update Password" button shall be displayed
```

**AC-8.1.2: Successful password change**

```gherkin
Given the support agent has entered a valid current password
And the agent has entered a new password that meets all validation rules
And the agent has entered the same new password in the confirmation field
When the agent clicks the "Update Password" button
Then a green success banner shall be displayed with a tick icon
And all form fields shall be cleared
```

**AC-8.1.3: Current password validation**

```gherkin
Given the support agent is on the Change Password page
When the agent enters an incorrect current password
And the agent clicks the "Update Password" button
Then an error message shall be displayed below the "Current Password" field
And the password shall not be changed
```

**AC-8.1.4: New password minimum length validation**

```gherkin
Given the support agent is on the Change Password page
When the agent enters a new password shorter than 8 characters
And the agent clicks the "Update Password" button
Then an error message shall be displayed below the "New Password" field indicating the minimum length requirement
And the password shall not be changed
```

**AC-8.1.5: New password must differ from current**

```gherkin
Given the support agent is on the Change Password page
When the agent enters the same value in both the "Current Password" and "New Password" fields
And the agent clicks the "Update Password" button
Then an error message shall be displayed indicating the new password must be different from the current password
And the password shall not be changed
```

**AC-8.1.6: Confirm password mismatch**

```gherkin
Given the support agent is on the Change Password page
When the agent enters a value in the "Confirm New Password" field that does not match the "New Password" field
And the agent clicks the "Update Password" button
Then an error message shall be displayed below the "Confirm New Password" field indicating the passwords do not match
And the password shall not be changed
```

**AC-8.1.7: Required fields validation**

```gherkin
Given the support agent is on the Change Password page
When the agent leaves any required field empty
And the agent clicks the "Update Password" button
Then error messages shall be displayed below each empty required field
And the password shall not be changed
```

**AC-8.1.8: Real-time error clearing**

```gherkin
Given an error message is displayed below a form field on the Change Password page
When the agent starts typing in that field
Then the error message for that field shall be cleared immediately
```

---

