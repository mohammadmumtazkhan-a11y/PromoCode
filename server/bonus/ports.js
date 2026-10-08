// Optional adapters (spec §1.3). The defaults keep the bonus module standalone.
//
// historySources    – extra read-only rows merged into the admin ledger history (e.g. promo redemptions).
//                     Each is async (filters) => rows in the ledger row shape, with source_type other than 'BONUS'.
// ledgerDecorator   – async (rows) => rows: lets the host add display fields the bonus module cannot know
//                     (e.g. referral rule names). Must not change amounts.
// customerDirectory – signupDate(id) and names(ids) the host may know better than bonus_customers.
// adminIdentity     – who is acting, for the audit trail.

const { authenticate } = require('../auth');

// The signed-in admin (from the access token), or the prototype's demo Growth Manager
function identityFromRequest(req) {
    if (req && req.admin) return { name: req.admin.name, role: req.admin.role };
    const who = req && req.get ? authenticate(req) : null;
    return who ? { name: who.name, role: who.role } : { name: 'Admin', role: 'ADMIN' };
}

function defaultPorts() {
    return {
        promoRedemptions: null,
        segmentUsage: null,
        historySources: [],
        ledgerDecorator: async (rows) => rows,
        customerDirectory: {
            async signupDate() { return null; },
            async names() { return {}; },
        },
        adminIdentity: identityFromRequest,
    };
}

module.exports = { defaultPorts, identityFromRequest };
