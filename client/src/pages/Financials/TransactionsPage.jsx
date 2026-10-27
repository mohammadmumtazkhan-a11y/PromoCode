import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

// Exact Financials sub-navigation tabs from module 97917 in staging_chunk2089.js
const FINANCIAL_TABS = [
    { label: 'Transactions', href: '/financials/transactions' },
    { label: 'MTO Submissions', href: '/financials/mto' },
    { label: 'Retail Submissions', href: '/financials/retail' },
    { label: 'Biller Submissions', href: '/financials/billers' },
    { label: 'Receive Money', href: '/financials/receive' },
];

// Exact filter dropdown options from staging_chunk2089.js
const CHANNEL_OPTIONS = [
    { label: 'All Channels', value: '' },
    { label: 'Web', value: 'Web' },
    { label: 'Mobile', value: 'Mobile' },
    { label: 'USSD', value: 'USSD' },
    { label: 'API', value: 'API' },
];

const TYPE_OPTIONS = [
    { label: 'All Types', value: '' },
    { label: 'Send Money', value: 'Send Money' },
    { label: 'Biller', value: 'Biller' },
    { label: 'AirTime', value: 'AirTime' },
    { label: 'Wallet Funding', value: 'Wallet Funding' },
];

const STATUS_OPTIONS = [
    { label: 'All Statuses', value: '' },
    { label: 'Processed', value: 'Processed' },
    { label: 'Pending', value: 'Pending' },
    { label: 'PaymentReceived', value: 'PaymentReceived' },
    { label: 'ProcessFailed', value: 'ProcessFailed' },
    { label: 'WaitOps', value: 'WaitOps' },
    { label: 'Hold', value: 'Hold' },
    { label: 'ComplianceHold', value: 'ComplianceHold' },
    { label: 'Suspended', value: 'Suspended' },
    { label: 'Cancelled', value: 'Cancelled' },
    { label: 'Void', value: 'Void' },
    { label: 'Verified', value: 'Verified' },
    { label: 'Received', value: 'Received' },
    { label: 'Refunded', value: 'Refunded' },
];

const PAYER_OPTIONS = [
    { label: 'All Payers', value: '' },
    { label: 'Access Bank Nigeria', value: 'Access Bank Nigeria' },
    { label: 'Zenith Bank PLC', value: 'Zenith Bank PLC' },
    { label: 'GTBank PLC', value: 'GTBank PLC' },
    { label: 'MPESA Kenya', value: 'MPESA Kenya' },
    { label: 'MTN Mobile Money Ghana', value: 'MTN Mobile Money Ghana' },
];

const PROVIDER_OPTIONS = [
    { label: 'All Providers', value: '' },
    { label: 'Flutterwave', value: 'Flutterwave' },
    { label: 'Paystack', value: 'Paystack' },
    { label: 'Interswitch', value: 'Interswitch' },
    { label: 'Thunes', value: 'Thunes' },
    { label: 'Onafriq', value: 'Onafriq' },
    { label: 'Zeepay', value: 'Zeepay' },
];

const AFFILIATE_OPTIONS = [
    { label: 'All Affiliates', value: '' },
    { label: 'Mito Direct UK', value: 'Mito Direct UK' },
    { label: 'Rhemito Europe', value: 'Rhemito Europe' },
    { label: 'Mito Canada Corridor', value: 'Mito Canada Corridor' },
];

