// Mock transaction data
export const MOCK_TRANSACTIONS = [
    {
        reference: '22505502',
        mtn: '22505502',
        affiliate: 'Rhemito Direct',
        status: 'Processed',
        type: 'MONEYTRANSFER',
        sendingCountry: 'GBR',
        beneficiaryFirstName: 'Marie',
        beneficiaryLastName: 'Laurent',
        beneficiaryPhone: '33612345678',
        beneficiaryEmail: 'marie.laurent@example.fr',
        beneficiaryAddress: '18 Rue de Rivoli, Paris, France',
        senderFirstName: 'Andy',
        senderLastName: 'Burnham',
        senderPhone: '447700900123',
        senderEmail: 'andy.burnham@example.co.uk',
        senderAddress: '10 Deansgate, Manchester, UK',
        accountBalance: '£ 2,450.00',
        lastUpdated: '12 Mar 2026, 11:30',
        channel: 'Rhemito Web / Instant Bank',
        serviceName: 'SEPA INSTANT EUR',
        serviceCode: 'SEPA-FR',
        collectionMethod: 'BANKACCOUNT',
        account: 'FR7630006000011234567890189',
        sendCurrency: 'GBP',
        receiveCurrency: 'EUR',
        sendAmount: 'GBP 100.00',
        amountSent: 'GBP 88.00',
        feeAmount: 'GBP 12.00',
        promoCode: 'SAVE55',
        rewardTag: 'PC',
        rewardRuleName: 'SAVE55',
        rewardType: 'Promo Code',
        discountAmount: 'GBP 55.00',
        receiverBonusAmount: 'EUR 0.00',
        customerPaid: 'GBP 45.00',
        rate: '1.08',
        payout: 'EUR 95.04',
        settle: 'GBP 88.00',
        total: 'GBP 45.00',
        messageHistory: [
            { timestamp: '12 Mar 2026, 11:30', user: 'System', message: 'Promo code [PC] SAVE55 applied (-GBP 55.00 discount)', type: 'system' },
            { timestamp: '12 Mar 2026, 11:32', user: 'Support Agent', message: 'Verified SEPA Instant payout to beneficiary.', type: 'agent' }
        ],
        notes: '',
        auditTrail: [
            { time: '11:30 AM', event: 'Transaction Initiated (Send Amount: GBP 100.00)', status: 'complete' },
            { time: '11:30 AM', event: '[PC] Promo code SAVE55 applied. Discount given: -GBP 55.00', status: 'complete' },
            { time: '11:31 AM', event: 'Customer Paid GBP 45.00 — Funds Cleared', status: 'complete' },
            { time: '11:32 AM', event: 'Partner Payout Confirmed (EUR 95.04)', status: 'complete' }
        ],
        kycStatus: 'Passed',
        hasUnseenComments: false,
        hasUnseenTickets: false
    },
    {
        reference: '05023676980',
        mtn: '05023676980',
        affiliate: 'ITransfer Money Movers',
        status: 'Processed',
        type: 'MONEYTRANSFER',
        sendingCountry: 'ESP',
        beneficiaryFirstName: 'OGBEIDE',
        beneficiaryLastName: 'OSAYANDE',
        beneficiaryPhone: '2348136931833',
        beneficiaryEmail: 'ogbeide.o@example.com',
        beneficiaryAddress: '12, Osayande St, Benin City, Nigeria',
        senderFirstName: 'OGBEIDE',
        senderLastName: 'OSAYANDE',
        senderPhone: '34678123456',
        senderEmail: 'ogbeide.sender@example.com',
        senderAddress: 'Calle de Alcala, 45, Madrid, Spain',
        accountBalance: '₦ 1,250,000.00',
        lastUpdated: '11 Mar 2026, 09:48',
        channel: 'FURP (onepipe) / FunTech',
        serviceName: 'ZENITH BANK PLC',
        serviceCode: '1011',
        collectionMethod: 'BANKACCOUNT',
        account: '2086208819',
        sendCurrency: 'EUR',
        receiveCurrency: 'NGN',
        sendAmount: 'EUR 63.76',
        amountSent: 'EUR 63.06',
        feeAmount: 'EUR 0.70',
        promoCode: null,
        rewardTag: null,
        rewardRuleName: null,
        rewardType: 'None',
        discountAmount: null,
        receiverBonusAmount: 'NGN 0.00',
        customerPaid: 'EUR 63.76',
        rate: '1645',
        payout: 'NGN 103734',
        settle: 'EUR 63.06',
        total: 'EUR 63.76',
        messageHistory: [
            { timestamp: '11 Mar 2026, 09:48', user: 'System', message: '[FTP] New Transaction added', type: 'system' },
            { timestamp: '11 Mar 2026, 10:15', user: 'Support Agent', message: 'Verifying payout status with partner.', type: 'agent' }
        ],
        notes: '',
        auditTrail: [
            { time: '09:48 AM', event: 'Transaction Initiated', status: 'complete' },
            { time: '09:50 AM', event: 'Funds Cleared', status: 'complete' },
            { time: '09:55 AM', event: 'Partner Payout Confirmed', status: 'complete' }
        ],
        kycStatus: 'Passed',
        hasUnseenComments: true,
        hasUnseenTickets: true
    },
    {
        reference: 'MITO-7721003',
        mtn: 'MITO-7721003',
        affiliate: 'Partner-KE',
        status: 'Completed',
        type: 'MONEYTRANSFER',
        sendingCountry: 'GBR',
        beneficiaryFirstName: 'John',
        beneficiaryLastName: 'Doe',
        beneficiaryPhone: '254712345678',
        beneficiaryEmail: 'john.doe@gmail.com',
        beneficiaryAddress: 'Moi Avenue, Nairobi, Kenya',
        senderFirstName: 'Jane',
        senderLastName: 'Smith',
        senderPhone: '447712345678',
        senderEmail: 'jane.smith@btinternet.co.uk',
        senderAddress: '221B Baker St, London, UK',
        accountBalance: '£ 5,420.50',
        lastUpdated: '08 Mar 2026, 14:10',
        channel: 'Mito Direct',
        serviceName: 'M-PESA',
        serviceCode: 'MPESA-KE',
        collectionMethod: 'MOBILEMONEY',
        account: '254712345678',
        sendCurrency: 'GBP',
        receiveCurrency: 'KES',
        sendAmount: 'GBP 205.00',
        amountSent: 'GBP 200.00',
        feeAmount: 'GBP 5.00',
        promoCode: 'WELCOME5',
        rewardTag: 'PC',
        rewardRuleName: 'WELCOME5',
        rewardType: 'Promo Code',
        discountAmount: 'GBP 5.00',
        receiverBonusAmount: 'KES 0.00',
        customerPaid: 'GBP 200.00',
        rate: '236',
        payout: 'KES 47200',
        settle: 'GBP 200.00',
        total: 'GBP 200.00',
        messageHistory: [
            { timestamp: '08 Mar 2026, 14:10', user: 'System', message: 'Transaction created via Direct channel', type: 'system' },
            { timestamp: '08 Mar 2026, 14:10', user: 'System', message: 'Promo code [PC] WELCOME5 applied (-GBP 5.00 discount)', type: 'system' },
            { timestamp: '08 Mar 2026, 14:45', user: 'Agent Smith', message: 'Customer called inquiring about delay. Escalated to partner.', type: 'agent' }
        ],
        notes: '',
        auditTrail: [
            { time: '09:00 AM', event: 'Transaction Initiated', status: 'complete' },
            { time: '09:01 AM', event: '[PC] Promo code WELCOME5 applied. Discount given: -GBP 5.00', status: 'complete' },
            { time: '09:02 AM', event: 'Funds Cleared', status: 'complete' },
            { time: '09:10 AM', event: 'Partner Payout Confirmed', status: 'complete' },
            { time: '09:12 AM', event: 'Transaction Complete', status: 'complete' },
        ],
        kycStatus: 'Pending',
        hasUnseenComments: true,
        hasUnseenTickets: true
    },
    {
        reference: 'MITO-8812044',
        mtn: 'MITO-8812044',
        affiliate: 'ITransfer Money Movers',
        status: 'Completed',
        type: 'MONEYTRANSFER',
        sendingCountry: 'ESP',
        beneficiaryFirstName: 'OGBEIDE',
        beneficiaryLastName: 'OSAYANDE',
        beneficiaryPhone: '2348031112233',
        beneficiaryEmail: 'ogbeide.family@example.com',
        beneficiaryAddress: '14, Mission Rd, Benin City, Nigeria',
        senderFirstName: 'OGBEIDE',
        senderLastName: 'OSAYANDE',
        senderPhone: '34678123456',
        senderEmail: 'ogbeide.sender@example.com',
        senderAddress: 'Calle de Alcala, 45, Madrid, Spain',
        accountBalance: '₦ 980,000.00',
        lastUpdated: '25 Feb 2026, 12:20',
        channel: 'FURP (onepipe) / FunTech',
        serviceName: 'ACCESS BANK PLC',
        serviceCode: '044',
        collectionMethod: 'BANKACCOUNT',
        account: '1029384756',
        sendCurrency: 'EUR',
        receiveCurrency: 'NGN',
        sendAmount: 'EUR 50.22',
        amountSent: 'EUR 47.90',
        feeAmount: 'EUR 2.32',
        promoCode: 'REF-BONUS',
        rewardTag: 'RF',
        rewardRuleName: 'EU-NG Referral Scheme (REF-BONUS)',
        rewardBonusAmount: 'EUR 2.00',
        rewardDirection: '+',
        rewardType: 'Referral / Bonus',
        discountAmount: 'EUR 2.00',
        receiverBonusAmount: 'NGN 1500.00',
        customerPaid: 'EUR 48.22',
        rate: '1638',
        payout: 'NGN 78624',
        settle: 'EUR 47.90',
        total: 'EUR 48.22',
        messageHistory: [
            { timestamp: '25 Feb 2026, 12:20', user: 'System', message: 'Transaction released to partner queue', type: 'system' },
            { timestamp: '25 Feb 2026, 12:21', user: 'System', message: 'Referral rule [RF] EU-NG Referral Scheme (REF-BONUS) applied (+EUR 2.00 referral bonus credit / +NGN 1,500.00 receiver bonus)', type: 'system' },
            { timestamp: '25 Feb 2026, 12:47', user: 'Support Agent', message: 'Customer confirmed beneficiary details.', type: 'agent' }
        ],
        notes: '',
        auditTrail: [
            { time: '12:20 PM', event: 'Transaction Initiated', status: 'complete' },
            { time: '12:21 PM', event: '[RF] Referral rule EU-NG Referral Scheme (REF-BONUS) applied. Bonus credit applied: +EUR 2.00 (Receiver bonus: +NGN 1,500.00)', status: 'complete' },
            { time: '12:23 PM', event: 'Funds Cleared', status: 'complete' },
            { time: '12:28 PM', event: 'Partner Payout Confirmed', status: 'complete' },
            { time: '12:30 PM', event: 'Transaction Complete', status: 'complete' }
        ],
        kycStatus: 'Passed',
        hasUnseenComments: true,
        hasUnseenTickets: true
    },
    {
        reference: 'MITO-9904112',
        mtn: 'MITO-9904112',
        requestRef: 'REQ-2026-9904112',
        retailSubmissionRef: 'RSL-2026-9904112',
        uetrRef: 'UETR-8f91c2a0-4b12-49d8-9904-112000778899',
        receiveMoneyLifecycle: 'Confirmed & Paid Out',
        affiliate: 'basketmouth.money',
        status: 'Completed',
        type: 'REQUESTMONEY',
        sendingCountry: 'GBR',
        beneficiaryFirstName: 'Chidi',
        beneficiaryLastName: 'Okafor',
        beneficiaryPhone: '2348099887766',
        beneficiaryEmail: 'chidi.okafor@example.ng',
        beneficiaryAddress: '24 Admiralty Way, Lekki Phase 1, Lagos',
        senderFirstName: 'Tunde',
        senderLastName: 'Bakare',
        senderPhone: '447911223344',
        senderEmail: 'tunde.bakare@example.co.uk',
        senderAddress: '15 Kingsway, London, UK',
        accountBalance: '£ 3,120.00',
        lastUpdated: '12 Mar 2026, 15:40',
        channel: 'Receive Money / Off-Ramp (Unified Lifecycle)',
        serviceName: 'GTBANK PLC (Receive Money)',
        serviceCode: '058',
        collectionMethod: 'OPENBANKING',
        account: '0123456789',
        sendCurrency: 'GBP',
        receiveCurrency: 'NGN',
        sendAmount: 'GBP 250.00',
        amountSent: 'GBP 250.00',
        feeAmount: 'GBP 0.00',
        promoCode: 'REQ-CREDIT-10',
        rewardTag: 'RW',
        rewardRuleName: 'Request Money 10% Credit (REQ-CREDIT-10)',
        rewardBonusAmount: 'GBP 25.00',
        rewardDirection: '+',
        rewardType: 'Referral / Bonus',
        discountAmount: 'GBP 25.00',
        receiverBonusAmount: 'NGN 51250.00',
        customerPaid: 'GBP 250.00',
        rate: '2050',
        payout: 'NGN 563750',
        settle: 'GBP 250.00',
        total: 'GBP 250.00',
        messageHistory: [
            { timestamp: '12 Mar 2026, 15:35', user: 'System', message: 'Unified Receive Money Lifecycle created: Request REQ-2026-9904112 linked to Retail Submission RSL-2026-9904112 and Transaction MITO-9904112 (Status: Awaiting Confirmation)', type: 'system' },
            { timestamp: '12 Mar 2026, 15:36', user: 'System', message: 'Reward scheme [RW] Request Money 10% Credit (REQ-CREDIT-10) applied (+GBP 25.00 bonus credit)', type: 'system' },
            { timestamp: '12 Mar 2026, 15:40', user: 'System', message: 'Payment confirmed & paid out under single linked record UETR-8f91c2a0-4b12-49d8-9904-112000778899', type: 'system' }
        ],
        notes: '',
        auditTrail: [
            { time: '03:35 PM', event: 'Receive Money Request Created — Simultaneous Log in Retail Submissions (RSL-2026-9904112) & Transactions (MITO-9904112) as Awaiting Confirmation [Req: REQ-2026-9904112]', status: 'complete' },
            { time: '03:36 PM', event: '[RW] Reward rule Request Money 10% Credit (REQ-CREDIT-10) applied. Bonus credit given: +GBP 25.00', status: 'complete' },
            { time: '03:38 PM', event: 'Payer Email Link Verified & Open Banking Payment Received (GBP 250.00)', status: 'complete' },
            { time: '03:40 PM', event: 'Unified Record Confirmed & Paid Out (NGN 563,750) — UETR-8f91c2a0-4b12-49d8-9904-112000778899', status: 'complete' }
        ],
        kycStatus: 'Passed',
        hasUnseenComments: false,
        hasUnseenTickets: false
    },
    {
        reference: 'MITO-6601001',
        mtn: 'MITO-6601001',
        affiliate: 'ITransfer Money Movers',
        status: 'Completed',
        type: 'MONEYTRANSFER',
        sendingCountry: 'ESP',
        beneficiaryFirstName: 'OGBEIDE',
        beneficiaryLastName: 'OSAYANDE',
        beneficiaryPhone: '2348031112233',
        beneficiaryEmail: 'ogbeide.family@example.com',
        beneficiaryAddress: '14, Mission Rd, Benin City, Nigeria',
        senderFirstName: 'OGBEIDE',
        senderLastName: 'OSAYANDE',
        senderPhone: '34678123456',
        senderEmail: 'ogbeide.sender@example.com',
        senderAddress: 'Calle de Alcala, 45, Madrid, Spain',
        accountBalance: '₦ 1,100,000.00',
        lastUpdated: '05 Feb 2026, 16:05',
        channel: 'FURP (onepipe) / FunTech',
        serviceName: 'ZENITH BANK PLC',
        serviceCode: '1011',
        collectionMethod: 'BANKACCOUNT',
        account: '2086208819',
        sendCurrency: 'EUR',
        receiveCurrency: 'NGN',
        sendAmount: 'EUR 34.89',
        amountSent: 'EUR 34.50',
        feeAmount: 'EUR 0.39',
        promoCode: null,
        rewardTag: null,
        rewardRuleName: null,
        rewardType: 'None',
        discountAmount: null,
        receiverBonusAmount: 'NGN 0.00',
        customerPaid: 'EUR 34.89',
        rate: '1620',
        payout: 'NGN 55890',
        settle: 'EUR 34.50',
        total: 'EUR 34.89',
        messageHistory: [
            { timestamp: '05 Feb 2026, 16:05', user: 'System', message: 'Transaction completed successfully', type: 'system' }
        ],
        notes: '',
        auditTrail: [
            { time: '04:05 PM', event: 'Transaction Initiated', status: 'complete' },
            { time: '04:08 PM', event: 'Funds Cleared', status: 'complete' },
            { time: '04:15 PM', event: 'Transaction Complete', status: 'complete' }
        ],
        kycStatus: 'Passed',
        hasUnseenComments: true,
        hasUnseenTickets: true
    }
];

