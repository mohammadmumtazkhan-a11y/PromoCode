// A promo business-rule refusal.
// Compatibility rule (spec §6.4): Rhemito reads `body.message ?? body.error` as the customer text,
// so `error` stays the customer message string and `code` carries the machine code.
class PromoError extends Error {
    constructor(status, code, message, extra = {}) {
        super(message);
        this.status = status;
        this.code = code;
        this.extra = extra;
    }

    body() {
        return { error: this.message, code: this.code, ...this.extra };
    }
}

function sendError(res, err) {
    if (err instanceof PromoError) return res.status(err.status).json(err.body());
    console.error('[promo]', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.', code: 'SERVER_ERROR' });
}

module.exports = { PromoError, sendError };
