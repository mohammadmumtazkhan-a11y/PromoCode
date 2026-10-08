// Optional adapters (spec §1.3). Defaults keep the promo module fully standalone.
//
// segmentProvider   – saved audiences owned by Growth > Bonus Scheme Manager. Read-only.
// customerDirectory – extra customer facts (signup date, name) the host may know about.
// adminIdentity     – who is acting, for the audit trail.

function defaultPorts(q) {
    return {
        segmentProvider: {
            async getSegment(id) {
                try { return (await q.get('SELECT id, name, description, criteria FROM user_segments WHERE id = ?', [id])) || null; } catch { return null; }
            },
            async listSegments() {
                try { return await q.all('SELECT id, name, description, criteria FROM user_segments ORDER BY name'); } catch { return []; }
            },
        },
        customerDirectory: {
            async signupDate() { return null; },
            async names() { return {}; },
        },
        adminIdentity: (req) => (req && req.admin ? { name: req.admin.name, role: req.admin.role } : { name: 'Admin', role: 'ADMIN' }),
    };
}

module.exports = { defaultPorts };
