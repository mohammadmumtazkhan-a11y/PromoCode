// Daily bonus jobs (BS-65): expire credits past their date and send "expiring in 7 days" reminders.
// The timer ticks hourly and acts once per UK day; POST /api/bonus/run-jobs runs it straight away.
// This is the only credit-expiry job, for every source (referral, scheme, manual).
const { ukToday, nowIso } = require('./time');
const wallet = require('./wallet');
const { write } = require('./db');

async function runJobs(q, { force = false } = {}) {
    const today = ukToday();
    const last = await q.get(`SELECT value FROM bonus_job_state WHERE name = 'daily:last_run'`);
    if (!force && last && last.value === today) return { credits_expired: 0, expiring_reminders: 0, skipped: true };
    return write(q, async () => {
        const credits_expired = await wallet.expireDue(q, { today });
        const expiring_reminders = await wallet.expiringReminders(q, { today });
        await q.run(`INSERT OR REPLACE INTO bonus_job_state (name, value) VALUES ('daily:last_run', ?)`, [today]);
        await q.run(`INSERT OR REPLACE INTO bonus_job_state (name, value) VALUES ('daily:last_run_at', ?)`, [nowIso()]);
        return { credits_expired, expiring_reminders };
    });
}

let timer = null;
function startTimer(q, ready) {
    const minutes = process.env.BONUS_JOBS_INTERVAL_MIN === undefined ? 60 : Number(process.env.BONUS_JOBS_INTERVAL_MIN);
    if (timer || !(minutes > 0)) return null;
    const tick = () => Promise.resolve(ready).then(() => runJobs(q)).catch((e) => console.error('[bonus] daily jobs failed', e.message));
    setTimeout(tick, 5000).unref();
    timer = setInterval(tick, minutes * 60 * 1000);
    timer.unref();
    return timer;
}

module.exports = { runJobs, startTimer };
