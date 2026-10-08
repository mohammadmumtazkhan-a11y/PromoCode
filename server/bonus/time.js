// Dates for the bonus module. Days are UK calendar days (Europe/London), shown DD/MM/YYYY (decision D12).
// `clock.now` can be replaced in tests.
const clock = { now: () => new Date() };
const UK_TZ = 'Europe/London';

const ukDate = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: UK_TZ }); // YYYY-MM-DD
const ukToday = () => ukDate(clock.now());
const nowIso = () => clock.now().toISOString();

function addDays(ymd, days) {
    const d = new Date(`${ymd}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + Number(days));
    return d.toISOString().slice(0, 10);
}

// YYYY-MM-DD (or an ISO timestamp) → DD/MM/YYYY
function fmtUk(value) {
    if (!value) return '';
    const s = String(value);
    const ymd = /^\d{4}-\d{2}-\d{2}$/.test(s.slice(0, 10)) && s.length > 10 && s.includes('T') ? ukDate(s) : s.slice(0, 10);
    return ymd.split('-').reverse().join('/');
}

// Whole days between two YYYY-MM-DD dates (b − a)
const daysBetween = (a, b) => Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86400000);

module.exports = { clock, ukDate, ukToday, nowIso, addDays, fmtUk, daysBetween, UK_TZ };
