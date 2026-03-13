// Mock transaction data
export const MOCK_TRANSACTIONS = [
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
        rate: '236',
        payout: 'KES 47200',
        settle: 'GBP 200.00',
        total: 'GBP 200.00',
        messageHistory: [
            { timestamp: '08 Mar 2026, 14:10', user: 'System', message: 'Transaction created via Direct channel', type: 'system' },
            { timestamp: '08 Mar 2026, 14:45', user: 'Agent Smith', message: 'Customer called inquiring about delay. Escalated to partner.', type: 'agent' }
        ],
        notes: '',
        auditTrail: [
            { time: '09:00 AM', event: 'Transaction Initiated', status: 'complete' },
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
        rate: '1638',
        payout: 'NGN 78624',
        settle: 'EUR 47.90',
        total: 'EUR 48.22',
        messageHistory: [
            { timestamp: '25 Feb 2026, 12:20', user: 'System', message: 'Transaction released to partner queue', type: 'system' },
            { timestamp: '25 Feb 2026, 12:47', user: 'Support Agent', message: 'Customer confirmed beneficiary details.', type: 'agent' }
        ],
        notes: '',
        auditTrail: [
            { time: '12:20 PM', event: 'Transaction Initiated', status: 'complete' },
            { time: '12:23 PM', event: 'Funds Cleared', status: 'complete' },
            { time: '12:28 PM', event: 'Partner Payout Confirmed', status: 'complete' },
            { time: '12:30 PM', event: 'Transaction Complete', status: 'complete' }
        ],
        kycStatus: 'Passed',
        hasUnseenComments: true,
        hasUnseenTickets: true
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

export const statusColors = {
    'In Progress': { bg: '#fef3c7', color: '#92400e' },
    'Completed': { bg: '#dcfce7', color: '#166534' },
    'Processed': { bg: '#dcfce7', color: '#166534' },
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
                if (part.length <= 4) return part;
                return part.slice(0, 2) + '*'.repeat(part.length - 4) + part.slice(-2);
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