/**
 * Formats the back-office "Rewards" display for a transaction:
 * - Uses `+` for bonuses or `-` for discounts
 * - Includes tag in brackets: `[PC]` for Promo Code, `[RF]` for Referral, `[RW]` for Reward
 * - Includes the specific code or rule name
 */
export const formatTransactionRewards = (tx) => {
    if (!tx) return null;
    const hasReward = !!(tx.promoCode && tx.discountAmount);
    if (!hasReward) return null;

    const tag = tx.rewardTag || (tx.rewardType === 'Referral / Bonus' ? (String(tx.promoCode || '').startsWith('REF') ? 'RF' : 'RW') : 'PC');
    const sign = tx.rewardDirection || (tag === 'PC' ? '-' : '+');
    const amount = tx.rewardBonusAmount || tx.discountAmount;
    const ruleOrCode = tx.rewardRuleName || tx.promoCode;
    return {
        tag,
        sign,
        amount,
        ruleOrCode,
        isBonus: sign === '+',
        display: `${sign}${amount} [${tag}] (${ruleOrCode})`
    };
};

export const SUMMARY_SNAPSHOT_ROWS = [
    {
        currency: 'MONEYTRANSFER (GBP)',
        total: 12,
        newCount: 1,
        inProgress: 1,
        processed: 9,
        failed: 1,
        pendingVal: '320.00',
        failedVal: '110.00',
        totalVal: '3,480.00',
        processedVal: '3,050.00',
        commsVal: '60.00',
        procPlusCommsVal: '3,110.00',
        receipt: '3,050.00',
        bal: '60.00'
    },
    {
        currency: 'MONEYTRANSFER (EUR)',
        total: 18,
        newCount: 2,
        inProgress: 1,
        processed: 14,
        failed: 1,
        pendingVal: '215.00',
        failedVal: '85.00',
        totalVal: '2,940.00',
        processedVal: '2,640.00',
        commsVal: '45.50',
        procPlusCommsVal: '2,685.50',
        receipt: '2,640.00',
        bal: '45.50'
    },
    {
        currency: 'MONEYTRANSFER (USD)',
        total: 8,
        newCount: 0,
        inProgress: 1,
        processed: 7,
        failed: 0,
        pendingVal: '150.00',
        failedVal: '0.00',
        totalVal: '1,890.00',
        processedVal: '1,740.00',
        commsVal: '32.00',
        procPlusCommsVal: '1,772.00',
        receipt: '1,740.00',
        bal: '32.00'
    },
    {
        currency: 'MONEYTRANSFER (NGN)',
        total: 121,
        newCount: 0,
        inProgress: 0,
        processed: 120,
        failed: 1,
        pendingVal: '0.00',
        failedVal: '95,300.00',
        totalVal: '25,841,978.10',
        processedVal: '25,746,678.10',
        commsVal: '0.00',
        procPlusCommsVal: '25,746,678.10',
        receipt: '0.00',
        bal: '25,746,678.10'
    }
];

