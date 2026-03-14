import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../../assets/logo.png';
import { supportPageTitleStyle, supportSectionTitleStyle } from './supportTypography';

const MOCK_RATES = [
    { id: 1246, affiliate: 'Rhemito', from: 'EUR', to: 'SGD', sendCountry: 'ALL', receiveCountry: 'ALL', moneyR: '1.0000 / 1.3900', active: true },
    { id: 2309, affiliate: 'Rhemito', from: 'GBP', to: 'INR', sendCountry: 'United Kingdom', receiveCountry: 'India', moneyR: '1.0000 / 105.0000', active: true, override: true },
    { id: 2269, affiliate: 'Rhemito', from: 'EUR', to: 'TRY', sendCountry: 'ALL', receiveCountry: 'Turkey', moneyR: '0.9800 / 4.2826', active: true, override: true },
    { id: 1203, affiliate: 'BasketMouth', from: 'NGN', to: 'USD', sendCountry: 'Nigeria', receiveCountry: 'ALL', moneyR: '1.0000 / 0.0000', active: true, override: true },
    { id: 3101, affiliate: 'Sika', from: 'GBP', to: 'NGN', sendCountry: 'ALL', receiveCountry: 'ALL', moneyR: '1.0000 / 1160.0000', active: true },
    { id: 3205, affiliate: 'Rhemito', from: 'USD', to: 'KES', sendCountry: 'ALL', receiveCountry: 'ALL', moneyR: '1.0000 / 152.0000', active: true },
    { id: 3302, affiliate: 'Rhemito', from: 'EUR', to: 'GHS', sendCountry: 'Europe', receiveCountry: 'Ghana', moneyR: '1.0000 / 14.2000', active: false },
];

const AFFILIATES = ['Rhemito', 'BasketMouth', 'Sika', 'FastPay', 'GlobalSend'];
const COUNTRY_DEFAULT_CURRENCY = {
    'United Kingdom': 'GBP',
    India: 'INR',
    Nigeria: 'NGN',
    Europe: 'EUR',
    Turkey: 'TRY',
    Ghana: 'GHS',
    Kenya: 'KES',
    Singapore: 'SGD',
    'United States': 'USD',
};

const CURRENCY_DETAILS = {
    GBP: { name: 'British Pound', flag: '🇬🇧', symbol: '£' },
    INR: { name: 'Indian Rupee', flag: '🇮🇳', symbol: '₹' },
    EUR: { name: 'Euro', flag: '🇪🇺', symbol: '€' },
    TRY: { name: 'Turkish Lira', flag: '🇹🇷', symbol: '₺' },
    NGN: { name: 'Nigerian Naira', flag: '🇳🇬', symbol: '₦' },
    USD: { name: 'US Dollar', flag: '🇺🇸', symbol: '$' },
    KES: { name: 'Kenyan Shilling', flag: '🇰🇪', symbol: 'KSh' },
    GHS: { name: 'Ghanaian Cedi', flag: '🇬🇭', symbol: '₵' },
    SGD: { name: 'Singapore Dollar', flag: '🇸🇬', symbol: 'S$' },
    JPY: { name: 'Japanese Yen', flag: '🇯🇵', symbol: '¥' },
    MXN: { name: 'Mexican Peso', flag: '🇲🇽', symbol: 'MX$' },
    KWD: { name: 'Kuwaiti Dinar', flag: '🇰🇼', symbol: 'د.ك' },
    AED: { name: 'UAE Dirham', flag: '🇦🇪', symbol: 'د.إ' },
    CAD: { name: 'Canadian Dollar', flag: '🇨🇦', symbol: 'C$' },
    AUD: { name: 'Australian Dollar', flag: '🇦🇺', symbol: 'A$' },
    CHF: { name: 'Swiss Franc', flag: '🇨🇭', symbol: 'CHF' },
    ZAR: { name: 'South African Rand', flag: '🇿🇦', symbol: 'R' },
    CNY: { name: 'Chinese Yuan', flag: '🇨🇳', symbol: '¥' },
    PKR: { name: 'Pakistani Rupee', flag: '🇵🇰', symbol: '₨' },
    BDT: { name: 'Bangladeshi Taka', flag: '🇧🇩', symbol: '৳' },
    PHP: { name: 'Philippine Peso', flag: '🇵🇭', symbol: '₱' },
    EGP: { name: 'Egyptian Pound', flag: '🇪🇬', symbol: 'E£' },
};

