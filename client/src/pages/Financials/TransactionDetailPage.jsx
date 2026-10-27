import React, { useState, useMemo, useEffect } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { SEED_TRANSACTIONS, getStagingStatusColor, formatMitoAdminReward } from './TransactionsPage';

// Exact 17 Admin Actions from module 37177 in staging_7339.js
const ADMIN_ACTION_ITEMS = [
    {
        id: 'cancel',
        label: 'Cancel',
        variant: 'danger',
        nextStatus: 'Cancelled',
        description: 'Cancels the transaction and prevents any further payout processing.',
    },
    {
        id: 'void',
        label: 'Void',
        variant: 'danger',
        nextStatus: 'Void',
        description: 'Marks this transaction as void in the ledger.',
    },
    {
        id: 'hold',
        label: 'Hold',
        variant: 'primary',
        nextStatus: 'Hold',
        description: 'Temporarily places the transaction on operational hold.',
    },
    {
        id: 'complianceHold',
        label: 'Compliance Hold',
        variant: 'primary',
        nextStatus: 'ComplianceHold',
        description: 'Places the transaction on hold pending compliance review.',
    },
    {
        id: 'suspend',
        label: 'Suspend',
        variant: 'primary',
        nextStatus: 'Suspended',
        description: 'Suspends automatic retry and background queue processing.',
    },
    {
        id: 'verify',
        label: 'Verify',
        variant: 'outline',
        nextStatus: 'Verified',
        description: 'Marks transaction verification checks as complete.',
    },
    {
        id: 'paymentReceived',
        label: 'Payment Received',
        variant: 'outline',
        nextStatus: 'PaymentReceived',
        description: 'Confirms customer settlement funds have been received.',
    },
    {
        id: 'received',
        label: 'Received',
        variant: 'outline',
        nextStatus: 'Received',
        description: 'Marks the transaction as received and ready for processing.',
    },
    {
        id: 'processed',
        label: 'Processed',
        variant: 'outline',
        nextStatus: 'Processed',
        description: 'Manually marks the payout as processed with the partner.',
    },
    {
        id: 'processFailed',
        label: 'Process Failed',
        variant: 'danger',
        nextStatus: 'ProcessFailed',
        description: 'Marks the partner payout attempt as failed.',
    },
    {
        id: 'waitOps',
        label: 'Wait Ops',
        variant: 'outline',
        nextStatus: 'WaitOps',
        description: 'Flags the transaction as awaiting operations team action.',
    },
    {
        id: 'queue',
        label: 'Queue',
        variant: 'outline',
        nextStatus: 'Pending',
        description: 'Re-queues the transaction for automatic partner payout.',
    },
    {
        id: 'queryPayment',
        label: 'Query Payment',
        variant: 'outline',
        nextStatus: null,
        description: 'Queries the collection gateway for the latest payment status.',
    },
    {
        id: 'updatePaymentRef',
        label: 'Update Payment Ref',
        variant: 'outline',
        nextStatus: null,
        requiresInput: true,
        inputLabel: 'New Payment Reference',
        description: 'Updates the external payment gateway reference attached to this transaction.',
    },
    {
        id: 'queryProvider',
        label: 'Query Provider',
        variant: 'outline',
        nextStatus: null,
        description: 'Queries the downstream payout processor for live disbursement status.',
    },
    {
        id: 'sendReceipt',
        label: 'Send Receipt',
        variant: 'outline',
        nextStatus: null,
        description: 'Emails the official PDF transaction receipt to the sender.',
    },
    {
        id: 'refundPayment',
        label: 'Refund Payment',
        variant: 'danger',
        nextStatus: 'Refunded',
        description: 'Initiates a refund of the collected payment back to the sender.',
    },
];

