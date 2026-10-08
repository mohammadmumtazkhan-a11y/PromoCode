// Integration ports of the referral module (REFERRAL_MODULE_SPEC_MITO_ADMIN.md §1.3).
// The module's only required dependency is `rewardWallet`; every other port has a harmless default.
// This file imports nothing from the bonus, promo or support modules.

const NOOP = async () => {};

// Names the module calls on rewardWallet. Checked once at start-up so a missing wiring fails loudly, not on the first reward.
const WALLET_FUNCTIONS = ['issueCredit', 'voidCredit', 'creditSummary'];

function resolvePorts(hooks = {}) {
    const wallet = hooks.rewardWallet;
    const missing = WALLET_FUNCTIONS.filter((fn) => !wallet || typeof wallet[fn] !== 'function');
    if (missing.length) {
        throw new Error(`Referral module: the rewardWallet port is required (missing ${missing.join(', ')}). Pass it as registerReferralRoutes(app, db, { rewardWallet }).`);
    }
    const guard = hooks.eligibilityGuard || {};
    return {
        rewardWallet: wallet,
        eligibilityGuard: {
            // { blocked: boolean, reason?: string }
            isEarningBlocked: guard.isEarningBlocked || (async () => ({ blocked: false })),
            // Optional: the host may count a lost reward as a strike against the referee (not part of the wallet)
            recordStrike: guard.recordStrike || NOOP,
        },
        // async (event) → void. Errors are logged by the module, never thrown to the caller.
        onRewardIssued: hooks.onRewardIssued || NOOP,
        // async ({ customerId, creditId, currency, amount, referralId, transferId }) → void | number (the part the host recorded as owed)
        onSpentCreditReversed: hooks.onSpentCreditReversed || (async () => 0),
    };
}

module.exports = { resolvePorts, WALLET_FUNCTIONS };
