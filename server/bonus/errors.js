// Error shapes for the bonus module (spec §7). Today's shapes are kept so callers don't break:
//   plain:    { error: "<message>" }                      (validation-style refusals that always used it)
//   business: { error: "<CODE>", message: "<message>" }   (+ fields / available when relevant)
class Reject extends Error {
    constructor(status, code, message, { plain = false, fields, extra } = {}) {
        super(message);
        this.status = status; this.code = code; this.plain = plain; this.fields = fields; this.extra = extra;
    }

    body() {
        const base = this.plain ? { error: this.message } : { error: this.code, message: this.message };
        return { ...base, ...(this.fields ? { fields: this.fields } : {}), ...(this.extra || {}) };
    }
}

function sendError(res, err, tag = 'bonus') {
    if (err instanceof Reject) return res.status(err.status).json(err.body());
    if (err && err.status && err.status < 500) {
        return res.status(err.status).json({ error: err.code || 'VALIDATION', message: err.message, ...(err.available !== undefined ? { available: err.available } : {}) });
    }
    console.error(`[${tag}]`, err && err.message);
    return res.status(500).json({ error: 'SERVER_ERROR', message: err && err.message });
}

module.exports = { Reject, sendError };
