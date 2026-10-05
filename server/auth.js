// Role-based access for Mito Admin write actions that need more than "any signed-in admin".
//
// Admin users are configured with the ADMIN_USERS environment variable, a JSON array:
//   ADMIN_USERS='[{"name":"Aisha Bello","role":"GROWTH_MANAGER","token":"<long random string>"},
//                 {"name":"Tunde Ade","role":"ADMIN","token":"<another long random string>"}]'
// A caller proves who they are with "Authorization: Bearer <token>". The server decides the name and
// role from that token, so neither can be spoofed from the request body.
//
// Roles: GROWTH_MANAGER may approve "Not eligible" referral rewards. ADMIN is every other admin.
//
// Local development: set ADMIN_AUTH_DISABLED=true to skip the token check. The caller is then treated as
// a GROWTH_MANAGER unless it sends an "X-Admin-Role" header (handy for trying the denied path).
// This switch is ignored when NODE_ENV is "production", so it cannot be left on by mistake.
const crypto = require('crypto');

const ROLES = Object.freeze({ ADMIN: 'ADMIN', GROWTH_MANAGER: 'GROWTH_MANAGER' });

const digest = (s) => crypto.createHash('sha256').update(String(s)).digest();

function loadUsers(env = process.env) {
    if (!env.ADMIN_USERS) return [];
    let parsed;
    try { parsed = JSON.parse(env.ADMIN_USERS); } catch { console.error('[auth] ADMIN_USERS is not valid JSON – no admin users loaded'); return []; }
    if (!Array.isArray(parsed)) return [];
    return parsed
        .filter((u) => u && u.token && u.name && ROLES[String(u.role || '').toUpperCase()])
        .map((u) => ({ name: String(u.name), role: ROLES[String(u.role).toUpperCase()], tokenHash: digest(u.token) }));
}

const devBypass = (env = process.env) => String(env.ADMIN_AUTH_DISABLED).toLowerCase() === 'true' && env.NODE_ENV !== 'production';

// Returns { name, role } for a valid caller, or null.
function authenticate(req, env = process.env) {
    if (devBypass(env)) {
        const role = ROLES[String(req.get('x-admin-role') || ROLES.GROWTH_MANAGER).toUpperCase()] || ROLES.ADMIN;
        return { name: req.get('x-admin-user') || 'Dev Admin', role, dev: true };
    }
    const m = /^Bearer\s+(.+)$/i.exec(req.get('authorization') || '');
    if (!m) return null;
    const presented = digest(m[1].trim());
    for (const u of loadUsers(env)) {
        if (crypto.timingSafeEqual(presented, u.tokenHash)) return { name: u.name, role: u.role };
    }
    return null;
}

// Express middleware: caller must hold one of the given roles.
function requireRole(...allowed) {
    return (req, res, next) => {
        const configured = loadUsers().length > 0 || devBypass();
        if (!configured) {
            return res.status(503).json({ error: 'AUTH_NOT_CONFIGURED', message: 'Admin access is not set up on the server yet (ADMIN_USERS).' });
        }
        const admin = authenticate(req);
        if (!admin) return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Sign in with your admin access token to do this.' });
        if (!allowed.includes(admin.role)) {
            return res.status(403).json({ error: 'FORBIDDEN_ROLE', message: `This action needs the ${allowed.map((r) => r.replace('_', ' ').toLowerCase()).join(' or ')} role.` });
        }
        req.admin = admin;
        next();
    };
}

module.exports = { ROLES, loadUsers, authenticate, requireRole };