// Exact 7 Horizontal Tabs with exact staging SVG icons (modules 94624, 72683, 34268, 67131, 14764, 37427, 31525)
const TABS = [
    {
        id: 'details',
        label: 'Details',
        // Module 94624: Circle with exclamation mark (!)
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle opacity="0.5" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 7V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="12" cy="16" r="1" fill="currentColor" />
            </svg>
        ),
    },
    {
        id: 'actions',
        label: 'Actions',
        // Module 72683: Cog / Gear icon
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                <path
                    opacity="0.5"
                    d="M13.7654 2.15224C13.3978 2 12.9319 2 12 2C11.0681 2 10.6022 2 10.2346 2.15224C9.74457 2.35523 9.35522 2.74458 9.15223 3.23463C9.05957 3.45834 9.0233 3.7185 9.00911 4.09799C8.98826 4.65568 8.70226 5.17189 8.21894 5.45093C7.73564 5.72996 7.14559 5.71954 6.65219 5.45876C6.31645 5.2813 6.07301 5.18262 5.83294 5.15102C5.30704 5.08178 4.77518 5.22429 4.35436 5.5472C4.03874 5.78938 3.80577 6.1929 3.33983 6.99993C2.87389 7.80697 2.64092 8.21048 2.58899 8.60491C2.51976 9.1308 2.66227 9.66266 2.98518 10.0835C3.13256 10.2756 3.3397 10.437 3.66119 10.639C4.1338 10.936 4.43789 11.4419 4.43786 12C4.43783 12.5581 4.13375 13.0639 3.66118 13.3608C3.33965 13.5629 3.13248 13.7244 2.98508 13.9165C2.66217 14.3373 2.51966 14.8691 2.5889 15.395C2.64082 15.7894 2.87379 16.193 3.33973 17C3.80568 17.807 4.03865 18.2106 4.35426 18.4527C4.77508 18.7756 5.30694 18.9181 5.83284 18.8489C6.07289 18.8173 6.31632 18.7186 6.65204 18.5412C7.14547 18.2804 7.73556 18.27 8.2189 18.549C8.70224 18.8281 8.98826 19.3443 9.00911 19.9021C9.02331 20.2815 9.05957 20.5417 9.15223 20.7654C9.35522 21.2554 9.74457 21.6448 10.2346 21.8478C10.6022 22 11.0681 22 12 22C12.9319 22 13.3978 22 13.7654 21.8478C14.2554 21.6448 14.6448 21.2554 14.8477 20.7654C14.9404 20.5417 14.9767 20.2815 14.9909 19.902C15.0117 19.3443 15.2977 18.8281 15.781 18.549C16.2643 18.2699 16.8544 18.2804 17.3479 18.5412C17.6836 18.7186 17.927 18.8172 18.167 18.8488C18.6929 18.9181 19.2248 18.7756 19.6456 18.4527C19.9612 18.2105 20.1942 17.807 20.6601 16.9999C21.1261 16.1929 21.3591 15.7894 21.411 15.395C21.4802 14.8691 21.3377 14.3372 21.0148 13.9164C20.8674 13.7243 20.6602 13.5628 20.3387 13.3608C19.8662 13.0639 19.5621 12.558 19.5621 11.9999C19.5621 11.4418 19.8662 10.9361 20.3387 10.6392C20.6603 10.4371 20.8675 10.2757 21.0149 10.0835C21.3378 9.66273 21.4803 9.13087 21.4111 8.60497C21.3592 8.21055 21.1262 7.80703 20.6602 7C20.1943 6.19297 19.9613 5.78945 19.6457 5.54727C19.2249 5.22436 18.693 5.08185 18.1671 5.15109C17.9271 5.18269 17.6836 5.28137 17.3479 5.4588C16.8545 5.71959 16.2644 5.73002 15.7811 5.45096C15.2977 5.17191 15.0117 4.65568 14.9909 4.09794C14.9767 3.71848 14.9404 3.45833 14.8477 3.23463C14.6448 2.74458 14.2554 2.35523 13.7654 2.15224Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
            </svg>
        ),
    },
    {
        id: 'trail',
        label: 'Trail & comments',
        // Module 34268: Trending-up zig-zag arrow icon
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 7L14.6203 14.3347C13.6227 15.3263 13.1238 15.822 12.5051 15.822C11.8864 15.8219 11.3876 15.326 10.3902 14.3342L10.1509 14.0962C9.15254 13.1035 8.65338 12.6071 8.03422 12.6074C7.41506 12.6076 6.91626 13.1043 5.91867 14.0977L2 18M22 7H16.5455M22 7V12.4545" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
    {
        id: 'edit',
        label: 'Edit',
        // Module 67131: Pencil icon
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.2869 3.15178L14.3601 4.07866L5.83882 12.5999C5.26166 13.1771 4.97308 13.4656 4.7249 13.7838C4.43213 14.1592 4.18114 14.5653 3.97634 14.995C3.80273 15.3593 3.67368 15.7465 3.41556 16.5208L2.32181 19.8021L2.05445 20.6042C1.92743 20.9852 2.0266 21.4053 2.31063 21.6894C2.59466 21.9734 3.01478 22.0726 3.39584 21.9456L4.19792 21.6782L7.47918 20.5844C8.25353 20.3263 8.6407 20.1973 9.00498 20.0237C9.43469 19.8189 9.84082 19.5679 10.2162 19.2751C10.5344 19.0269 10.8229 18.7383 11.4001 18.1612L19.9213 9.63993L20.8482 8.71306C22.3839 7.17735 22.3839 4.68748 20.8482 3.15178C19.3125 1.61607 16.8226 1.61607 15.2869 3.15178Z" stroke="currentColor" strokeWidth="1.5" />
                <path opacity="0.5" d="M14.36 4.07812C14.36 4.07812 14.4759 6.04774 16.2138 7.78564C17.9517 9.52354 19.9213 9.6394 19.9213 9.6394M4.19789 21.6777L2.32178 19.8015" stroke="currentColor" strokeWidth="1.5" />
            </svg>
        ),
    },
    {
        id: 'items',
        label: 'Items',
        // Module 14764: Check-list icon
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 5.5L3.21429 7L7.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path opacity="0.5" d="M2 12.5L3.21429 14L7.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 19.5L3.21429 21L7.5 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 19L12 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path opacity="0.5" d="M22 12L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M22 5L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        ),
    },
    {
        id: 'kyc',
        label: 'KYC',
        // Module 37427: Badge with checkmark and user
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.25 3C5.38805 3 4.5614 3.34241 3.9519 3.9519C3.34241 4.5614 3 5.38805 3 6.25V17.75C3 18.612 3.34241 19.4386 3.9519 20.0481C4.5614 20.6576 5.38805 21 6.25 21H13.172C13.057 20.6361 12.999 20.2566 13 19.875V19.772C13 19.6807 13.0043 19.59 13.013 19.5H6.25C5.78587 19.5 5.34075 19.3156 5.01256 18.9874C4.68437 18.6592 4.5 18.2141 4.5 17.75V6.25C4.5 5.284 5.284 4.5 6.25 4.5H17.75C18.716 4.5 19.5 5.284 19.5 6.25V11.145C20.0687 11.3149 20.5849 11.6267 21 12.051V6.25C21 5.38805 20.6576 4.5614 20.0481 3.9519C19.4386 3.34241 18.612 3 17.75 3H6.25ZM17.28 9.28C17.52 9.04 17.52 8.46 17.22 8.22L9.997 14.436L7.78 12.22C7.48 11.98 6.98 11.98 6.72 12.28L9.465 16.026C9.76 16.28 10.22 16.28 10.525 16.026L17.28 9.28ZM21 14.5C21 15.88 19.88 17 18.5 17C17.12 17 16 15.88 16 14.5C16 13.12 17.12 12 18.5 12C19.88 12 21 13.12 21 14.5ZM23 19.875C23 21.431 21.714 23 18.5 23C15.286 23 14 21.437 14 19.875V19.772C14 18.792 14.794 18 15.773 18H21.227C22.207 18 23 18.793 23 19.772V19.875Z" />
            </svg>
        ),
    },
    {
        id: 'tickets',
        label: 'Help tickets',
        // Module 31525: Circle with question mark (?)
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle opacity="0.5" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10.125 8.875C10.125 7.83947 10.9645 7 12 7C13.0355 7 13.875 7.83947 13.875 8.875C13.875 9.56245 13.505 10.1635 12.9534 10.4899C12.478 10.7711 12 11.1977 12 11.75V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="12" cy="16" r="1" fill="currentColor" />
            </svg>
        ),
    },
];

