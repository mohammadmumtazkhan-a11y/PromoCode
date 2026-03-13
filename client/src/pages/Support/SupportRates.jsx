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
    const [countryFilter, setCountryFilter] = useState('');
    const [fromFilter, setFromFilter] = useState('all');
    const [toFilter, setToFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [affiliateSearch, setAffiliateSearch] = useState('Rhemito');

    const countryOptions = Object.keys(COUNTRY_DEFAULT_CURRENCY);
    const fromCurrencies = [...new Set(MOCK_RATES.map((rate) => rate.from))];
    const toCurrencies = [...new Set(MOCK_RATES.map((rate) => rate.to))];

    const filtered = MOCK_RATES.filter((rate) => {
        if (affiliateSearch && !rate.affiliate.toLowerCase().includes(affiliateSearch.toLowerCase())) return false;
        if (countryFilter) {
            const normalizedCountryFilter = countryFilter.toLowerCase();
            const normalizedSendCountry = rate.sendCountry.toLowerCase();
            if (!normalizedSendCountry.includes(normalizedCountryFilter)) return false;
        }
        if (fromFilter !== 'all' && rate.from !== fromFilter) return false;
        if (toFilter !== 'all' && rate.to !== toFilter) return false;
        if (statusFilter === 'active' && !rate.active) return false;
        if (statusFilter === 'inactive' && rate.active) return false;
        return true;
    });

    const filterSummary = [
        `Affiliate: ${affiliateSearch || 'All'}`,
        `Send Country: ${countryFilter || 'All'}`,
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
                    <div style={{ position: 'relative', gridColumn: 'span 1' }}>
                        <input
                            list="affiliate-list"
                            type="text"
                            placeholder="Search Affiliate..."
                            value={affiliateSearch}
                            onChange={(event) => setAffiliateSearch(event.target.value)}
                            style={{
                                width: '100%',
                                minHeight: 52,
                                padding: '0 44px 0 16px',
                                borderRadius: 14,
                                border: '1px solid rgba(148, 163, 184, 0.3)',
                                background: '#fff',
                                color: '#334155',
                                fontSize: '0.95rem',
                                boxSizing: 'border-box'
                            }}
                        />
                        <datalist id="affiliate-list">
                            {AFFILIATES.map((affiliate) => <option key={affiliate} value={affiliate} />)}
                        </datalist>
                        {affiliateSearch && (
                            <button
                                type="button"
                                onClick={() => setAffiliateSearch('')}
                                aria-label="Clear affiliate search"
                                style={{
                                    position: 'absolute',
                                    right: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    color: '#94a3b8',
                                    fontSize: '1rem'
                                }}
                            >
                                x
                            </button>
                        )}
                    </div>

                    <div style={{ position: 'relative', gridColumn: 'span 2' }}>
                        <input
                            list="country-list"
                            type="text"
                            placeholder="Search Send Country..."
                            value={countryFilter}
                            onChange={(event) => setCountryFilter(event.target.value)}
                            style={{
                                width: '100%',
                                minHeight: 52,
                                padding: '0 44px 0 16px',
                                borderRadius: 14,
                                border: '1px solid rgba(148, 163, 184, 0.3)',
                                background: '#fff',
                                color: '#334155',
                                fontSize: '0.95rem',
                                boxSizing: 'border-box',
                                boxShadow: 'inset 0 1px 2px rgba(15, 23, 42, 0.02)',
                            }}
                        />
                        <datalist id="country-list">
                            {countryOptions.map((country) => <option key={country} value={country} />)}
                        </datalist>
                        {countryFilter && (
                            <button
                                type="button"
                                onClick={() => setCountryFilter('')}
                                aria-label="Clear country filter"
                                style={{
                                    position: 'absolute',
                                    right: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    color: '#94a3b8',
                                    fontSize: '1rem'
                                }}
                            >
                                x
                            </button>
                        )}
                    </div>

                    <select id="filter-from" value={fromFilter} onChange={(event) => setFromFilter(event.target.value)} style={selectStyle}>
                        <option value="all">&lt;All From Currency&gt;</option>
                        {fromCurrencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                    </select>

                    <select id="filter-to" value={toFilter} onChange={(event) => setToFilter(event.target.value)} style={selectStyle}>
                        <option value="all">&lt;All To Currency&gt;</option>
                        {toCurrencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                    </select>

                    <select id="filter-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={selectStyle}>
                        <option value="all">&lt;All Status&gt;</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
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