const COUNTRY_DETAILS = {
    'United Kingdom': { flag: '🇬🇧' },
    India: { flag: '🇮🇳' },
    Nigeria: { flag: '🇳🇬' },
    Europe: { flag: '🇪🇺' },
    Turkey: { flag: '🇹🇷' },
    Ghana: { flag: '🇬🇭' },
    Kenya: { flag: '🇰🇪' },
    Singapore: { flag: '🇸🇬' },
    'United States': { flag: '🇺🇸' },
};

const PAGE_FONT = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

const surfaceShadow = '0 24px 64px rgba(15, 23, 42, 0.08)';
const panelBorder = '1px solid rgba(148, 163, 184, 0.18)';
const mitoNavy = [7, 20, 53];
const mitoOrange = [234, 88, 12];

const exportColumns = [
    { label: 'Ref', value: (rate) => rate.id },
    { label: 'Send Country', value: (rate) => rate.sendCountry },
    { label: 'Receive Country', value: (rate) => rate.receiveCountry },
    { label: 'From-To', value: (rate) => `${rate.from} - ${rate.to}` },
    { label: 'Rates', value: (rate) => `${rate.moneyR}${rate.override ? ' (Override)' : ''}` },
    { label: 'Status', value: (rate) => (rate.active ? 'Active' : 'Inactive') },
];

const StatusBadge = ({ active }) => (
    <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 88,
        padding: '6px 12px',
        borderRadius: 999,
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.02em',
        background: active ? 'rgba(22, 163, 74, 0.12)' : 'rgba(220, 38, 38, 0.12)',
        color: active ? '#166534' : '#991b1b',
        border: `1px solid ${active ? 'rgba(22, 163, 74, 0.18)' : 'rgba(220, 38, 38, 0.18)'}`
    }}>
        {active ? 'Active' : 'Inactive'}
    </span>
);

const OverrideBadge = () => (
    <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: 10,
        padding: '4px 8px',
        borderRadius: 999,
        fontSize: '0.68rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: '#b45309',
        background: 'rgba(245, 158, 11, 0.12)',
        border: '1px solid rgba(245, 158, 11, 0.18)'
    }}>
        Override
    </span>
);

const iconButtonStyle = (primary = false) => ({
    padding: '13px 18px',
    borderRadius: 14,
    border: primary ? '1px solid #c2410c' : '1px solid rgba(148, 163, 184, 0.26)',
    background: primary
        ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
        : 'rgba(255, 255, 255, 0.92)',
    color: primary ? '#fff' : '#1e293b',
    fontWeight: 700,
    fontSize: '0.92rem',
    letterSpacing: '0.01em',
    cursor: 'pointer',
    boxShadow: primary ? '0 16px 30px rgba(234, 88, 12, 0.22)' : '0 12px 24px rgba(15, 23, 42, 0.05)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
});

const formatCsvValue = (value) => `"${String(value).replaceAll('"', '""')}"`;