// Reusable Stacked Detail Card matching module 35709 in staging_5709.js
function DetailSectionCard({ title, fields }) {
    return (
        <div className="staging-detail-card">
            <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: '#605E5C' }}>
                {title}
            </h3>
            <dl className="staging-detail-grid" style={{ margin: 0 }}>
                {fields.map((item, idx) => (
                    <div key={idx}>
                        <dt style={{ fontSize: 12, color: '#A19F9D', margin: 0 }}>{item.label}</dt>
                        <dd
                            style={{
                                margin: '2px 0 0 0',
                                fontSize: 14,
                                fontWeight: 600,
                                color: '#323130',
                                wordBreak: 'break-word',
                            }}
                        >
                            {item.href ? (
                                <Link
                                    to={item.href}
                                    style={{ color: '#2E5BFF', textDecoration: 'none' }}
                                >
                                    {item.value || '—'}
                                </Link>
                            ) : (
                                item.value ?? '—'
                            )}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

const formInputStyle = {
    width: '100%',
    height: 38,
    padding: '6px 12px',
    border: '1px solid #e0e6ed',
    borderRadius: 6,
    fontSize: 14,
    color: '#0e1726',
    background: '#ffffff',
    outline: 'none',
    fontFamily: 'inherit',
};

export default function TransactionDetailPage({ type: propType }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isRetailRoute =
        propType === 'retail' || location.pathname.startsWith('/financials/retail');
    const isRetail = false;

    const baseTx = useMemo(() => {
        const found = SEED_TRANSACTIONS.find(
            (t) => t.id === id || t.reference.toLowerCase() === String(id).toLowerCase()
        );
        if (found) return found;
        return {
            ...SEED_TRANSACTIONS[0],
            id: id || 'a4452812-9c03-41a6-8da9-430167c0d976',
        };
    }, [id]);

    const [tx, setTx] = useState(baseTx);
    const [serverRewardDisplay, setServerRewardDisplay] = useState(null);

    useEffect(() => {
        setTx(baseTx);
        setServerRewardDisplay(null);
        const ref = baseTx?.reference || id;
        if (!ref) return;
        let cancelled = false;
        fetch(`/api/transactions/${encodeURIComponent(ref)}/rewards`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!cancelled && data && data.display && data.display !== '—') {
                    setServerRewardDisplay(data.display);
                }
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [baseTx, id]);
    const [activeTab, setActiveTab] = useState('details');
    const [toastMessage, setToastMessage] = useState(null);
    const [retailNextStatus, setRetailNextStatus] = useState('');
    const [retailStatusReason, setRetailStatusReason] = useState('');

    // Compliance checks in Summary card matching module 55538 (true = checked, false = "failed", null = "n/a")
    const [complianceChecks, setComplianceChecks] = useState({
        verification: baseTx.verificationPassed !== undefined ? baseTx.verificationPassed : (baseTx.verificationChecked ?? false),
        kyc: baseTx.kycPassed !== undefined ? baseTx.kycPassed : (baseTx.kycChecked ?? true),
        thresholds: baseTx.thresholdsPassed !== undefined ? baseTx.thresholdsPassed : null,
        postcode: baseTx.postcodePassed !== undefined ? baseTx.postcodePassed : null,
    });

    // Actions tab modal state
    const [pendingAction, setPendingAction] = useState(null);
    const [actionPaymentRefInput, setActionPaymentRefInput] = useState(baseTx.paymentReference || '');
    const [switchProviderValue, setSwitchProviderValue] = useState(baseTx.provider || 'Flutterwave');
    const [splitChunkValue, setSplitChunkValue] = useState('250');

    // Trail & comments state
    const [auditTrail, setAuditTrail] = useState([
        {
            id: 'AUD-1',
            timestamp: `${baseTx.date} ${baseTx.time}`,
            actor: 'System Gateway',
            text: `Transaction ${baseTx.reference} created via ${baseTx.channel} (${baseTx.application}) by ${baseTx.createdBy}.`,
        },
        {
            id: 'AUD-2',
            timestamp: `${baseTx.date} ${baseTx.time}`,
            actor: 'Payment Service',
            text: `Collection status (${baseTx.paymentStatus}) confirmed via ${baseTx.paymentMethod} [Ref: ${baseTx.paymentReference}].`,
        },
        {
            id: 'AUD-3',
            timestamp: `${baseTx.date} ${baseTx.time}`,
            actor: 'Compliance Engine',
            text: `Automated AML, KYC & Velocity Threshold checks passed. Routed to ${baseTx.provider}.`,
        },
        {
            id: 'AUD-4',
            timestamp: `${baseTx.date} ${baseTx.time}`,
            actor: baseTx.provider,
            text: `Current transaction status reported as ${baseTx.status}.`,
        },
    ]);

    const [comments, setComments] = useState([
        {
            id: 'CMT-1',
            author: 'Mito Admin (Operations)',
            createdAt: `${baseTx.date} 14:30`,
            body: `Verified ${baseTx.provider} settlement reference ${baseTx.merchantRef}.`,
            visibleToCustomer: false,
            notifyPartner: false,
            closed: false,
        },
    ]);
    const [newCommentText, setNewCommentText] = useState('');
    const [commentFlags, setCommentFlags] = useState({
        visibleToCustomer: false,
        notifyPartner: false,
        closed: false,
    });

    // Edit tab state
    const nameParts = (tx.beneficiaryName || 'Adebayo Ogunlesi').split(' ');
    const [editForm, setEditForm] = useState({
        firstName: nameParts[0] || 'Adebayo',
        lastName: nameParts.slice(1).join(' ') || 'Ogunlesi',
        middleName: '',
        mobile: tx.beneficiaryPhone || '+234 803 441 9920',
        address: tx.beneficiaryAddress || '24 Admiralty Way, Lekki Phase 1',
        city: tx.beneficiaryCity || 'Lagos',
        postcode: '105102',
        email: tx.beneficiaryEmail || 'adebayo.ogunlesi@gmail.com',
        accountNumber: tx.beneficiaryAccount || '0038492011',
        status: tx.status || 'Processed',
    });

    // Help tickets state
    const [tickets, setTickets] = useState([
        {
            id: 'TKT-4091',
            subject: `Delivery confirmation inquiry for ${baseTx.reference}`,
            status: 'Resolved',
            priority: 'Normal',
            created: `${baseTx.date} 14:40`,
            assignee: 'Customer Support Tier 2',
        },
    ]);

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    const dotColor = getStagingStatusColor(tx.status);

    // Summary Card 13 fields matching module 55538 in staging_5709.js
    const summaryFields = [
        {
            label: 'Date',
            value: tx.createdDisplay || `Created: ${tx.date} at ${tx.time}`,
        },
        { label: 'Reference', value: tx.reference },
        {
            label: 'Summary',
            value: tx.summaryText || `${tx.createdBy} to ${tx.beneficiaryName} (${tx.beneficiaryBank})`,
        },
        { label: 'Send', value: `${tx.sendCurrency} ${tx.sendAmount.toFixed(2)}` },
        {
            label: 'Receive',
            value: `${tx.receiveCurrency} ${tx.receiveAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        },
        {
            label: 'Rate',
            value: tx.rateDisplay || (Number.isInteger(tx.rate) ? String(tx.rate) : tx.rate.toFixed(4)),
        },
        { label: 'Total paid', value: `${tx.currency} ${tx.amount.toFixed(2)}` },
        {
            label: 'Rewards',
            value:
                serverRewardDisplay || formatMitoAdminReward(tx) || tx.discountDisplay ||
                (tx.discount && tx.discount > 0
                    ? `${tx.currency} ${tx.discount.toFixed(2)}${tx.promoCode ? ` (${tx.promoCode})` : ''}`
                    : '—'),
        },
        { label: 'Commission / charges', value: `${tx.currency} ${tx.commission.toFixed(2)}` },
        { label: 'Payment method', value: tx.paymentMethod },
        { label: 'Channel', value: tx.channel },
        { label: 'Application / Route', value: `${tx.application} / ${tx.initiationRoute}` },
        { label: 'Payment reference', value: tx.paymentReference || '—' },
    ];

    const executeAdminAction = () => {
        if (!pendingAction) return;
        const nowStr = '27 Oct 2026 19:50:00';
        if (pendingAction.requiresInput) {
            setTx((prev) => ({ ...prev, paymentReference: actionPaymentRefInput }));
            setAuditTrail((prev) => [
                {
                    id: `AUD-${Date.now()}`,
                    timestamp: nowStr,
                    actor: 'Mito Admin',
                    text: `Updated Payment Reference to ${actionPaymentRefInput}.`,
                },
                ...prev,
            ]);
            showToast(`Payment Reference updated to ${actionPaymentRefInput}.`);
        } else {
            if (pendingAction.nextStatus) {
                setTx((prev) => ({ ...prev, status: pendingAction.nextStatus }));
                setEditForm((prev) => ({ ...prev, status: pendingAction.nextStatus }));
            }
            setAuditTrail((prev) => [
                {
                    id: `AUD-${Date.now()}`,
                    timestamp: nowStr,
                    actor: 'Mito Admin',
                    text: `Executed action "${pendingAction.label}"${pendingAction.nextStatus ? ` -> Status changed to ${pendingAction.nextStatus}` : ''}.`,
                },
                ...prev,
            ]);
            showToast(`Action "${pendingAction.label}" executed successfully.`);
        }
        setPendingAction(null);
    };

    const actionButtonStyle = (variant) => {
        const base = {
            width: '100%',
            height: 36,
            padding: '0 12px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s',
        };
        if (variant === 'danger') {
            return { ...base, background: '#dc2626', border: '1px solid #dc2626', color: '#ffffff' };
        }
        if (variant === 'primary') {
            return { ...base, background: '#FB4B14', border: '1px solid #FB4B14', color: '#ffffff' };
        }
        return { ...base, background: '#ffffff', border: '1px solid #FB4B14', color: '#FB4B14' };
    };

    return (
        <div style={{ paddingTop: 20 }}>
            {/* Toast Notification */}
            {toastMessage && (
                <div
                    style={{
                        position: 'fixed',
                        top: 24,
                        right: 24,
                        zIndex: 9999,
                        background: '#0e1726',
                        color: '#ffffff',
                        padding: '12px 20px',
                        borderRadius: 8,
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        fontSize: 14,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                    }}
                >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#62AA32' }} />
                    {toastMessage}
                </div>
            )}

            {/* Module 84192 (I.Qp with showBack: false): User Name + Breadcrumb */}
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h4 className="staging-user-title">Mito Admin</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <ol
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                gap: 6,
                                color: '#605E5C',
                                fontSize: 14,
                                listStyle: 'none',
                                padding: 0,
                                margin: 0,
                            }}
                        >
                            <li>
                                <Link to="/dashboard" style={{ color: '#605E5C', textDecoration: 'none' }}>
                                    Home
                                </Link>
                            </li>
                            <li>/ <span style={{ textTransform: 'capitalize' }}>Financials</span></li>
                            <li>
                                /{' '}
                                <Link
                                    to={isRetailRoute ? '/financials/retail-transactions' : '/financials/transactions'}
                                    style={{ color: '#605E5C', textDecoration: 'none', textTransform: 'capitalize' }}
                                >
                                    {isRetailRoute ? 'Retail-transactions' : 'Transactions'}
                                </Link>
                            </li>
                            <li>
                                /{' '}
                                <span style={{ textTransform: 'capitalize' }}>
                                    {isRetailRoute ? 'Retail Submission Details' : 'Transaction Details'}
                                </span>
                            </li>
                        </ol>
                    </div>
                </div>
            </div>

            {/* Module 49245: Back Button + Heading + "Download details" Button */}
            <div style={{ marginTop: 24, width: '100%' }}>
                <div
                    style={{
                        marginBottom: 24,
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button
                            type="button"
                            onClick={() =>
                                navigate(isRetailRoute ? '/financials/retail-transactions' : '/financials/transactions')
                            }
                            title={isRetailRoute ? 'Back to Retail Submissions' : 'Back to Transactions'}
                            style={{
                                flexShrink: 0,
                                cursor: 'pointer',
                                borderRadius: '9999px',
                                border: '1px solid #FEC9B8',
                                background: '#ffffff',
                                padding: 8,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {/* Module 59357 Orange Back Arrow SVG */}
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M9.03092 15.5892C9.35636 15.9147 9.88399 15.9147 10.2094 15.5892C10.5349 15.2638 10.5349 14.7362 10.2094 14.4107L6.63186 10.8333H15.834C16.2942 10.8333 16.6673 10.4602 16.6673 9.99996C16.6673 9.53972 16.2942 9.16663 15.834 9.16663H6.63186L10.2094 5.58922C10.5349 5.26378 10.5349 4.73614 10.2094 4.4107C9.88399 4.08527 9.35636 4.08527 9.03092 4.4107L4.03092 9.4107C3.70548 9.73614 3.70548 10.2638 4.03092 10.5892L9.03092 15.5892Z"
                                    fill="#FB4B14"
                                />
                            </svg>
                        </button>
                        <h1
                            style={{
                                margin: '0 0 0 16px',
                                fontSize: 20,
                                lineHeight: '28px',
                                fontWeight: 700,
                                color: '#605E5C',
                            }}
                        >
                            {isRetailRoute ? 'Retail Submission Details' : 'Transaction Details'}
                        </h1>
                    </div>

                    {/* Module 45891: Download details button (shown on standard Transaction Details) */}
                    {!isRetail && (
                        <button
                            type="button"
                            onClick={() => {
                                showToast(`Downloading PDF details for ${tx.reference}...`);
                                window.print();
                            }}
                            style={{
                                height: 40,
                                padding: '0 16px',
                                borderRadius: 6,
                                border: '1px solid #FB4B14',
                                background: '#FB4B14',
                                color: '#ffffff',
                                fontSize: 14,
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                            }}
                        >
                            {/* Module 36448 Download SVG */}
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                    opacity="0.5"
                                    d="M17 9.00195C19.175 9.01406 20.3529 9.11051 21.1213 9.8789C22 10.7576 22 12.1718 22 15.0002V16.0002C22 18.8286 22 20.2429 21.1213 21.1215C20.2426 22.0002 18.8284 22.0002 16 22.0002H8C5.17157 22.0002 3.75736 22.0002 2.87868 21.1215C2 20.2429 2 18.8286 2 16.0002L2 15.0002C2 12.1718 2 10.7576 2.87868 9.87889C3.64706 9.11051 4.82497 9.01406 7 9.00195"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                />
                                <path
                                    d="M12 2L12 15M12 15L9 11.5M12 15L15 11.5"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            <span>Download details</span>
                        </button>
                    )}
                </div>

                {/* Summary Card: Module 8307 (4 fields for Retail) vs Module 55538 (13 fields + 4 checks for Transactions) */}
                <div className="staging-summary-card">
                    <div
                        style={{
                            marginBottom: 16,
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                        }}
                    >
                        <div style={{ fontSize: 14, lineHeight: '20px', fontWeight: 600, color: '#605E5C' }}>
                            Summary
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                                style={{
                                    display: 'inline-block',
                                    width: 8,
                                    height: 8,
                                    borderRadius: '9999px',
                                    backgroundColor: dotColor,
                                }}
                            />
                            <span style={{ fontSize: 14, lineHeight: '20px', fontWeight: 600, color: '#323130' }}>
                                {tx.status}
                            </span>
                        </div>
                    </div>

                    {isRetail ? (
                        /* Retail Summary 4-Column Grid from module 8307 in retail_detail_page.js */
                        <div className="staging-summary-grid">
                            {[
                                { label: 'Reference', value: tx.reference },
                                { label: 'Affiliate', value: tx.affiliate },
                                { label: 'Total amount', value: `${tx.sendCurrency} ${tx.amount.toFixed(2)}` },
                                { label: 'Payment mode', value: tx.paymentMethod },
                            ].map((item, idx) => (
                                <div key={idx} style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 12, lineHeight: '16px', color: '#A19F9D' }}>
                                        {item.label}
                                    </div>
                                    <div
                                        style={{
                                            marginTop: 4,
                                            fontSize: 14,
                                            lineHeight: '20px',
                                            fontWeight: 600,
                                            color: '#323130',
                                            wordBreak: 'break-word',
                                        }}
                                    >
                                        {item.value || '—'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            {/* 4-Column Responsive Grid of 13 Summary Fields */}
                            <div className="staging-summary-grid">
                                {summaryFields.map((item, idx) => (
                                    <div key={idx} style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 12, lineHeight: '16px', color: '#A19F9D' }}>
                                            {item.label}
                                        </div>
                                        <div
                                            style={{
                                                marginTop: 4,
                                                fontSize: 14,
                                                lineHeight: '20px',
                                                fontWeight: 600,
                                                color: '#323130',
                                                wordBreak: 'break-word',
                                            }}
                                        >
                                            {item.value || '—'}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* 4 Compliance Checkboxes matching c=({label, passed}) in module 55538 */}
                            <div
                                style={{
                                    marginTop: 16,
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    columnGap: 20,
                                    rowGap: 8,
                                    borderTop: '1px solid #EDEBE9',
                                    paddingTop: 12,
                                }}
                            >
                                {[
                                    { key: 'verification', label: 'Verification' },
                                    { key: 'kyc', label: 'KYC' },
                                    { key: 'thresholds', label: 'Thresholds' },
                                    { key: 'postcode', label: 'Card postcode' },
                                ].map((chk) => {
                                    const passed = complianceChecks[chk.key];
                                    return (
                                        <label
                                            key={chk.key}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                fontSize: 14,
                                                lineHeight: '20px',
                                                fontWeight: 500,
                                                color: '#323130',
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={passed === true}
                                                readOnly
                                                disabled
                                                style={{
                                                    width: 14,
                                                    height: 14,
                                                    accentColor: '#71AD42',
                                                }}
                                            />
                                            <span>{chk.label}</span>
                                            {passed === false ? (
                                                <span style={{ fontSize: 12, lineHeight: '16px', fontWeight: 400, color: '#D83B01' }}>
                                                    failed
                                                </span>
                                            ) : null}
                                            {passed === null ? (
                                                <span style={{ fontSize: 12, lineHeight: '16px', fontWeight: 400, color: '#A19F9D' }}>
                                                    n/a
                                                </span>
                                            ) : null}
                                        </label>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Horizontal Underline Tabs: 4 Tabs on Retail (Details, Actions, Trail & comments, Help tickets) vs 7 Tabs on Standard */}
                <div className="staging-underline-tabs">
                    {(isRetail
                        ? TABS.filter((t) => ['details', 'actions', 'trail', 'tickets'].includes(t.id))
                        : TABS
                    ).map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    whiteSpace: 'nowrap',
                                    padding: '4px 16px 10px 16px',
                                    fontSize: 14,
                                    fontWeight: 500,
                                    background: 'transparent',
                                    borderTop: 'none',
                                    borderLeft: 'none',
                                    borderRight: 'none',
                                    borderBottom: isActive ? '2px solid #FB4B14' : '2px solid transparent',
                                    color: isActive ? '#FB4B14' : '#6b7280',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* TAB 1: DETAILS */}
                {activeTab === 'details' &&
                    (isRetail ? (
                        /* Retail Submission Details Single Card (module 90665 & 66954: Service, Beneficiary, Sender, Payment) */
                        <div className="staging-detail-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {[
                                {
                                    title: 'Service',
                                    rows: [
                                        { label: 'Type', value: tx.type },
                                        { label: 'TUN#', value: tx.tun, href: `/financials/transactions/${tx.id}` },
                                        { label: 'Channel', value: tx.channel },
                                        { label: 'Provider', value: tx.provider },
                                        { label: 'Service code', value: tx.providerCode },
                                        { label: 'Collection method', value: 'Bank Deposit / Instant Transfer' },
                                        { label: 'Account number', value: tx.beneficiaryAccount },
                                        { label: 'Routing number', value: '044150149' },
                                    ],
                                },
                                {
                                    title: 'Beneficiary',
                                    rows: [
                                        { label: 'Name', value: tx.beneficiaryName },
                                        { label: 'Contact number', value: tx.beneficiaryPhone },
                                        { label: 'Email', value: tx.beneficiaryEmail },
                                        { label: 'Address', value: tx.beneficiaryAddress },
                                    ],
                                },
                                {
                                    title: 'Sender',
                                    rows: [
                                        { label: 'Name', value: tx.createdBy },
                                        { label: 'Contact number', value: tx.senderPhone },
                                        { label: 'Email', value: tx.createdByEmail },
                                        { label: 'Address', value: tx.senderAddress },
                                    ],
                                },
                                {
                                    title: 'Payment',
                                    rows: [
                                        { label: 'Rate', value: Number(tx.rate).toFixed(4) },
                                        { label: 'Settlement amount', value: `${tx.sendCurrency} ${tx.sendAmount.toFixed(2)}` },
                                        {
                                            label: 'Payout amount',
                                            value: `${tx.receiveCurrency} ${tx.receiveAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                                        },
                                        { label: 'Total paid', value: `${tx.currency} ${tx.amount.toFixed(2)}` },
                                        { label: 'Payment method', value: tx.paymentMethod },
                                        { label: 'Payment status', value: tx.paymentStatus },
                                        { label: 'Commission', value: `${tx.currency} ${tx.commission.toFixed(2)}` },
                                        { label: 'Agent commission', value: `${tx.currency} ${Number(tx.agentFee ?? 0.25).toFixed(2)}` },
                                    ],
                                },
                            ].map((sec) => (
                                <div key={sec.title} style={{ minWidth: 0 }}>
                                    <h3 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600, color: '#605E5C' }}>
                                        {sec.title}
                                    </h3>
                                    <div className="staging-detail-grid">
                                        {sec.rows.map((r, i) => (
                                            <div key={i} style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: 12, color: '#A19F9D' }}>{r.label}</div>
                                                <div
                                                    style={{
                                                        marginTop: 2,
                                                        fontSize: 14,
                                                        fontWeight: 600,
                                                        color: '#323130',
                                                        wordBreak: 'break-word',
                                                    }}
                                                >
                                                    {r.href ? (
                                                        <Link to={r.href} style={{ color: '#FB4B14', textDecoration: 'none' }}>
                                                            {r.value || 'N/A'}
                                                        </Link>
                                                    ) : (
                                                        r.value || 'N/A'
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Standard Transaction Details 6 Stacked Cards (Module 35709 in staging_5709.js) */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <DetailSectionCard
                                title="Overview"
                                fields={[
                                    { label: 'Date created', value: `${tx.date} ${tx.time}` },
                                    { label: 'TUN#', value: tx.tun || 'TUN-88492011' },
                                    { label: 'Partner ref', value: tx.merchantRef },
                                    { label: 'Type', value: tx.type },
                                    { label: 'CreatedBy', value: tx.createdBy, href: '/customer/users' },
                                    { label: 'Acc Bal.', value: tx.accountBalance },
                                ]}
                            />
                            <DetailSectionCard
                                title="Account"
                                fields={[
                                    { label: 'Account', value: `${tx.furpAccountNo} (${tx.createdBy})`, href: '/customer/accounts' },
                                    { label: 'Cumulative thresholds', value: tx.cumulativeThresholds },
                                    { label: 'Affiliate', value: tx.affiliate },
                                    { label: 'Comments', value: `${comments.length} operational note(s)` },
                                ]}
                            />
                            <DetailSectionCard
                                title="Sender"
                                fields={[
                                    { label: 'Name', value: tx.createdBy, href: '/customer/users' },
                                    { label: 'Email', value: tx.createdByEmail },
                                    { label: 'Mobile', value: tx.senderPhone },
                                    { label: 'Address', value: tx.senderAddress },
                                    { label: 'Nationality', value: tx.senderNationality },
                                    { label: 'Country of birth', value: tx.senderCountryOfBirth },
                                    { label: 'Occupation', value: tx.senderOccupation },
                                    { label: 'Date of birth', value: tx.senderDob },
                                    { label: 'ID country', value: tx.senderIdCountry },
                                    { label: 'ID type', value: tx.senderIdType },
                                    { label: 'ID number', value: tx.senderIdNumber },
                                    { label: 'ID issue date', value: tx.senderIdIssueDate },
                                    { label: 'ID expire date', value: tx.senderIdExpireDate },
                                ]}
                            />
                            <DetailSectionCard
                                title="Beneficiary"
                                fields={[
                                    {
                                        label: 'Name',
                                        value: `${editForm.firstName} ${editForm.lastName}`.trim(),
                                        href: '/customer/beneficiaries',
                                    },
                                    { label: 'Email', value: editForm.email },
                                    { label: 'Mobile', value: editForm.mobile },
                                    { label: 'Address', value: editForm.address },
                                    { label: 'City', value: editForm.city },
                                    { label: 'Country', value: tx.beneficiaryCountry },
                                    { label: 'Relationship', value: tx.beneficiaryRelationship },
                                    { label: 'Purpose', value: tx.beneficiaryPurpose },
                                    { label: 'ID country', value: tx.beneficiaryCountry },
                                    { label: 'ID type', value: 'National ID / BVN' },
                                    { label: 'ID number', value: 'BVN-22394810291' },
                                ]}
                            />
                            <DetailSectionCard
                                title="Service"
                                fields={[
                                    { label: 'Collection method', value: 'Bank Deposit / Instant Transfer' },
                                    { label: 'Provider', value: tx.provider, href: '/configuration/providers' },
                                    { label: 'Provider code', value: tx.providerCode },
                                    { label: 'Destination', value: `${tx.beneficiaryCountry} (${tx.receiveCurrency})` },
                                    { label: 'Account', value: `${editForm.accountNumber} (${tx.beneficiaryBank})` },
                                    { label: 'IBAN', value: '—' },
                                    { label: 'SWIFT / BIC', value: 'ABNGNGLAXXX' },
                                    { label: 'Sort / routing', value: '044150149' },
                                    { label: 'Pickup code', value: '—' },
                                    { label: 'Pickup location', value: '—' },
                                ]}
                            />
                            <DetailSectionCard
                                title="Cross rates"
                                fields={[
                                    { label: 'Cross-rate currency', value: `${tx.sendCurrency} / ${tx.receiveCurrency}` },
                                    { label: 'Sender / cross rate', value: tx.rate.toFixed(4) },
                                    { label: 'Sender / cross market rate', value: (tx.rate * 0.992).toFixed(4) },
                                    { label: 'Sender / cross spread', value: '0.80%' },
                                    { label: 'Sender / cross factor', value: '1.0000' },
                                    { label: 'Sender / cross amount', value: `${tx.sendCurrency} ${tx.sendAmount.toFixed(2)}` },
                                    { label: 'Cross / recipient rate', value: tx.rate.toFixed(4) },
                                    { label: 'Cross / recipient market rate', value: (tx.rate * 0.992).toFixed(4) },
                                    {
                                        label: 'Cross / recipient amount',
                                        value: `${tx.receiveCurrency} ${tx.receiveAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                                    },
                                ]}
                            />
                        </div>
                    ))}

                {/* TAB 2: ACTIONS */}
                {activeTab === 'actions' &&
                    (isRetail ? (
                        /* Retail Update Status Action Card (N in module 90665) */
                        <div className="staging-detail-card">
                            <h3 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 600, color: '#605E5C' }}>
                                Update status
                            </h3>
                            <p style={{ margin: '0 0 12px 0', fontSize: 14, color: '#A19F9D' }}>
                                Current status: {tx.status || '—'}. The change is logged in Trail &amp; comments with your name and the reason.
                            </p>
                            <div style={{ marginBottom: 12, maxWidth: 448 }}>
                                <select
                                    style={formInputStyle}
                                    value={retailNextStatus}
                                    onChange={(e) => setRetailNextStatus(e.target.value)}
                                >
                                    <option value="">Select status</option>
                                    <option value="Under Review">Under Review</option>
                                    <option value="Processed">Processed</option>
                                    <option value="Successful">Successful</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Failed">Failed</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>
                            <textarea
                                rows={2}
                                placeholder="Reason"
                                value={retailStatusReason}
                                onChange={(e) => setRetailStatusReason(e.target.value)}
                                style={{
                                    ...formInputStyle,
                                    height: 'auto',
                                    padding: 8,
                                    marginBottom: 12,
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    if (!retailNextStatus) {
                                        showToast('Select a status.');
                                        return;
                                    }
                                    if (!retailStatusReason.trim()) {
                                        showToast('Enter a reason.');
                                        return;
                                    }
                                    setTx((prev) => ({ ...prev, status: retailNextStatus }));
                                    setAuditTrail((prev) => [
                                        {
                                            id: `AUD-${Date.now()}`,
                                            timestamp: '27 Oct 2026 20:15:00',
                                            actor: 'Mito Admin',
                                            text: `Retail submission status updated to ${retailNextStatus}. Reason: ${retailStatusReason.trim()}`,
                                        },
                                        ...prev,
                                    ]);
                                    setRetailNextStatus('');
                                    setRetailStatusReason('');
                                    showToast('Status updated.');
                                }}
                                style={{
                                    height: 36,
                                    padding: '0 14px',
                                    borderRadius: 6,
                                    border: '1px solid #FB4B14',
                                    background: '#ffffff',
                                    color: '#FB4B14',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                Update status
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div className="staging-detail-card">
                            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#605E5C' }}>
                                Actions
                            </h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                                {ADMIN_ACTION_ITEMS.map((act) => (
                                    <div
                                        key={act.id}
                                        style={{
                                            display: 'flex',
                                            minWidth: 200,
                                            flex: '1 1 200px',
                                            maxWidth: 280,
                                            flexDirection: 'column',
                                            gap: 6,
                                            borderRadius: 8,
                                            border: '1px solid #f3f4f6',
                                            background: '#f9fafb',
                                            padding: 12,
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <button
                                                type="button"
                                                style={actionButtonStyle(act.variant)}
                                                onClick={() => {
                                                    setActionPaymentRefInput(tx.paymentReference || '');
                                                    setPendingAction(act);
                                                }}
                                            >
                                                {act.label}
                                            </button>
                                            <span
                                                title={act.description}
                                                style={{
                                                    flexShrink: 0,
                                                    width: 18,
                                                    height: 18,
                                                    borderRadius: '9999px',
                                                    border: '1px solid #d1d5db',
                                                    color: '#6b7280',
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'help',
                                                }}
                                            >
                                                i
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: 12, lineHeight: '16px', color: '#605E5C' }}>
                                            {act.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Module 30539: Switch Processor + Split Cards */}
                        <div className="staging-switch-split-grid">
                            <div className="staging-detail-card">
                                <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600, color: '#605E5C' }}>
                                    Switch Processor
                                </h3>
                                <p style={{ margin: '0 0 12px 0', fontSize: 12, color: '#A19F9D' }}>
                                    Re-route this transaction to an alternative payout processor.
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#A19F9D' }}>
                                            Processor
                                        </label>
                                        <select
                                            style={formInputStyle}
                                            value={switchProviderValue}
                                            onChange={(e) => setSwitchProviderValue(e.target.value)}
                                        >
                                            <option value="Flutterwave">Flutterwave</option>
                                            <option value="Paystack">Paystack</option>
                                            <option value="Interswitch">Interswitch</option>
                                            <option value="Thunes">Thunes</option>
                                            <option value="Onafriq">Onafriq</option>
                                            <option value="Zeepay">Zeepay</option>
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTx((prev) => ({ ...prev, provider: switchProviderValue }));
                                            showToast(`Switched processor to ${switchProviderValue}.`);
                                        }}
                                        style={{
                                            alignSelf: 'flex-start',
                                            height: 38,
                                            padding: '0 20px',
                                            borderRadius: 6,
                                            border: '1px solid #FB4B14',
                                            background: '#FB4B14',
                                            color: '#ffffff',
                                            fontSize: 14,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Switch
                                    </button>
                                </div>
                            </div>

                            <div className="staging-detail-card">
                                <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600, color: '#605E5C' }}>
                                    Split
                                </h3>
                                <p style={{ margin: '0 0 12px 0', fontSize: 12, color: '#A19F9D' }}>
                                    Split this transaction into smaller child disbursements to bypass single-payout limits.
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#A19F9D' }}>
                                            Max chunk amount ({tx.sendCurrency})
                                        </label>
                                        <input
                                            type="number"
                                            style={formInputStyle}
                                            value={splitChunkValue}
                                            onChange={(e) => setSplitChunkValue(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTx((prev) => ({ ...prev, splitTag: 'SP' }));
                                            showToast(`Split transaction into chunks of ${tx.sendCurrency} ${splitChunkValue}.`);
                                        }}
                                        style={{
                                            alignSelf: 'flex-start',
                                            height: 38,
                                            padding: '0 20px',
                                            borderRadius: 6,
                                            border: '1px solid #FB4B14',
                                            background: '#FB4B14',
                                            color: '#ffffff',
                                            fontSize: 14,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Split Transaction
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* TAB 3: TRAIL & COMMENTS (Module 79333 in staging_7959.js) */}
                {activeTab === 'trail' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div className="staging-detail-card">
                            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#605E5C' }}>
                                Audit trail
                            </h3>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {auditTrail.map((item, idx) => {
                                    const isLast = idx === auditTrail.length - 1;
                                    return (
                                        <li
                                            key={item.id}
                                            style={{
                                                position: 'relative',
                                                display: 'flex',
                                                gap: 12,
                                                paddingBottom: isLast ? 0 : 16,
                                            }}
                                        >
                                            {!isLast && (
                                                <span
                                                    style={{
                                                        position: 'absolute',
                                                        left: 5,
                                                        top: 14,
                                                        bottom: 0,
                                                        width: 1,
                                                        background: '#EDEBE9',
                                                    }}
                                                />
                                            )}
                                            <span
                                                style={{
                                                    position: 'relative',
                                                    zIndex: 1,
                                                    marginTop: 6,
                                                    width: 10,
                                                    height: 10,
                                                    flexShrink: 0,
                                                    borderRadius: '9999px',
                                                    background: '#71AD42',
                                                }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 12, color: '#A19F9D' }}>
                                                    {item.timestamp} · <strong style={{ color: '#605E5C' }}>{item.actor}</strong>
                                                </div>
                                                <p style={{ margin: '2px 0 0 0', fontSize: 14, color: '#323130' }}>
                                                    {item.text}
                                                </p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        <div className="staging-detail-card">
                            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#605E5C' }}>
                                Comments
                            </h3>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (!newCommentText.trim()) return;
                                    setComments((prev) => [
                                        {
                                            id: `CMT-${Date.now()}`,
                                            author: 'Mito Admin',
                                            createdAt: '27 Oct 2026 19:52',
                                            body: newCommentText.trim(),
                                            ...commentFlags,
                                        },
                                        ...prev,
                                    ]);
                                    setNewCommentText('');
                                    showToast('Comment added.');
                                }}
                                style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}
                            >
                                <div>
                                    <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#A19F9D' }}>
                                        Add comment
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder="Enter comment..."
                                        value={newCommentText}
                                        onChange={(e) => setNewCommentText(e.target.value)}
                                        style={{
                                            ...formInputStyle,
                                            height: 'auto',
                                            padding: '8px 12px',
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                                    {[
                                        { key: 'visibleToCustomer', label: 'Visible to Customer' },
                                        { key: 'notifyPartner', label: 'Notify Partner' },
                                        { key: 'closed', label: 'Closed' },
                                    ].map((flag) => (
                                        <label
                                            key={flag.key}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                fontSize: 14,
                                                color: '#605E5C',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={commentFlags[flag.key]}
                                                onChange={(e) =>
                                                    setCommentFlags((prev) => ({
                                                        ...prev,
                                                        [flag.key]: e.target.checked,
                                                    }))
                                                }
                                                style={{ width: 16, height: 16, accentColor: '#FB4B14' }}
                                            />
                                            {flag.label}
                                        </label>
                                    ))}
                                </div>
                                <div>
                                    <button
                                        type="submit"
                                        style={{
                                            height: 38,
                                            padding: '0 20px',
                                            borderRadius: 6,
                                            border: '1px solid #FB4B14',
                                            background: '#FB4B14',
                                            color: '#ffffff',
                                            fontSize: 14,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Submit
                                    </button>
                                </div>
                            </form>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid #EDEBE9', paddingTop: 16 }}>
                                {comments.map((c) => (
                                    <div
                                        key={c.id}
                                        style={{
                                            borderRadius: 8,
                                            border: '1px solid #EDEBE9',
                                            background: '#FAF9F8',
                                            padding: 12,
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#A19F9D', marginBottom: 4 }}>
                                            <strong style={{ color: '#323130' }}>{c.author}</strong>
                                            <span>{c.createdAt}</span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: 14, color: '#323130' }}>{c.body}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 4: EDIT (Module 4873 in staging_7339.js) */}
                {activeTab === 'edit' && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            setTx((prev) => ({
                                ...prev,
                                beneficiaryName: `${editForm.firstName} ${editForm.lastName}`.trim(),
                                beneficiaryPhone: editForm.mobile,
                                beneficiaryAddress: editForm.address,
                                beneficiaryCity: editForm.city,
                                beneficiaryEmail: editForm.email,
                                beneficiaryAccount: editForm.accountNumber,
                                status: editForm.status,
                            }));
                            showToast('Transaction beneficiary and status updated.');
                        }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
                    >
                        <div className="staging-detail-card">
                            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#605E5C' }}>
                                Beneficiary
                            </h3>
                            <div className="staging-edit-grid">
                                <div>
                                    <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#A19F9D' }}>First name *</label>
                                    <input
                                        type="text"
                                        required
                                        style={formInputStyle}
                                        value={editForm.firstName}
                                        onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#A19F9D' }}>Last name *</label>
                                    <input
                                        type="text"
                                        required
                                        style={formInputStyle}
                                        value={editForm.lastName}
                                        onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#A19F9D' }}>Middle name</label>
                                    <input
                                        type="text"
                                        style={formInputStyle}
                                        value={editForm.middleName}
                                        onChange={(e) => setEditForm({ ...editForm, middleName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#A19F9D' }}>Mobile</label>
                                    <input
                                        type="text"
                                        style={formInputStyle}
                                        value={editForm.mobile}
                                        onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#A19F9D' }}>Address</label>
                                    <input
                                        type="text"
                                        style={formInputStyle}
                                        value={editForm.address}
                                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#A19F9D' }}>City</label>
                                    <input
                                        type="text"
                                        style={formInputStyle}
                                        value={editForm.city}
                                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#A19F9D' }}>Postcode</label>
                                    <input
                                        type="text"
                                        style={formInputStyle}
                                        value={editForm.postcode}
                                        onChange={(e) => setEditForm({ ...editForm, postcode: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#A19F9D' }}>Email</label>
                                    <input
                                        type="email"
                                        style={formInputStyle}
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#A19F9D' }}>Account / IBAN</label>
                                    <input
                                        type="text"
                                        style={formInputStyle}
                                        value={editForm.accountNumber}
                                        onChange={(e) => setEditForm({ ...editForm, accountNumber: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="staging-detail-card">
                            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#605E5C' }}>
                                Transaction Status
                            </h3>
                            <div style={{ maxWidth: 320, marginBottom: 16 }}>
                                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#A19F9D' }}>Status *</label>
                                <select
                                    style={formInputStyle}
                                    value={editForm.status}
                                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                >
                                    <option value="Processed">Processed</option>
                                    <option value="Pending">Pending</option>
                                    <option value="PaymentReceived">PaymentReceived</option>
                                    <option value="ProcessFailed">ProcessFailed</option>
                                    <option value="WaitOps">WaitOps</option>
                                    <option value="Hold">Hold</option>
                                    <option value="ComplianceHold">ComplianceHold</option>
                                    <option value="Suspended">Suspended</option>
                                    <option value="Cancelled">Cancelled</option>
                                    <option value="Void">Void</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                style={{
                                    height: 40,
                                    padding: '0 24px',
                                    borderRadius: 6,
                                    border: '1px solid #FB4B14',
                                    background: '#FB4B14',
                                    color: '#ffffff',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Save Transaction
                            </button>
                        </div>
                    </form>
                )}

                {/* TAB 5: ITEMS (Module 26350 in staging_7339.js) */}
                {activeTab === 'items' && (
                    <div className="staging-detail-card">
                        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#605E5C' }}>
                            Transaction Items
                        </h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, textAlign: 'left' }}>
                                <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                    <tr>
                                        {['Index', 'FGC Ref', 'Processor', 'Value', 'External Ref', 'Local', 'Tries', 'Success', 'Active', 'Message', 'Last Attempt', 'Created'].map((col) => (
                                            <th key={col} style={{ padding: '8px 12px', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '10px 12px' }}>1</td>
                                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#FB4B14' }}>{tx.reference}-01</td>
                                        <td style={{ padding: '10px 12px' }}>{tx.provider}</td>
                                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                                            {tx.receiveCurrency} {tx.receiveAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ padding: '10px 12px' }}>{tx.merchantRef}</td>
                                        <td style={{ padding: '10px 12px' }}>{tx.sendCurrency} {tx.sendAmount.toFixed(2)}</td>
                                        <td style={{ padding: '10px 12px' }}>1</td>
                                        <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 600 }}>Yes</td>
                                        <td style={{ padding: '10px 12px' }}>Yes</td>
                                        <td style={{ padding: '10px 12px' }}>00: Approved or completed successfully</td>
                                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{tx.date} {tx.time}</td>
                                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{tx.date} {tx.time}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 6: KYC (Module 95082 in staging_tx_detail.js) */}
                {activeTab === 'kyc' && (
                    <div
                        className="staging-detail-card"
                        style={{ maxWidth: 672, margin: '0 auto', textAlign: 'center', padding: 32 }}
                    >
                        <div
                            style={{
                                width: 72,
                                height: 72,
                                borderRadius: '9999px',
                                background: 'rgba(113, 173, 66, 0.12)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 16,
                            }}
                        >
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M12 2L4 5.5V11.5C4 16.8 7.4 21.6 12 23C16.6 21.6 20 16.8 20 11.5V5.5L12 2ZM10.2 16.2L6.5 12.5L7.9 11.1L10.2 13.4L16.1 7.5L17.5 8.9L10.2 16.2Z"
                                    fill="#71AD42"
                                />
                            </svg>
                        </div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 600, color: '#323130' }}>
                            KYC Verification status
                        </h3>
                        <p style={{ margin: '0 0 2px 0', fontSize: 12, color: '#A19F9D' }}>
                            Linked to the account ({tx.furpAccountNo} · {tx.createdBy})
                        </p>
                        <p style={{ margin: '0 0 16px 0', fontSize: 12, color: '#A19F9D' }}>
                            Last Updated: {tx.date}
                        </p>
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '6px 16px',
                                borderRadius: 9999,
                                background: 'rgba(113, 173, 66, 0.12)',
                            }}
                        >
                            <span style={{ width: 8, height: 8, borderRadius: '9999px', background: '#71AD42' }} />
                            <span style={{ fontSize: 16, fontWeight: 700, color: '#323130' }}>Verified</span>
                        </div>
                    </div>
                )}

                {/* TAB 7: HELP TICKETS (Module 51626) */}
                {activeTab === 'tickets' && (
                    <div className="staging-detail-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#605E5C' }}>
                                Help tickets
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
                                    const nextId = `TKT-${Math.floor(4100 + Math.random() * 900)}`;
                                    setTickets((prev) => [
                                        {
                                            id: nextId,
                                            subject: `Follow-up check for ${tx.reference}`,
                                            status: 'Open',
                                            priority: 'High',
                                            created: '27 Oct 2026 19:53',
                                            assignee: 'Operations Escalation Desk',
                                        },
                                        ...prev,
                                    ]);
                                    showToast(`Ticket ${nextId} created.`);
                                }}
                                style={{
                                    height: 36,
                                    padding: '0 16px',
                                    borderRadius: 6,
                                    border: '1px solid #FB4B14',
                                    background: '#FB4B14',
                                    color: '#ffffff',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                + New Ticket
                            </button>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, textAlign: 'left' }}>
                                <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                    <tr>
                                        <th style={{ padding: '8px 12px', fontWeight: 600, color: '#374151' }}>Ticket ID</th>
                                        <th style={{ padding: '8px 12px', fontWeight: 600, color: '#374151' }}>Subject</th>
                                        <th style={{ padding: '8px 12px', fontWeight: 600, color: '#374151' }}>Priority</th>
                                        <th style={{ padding: '8px 12px', fontWeight: 600, color: '#374151' }}>Assignee</th>
                                        <th style={{ padding: '8px 12px', fontWeight: 600, color: '#374151' }}>Created</th>
                                        <th style={{ padding: '8px 12px', fontWeight: 600, color: '#374151' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tickets.map((t) => (
                                        <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={{ padding: '10px 12px', fontWeight: 600, color: '#FB4B14' }}>{t.id}</td>
                                            <td style={{ padding: '10px 12px' }}>{t.subject}</td>
                                            <td style={{ padding: '10px 12px' }}>{t.priority}</td>
                                            <td style={{ padding: '10px 12px' }}>{t.assignee}</td>
                                            <td style={{ padding: '10px 12px' }}>{t.created}</td>
                                            <td style={{ padding: '10px 12px', fontWeight: 600, color: t.status === 'Resolved' ? '#16a34a' : '#FB4B14' }}>
                                                {t.status}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Confirmation Modal */}
            {pendingAction && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(14, 23, 38, 0.55)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 999,
                        padding: 16,
                    }}
                >
                    <div style={{ background: '#ffffff', borderRadius: 12, maxWidth: 440, width: '100%', padding: 24 }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 700, color: '#0e1726' }}>
                            Confirm Action: {pendingAction.label}
                        </h3>
                        <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#605E5C' }}>
                            {pendingAction.description}
                        </p>
                        {pendingAction.requiresInput && (
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#A19F9D' }}>
                                    {pendingAction.inputLabel}
                                </label>
                                <input
                                    type="text"
                                    style={formInputStyle}
                                    value={actionPaymentRefInput}
                                    onChange={(e) => setActionPaymentRefInput(e.target.value)}
                                />
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button
                                type="button"
                                onClick={() => setPendingAction(null)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 6,
                                    border: '1px solid #d1d5db',
                                    background: '#ffffff',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={executeAdminAction}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 6,
                                    border: pendingAction.variant === 'danger' ? '1px solid #dc2626' : '1px solid #FB4B14',
                                    background: pendingAction.variant === 'danger' ? '#dc2626' : '#FB4B14',
                                    color: '#ffffff',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Confirm {pendingAction.label}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