const PAYMENT_STATUS_OPTIONS = [
    { label: 'All Payment Statuses', value: '' },
    { label: 'Paid', value: 'Paid' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Failed', value: 'Failed' },
    { label: 'Refunded', value: 'Refunded' },
    { label: 'Chargeback', value: 'Chargeback' },
];

const PAYMENT_METHOD_OPTIONS = [
    { label: 'All Payment Methods', value: '' },
    { label: 'Debit Card', value: 'Debit Card' },
    { label: 'Bank Transfer', value: 'Bank Transfer' },
    { label: 'Open Banking (Truelayer)', value: 'Open Banking (Truelayer)' },
    { label: 'Wallet Balance', value: 'Wallet Balance' },
];

const APPLICATION_OPTIONS = [
    { label: 'All Applications', value: '' },
    { label: 'Mito Web Portal', value: 'Mito Web Portal' },
    { label: 'Mito iOS App', value: 'Mito iOS App' },
    { label: 'Mito Android App', value: 'Mito Android App' },
    { label: 'Partner API Gateway', value: 'Partner API Gateway' },
];

const SPLIT_OPTIONS = [
    { label: 'All Transactions', value: '' },
    { label: 'Split Parents Only (SP)', value: 'SP' },
    { label: 'Split Children Only (SC)', value: 'SC' },
];

const INITIATION_ROUTE_OPTIONS = [
    { label: 'All Initiation Routes', value: '' },
    { label: 'Direct Customer', value: 'Direct Customer' },
    { label: 'Agent Assisted', value: 'Agent Assisted' },
    { label: 'Recurring Standing Order', value: 'Recurring Standing Order' },
];

// Exact Status Dot colors from module 33607 in staging_chunk2089.js
export function getStagingStatusColor(status = '') {
    switch (status) {
        case 'Successful':
        case 'Processed':
        case 'Paid Out':
        case 'PAID':
        case 'Verified':
            return '#62AA32'; // green
        case 'Failed':
        case 'ProcessFailed':
        case 'Aborted':
        case 'Cancelled':
        case 'Timeout':
        case 'EXPIRED':
        case 'Expired':
        case 'FAILED':
        case 'CANCELLED':
        case 'Void':
            return '#8F0404'; // dark red
        case 'In Progress':
        case 'Under Review':
        case 'Ready To Process':
        case 'Paying Out':
        case 'Payment Processing':
        case 'PENDING_REVIEW':
        case 'PAYMENT_PENDING':
        case 'Awaiting Payment':
        case 'Awaiting Payment Confirmation':
        case 'Sent':
        case 'SENT':
        case 'Pending':
        case 'PaymentReceived':
        case 'Received':
            return '#FED217'; // yellow
        default:
            return '#9658F7'; // purple
    }
}

// Seed transactions including exact sample ID a4452812-9c03-41a6-8da9-430167c0d976 from staging screenshot
export const SEED_TRANSACTIONS = [
    {
        id: 'a4452812-9c03-41a6-8da9-430167c0d976',
        reference: '22505551',
        tun: '22505551',
        merchantRef: 'FT-22505551',
        payerRef: 'PAY-22505551',
        furpAccountNo: 'FURP-0022505',
        channel: 'API',
        date: '27 Oct 2026',
        time: '07:40',
        createdDisplay: 'Created: 27 Oct 2026 at 07:40',
        isoDate: '2026-10-27',
        type: 'Send Money',
        summaryText: 'Initiate Payout for User',
        currency: 'GBP',
        amount: 1.00,
        sendCurrency: 'GBP',
        sendAmount: 1.00,
        receiveCurrency: 'GBP',
        receiveAmount: 1.00,
        rate: 1,
        rateDisplay: '1',
        commission: 0.00,
        discount: null,
        discountDisplay: '—',
        promoCode: null,
        details: 'Initiate Payout for User · Account Wallet · MITOADMIN / FunTech',
        beneficiaryName: 'Adebayo Ogunlesi',
        beneficiaryBank: 'Access Bank Nigeria',
        beneficiaryAccount: '0038492011',
        beneficiaryPhone: '+234 803 441 9920',
        beneficiaryEmail: 'adebayo.ogunlesi@gmail.com',
        beneficiaryAddress: '24 Admiralty Way, Lekki Phase 1',
        beneficiaryCity: 'Lagos',
        beneficiaryCountry: 'United Kingdom',
        beneficiaryRelationship: 'Self',
        beneficiaryPurpose: 'Initiate Payout for User',
        provider: 'FunTech',
        providerCode: 'FUNTECH_GBP',
        payer: 'Access Bank Nigeria',
        affiliate: 'MITOADMIN',
        paymentStatus: 'Paid',
        paymentMethod: 'Account Wallet',
        paymentReference: '',
        application: 'MITOADMIN',
        initiationRoute: 'FunTech',
        splitTag: null,
        accountBalance: 'GBP 42,810.50',
        createdBy: 'Mito Admin',
        createdByEmail: 'admin@mito.money',
        senderPhone: '+44 7700 900412',
        senderAddress: '14 Kensington High Street, London, W8 4PT',
        senderNationality: 'United Kingdom',
        senderCountryOfBirth: 'United Kingdom',
        senderOccupation: 'Administrator',
        senderDob: '14/05/1988',
        senderIdCountry: 'United Kingdom',
        senderIdType: 'Passport',
        senderIdNumber: 'GBR-559281740',
        senderIdIssueDate: '10/02/2021',
        senderIdExpireDate: '10/02/2031',
        cumulativeThresholds: 'Open user hub',
        status: 'Under Review',
        verificationPassed: false,
        kycPassed: true,
        thresholdsPassed: null,
        postcodePassed: null,
    },
    {
        id: 'TXN-90841',
        reference: 'MITO-99482709',
        tun: 'TUN-88492010',
        merchantRef: 'PSK-TX-77192831',
        payerRef: 'ZEN-NG-1192834',
        furpAccountNo: 'FURP-0049199',
        channel: 'Mobile',
        date: '27 Oct 2026',
        time: '13:48:04',
        isoDate: '2026-10-27',
        type: 'Send Money',
        currency: 'GBP',
        amount: 1200.00,
        sendCurrency: 'GBP',
        sendAmount: 1185.00,
        receiveCurrency: 'NGN',
        receiveAmount: 2429250.00,
        rate: 2050.0,
        commission: 20.00,
        discount: 5.00,
        promoCode: 'VIP100',
        details: 'Ngozi Okonkwo · Zenith Bank PLC (2099481723) · Property Investment',
        beneficiaryName: 'Ngozi Okonkwo',
        beneficiaryBank: 'Zenith Bank PLC',
        beneficiaryAccount: '2099481723',
        beneficiaryPhone: '+234 809 112 3341',
        beneficiaryEmail: 'ngozi.okonkwo@yahoo.com',
        beneficiaryAddress: '8B Maitama Sule Street, Ikoyi',
        beneficiaryCity: 'Lagos',
        beneficiaryCountry: 'Nigeria',
        beneficiaryRelationship: 'Spouse',
        beneficiaryPurpose: 'Property Investment',
        provider: 'Paystack',
        providerCode: 'PSK_NG_INSTANT',
        payer: 'Zenith Bank PLC',
        affiliate: 'Mito Direct UK',
        paymentStatus: 'Paid',
        paymentMethod: 'Open Banking (Truelayer)',
        paymentReference: 'TRL-OB-88371625',
        application: 'Mito iOS App',
        initiationRoute: 'Direct Customer',
        splitTag: 'SP',
        accountBalance: 'GBP 43,295.50',
        createdBy: 'Amara Eze',
        createdByEmail: 'amara.eze@example.com',
        senderPhone: '+44 7911 123456',
        senderAddress: '82 Deansgate, Manchester, M3 2ER',
        senderNationality: 'United Kingdom',
        senderCountryOfBirth: 'Nigeria',
        senderOccupation: 'Clinical Pharmacist',
        senderDob: '22/11/1990',
        senderIdCountry: 'United Kingdom',
        senderIdType: 'Driving Licence',
        senderIdNumber: 'EZEAM901122G99AB',
        senderIdIssueDate: '15/06/2020',
        senderIdExpireDate: '15/06/2030',
        cumulativeThresholds: 'GBP 6,850.00 / GBP 10,000.00 (30 Days)',
        status: 'WaitOps',
        verificationChecked: true,
        kycChecked: true,
        thresholdsChecked: true,
        postcodeChecked: true,
    },
    {
        id: 'TXN-90840',
        reference: 'MITO-99482708',
        tun: 'TUN-88492009',
        merchantRef: 'THN-TX-66281940',
        payerRef: 'MPS-KE-5540192',
        furpAccountNo: 'FURP-0050120',
        channel: 'Mobile',
        date: '27 Oct 2026',
        time: '12:15:52',
        isoDate: '2026-10-27',
        type: 'Send Money',
        currency: 'EUR',
        amount: 310.00,
        sendCurrency: 'EUR',
        sendAmount: 300.00,
        receiveCurrency: 'KES',
        receiveAmount: 42150.00,
        rate: 140.5,
        commission: 10.00,
        discount: 0.00,
        promoCode: null,
        details: 'Kamau Wanjiru · MPESA Kenya (+254712345678) · Medical Expenses',
        beneficiaryName: 'Kamau Wanjiru',
        beneficiaryBank: 'MPESA Kenya',
        beneficiaryAccount: '+254712345678',
        beneficiaryPhone: '+254 712 345 678',
        beneficiaryEmail: 'kamau.wanjiru@gmail.com',
        beneficiaryAddress: 'Ngong Road, Kilimani',
        beneficiaryCity: 'Nairobi',
        beneficiaryCountry: 'Kenya',
        beneficiaryRelationship: 'Parent',
        beneficiaryPurpose: 'Medical Expenses',
        provider: 'Thunes',
        providerCode: 'THN_KE_MPESA',
        payer: 'MPESA Kenya',
        affiliate: 'Rhemito Europe',
        paymentStatus: 'Paid',
        paymentMethod: 'Debit Card',
        paymentReference: 'ADY-PM-44918273',
        application: 'Mito Android App',
        initiationRoute: 'Direct Customer',
        splitTag: null,
        accountBalance: 'EUR 19,420.00',
        createdBy: 'DavidMwangi',
        createdByEmail: 'david.mwangi@example.com',
        senderPhone: '+49 1512 3456789',
        senderAddress: 'Friedrichstraße 114A, 10117 Berlin',
        senderNationality: 'Germany',
        senderCountryOfBirth: 'Kenya',
        senderOccupation: 'Civil Engineer',
        senderDob: '03/08/1985',
        senderIdCountry: 'Germany',
        senderIdType: 'National ID',
        senderIdNumber: 'DEU-991028374',
        senderIdIssueDate: '01/09/2022',
        senderIdExpireDate: '01/09/2032',
        cumulativeThresholds: 'EUR 1,240.00 / EUR 10,000.00 (30 Days)',
        status: 'Processed',
        verificationChecked: true,
        kycChecked: true,
        thresholdsChecked: true,
        postcodeChecked: true,
    },
    {
        id: 'TXN-90839',
        reference: 'MITO-99482707',
        tun: 'TUN-88492008',
        merchantRef: 'ZEE-TX-55192834',
        payerRef: 'MTN-GH-9920183',
        furpAccountNo: 'FURP-0050311',
        channel: 'Web',
        date: '26 Oct 2026',
        time: '18:04:11',
        isoDate: '2026-10-26',
        type: 'Send Money',
        currency: 'GBP',
        amount: 225.00,
        sendCurrency: 'GBP',
        sendAmount: 220.00,
        receiveCurrency: 'GHS',
        receiveAmount: 4356.00,
        rate: 19.8,
        commission: 8.00,
        discount: 3.00,
        promoCode: 'GHANA3',
        details: 'Kwame Mensah · MTN Mobile Money Ghana (0244881920) · Education Fees',
        beneficiaryName: 'Kwame Mensah',
        beneficiaryBank: 'MTN Mobile Money Ghana',
        beneficiaryAccount: '0244881920',
        beneficiaryPhone: '+233 24 488 1920',
        beneficiaryEmail: 'kwame.mensah@outlook.com',
        beneficiaryAddress: '19 Oxford Street, Osu',
        beneficiaryCity: 'Accra',
        beneficiaryCountry: 'Ghana',
        beneficiaryRelationship: 'Sibling',
        beneficiaryPurpose: 'Education Fees',
        provider: 'Zeepay',
        providerCode: 'ZEE_GH_MOMO',
        payer: 'MTN Mobile Money Ghana',
        affiliate: 'Mito Direct UK',
        paymentStatus: 'Failed',
        paymentMethod: 'Debit Card',
        paymentReference: 'STRP-PM-11029384',
        application: 'Mito Web Portal',
        initiationRoute: 'Direct Customer',
        splitTag: null,
        accountBalance: 'GBP 44,495.50',
        createdBy: 'Akosua Boateng',
        createdByEmail: 'akosua.boateng@example.com',
        senderPhone: '+44 7800 554321',
        senderAddress: '55 Peckham High Street, London, SE15 5EB',
        senderNationality: 'United Kingdom',
        senderCountryOfBirth: 'Ghana',
        senderOccupation: 'Registered Nurse',
        senderDob: '19/02/1992',
        senderIdCountry: 'United Kingdom',
        senderIdType: 'Passport',
        senderIdNumber: 'GBR-773819204',
        senderIdIssueDate: '12/04/2019',
        senderIdExpireDate: '12/04/2029',
        cumulativeThresholds: 'GBP 890.00 / GBP 10,000.00 (30 Days)',
        status: 'ProcessFailed',
        verificationChecked: true,
        kycChecked: true,
        thresholdsChecked: true,
        postcodeChecked: false,
    },
    {
        id: 'TXN-90838',
        reference: 'MITO-99482706',
        tun: 'TUN-88492007',
        merchantRef: 'ISW-TX-44019283',
        payerRef: 'GTB-NG-6638192',
        furpAccountNo: 'FURP-0050890',
        channel: 'API',
        date: '26 Oct 2026',
        time: '15:39:29',
        isoDate: '2026-10-26',
        type: 'Biller',
        currency: 'GBP',
        amount: 95.00,
        sendCurrency: 'GBP',
        sendAmount: 92.00,
        receiveCurrency: 'NGN',
        receiveAmount: 188600.00,
        rate: 2050.0,
        commission: 3.00,
        discount: 0.00,
        promoCode: null,
        details: 'IKEDC Prepaid Meter · GTBank PLC (0129384756) · Utility Bill Payment',
        beneficiaryName: 'Tunde Bakare (IKEDC Prepaid)',
        beneficiaryBank: 'GTBank PLC',
        beneficiaryAccount: '0129384756',
        beneficiaryPhone: '+234 802 998 1122',
        beneficiaryEmail: 'tunde.bakare@gmail.com',
        beneficiaryAddress: '12 Allen Avenue, Ikeja',
        beneficiaryCity: 'Lagos',
        beneficiaryCountry: 'Nigeria',
        beneficiaryRelationship: 'Self',
        beneficiaryPurpose: 'Utility Bill Payment',
        provider: 'Interswitch',
        providerCode: 'ISW_NG_BILLER',
        payer: 'GTBank PLC',
        affiliate: 'Mito Direct UK',
        paymentStatus: 'Pending',
        paymentMethod: 'Bank Transfer',
        paymentReference: 'BNK-TR-66291834',
        application: 'Partner API Gateway',
        initiationRoute: 'Agent Assisted',
        splitTag: 'SC',
        accountBalance: 'GBP 44,720.50',
        createdBy: 'Tunde Bakare',
        createdByEmail: 'tunde.bakare@example.com',
        senderPhone: '+44 7712 889900',
        senderAddress: '101 Broad Street, Birmingham, B15 1AU',
        senderNationality: 'United Kingdom',
        senderCountryOfBirth: 'Nigeria',
        senderOccupation: 'Business Analyst',
        senderDob: '09/12/1987',
        senderIdCountry: 'United Kingdom',
        senderIdType: 'Passport',
        senderIdNumber: 'GBR-119283746',
        senderIdIssueDate: '20/08/2021',
        senderIdExpireDate: '20/08/2031',
        cumulativeThresholds: 'GBP 2,150.00 / GBP 10,000.00 (30 Days)',
        status: 'Hold',
        verificationChecked: true,
        kycChecked: true,
        thresholdsChecked: false,
        postcodeChecked: true,
    },
    {
        id: 'TXN-90837',
        reference: 'MITO-99482705',
        tun: 'TUN-88492006',
        merchantRef: 'ONF-TX-33918274',
        payerRef: 'MPS-KE-3301928',
        furpAccountNo: 'FURP-0051002',
        channel: 'USSD',
        date: '25 Oct 2026',
        time: '09:12:45',
        isoDate: '2026-10-25',
        type: 'AirTime',
        currency: 'GBP',
        amount: 50.00,
        sendCurrency: 'GBP',
        sendAmount: 50.00,
        receiveCurrency: 'KES',
        receiveAmount: 7025.00,
        rate: 140.5,
        commission: 0.00,
        discount: 0.00,
        promoCode: null,
        details: 'Safaricom Topup · MPESA Kenya (+254722998877) · Mobile Airtime',
        beneficiaryName: 'Grace Mutua',
        beneficiaryBank: 'MPESA Kenya',
        beneficiaryAccount: '+254722998877',
        beneficiaryPhone: '+254 722 998 877',
        beneficiaryEmail: 'grace.mutua@gmail.com',
        beneficiaryAddress: 'Moi Avenue, Mombasa',
        beneficiaryCity: 'Mombasa',
        beneficiaryCountry: 'Kenya',
        beneficiaryRelationship: 'Friend',
        beneficiaryPurpose: 'Mobile Airtime',
        provider: 'Onafriq',
        providerCode: 'ONF_KE_AIRTIME',
        payer: 'MPESA Kenya',
        affiliate: 'Mito Canada Corridor',
        paymentStatus: 'Pending',
        paymentMethod: 'Wallet Balance',
        paymentReference: 'WLT-PM-77482910',
        application: 'Mito Android App',
        initiationRoute: 'Recurring Standing Order',
        splitTag: null,
        accountBalance: 'GBP 44,815.50',
        createdBy: 'Faith Otieno',
        createdByEmail: 'faith.otieno@example.com',
        senderPhone: '+1 416 555 0198',
        senderAddress: '200 Bay Street, Toronto, ON M5J 2J2',
        senderNationality: 'Canada',
        senderCountryOfBirth: 'Kenya',
        senderOccupation: 'Accountant',
        senderDob: '27/04/1993',
        senderIdCountry: 'Canada',
        senderIdType: 'Passport',
        senderIdNumber: 'CAN-664738291',
        senderIdIssueDate: '04/01/2023',
        senderIdExpireDate: '04/01/2033',
        cumulativeThresholds: 'GBP 450.00 / GBP 10,000.00 (30 Days)',
        status: 'Pending',
        verificationChecked: true,
        kycChecked: true,
        thresholdsChecked: true,
        postcodeChecked: true,
    },
];

const INITIAL_FILTERS = {
    FURPAccountNo: '',
    TransactionRef: '',
    MerchantRef: '',
    PayerRef: '',
    Recipient: '',
    Channel: '',
    Type: '',
    Status: '',
    Payer: '',
    Provider: '',
    Affiliate: '',
    PaymentStatus: '',
    PaymentMethod: '',
    Application: '',
    Split: '',
    InitiationRoute: '',
    StartDate: '20/10/2026',
    EndDate: '27/10/2026',
};

const inputStyle = {
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

export default function TransactionsPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [transactions, setTransactions] = useState(SEED_TRANSACTIONS);
    const [showFilter, setShowFilter] = useState(false);
    const [draftFilters, setDraftFilters] = useState(INITIAL_FILTERS);
    const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
    const [selectedIds, setSelectedIds] = useState([]);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);
    const [toastMessage, setToastMessage] = useState(null);
    const [switchModalOpen, setSwitchModalOpen] = useState(false);
    const [switchProcessorTarget, setSwitchProcessorTarget] = useState('Flutterwave');
    const [splitModalOpen, setSplitModalOpen] = useState(false);
    const [splitChunkAmount, setSplitChunkAmount] = useState('250');

    const triggerToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    const filteredTransactions = useMemo(() => {
        return transactions.filter((tx) => {
            if (appliedFilters.FURPAccountNo && !tx.furpAccountNo.toLowerCase().includes(appliedFilters.FURPAccountNo.toLowerCase())) return false;
            if (appliedFilters.TransactionRef && !tx.reference.toLowerCase().includes(appliedFilters.TransactionRef.toLowerCase()) && !tx.id.toLowerCase().includes(appliedFilters.TransactionRef.toLowerCase())) return false;
            if (appliedFilters.MerchantRef && !tx.merchantRef.toLowerCase().includes(appliedFilters.MerchantRef.toLowerCase())) return false;
            if (appliedFilters.PayerRef && !tx.payerRef.toLowerCase().includes(appliedFilters.PayerRef.toLowerCase())) return false;
            if (appliedFilters.Recipient && !tx.details.toLowerCase().includes(appliedFilters.Recipient.toLowerCase())) return false;
            if (appliedFilters.Channel && tx.channel !== appliedFilters.Channel) return false;
            if (appliedFilters.Type && tx.type !== appliedFilters.Type) return false;
            if (appliedFilters.Status && tx.status !== appliedFilters.Status) return false;
            if (appliedFilters.Payer && tx.payer !== appliedFilters.Payer) return false;
            if (appliedFilters.Provider && tx.provider !== appliedFilters.Provider) return false;
            if (appliedFilters.Affiliate && tx.affiliate !== appliedFilters.Affiliate) return false;
            if (appliedFilters.PaymentStatus && tx.paymentStatus !== appliedFilters.PaymentStatus) return false;
            if (appliedFilters.PaymentMethod && tx.paymentMethod !== appliedFilters.PaymentMethod) return false;
            if (appliedFilters.Application && tx.application !== appliedFilters.Application) return false;
            if (appliedFilters.Split && tx.splitTag !== appliedFilters.Split) return false;
            if (appliedFilters.InitiationRoute && tx.initiationRoute !== appliedFilters.InitiationRoute) return false;
            return true;
        });
    }, [transactions, appliedFilters]);

    const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / rowsPerPage));
    const paginatedTransactions = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return filteredTransactions.slice(start, start + rowsPerPage);
    }, [filteredTransactions, currentPage, rowsPerPage]);

    const allVisibleSelected =
        paginatedTransactions.length > 0 &&
        paginatedTransactions.every((tx) => selectedIds.includes(tx.id));

    const toggleSelectAll = () => {
        if (allVisibleSelected) {
            setSelectedIds((prev) => prev.filter((id) => !paginatedTransactions.some((r) => r.id === id)));
        } else {
            const visibleIds = paginatedTransactions.map((r) => r.id);
            setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
        }
    };

    const toggleSelectRow = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleBulkAction = (actionName) => {
        if (selectedIds.length === 0) return;
        if (actionName === 'Clear') {
            setSelectedIds([]);
            return;
        }
        if (actionName === 'Switch') {
            setSwitchModalOpen(true);
            return;
        }
        if (actionName === 'Split') {
            setSplitModalOpen(true);
            return;
        }

        const nextStatusMap = {
            'Pause/Hold': 'Hold',
            'Bulk Failed': 'ProcessFailed',
            'Bulk Success': 'Processed',
            'Abort': 'Cancelled',
        };
        if (nextStatusMap[actionName]) {
            setTransactions((prev) =>
                prev.map((tx) =>
                    selectedIds.includes(tx.id) ? { ...tx, status: nextStatusMap[actionName] } : tx
                )
            );
        }
        triggerToast(`${actionName} executed on ${selectedIds.length} transaction(s).`);
        setSelectedIds([]);
    };

    const hasSelect = selectedIds.length > 0;

    const bulkBtnStyle = (variant = 'default') => {
        const base = {
            height: 32,
            padding: '0 12px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: hasSelect ? 'pointer' : 'not-allowed',
            opacity: hasSelect ? 1 : 0.6,
            fontFamily: 'inherit',
            transition: 'all 0.15s',
        };
        if (variant === 'danger') {
            return { ...base, background: '#ffffff', border: '1px solid #ef4444', color: '#dc2626' };
        }
        if (variant === 'success') {
            return { ...base, background: '#ffffff', border: '1px solid #22c55e', color: '#16a34a' };
        }
        if (variant === 'primary-outline') {
            return { ...base, background: '#ffffff', border: '1px solid #FB4B14', color: '#FB4B14' };
        }
        if (variant === 'ghost') {
            return { ...base, background: 'transparent', border: '1px solid transparent', color: '#6b7280' };
        }
        return { ...base, background: '#ffffff', border: '1px solid #d1d5db', color: '#374151' };
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

            {/* Module 84192 (N.Qp): User Name Heading + Circular Back Button + Breadcrumb */}
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h4 className="staging-user-title">Mito Admin</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            title="Go back"
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
                            <li>/ <span style={{ textTransform: 'capitalize' }}>Transactions</span></li>
                        </ol>
                    </div>
                </div>
            </div>

            {/* First Panel: Financials Switcher Tabs + Transactions Title + Filter Button + Collapsible Filter Grid */}
            <div className="staging-tx-panel-top">
                {/* Module 97917 (W.A): Financials Switcher Pills */}
                <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {FINANCIAL_TABS.map((tab) => {
                        const isActive = location.pathname.startsWith(tab.href);
                        return (
                            <Link
                                key={tab.href}
                                to={tab.href}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: 40,
                                    padding: '6px 14px',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                    border: '1px solid #FB4B14',
                                    background: isActive ? '#FB4B14' : '#ffffff',
                                    color: isActive ? '#ffffff' : '#FB4B14',
                                    pointerEvents: isActive ? 'none' : 'auto',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {tab.label}
                            </Link>
                        );
                    })}
                </div>

                {/* Title & Filter Toggle Row */}
                <div className="staging-tx-title-row">
                    <h5 style={{ fontSize: 24, lineHeight: '32px', fontWeight: 700, margin: 0, color: '#0e1726' }}>
                        Transactions
                    </h5>
                    <div>
                        <button
                            type="button"
                            className="staging-tx-filter-toggle-btn"
                            onClick={() => setShowFilter((prev) => !prev)}
                        >
                            {/* Module 63030 Funnel Filter SVG */}
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M3 7C3 6.44772 3.44772 6 4 6H20C20.5523 6 21 6.44772 21 7C21 7.55228 20.5523 8 20 8H4C3.44772 8 3 7.55228 3 7ZM6 12C6 11.4477 6.44772 11 7 11H17C17.5523 11 18 11.4477 18 12C18 12.5523 17.5523 13 17 13H7C6.44772 13 6 12.5523 6 12ZM9 17C9 16.4477 9.44772 16 10 16H14C14.5523 16 15 16.4477 15 17C15 17.5523 14.5523 18 14 18H10C9.44772 18 9 17.5523 9 17Z"
                                    fill="white"
                                />
                            </svg>
                            Filter
                        </button>
                    </div>
                </div>

                {/* Collapsible 18-Field Filter Form (k in module 62089) */}
                {showFilter && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            setAppliedFilters(draftFilters);
                            setCurrentPage(1);
                        }}
                    >
                        <div className="staging-tx-filter-grid">
                            <input
                                type="text"
                                placeholder="FURP Account No."
                                style={inputStyle}
                                value={draftFilters.FURPAccountNo}
                                onChange={(e) => setDraftFilters({ ...draftFilters, FURPAccountNo: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="Transaction Ref"
                                style={inputStyle}
                                value={draftFilters.TransactionRef}
                                onChange={(e) => setDraftFilters({ ...draftFilters, TransactionRef: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="Merchant Ref (MTN etc)"
                                style={inputStyle}
                                value={draftFilters.MerchantRef}
                                onChange={(e) => setDraftFilters({ ...draftFilters, MerchantRef: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="Payer Ref"
                                style={inputStyle}
                                value={draftFilters.PayerRef}
                                onChange={(e) => setDraftFilters({ ...draftFilters, PayerRef: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="Recipient (Mobile, Account)"
                                style={inputStyle}
                                value={draftFilters.Recipient}
                                onChange={(e) => setDraftFilters({ ...draftFilters, Recipient: e.target.value })}
                            />
                            <select
                                style={inputStyle}
                                value={draftFilters.Channel}
                                onChange={(e) => setDraftFilters({ ...draftFilters, Channel: e.target.value })}
                            >
                                <option value="">Select channel</option>
                                {CHANNEL_OPTIONS.filter((o) => o.value).map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <select
                                style={inputStyle}
                                value={draftFilters.Type}
                                onChange={(e) => setDraftFilters({ ...draftFilters, Type: e.target.value })}
                            >
                                <option value="">Select type</option>
                                {TYPE_OPTIONS.filter((o) => o.value).map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <select
                                style={inputStyle}
                                value={draftFilters.Status}
                                onChange={(e) => setDraftFilters({ ...draftFilters, Status: e.target.value })}
                            >
                                <option value="">Select transaction status</option>
                                {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <select
                                style={inputStyle}
                                value={draftFilters.Payer}
                                onChange={(e) => setDraftFilters({ ...draftFilters, Payer: e.target.value })}
                            >
                                <option value="">Select payer</option>
                                {PAYER_OPTIONS.filter((o) => o.value).map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <select
                                style={inputStyle}
                                value={draftFilters.Provider}
                                onChange={(e) => setDraftFilters({ ...draftFilters, Provider: e.target.value })}
                            >
                                <option value="">Select provider</option>
                                {PROVIDER_OPTIONS.filter((o) => o.value).map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <select
                                style={inputStyle}
                                value={draftFilters.Affiliate}
                                onChange={(e) => setDraftFilters({ ...draftFilters, Affiliate: e.target.value })}
                            >
                                <option value="">Select affiliate</option>
                                {AFFILIATE_OPTIONS.filter((o) => o.value).map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <select
                                style={inputStyle}
                                value={draftFilters.PaymentStatus}
                                onChange={(e) => setDraftFilters({ ...draftFilters, PaymentStatus: e.target.value })}
                            >
                                <option value="">Select payment status</option>
                                {PAYMENT_STATUS_OPTIONS.filter((o) => o.value).map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <select
                                style={inputStyle}
                                value={draftFilters.PaymentMethod}
                                onChange={(e) => setDraftFilters({ ...draftFilters, PaymentMethod: e.target.value })}
                            >
                                <option value="">Select payment method</option>
                                {PAYMENT_METHOD_OPTIONS.filter((o) => o.value).map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <select
                                style={inputStyle}
                                value={draftFilters.Application}
                                onChange={(e) => setDraftFilters({ ...draftFilters, Application: e.target.value })}
                            >
                                <option value="">Select application</option>
                                {APPLICATION_OPTIONS.filter((o) => o.value).map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <select
                                style={inputStyle}
                                value={draftFilters.Split}
                                onChange={(e) => setDraftFilters({ ...draftFilters, Split: e.target.value })}
                            >
                                <option value="">Filter by split</option>
                                {SPLIT_OPTIONS.filter((o) => o.value).map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <select
                                style={inputStyle}
                                value={draftFilters.InitiationRoute}
                                onChange={(e) => setDraftFilters({ ...draftFilters, InitiationRoute: e.target.value })}
                            >
                                <option value="">Select initiation route</option>
                                {INITIATION_ROUTE_OPTIONS.filter((o) => o.value).map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                placeholder="From date"
                                style={inputStyle}
                                value={draftFilters.StartDate}
                                onChange={(e) => setDraftFilters({ ...draftFilters, StartDate: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="To date"
                                style={inputStyle}
                                value={draftFilters.EndDate}
                                onChange={(e) => setDraftFilters({ ...draftFilters, EndDate: e.target.value })}
                            />
                        </div>

                        <div
                            style={{
                                marginTop: 24,
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: 20,
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    setDraftFilters(INITIAL_FILTERS);
                                    setAppliedFilters(INITIAL_FILTERS);
                                    setCurrentPage(1);
                                }}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: 6,
                                    border: '1px solid #dc2626',
                                    background: '#ffffff',
                                    color: '#FB4B14',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                Clear filter
                            </button>
                            <button
                                type="submit"
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: 6,
                                    border: '1px solid #FB4B14',
                                    background: '#FB4B14',
                                    color: '#ffffff',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                Show transactions
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Second Panel: Toolbar + Desktop Table + Mobile Card List + Pagination */}
            <div className="staging-tx-panel-table">
                {/* Top Toolbar (module 62089) */}
                <div className="staging-tx-toolbar">
                    {/* Left: selected count + 9 bulk action buttons */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, color: '#605E5C' }}>{selectedIds.length} selected</span>
                        <button type="button" disabled={!hasSelect} style={bulkBtnStyle('default')} onClick={() => handleBulkAction('Pause/Hold')}>
                            Pause/Hold
                        </button>
                        <button type="button" disabled={!hasSelect} style={bulkBtnStyle('danger')} onClick={() => handleBulkAction('Bulk Failed')}>
                            Bulk Failed
                        </button>
                        <button type="button" disabled={!hasSelect} style={bulkBtnStyle('success')} onClick={() => handleBulkAction('Bulk Success')}>
                            Bulk Success
                        </button>
                        <button type="button" disabled={!hasSelect} style={bulkBtnStyle('default')} onClick={() => handleBulkAction('Bulk Query')}>
                            Bulk Query
                        </button>
                        <button type="button" disabled={!hasSelect} style={bulkBtnStyle('default')} onClick={() => handleBulkAction('Retry')}>
                            Retry
                        </button>
                        <button type="button" disabled={!hasSelect} style={bulkBtnStyle('danger')} onClick={() => handleBulkAction('Abort')}>
                            Abort
                        </button>
                        <button type="button" disabled={!hasSelect} style={bulkBtnStyle('primary-outline')} onClick={() => handleBulkAction('Switch')}>
                            Switch
                        </button>
                        <button type="button" disabled={!hasSelect} style={bulkBtnStyle('primary-outline')} onClick={() => handleBulkAction('Split')}>
                            Split
                        </button>
                        <button type="button" disabled={!hasSelect} style={bulkBtnStyle('ghost')} onClick={() => handleBulkAction('Clear')}>
                            Clear
                        </button>
                    </div>

                    {/* Right: Count Pill (N.lJ = en) + Rows Selector (V.t = 39459) */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                        <span
                            style={{
                                borderRadius: 9999,
                                background: 'rgba(251, 75, 20, 0.1)',
                                padding: '6px 16px',
                                fontSize: 14,
                                fontWeight: 600,
                                color: '#fb4b14',
                            }}
                        >
                            {filteredTransactions.length} transactions found
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label htmlFor="tx-rows-select" style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                                Rows
                            </label>
                            <select
                                id="tx-rows-select"
                                value={rowsPerPage}
                                onChange={(e) => {
                                    setRowsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                style={{
                                    height: 36,
                                    width: 72,
                                    padding: '4px 8px',
                                    fontSize: 14,
                                    borderRadius: 6,
                                    border: '1px solid #e0e6ed',
                                    background: '#ffffff',
                                    color: '#0e1726',
                                    outline: 'none',
                                }}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Desktop Table (N.XI = 9117, hidden on mobile < 768px) */}
                <div className="staging-tx-desktop-table">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, textAlign: 'left' }}>
                        <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                            <tr>
                                <th style={{ width: 32, padding: '8px 12px', textAlign: 'left' }}>
                                    <input
                                        type="checkbox"
                                        checked={allVisibleSelected}
                                        onChange={toggleSelectAll}
                                        style={{ width: 16, height: 16, accentColor: '#FB4B14', cursor: 'pointer' }}
                                    />
                                </th>
                                <th style={{ padding: '8px 12px', fontWeight: 600, color: '#374151', textAlign: 'left' }}>Ref</th>
                                <th style={{ padding: '8px 12px', fontWeight: 600, color: '#374151', textAlign: 'left' }}>Channel</th>
                                <th style={{ padding: '8px 12px', fontWeight: 600, color: '#374151', textAlign: 'left' }}>Date</th>
                                <th style={{ padding: '8px 12px', fontWeight: 600, color: '#374151', textAlign: 'left' }}>Type</th>
                                <th style={{ padding: '8px 12px', fontWeight: 600, color: '#374151', textAlign: 'left' }}>Amount</th>
                                <th style={{ padding: '8px 12px', fontWeight: 600, color: '#374151', textAlign: 'left' }}>Rate</th>
                                <th style={{ padding: '8px 12px', fontWeight: 600, color: '#374151', textAlign: 'left', maxWidth: 224 }}>Details</th>
                                <th style={{ padding: '8px 12px', fontWeight: 600, color: '#374151', textAlign: 'left', maxWidth: 160 }}>Provider</th>
                                <th style={{ padding: '8px 12px', fontWeight: 600, color: '#374151', textAlign: 'left' }}>Acc Bal.</th>
                                <th style={{ padding: '8px 12px', fontWeight: 600, color: '#374151', textAlign: 'left' }}>CreatedBy</th>
                                <th style={{ width: 56, padding: '8px 12px', fontWeight: 600, color: '#374151', textAlign: 'center' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedTransactions.map((tx) => {
                                const isSelected = selectedIds.includes(tx.id);
                                const dotColor = getStagingStatusColor(tx.status);
                                return (
                                    <tr
                                        key={tx.id}
                                        style={{
                                            borderBottom: '1px solid #f3f4f6',
                                            background: isSelected ? 'rgba(251, 75, 20, 0.04)' : '#ffffff',
                                            transition: 'background 0.15s',
                                        }}
                                    >
                                        <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelectRow(tx.id)}
                                                style={{ width: 16, height: 16, accentColor: '#FB4B14', cursor: 'pointer' }}
                                            />
                                        </td>
                                        <td style={{ padding: '8px 12px', verticalAlign: 'middle', maxWidth: 160 }}>
                                            <Link
                                                to={`/financials/transactions/${tx.id}`}
                                                style={{ color: '#FB4B14', fontWeight: 500, textDecoration: 'none', wordBreak: 'break-all' }}
                                            >
                                                {tx.reference}
                                            </Link>
                                            {tx.splitTag && (
                                                <span
                                                    style={{
                                                        marginLeft: 6,
                                                        display: 'inline-block',
                                                        borderRadius: 4,
                                                        background: tx.splitTag === 'SP' ? '#ffedd5' : '#dbeafe',
                                                        padding: '2px 6px',
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        color: tx.splitTag === 'SP' ? '#c2410c' : '#1d4ed8',
                                                    }}
                                                >
                                                    {tx.splitTag}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '8px 12px', verticalAlign: 'middle', color: '#374151' }}>{tx.channel}</td>
                                        <td style={{ padding: '8px 12px', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#374151' }}>
                                            <div>{tx.date}</div>
                                            <div>{tx.time}</div>
                                        </td>
                                        <td style={{ padding: '8px 12px', verticalAlign: 'middle', color: '#374151' }}>{tx.type}</td>
                                        <td style={{ padding: '8px 12px', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#374151' }}>
                                            <div>{tx.currency}</div>
                                            <div>{tx.amount.toFixed(2)}</div>
                                        </td>
                                        <td style={{ padding: '8px 12px', verticalAlign: 'middle', color: '#374151' }}>
                                            {tx.rate.toFixed(4)}
                                        </td>
                                        <td style={{ padding: '8px 12px', verticalAlign: 'middle', maxWidth: 224, wordBreak: 'break-word', color: '#374151' }}>
                                            {tx.details}
                                        </td>
                                        <td style={{ padding: '8px 12px', verticalAlign: 'middle', maxWidth: 160, wordBreak: 'break-word' }}>
                                            <Link
                                                to="/configuration/providers"
                                                style={{ color: '#FB4B14', textDecoration: 'none' }}
                                            >
                                                {tx.provider}
                                            </Link>
                                        </td>
                                        <td style={{ padding: '8px 12px', verticalAlign: 'middle', whiteSpace: 'nowrap', color: '#374151' }}>
                                            {tx.accountBalance}
                                        </td>
                                        <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                                            <Link
                                                to="/customer/users"
                                                title={tx.createdByEmail}
                                                style={{ color: '#FB4B14', textDecoration: 'none' }}
                                            >
                                                {tx.createdBy}
                                            </Link>
                                        </td>
                                        <td style={{ width: 56, padding: '8px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                                            {/* Module 45429 Status Dot: ONLY 10px circle dot in Status column */}
                                            <span
                                                title={tx.status}
                                                style={{
                                                    display: 'inline-block',
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: '9999px',
                                                    backgroundColor: dotColor,
                                                }}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card List (Y in staging_chunk2089.js, visible on mobile < 768px) */}
                <div className="staging-tx-mobile-list">
                    {paginatedTransactions.map((tx) => {
                        const isSelected = selectedIds.includes(tx.id);
                        const dotColor = getStagingStatusColor(tx.status);
                        return (
                            <div
                                key={tx.id}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 12,
                                    borderRadius: 8,
                                    border: '1px solid #f3f4f6',
                                    background: '#ffffff',
                                    padding: 16,
                                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelectRow(tx.id)}
                                            style={{ marginTop: 4, width: 16, height: 16, accentColor: '#FB4B14', cursor: 'pointer' }}
                                        />
                                        <div>
                                            <Link
                                                to={`/financials/transactions/${tx.id}`}
                                                style={{ fontWeight: 700, color: '#FB4B14', textDecoration: 'none', fontSize: 14 }}
                                            >
                                                {tx.reference}
                                            </Link>
                                            {tx.splitTag && (
                                                <span
                                                    style={{
                                                        marginLeft: 6,
                                                        display: 'inline-block',
                                                        borderRadius: 4,
                                                        background: tx.splitTag === 'SP' ? '#ffedd5' : '#dbeafe',
                                                        padding: '2px 6px',
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        color: tx.splitTag === 'SP' ? '#c2410c' : '#1d4ed8',
                                                    }}
                                                >
                                                    {tx.splitTag}
                                                </span>
                                            )}
                                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                                                {tx.date} {tx.time}
                                            </div>
                                            <div style={{ fontSize: 12, color: '#4b5563', marginTop: 2 }}>
                                                {tx.channel} · {tx.type}
                                            </div>
                                        </div>
                                    </div>
                                    <span
                                        title={tx.status}
                                        style={{
                                            marginTop: 4,
                                            display: 'inline-block',
                                            width: 8,
                                            height: 8,
                                            borderRadius: '9999px',
                                            backgroundColor: dotColor,
                                        }}
                                    />
                                </div>

                                <div style={{ borderTop: '1px solid #f9fafb', paddingTop: 12, fontSize: 14 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                        <span style={{ color: '#6b7280' }}>Amount</span>
                                        <span style={{ fontWeight: 600, color: '#fb4b14' }}>
                                            {tx.currency} {tx.amount.toFixed(2)}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                        <span style={{ color: '#6b7280' }}>Rate</span>
                                        <span style={{ fontWeight: 500, color: '#1f2937' }}>{tx.rate.toFixed(4)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                        <span style={{ color: '#6b7280' }}>Provider</span>
                                        <span style={{ fontWeight: 500, color: '#1f2937' }}>{tx.provider}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', gap: 12 }}>
                                        <span style={{ color: '#6b7280', flexShrink: 0 }}>Details</span>
                                        <span style={{ fontWeight: 500, color: '#1f2937', textAlign: 'right' }}>{tx.details}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                        <span style={{ color: '#6b7280' }}>Acc Bal.</span>
                                        <span style={{ fontWeight: 500, color: '#1f2937' }}>{tx.accountBalance}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                        <span style={{ color: '#6b7280' }}>CreatedBy</span>
                                        <span style={{ fontWeight: 500, color: '#1f2937' }}>{tx.createdBy}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Pagination (N.dK = 74191 in staging_9147.js) */}
                <div
                    style={{
                        marginBottom: 20,
                        marginTop: 40,
                        display: 'flex',
                        width: '100%',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <ul
                        style={{
                            marginLeft: 'auto',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            listStyle: 'none',
                            padding: 0,
                            margin: '0 0 0 auto',
                        }}
                    >
                        <li>
                            <button
                                type="button"
                                disabled={currentPage <= 1}
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 4,
                                    border: '1px solid #d1d5db',
                                    padding: '8px 12px',
                                    background: '#ffffff',
                                    color: '#6b7280',
                                    cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                                    opacity: currentPage <= 1 ? 0.5 : 1,
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M15 5L9 12L15 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </li>
                        {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => {
                            const active = page === currentPage;
                            return (
                                <li key={page}>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(page)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: 4,
                                            border: active ? '1px solid #FB4B14' : '1px solid #d1d5db',
                                            background: active ? '#FB4B14' : '#ffffff',
                                            color: active ? '#ffffff' : '#6b7280',
                                            padding: '8px 14px',
                                            fontSize: 14,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {page}
                                    </button>
                                </li>
                            );
                        })}
                        <li>
                            <button
                                type="button"
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 4,
                                    border: '1px solid #d1d5db',
                                    padding: '8px 12px',
                                    background: '#ffffff',
                                    color: '#6b7280',
                                    cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                                    opacity: currentPage >= totalPages ? 0.5 : 1,
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M9 5L15 12L9 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Bulk Switch Processor Modal */}
            {switchModalOpen && (
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
                            Switch Processor ({selectedIds.length} selected)
                        </h3>
                        <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#605E5C' }}>
                            Select the target payout processor for the selected transaction(s):
                        </p>
                        <select
                            style={{ ...inputStyle, marginBottom: 20 }}
                            value={switchProcessorTarget}
                            onChange={(e) => setSwitchProcessorTarget(e.target.value)}
                        >
                            {PROVIDER_OPTIONS.filter((o) => o.value).map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button
                                type="button"
                                onClick={() => setSwitchModalOpen(false)}
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
                                onClick={() => {
                                    setTransactions((prev) =>
                                        prev.map((tx) =>
                                            selectedIds.includes(tx.id) ? { ...tx, provider: switchProcessorTarget } : tx
                                        )
                                    );
                                    setSwitchModalOpen(false);
                                    triggerToast(`Switched ${selectedIds.length} transaction(s) to ${switchProcessorTarget}.`);
                                    setSelectedIds([]);
                                }}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 6,
                                    border: '1px solid #FB4B14',
                                    background: '#FB4B14',
                                    color: '#ffffff',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Switch Processor
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Split Modal */}
            {splitModalOpen && (
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
                            Split Transaction ({selectedIds.length} selected)
                        </h3>
                        <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#605E5C' }}>
                            Specify maximum chunk amount to split selected transaction(s):
                        </p>
                        <input
                            type="number"
                            style={{ ...inputStyle, marginBottom: 20 }}
                            value={splitChunkAmount}
                            onChange={(e) => setSplitChunkAmount(e.target.value)}
                            placeholder="Chunk amount"
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button
                                type="button"
                                onClick={() => setSplitModalOpen(false)}
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
                                onClick={() => {
                                    setTransactions((prev) =>
                                        prev.map((tx) =>
                                            selectedIds.includes(tx.id) ? { ...tx, splitTag: 'SP' } : tx
                                        )
                                    );
                                    setSplitModalOpen(false);
                                    triggerToast(`Split ${selectedIds.length} transaction(s) into chunks of ${splitChunkAmount}.`);
                                    setSelectedIds([]);
                                }}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 6,
                                    border: '1px solid #FB4B14',
                                    background: '#FB4B14',
                                    color: '#ffffff',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Confirm Split
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
