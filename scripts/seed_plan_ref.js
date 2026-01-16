
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to existing DB (assuming server is using file or we can interact with its memory if exposed... 
// WAIT, the server uses ':memory:'. We cannot seed it from an external script unless we expose an endpoint or modify server.js to run this seed.
// Since the server code is in `server.js` and uses :memory:, I should probably add a SEED ENDPOINT or just APPEND this logic to server.js initialization.
// The user wants "dummy data for all schemas". 
// Modifying `server.js` initializeDatabase function is the best way for :memory: DB.

console.log("This script is a reference. Please adapt server.js to include this seed data.");

/*
    Proposed Seed Data to Add to server.js `initializeDatabase`:
    
    // 1. Ensure Bonus Schemes exist
    INSERT INTO bonus_schemes (name, bonus_type, credit_amount, currency, status) VALUES 
    ('Summer Referral Blast', 'REFERRAL_CREDIT', 15.00, 'GBP', 'ACTIVE'),
    ('VIP Loyalty Tier', 'LOYALTY_CREDIT', 50.00, 'USD', 'ACTIVE'),
    ('Q1 Transaction Bonus', 'TRANSACTION_THRESHOLD_CREDIT', 10.00, 'EUR', 'EXPIRED');

    // 2. Ensure Promo Codes exist
    INSERT INTO promo_codes (code, type, value, status) VALUES
    ('WELCOME50', 'Fixed', 50, 'Active'),
    ('SUMMER10', 'Percentage', 10, 'Active');

    // 3. Populate Credit Ledger (Transactions)
    // User 1
    INSERT INTO credit_ledger (user_id, amount, type, scheme_id, reference_id, reason_code, notes, created_at) VALUES
    ('user_101', 15.00, 'EARNED', 1, 'ref_001', 'REFERRAL_REWARD', 'Referral: user_999', '2025-01-10 10:00:00'),
    ('user_101', -5.00, 'APPLIED', 1, 'tx_999', 'PAYMENT_OFFSET', 'Used for Txn #123', '2025-01-12 14:00:00');

    // User 2
    INSERT INTO credit_ledger (user_id, amount, type, scheme_id, reference_id, reason_code, notes, created_at) VALUES
    ('user_102', 50.00, 'EARNED', 2, 'loyalty_001', 'LOYALTY', 'VIP Tier reached', '2025-01-01 09:00:00'),
    ('user_102', -50.00, 'EXPIRED', 2, 'exp_001', 'EXPIRY', 'Unused credit expired', '2025-04-01 00:00:00');

    // 4. Populate Promo Redemptions
    INSERT INTO promo_redemptions (promo_code_id, transaction_id, user_id, discount_amount, status, created_at) VALUES
    ('1', 'tx_888', 'user_103', 50.00, 'Redeemed', '2025-01-15 11:30:00'), -- WELCOME50
    ('2', 'tx_777', 'user_104', 12.50, 'Redeemed', '2025-01-16 08:45:00'); -- SUMMER10 (10%)
*/