const downloadBlob = (content, fileName, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const getImageDataUrl = async (src) => {
    try {
        const response = await fetch(src);
        const blob = await response.blob();
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
};

const SupportRates = () => {
    const [fromFilter, setFromFilter] = useState('all');
    const [toFilter, setToFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [affiliateSearch, setAffiliateSearch] = useState('Rhemito');

    const fromCurrencies = [...new Set(MOCK_RATES.map((rate) => rate.from))];
    const toCurrencies = [...new Set(MOCK_RATES.map((rate) => rate.to))];

    const filtered = MOCK_RATES.filter((rate) => {
        if (affiliateSearch && !rate.affiliate.toLowerCase().includes(affiliateSearch.toLowerCase())) return false;
        if (fromFilter !== 'all' && rate.from !== fromFilter) return false;
        if (toFilter !== 'all' && rate.to !== toFilter) return false;
        if (statusFilter === 'active' && !rate.active) return false;
        if (statusFilter === 'inactive' && rate.active) return false;
        return true;
    });

    const filterSummary = [
        `Affiliate: ${affiliateSearch || 'All'}`,
        `From: ${fromFilter === 'all' ? 'All' : fromFilter}`,
        `To: ${toFilter === 'all' ? 'All' : toFilter}`,
        `Status: ${statusFilter === 'all' ? 'All' : statusFilter}`,
    ].join(' | ');

    const handleDownloadCsv = () => {
        const headerRow = exportColumns.map((column) => formatCsvValue(column.label)).join(',');
        const dataRows = filtered.map((rate) =>
            exportColumns.map((column) => formatCsvValue(column.value(rate))).join(',')
        );

        downloadBlob(
            [headerRow, ...dataRows].join('\n'),
            'exchange-rates-corridors.csv',
            'text/csv;charset=utf-8;'
        );
    };

    const handleDownloadPdf = async () => {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'pt',
            format: 'a4',
        });

        const generatedAt = new Date().toLocaleString();
        const tableBody = filtered.length > 0
            ? filtered.map((rate) => exportColumns.map((column) => String(column.value(rate))))
            : [[`No corridors match the current filters.`, '', '', '', '', '']];

        const logoDataUrl = await getImageDataUrl(logo);

        doc.setFillColor(...mitoNavy);
        doc.roundedRect(28, 22, 785, 86, 18, 18, 'F');
        doc.setFillColor(...mitoOrange);
        doc.roundedRect(28, 22, 8, 86, 8, 8, 'F');

        if (logoDataUrl) {
            doc.addImage(logoDataUrl, 'PNG', 46, 42, 26, 26);
        }

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.text('MITO | Exchange Rates & Corridors', logoDataUrl ? 82 : 48, 58);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Exported ${generatedAt}`, 48, 80);
        doc.text(filterSummary, 48, 96);

        autoTable(doc, {
            startY: 132,
            head: [exportColumns.map((column) => column.label)],
            body: tableBody,
            margin: { left: 28, right: 28, bottom: 28 },
            theme: 'grid',
            styles: {
                font: 'helvetica',
                fontSize: 9,
                cellPadding: 9,
                lineColor: [226, 232, 240],
                lineWidth: 1,
                textColor: [30, 41, 59],
            },
            headStyles: {
                fillColor: mitoOrange,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'left',
            },
            bodyStyles: {
                fillColor: [255, 255, 255],
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252],
            },
        });

        doc.save('exchange-rates-corridors.pdf');
    };

    const selectStyle = {
        padding: '14px 16px',
        border: '1px solid rgba(148, 163, 184, 0.3)',
        borderRadius: 14,
        minHeight: 52,
        background: '#fff',
        color: '#334155',
        fontSize: '0.95rem',
        outline: 'none',
        boxShadow: 'inset 0 1px 2px rgba(15, 23, 42, 0.02)',
        flex: '1 1 180px'
    };

    const thStyle = {
        padding: '16px 18px',
        textAlign: 'left',
        color: '#64748b',
        fontWeight: 700,
        fontSize: '0.77rem',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        borderBottom: '1px solid rgba(226, 232, 240, 0.85)'
    };

    const SearchableSelect = ({ label, options, value, onChange, placeholder, style = {} }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = React.useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        (opt.subtext && opt.subtext.toLowerCase().includes(search.toLowerCase())) ||
        (opt.currencySymbol && opt.currencySymbol.toLowerCase().includes(search.toLowerCase()))
    );

    const selectedOption = options.find(opt => opt.value === value) || options[0];

    return (
        <div ref={dropdownRef} style={{ position: 'relative', flex: '1 1 180px', ...style }}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    padding: '0 16px',
                    border: isOpen ? '1.5px solid #ea580c' : '1px solid rgba(148, 163, 184, 0.3)',
                    borderRadius: 14,
                    minHeight: 52,
                    background: '#fff',
                    color: '#334155',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                    boxShadow: isOpen ? '0 0 0 3px rgba(234, 88, 12, 0.1)' : 'inset 0 1px 2px rgba(15, 23, 42, 0.02)',
                    transition: 'border 0.2s, box-shadow 0.2s',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                    {selectedOption.icon && <span style={{ fontSize: '1.25rem', lineHeight: 1, flexShrink: 0 }}>{selectedOption.icon}</span>}
                    <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {selectedOption.label}
                        {selectedOption.subtext && <span style={{ color: '#94a3b8', fontWeight: 500, marginLeft: 4 }}>({selectedOption.subtext})</span>}
                        {selectedOption.currencySymbol && <span style={{ color: '#ea580c', fontWeight: 700, marginLeft: 6 }}>{selectedOption.currencySymbol}</span>}
                    </span>
                </div>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease', flexShrink: 0, marginLeft: 8 }}>▼</span>
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    minWidth: 260,
                    background: '#fff',
                    border: '1px solid rgba(148, 163, 184, 0.15)',
                    borderRadius: 16,
                    boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.15), 0 8px 20px -8px rgba(0, 0, 0, 0.08)',
                    zIndex: 100,
                    overflow: 'hidden',
                    animation: 'fadeInDown 0.15s ease-out',
                }}>
                    <div style={{ padding: '10px 10px 8px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem', pointerEvents: 'none' }}>🔍</span>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Type to search..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px 10px 36px',
                                    border: '1.5px solid #e2e8f0',
                                    borderRadius: 10,
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    transition: 'border 0.2s',
                                    background: '#fafbfc',
                                }}
                                onFocus={(e) => { e.target.style.borderColor = '#ea580c'; e.target.style.background = '#fff'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#fafbfc'; }}
                            />
                        </div>
                    </div>
                    <div style={{ maxHeight: 280, overflowY: 'auto', padding: '4px 0' }}>
                        {filteredOptions.length === 0 && (
                            <div style={{ padding: '20px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
                                No results found
                            </div>
                        )}
                        {filteredOptions.map((opt) => {
                            const isSelected = opt.value === value;
                            return (
                                <div
                                    key={opt.value}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    style={{
                                        padding: '11px 16px',
                                        fontSize: '0.93rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        background: isSelected ? 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)' : 'transparent',
                                        color: isSelected ? '#fff' : '#1e293b',
                                        transition: 'background 0.15s, padding-left 0.15s',
                                        borderLeft: isSelected ? '3px solid #0284c7' : '3px solid transparent',
                                        margin: '1px 4px',
                                        borderRadius: 10,
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.background = '#f8fafc';
                                            e.currentTarget.style.borderLeftColor = '#e2e8f0';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.borderLeftColor = 'transparent';
                                        }
                                    }}
                                >
                                    {opt.icon && (
                                        <span style={{
                                            fontSize: '1.35rem',
                                            lineHeight: 1,
                                            flexShrink: 0,
                                            width: 28,
                                            textAlign: 'center',
                                        }}>{opt.icon}</span>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{opt.label}</span>
                                            {opt.subtext && (
                                                <span style={{
                                                    fontWeight: 700,
                                                    fontSize: '0.78rem',
                                                    color: isSelected ? 'rgba(255,255,255,0.8)' : '#64748b',
                                                    background: isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(100, 116, 139, 0.08)',
                                                    padding: '2px 7px',
                                                    borderRadius: 6,
                                                    letterSpacing: '0.04em',
                                                }}>
                                                    {opt.subtext}
                                                </span>
                                            )}
                                        </div>
                                        {opt.currencySymbol && (
                                            <span style={{
                                                fontSize: '0.76rem',
                                                color: isSelected ? 'rgba(255,255,255,0.7)' : '#94a3b8',
                                                fontWeight: 500,
                                                marginTop: 1,
                                            }}>
                                                {opt.currencySymbol}
                                            </span>
                                        )}
                                    </div>
                                    {isSelected && (
                                        <span style={{ fontSize: '0.9rem', flexShrink: 0, marginLeft: 'auto' }}>✓</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

const tdStyle = {
        padding: '18px',
        fontSize: '0.92rem',
        borderBottom: '1px solid rgba(226, 232, 240, 0.65)'
    };

    return (
        <div style={{
            fontFamily: PAGE_FONT,
            color: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            gap: 24
        }}>
            <section style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 28,
                border: panelBorder,
                background: 'linear-gradient(135deg, #fff8f2 0%, #ffffff 42%, #f8fafc 100%)',
                boxShadow: surfaceShadow,
                padding: '28px clamp(20px, 3vw, 34px)'
            }}>
                <div style={{
                    position: 'absolute',
                    inset: 'auto -80px -110px auto',
                    width: 280,
                    height: 280,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(249, 115, 22, 0.18) 0%, rgba(249, 115, 22, 0) 72%)'
                }} />

                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 18,
                    flexWrap: 'wrap',
                    position: 'relative'
                }}>
                    <div style={{ maxWidth: 700 }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            marginBottom: 16,
                        }}>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '10px 14px',
                                borderRadius: 18,
                                background: 'rgba(255, 255, 255, 0.82)',
                                border: '1px solid rgba(251, 146, 60, 0.18)',
                                boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)'
                            }}>
                                <img src={logo} alt="MITO" style={{ height: 28, width: 'auto', display: 'block' }} />
                                <div style={{
                                    width: 1,
                                    alignSelf: 'stretch',
                                    background: 'rgba(148, 163, 184, 0.4)'
                                }} />
                                <div style={{
                                    color: '#0f172a',
                                    fontSize: '0.82rem',
                                    fontWeight: 800,
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase'
                                }}>
                                    MITO Support
                                </div>
                            </div>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '8px 12px',
                                borderRadius: 999,
                                background: 'rgba(255, 255, 255, 0.78)',
                                border: '1px solid rgba(251, 146, 60, 0.22)',
                                color: '#c2410c',
                                fontSize: '0.77rem',
                                fontWeight: 800,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase'
                            }}>
                                Read Only
                            </div>
                        </div>
                        <h1 style={{ ...supportPageTitleStyle, margin: '0 0 10px' }}>
                            Exchange Rates & Corridors
                        </h1>
                        <p style={{ margin: 0, color: '#475569', fontSize: '1rem', lineHeight: 1.6 }}>
                            Review the exact table currently on screen, then export the filtered result set in CSV or PDF format.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={handleDownloadCsv}
                            style={iconButtonStyle(false)}
                            aria-label="Download CSV"
                        >
                            Download CSV
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            style={iconButtonStyle(true)}
                            aria-label="Download PDF"
                        >
                            Download PDF
                        </button>
                    </div>
                </div>
            </section>

            <section style={{
                borderRadius: 24,
                border: panelBorder,
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 100%)',
                boxShadow: surfaceShadow,
                padding: '24px clamp(18px, 3vw, 34px)'
            }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 16,
                    alignItems: 'center'
                }}>
                    <SearchableSelect
                        placeholder="Search Affiliate..."
                        value={affiliateSearch}
                        onChange={setAffiliateSearch}
                        options={[
                            { value: '', label: 'All Affiliates' },
                            ...AFFILIATES.map(aff => ({ value: aff, label: aff }))
                        ]}
                        style={{ gridColumn: 'span 1' }}
                    />

                    <SearchableSelect
                        placeholder="From Currency..."
                        value={fromFilter}
                        onChange={setFromFilter}
                        options={[
                            { value: 'all', label: 'All From Currency', icon: '💱' },
                            ...fromCurrencies.map(curr => ({
                                value: curr,
                                label: CURRENCY_DETAILS[curr]?.name || curr,
                                subtext: curr,
                                icon: CURRENCY_DETAILS[curr]?.flag,
                                currencySymbol: CURRENCY_DETAILS[curr]?.symbol,
                            }))
                        ]}
                    />

                    <SearchableSelect
                        placeholder="To Currency..."
                        value={toFilter}
                        onChange={setToFilter}
                        options={[
                            { value: 'all', label: 'All To Currency', icon: '💱' },
                            ...toCurrencies.map(curr => ({
                                value: curr,
                                label: CURRENCY_DETAILS[curr]?.name || curr,
                                subtext: curr,
                                icon: CURRENCY_DETAILS[curr]?.flag,
                                currencySymbol: CURRENCY_DETAILS[curr]?.symbol,
                            }))
                        ]}
                    />

                    <SearchableSelect
                        placeholder="Select Status..."
                        value={statusFilter}
                        onChange={setStatusFilter}
                        options={[
                            { value: 'all', label: '<All Status>' },
                            { value: 'active', label: 'Active' },
                            { value: 'inactive', label: 'Inactive' }
                        ]}
                    />
                </div>

                <div style={{
                    marginTop: 20,
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 16,
                    alignItems: 'center',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ color: '#475569', fontSize: '0.95rem' }}>
                        Showing <strong style={{ color: '#0f172a' }}>{filtered.length}</strong> of <strong style={{ color: '#0f172a' }}>{MOCK_RATES.length}</strong> corridors
                    </div>
                    <div style={{
                        padding: '8px 12px',
                        borderRadius: 999,
                        background: 'rgba(15, 23, 42, 0.04)',
                        color: '#64748b',
                        fontSize: '0.8rem',
                        fontWeight: 600
                    }}>
                        {filterSummary}
                    </div>
                </div>
            </section>

            <section style={{
                borderRadius: 24,
                border: panelBorder,
                background: '#fff',
                boxShadow: surfaceShadow,
                overflow: 'hidden'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(226, 232, 240, 0.75)',
                    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
                }}>
                    <div>
                        <h2 style={{ ...supportSectionTitleStyle, margin: '0 0 4px', color: '#0f172a' }}>
                            Current Corridor Snapshot
                        </h2>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
                            Exports always use the same filtered rows shown below.
                        </p>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
                        <thead style={{ background: '#fcfdff' }}>
                            <tr>
                                <th style={thStyle}>Ref</th>
                                <th style={thStyle}>Send Country</th>
                                <th style={thStyle}>Receive Country</th>
                                <th style={thStyle}>From-To</th>
                                <th style={{ ...thStyle, fontSize: '0.85rem' }}>Rates</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((rate, index) => (
                                <tr
                                    key={rate.id}
                                    style={{
                                        background: index % 2 === 0 ? '#ffffff' : '#fbfdff',
                                        transition: 'background 0.2s ease'
                                    }}
                                >
                                    <td style={{ ...tdStyle, color: '#ea580c', fontWeight: 800 }}>{rate.id}</td>
                                    <td style={{ ...tdStyle, color: rate.sendCountry === 'ALL' ? '#64748b' : '#0f172a', fontWeight: rate.sendCountry === 'ALL' ? 500 : 700 }}>
                                        {rate.sendCountry}
                                    </td>
                                    <td style={{ ...tdStyle, color: rate.receiveCountry === 'ALL' ? '#64748b' : '#0f172a', fontWeight: rate.receiveCountry === 'ALL' ? 500 : 700 }}>
                                        {rate.receiveCountry}
                                    </td>
                                    <td style={{ ...tdStyle, fontWeight: 800, color: '#0f172a' }}>{rate.from} - {rate.to}</td>
                                    <td style={{ ...tdStyle, fontFamily: "'Consolas', 'Courier New', monospace", fontSize: '1.01rem', fontWeight: 700, color: '#334155' }}>
                                        {rate.moneyR}
                                        {rate.override && <OverrideBadge />}
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                        <StatusBadge active={rate.active} />
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ padding: '56px 18px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>
                                        No corridors match your filters
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default SupportRates;
