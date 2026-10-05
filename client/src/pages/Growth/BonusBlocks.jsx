import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatUkDate } from './referralUtils';
import { ToastStack, ConfirmDialog } from '../../components/Feedback';
import { useToasts } from '../../components/useToasts';
import { adminHeaders, getAdminToken, setAdminToken } from '../../lib/adminAuth';
import './referral.css';

// Customers blocked from earning bonus after repeated cancelled / refunded bonus-earning transfers.
const BonusBlocks = () => {
    const [status, setStatus] = useState('ACTIVE');
    const [rows, setRows] = useState([]);
    const [limit, setLimit] = useState(3);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [open, setOpen] = useState(null); // customer id whose strikes are expanded
    const [strikes, setStrikes] = useState([]);
    const [lift, setLift] = useState(null);
    const [reason, setReason] = useState('');
    const [reasonError, setReasonError] = useState('');
    const [token, setToken] = useState(getAdminToken());
    const [tokenError, setTokenError] = useState('');
    const { toasts, push, dismiss } = useToasts();

    const load = useCallback(async () => {
        setLoading(true); setError(false);
        try {
            const res = await fetch(`/api/bonus-blocks?status=${status}`);
            if (!res.ok) throw new Error();
            const d = await res.json();
            setRows(d.data || []); setLimit(d.limit || 3);
        } catch { setError(true); } finally { setLoading(false); }
    }, [status]);
    useEffect(() => { load(); }, [load]);

    const toggle = async (customerId) => {
        if (open === customerId) { setOpen(null); return; }
        setOpen(customerId);
        try { setStrikes(((await (await fetch(`/api/bonus-blocks/${encodeURIComponent(customerId)}`)).json()).strikes) || []); } catch { setStrikes([]); }
    };

    const submitLift = async () => {
        const text = reason.trim();
        if (text.length < 10 || text.length > 250) { setReasonError('Enter a reason of 10–250 characters.'); return; }
        setAdminToken(token);
        try {
            const res = await fetch(`/api/bonus-blocks/${encodeURIComponent(lift.customer_id)}/lift`, {
                method: 'POST', headers: adminHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ reason: text }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 401 || res.status === 403) {
                if (res.status === 401) setAdminToken('');
                setTokenError(data.message || 'Only a Growth Manager can approve a blocked customer.');
                return;
            }
            if (!res.ok) throw new Error(data.message);
            push(`Bonus unblocked for ${lift.customer_id}.`);
            setLift(null); setOpen(null);
            load();
        } catch (e) {
            push(e.message || "We couldn't unblock this customer. Please try again.", 'error');
        }
    };

    return (
        <div className="rf-page">
            <ToastStack toasts={toasts} onDismiss={dismiss} />
            <h2 className="rf-title">Blocked Customers</h2>
            <p className="rf-subtitle">
                A customer who has {limit} bonus-earning transfers cancelled or refunded earns no more bonus (scheme bonuses and referral rewards) until a Growth Manager approves them.
                A referral held back by a block shows as &quot;Not eligible&quot; in <Link to="/growth/referral-tracking">Referral Tracking</Link>.
            </p>
            <div className="rf-card">
                <div className="rf-filters">
                    <div className="rf-field"><label htmlFor="bb-status">Show</label>
                        <select id="bb-status" className="rf-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="ACTIVE">Blocked now</option>
                            <option value="LIFTED">Approved (unblocked)</option>
                            <option value="ALL">All</option>
                        </select></div>
                </div>
                <div className="rf-table-wrap">
                    <table className="rf-table">
                        <thead><tr><th>Customer</th><th>Blocked on</th><th>Strikes</th><th>Why the bonus was blocked</th><th>Status</th><th /></tr></thead>
                        <tbody>
                            {loading ? <tr><td colSpan="6" className="rf-empty">Loading...</td></tr>
                                : error ? <tr><td colSpan="6" className="rf-empty">We couldn&apos;t load blocked customers. <button type="button" className="rf-link" onClick={load}>Retry</button></td></tr>
                                    : rows.length === 0 ? <tr><td colSpan="6" className="rf-empty">{status === 'ACTIVE' ? 'No customers are blocked.' : 'Nothing to show.'}</td></tr>
                                        : rows.map((b) => (
                                            <React.Fragment key={b.id}>
                                                <tr>
                                                    <td className="rf-strong">{b.customer_name || b.customer_id}<span className="rf-sub">ID: {b.customer_id}</span></td>
                                                    <td style={{ whiteSpace: 'nowrap' }}>{formatUkDate(b.blocked_at)}</td>
                                                    <td>{b.strikes}</td>
                                                    <td style={{ maxWidth: 420 }}>{b.reason}
                                                        {b.status === 'LIFTED' && <span className="rf-sub">Approved by {b.lifted_by} on {formatUkDate(b.lifted_at)}: {b.lift_reason}</span>}</td>
                                                    <td><span className={`rf-pill rf-pill-${b.status === 'ACTIVE' ? 'red' : 'green'}`}>{b.status === 'ACTIVE' ? 'Blocked' : 'Approved'}</span></td>
                                                    <td style={{ whiteSpace: 'nowrap' }}>
                                                        <button type="button" className="rf-link" onClick={() => toggle(b.customer_id)}>{open === b.customer_id ? 'Hide' : 'Strikes'}</button>{' '}
                                                        {b.status === 'ACTIVE' && <button type="button" className="rf-btn-sm" onClick={() => { setLift(b); setReason(''); setReasonError(''); setTokenError(''); }}>Approve customer</button>}
                                                    </td>
                                                </tr>
                                                {open === b.customer_id && (
                                                    <tr><td colSpan="6" style={{ background: '#f9fafb' }}>
                                                        {strikes.length === 0 ? <span className="rf-muted">No open strikes (they were cleared when the block was approved).</span>
                                                            : <ul style={{ margin: 0, paddingLeft: 18 }}>{strikes.map((s) => <li key={s.id}>{formatUkDate(s.created_at)} – {s.detail}</li>)}</ul>}
                                                    </td></tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmDialog
                open={!!lift}
                title="Approve customer for bonus"
                message={lift ? `${lift.customer_name || lift.customer_id} was blocked because: ${lift.reason} Approving lets them earn bonus again and restarts their strike count.` : ''}
                confirmLabel="Approve customer"
                onCancel={() => setLift(null)}
                onConfirm={submitLift}
            >
                <div className="rf-field" style={{ marginBottom: 12 }}>
                    <label htmlFor="bb-reason">Reason<span className="rf-req">*</span></label>
                    <textarea id="bb-reason" className={`rf-input${reasonError ? ' rf-invalid' : ''}`} rows={3} maxLength={250} value={reason}
                        onChange={(e) => { setReason(e.target.value); setReasonError(''); }} placeholder="Why is it safe to let this customer earn bonus again?" />
                    {reasonError ? <div className="rf-error">{reasonError}</div> : <div className="rf-hint">{reason.trim().length}/250 characters (minimum 10)</div>}
                </div>
                <div className="rf-field" style={{ marginBottom: 12 }}>
                    <label htmlFor="bb-token">Access token</label>
                    <input id="bb-token" type="password" autoComplete="off" className={`rf-input${tokenError ? ' rf-invalid' : ''}`} value={token}
                        onChange={(e) => { setToken(e.target.value); setTokenError(''); }} placeholder="Your Growth Manager access token" />
                    {tokenError ? <div className="rf-error">{tokenError}</div> : <div className="rf-hint">Limited to the Growth Manager role. Your name is recorded from this token.</div>}
                </div>
            </ConfirmDialog>
        </div>
    );
};

export default BonusBlocks;
