// Deprecated (spec PROMO-MITO §7.1): kept unchanged so any caller keeps working. The admin UI never calls it.
// It targets the legacy merchants table and only simulates email. Bulk / personal codes (POST /api/promocodes/bulk) replace it.
function registerLegacyDistribute(app, db) {
    // 8. Distribute Promos (Story 2.0)
    app.post('/api/promocodes/distribute', (req, res) => {
        const { segment, promo_config, criteria, existing_code_id } = req.body;
    
        const distributeToTargets = (targets) => {
            if (targets.length === 0) return res.json({ success: true, count: 0, message: "No users in segment" });
    
            const now = new Date().toISOString();
    
            // If distributing an EXISTING code, just log the campaign without creating new codes
            if (existing_code_id) {
                db.serialize(() => {
                    const logStmt = db.prepare("INSERT INTO email_logs VALUES (?, ?, ?, ?, ?, ?)");
                    let count = 0;
                    targets.forEach(user => {
                        logStmt.run('log_' + Date.now() + '_' + count, user.id, existing_code_id, segment, now, 'Sent');
                        console.log(`[EMAIL SIMULATION] Sending existing code ${existing_code_id} to ${user.email}`);
                        count++;
                    });
                    logStmt.finalize();
                    res.json({ success: true, count, segment, existing_code: existing_code_id });
                });
                return;
            }
    
            // Otherwise, create NEW unique codes for each target
            db.serialize(() => {
                const stmt = db.prepare(`INSERT INTO promo_codes (
                    id, code, type, value, min_threshold, max_discount, currency, 
                    usage_limit_global, usage_limit_per_user, budget_limit, 
                    start_date, end_date, status, restrictions, user_segment, user_segment_criteria
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    
                const logStmt = db.prepare("INSERT INTO email_logs VALUES (?, ?, ?, ?, ?, ?)");
    
                let count = 0;
                const parseNum = (val, isInt = false) => {
                    if (val === '' || val === null || val === undefined) return null;
                    const num = isInt ? parseInt(val) : parseFloat(val);
                    return Number.isNaN(num) ? null : num;
                };
    
                targets.forEach(user => {
                    const uniqueCode = (promo_config.prefix || 'OFFER') + Math.random().toString(36).substring(7).toUpperCase();
                    const id = 'pc_' + Date.now() + '_' + count;
                    const restrictions = { ...promo_config.restrictions };
                    if (promo_config.corridors) restrictions.corridors = promo_config.corridors;
                    if (promo_config.affiliates) restrictions.affiliates = promo_config.affiliates;
    
                    stmt.run(
                        id, uniqueCode, promo_config.type, parseNum(promo_config.value), parseNum(promo_config.min_threshold) || 0,
                        parseNum(promo_config.max_discount), promo_config.currency || null, 1, 1, -1,
                        promo_config.start_date, promo_config.end_date, 'Active',
                        JSON.stringify(restrictions),
                        JSON.stringify({ type: 'targeted', user_id: user.id }),
                        JSON.stringify({})
                    );
    
                    logStmt.run('log_' + Date.now() + '_' + count, user.id, uniqueCode, segment, now, 'Sent');
                    console.log(`[EMAIL SIMULATION] Sending code ${uniqueCode} to ${user.email}`);
                    count++;
                });
    
                stmt.finalize();
                logStmt.finalize();
                res.json({ success: true, count, segment });
            });
        };
    
        // 1. Check if Segment is Dynamic (Numeric ID)
        if (!isNaN(segment)) {
            db.get("SELECT * FROM user_segments WHERE id = ?", [segment], (err, segRow) => {
                if (err) return res.status(500).json({ error: err.message });
                if (!segRow) return res.status(404).json({ error: "Segment not found" });
    
                const crit = JSON.parse(segRow.criteria || '{}');
                let sql = "SELECT m.* FROM merchants m ";
                const params = [];
    
                // Build Dynamic Query
                if (crit.type === 'TRANSACTION_COUNT' || crit.type === 'TRANSACTION_VOLUME') {
                    sql += " LEFT JOIN transactions t ON t.merchant_id = m.id ";
    
                    // Time Period Filter (Moved to ON clause for LEFT JOIN)
                    if (crit.period_days) {
                        sql += " AND t.debit_date >= date('now', '-' || ? || ' days') ";
                        params.push(crit.period_days);
                    }
    
                    sql += " GROUP BY m.id ";
    
                    // Aggregation Filter
                    if (crit.type === 'TRANSACTION_COUNT') {
                        // Count(t.id) handles NULLs correctly (returns 0)
                        sql += " HAVING COUNT(t.id) >= ? ";
                        params.push(crit.min || 0);
                        if (crit.max !== null && crit.max !== undefined) {
                            sql += " AND COUNT(t.id) <= ? ";
                            params.push(crit.max);
                        }
                    } else { // VOLUME
                        // Use COALESCE to handle NULL sums as 0
                        sql += " HAVING COALESCE(SUM(t.amount_debit_ngn), 0) >= ? ";
                        params.push(crit.min || 0);
                        if (crit.max !== null && crit.max !== undefined) {
                            sql += " AND COALESCE(SUM(t.amount_debit_ngn), 0) <= ? ";
                            params.push(crit.max);
                        }
                    }
                } else {
                    // Default: All merchants if no valid type
                    // Or maybe 'New Users' logic if we implemented 'ACCOUNT_AGE'
                }
    
                console.log("[DEBUG] Segment Query:", sql, params);
    
                db.all(sql, params, (err, users) => {
                    if (err) return res.status(500).json({ error: err.message });
                    distributeToTargets(users);
                });
            });
        } else {
            // 2. Handle 'all' users or Invalid
            if (segment === 'all') {
                db.all("SELECT * FROM merchants", [], (err, users) => {
                    if (err) return res.status(500).json({ error: err.message });
                    distributeToTargets(users);
                });
            } else {
                return res.status(400).json({ error: "Invalid segment ID. Use a numeric ID or 'all'." });
            }
        }
    });
}

module.exports = { registerLegacyDistribute };
