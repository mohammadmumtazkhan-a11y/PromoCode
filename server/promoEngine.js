// Kept for compatibility: the promo engine now lives in server/promo/ (spec PROMO-MITO §1.2).
const engine = require('./promo/engine');

module.exports = {
    validate: engine.validate,
    redeem: engine.redeem,
    release: engine.release,
    check: engine.check,
    computeDiscount: engine.computeDiscount,
    normalise: engine.normalise,
};