export const statusColors = {
    'Awaiting Confirmation': { bg: '#e0f2fe', color: '#0369a1' },
    'In Progress': { bg: '#fef3c7', color: '#92400e' },
    'Completed': { bg: '#dcfce7', color: '#166534' },
    'Processed': { bg: '#dcfce7', color: '#166534' },
    'Aborted': { bg: '#fee2e2', color: '#991b1b' },
    'Failed': { bg: '#fee2e2', color: '#991b1b' },
};

export const kycStatusColors = {
    'Passed': { bg: '#dcfce7', color: '#166534', icon: '✅' },
    'Pending': { bg: '#fef3c7', color: '#92400e', icon: '⏳' },
    'Failed': { bg: '#fee2e2', color: '#991b1b', icon: '❌' },
};

export const MONTH_MAP = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

export const parseDisplayDate = (value) => {
    const match = value.match(/^(\d{2}) (\w{3}) (\d{4}), (\d{2}):(\d{2})$/);
    if (!match) return new Date('1970-01-01T00:00:00');
    const [, day, month, year, hour, minute] = match;
    return new Date(Number(year), MONTH_MAP[month], Number(day), Number(hour), Number(minute));
};

export const shiftDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

export const formatDateInputValue = (date) => {
    if (!date || isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const TRANSACTIONS = MOCK_TRANSACTIONS.map((transaction) => ({
    ...transaction,
    lastUpdatedAt: parseDisplayDate(transaction.lastUpdated)
}));

export const DEFAULT_END_DATE = TRANSACTIONS.reduce(
    (latest, transaction) => (transaction.lastUpdatedAt > latest ? transaction.lastUpdatedAt : latest),
    TRANSACTIONS[0].lastUpdatedAt
);
export const DEFAULT_START_DATE = shiftDays(DEFAULT_END_DATE, -30);

export const maskPII = (value, type) => {
    if (!value) return 'N/A';
    
    switch (type) {
        case 'phone': {
            const clean = value.replace(/\s+/g, '');
            if (clean.length <= 4) return value;
            return '*'.repeat(clean.length - 4) + clean.slice(-4);
        }
        case 'email': {
            const [local, domain] = value.split('@');
            if (!domain) return value;
            if (local.length <= 2) return '*@' + domain;
            return local[0] + '*'.repeat(local.length - 2) + local.slice(-1) + '@' + domain;
        }
        case 'address': {
            const parts = value.split(',');
            if (parts.length <= 1) return '***';
            return '***, ' + parts.slice(1).join(',').trim();
        }
        case 'name': {
            const parts = value.trim().split(/\s+/);
            return parts.map(part => {
                // Show only first character to ensure 75%+ masking
                // e.g., "John" → "J***" (75%), "Smith" → "S****" (80%)
                return part[0] + '*'.repeat(part.length - 1);
            }).join(' ');
        }
        case 'account': {
            const clean = value.replace(/\s+/g, '');
            if (clean.length <= 4) return value;
            return '*'.repeat(clean.length - 4) + clean.slice(-4);
        }
        case 'balance':
            return '****';
            
        default:
            return value;
    }
};
