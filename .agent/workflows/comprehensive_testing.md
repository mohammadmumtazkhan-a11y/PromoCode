---
description: Comprehensive Testing Protocol (Mandatory before User Notification)
---

# Comprehensive Testing Protocol

Before notifying the user of ANY completion, you MUST execute this workflow:

1.  **Scenario Analysis**:
    - Identify all critical scenarios and edge cases related to the change.
    - List them out (mental or in task.md).

2.  **Test Implementation**:
    - Create or update automated tests (Unit or Integration) for *every* identified scenario.
    - Run these tests and ensure they PASS.
    - *Constraint*: Do not rely solely on manual verification.

3.  **End-to-End (E2E) & Load Testing**:
    - **Page Load Verification**: Verify that the application (Frontend & Backend) starts and loads the relevant pages successfully without checking "Connection Refused".
    - **Critical Flow E2E**: Execute a Playwright E2E test for the main user flow.
    - If E2E fails, debug and fix BEFORE notifying.

4.  **Final Verification**:
    - Only after Steps 1-3 pass, proceed to `notify_user`.
