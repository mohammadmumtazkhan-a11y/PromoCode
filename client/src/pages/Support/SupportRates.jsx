import React, { useState } from 'react';

// Mock rates data (from existing RateManager)
const MOCK_RATES = [
    { id: 1246, from: 'EUR', to: 'SGD', moneyR: '1.0000 / 1.3900', mobileR: '1.0000 / 1.3900', billR: '1.0000 / 1.3900', moneyW: '1.2000 / 1.6680', plFactor: '+2.5%', plCommBase: 'N/A', plCommPct: '+1.0%', active: true },
    { id: 2309, from: 'GBP', to: 'INR', moneyR: '1.0000 / 105.0000', mobileR: '1.0000 / 0.0000', billR: '1.0000 / 0.0000', moneyW: '1.0000 / 105.0000', plFactor: '+15.2%', plCommBase: 'N/A', plCommPct: '+0.5%', active: true, override: true },
    { id: 2269, from: 'EUR', to: 'TRY', moneyR: '0.9800 / 4.2826', mobileR: '1.0000 / 4.3700', billR: '1.0000 / 4.3700', moneyW: '1.0000 / 800.0000', plFactor: '-1.5%', plCommBase: 'N/A', plCommPct: '+0.0%', active: true, override: true },
    { id: 1203, from: 'NGN', to: 'USD', moneyR: '1.0000 / 0.0000', mobileR: '1.0000 / 0.0000', billR: '1.0000 / 0.0000', moneyW: '1.0000 / 643.0000', plFactor: '0.0%', plCommBase: 'N/A', plCommPct: '+0.0%', active: true, override: true },
    { id: 3101, from: 'GBP', to: 'NGN', moneyR: '1.0000 / 1160.0000', mobileR: '1.0000 / 1155.0000', billR: '1.0000 / 1150.0000', moneyW: '1.0000 / 1165.0000', plFactor: '+8.3%', plCommBase: 'N/A', plCommPct: '+1.5%', active: true },
    { id: 3205, from: 'USD', to: 'KES', moneyR: '1.0000 / 152.0000', mobileR: '1.0000 / 151.5000', billR: '1.0000 / 150.0000', moneyW: '1.0000 / 153.0000', plFactor: '+4.1%', plCommBase: 'N/A', plCommPct: '+0.8%', active: true },
    { id: 3302, from: 'EUR', to: 'GHS', moneyR: '1.0000 / 14.2000', mobileR: '1.0000 / 14.0000', billR: '1.0000 / 13.8000', moneyW: '1.0000 / 14.5000', plFactor: '+3.7%', plCommBase: 'N/A', plCommPct: '+0.5%', active: false },
];

const StatusBadge = ({ active }) => (
    <span style={{
        background: active ? '#dcfce7' : '#fee2e2',
        color: active ? '#15803d' : '#b91c1c',
        padding: '4px 12px',
        borderRadius: 99,
        fontSize: '0.75rem',
        fontWeight: 600,
    }}>
        {active ? 'Active' : 'Inactive'}
    </span>
);

const OverrideBadge = () => (
    <span style={{
        background: '#ffedd5',
        color: '#c2410c',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: '0.7rem',
        fontWeight: 600,
        marginLeft: 8,
        border: '1px solid #fdba74'
    }}>
        Override
    </span>
);

const SupportRates = () => {
    const [fromFilter, setFromFilter] = useState('all');
    const [toFilter, setToFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // Get unique currencies
    const fromCurrencies = [...new Set(MOCK_RATES.map(r => r.from))];
    const toCurrencies = [...new Set(MOCK_RATES.map(r => r.to))];

    // Filter
    const filtered = MOCK_RATES.filter(r => {
        if (fromFilter !== 'all' && r.from !== fromFilter) return false;
        if (toFilter !== 'all' && r.to !== toFilter) return false;
        if (statusFilter === 'active' && !r.active) return false;
        if (statusFilter === 'inactive' && r.active) return false;
        return true;
    });

    const thStyle = {
        padding: '12px 16px', textAlign: 'left',
        color: '#6b7280', fontWeight: 600, fontSize: '0.8rem',
        whiteSpace: 'nowrap'
    };

    const tdStyle = {
        padding: '12px 16px', fontSize: '0.85rem',
        borderBottom: '1px solid #f3f4f6'
    };

    const exportColumns = [
        { label: 'Ref', value: (rate) => rate.id },
        { label: 'From-To', value: (rate) => `${rate.from} - ${rate.to}` },
        { label: 'Money-R', value: (rate) => rate.moneyR },
        { label: 'Mobile-R', value: (rate) => rate.mobileR },
        { label: 'Bill-R', value: (rate) => rate.billR },
        { label: 'Money-W', value: (rate) => rate.moneyW },
        { label: 'Status', value: (rate) => (rate.active ? 'Active' : 'Inactive') },
    ];

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

    const handleDownloadPdf = () => {
        const printableRows = filtered.map((rate) => `
            <tr>
                ${exportColumns.map((column) => `<td>${column.value(rate)}</td>`).join('')}
            </tr>
        `).join('');
        const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');
        if (!printWindow) return;

        printWindow.document.write(`
            <!doctype html>
            <html>
                <head>
                    <title>Exchange Rates & Corridors</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 24px;
                            color: #111827;
                        }
                        h1 {
                            margin: 0 0 8px;
                            font-size: 24px;
                        }
                        p {
                            margin: 0 0 20px;
                            color: #4b5563;
                            font-size: 14px;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            font-size: 12px;
                        }
                        th, td {
                            border: 1px solid #d1d5db;
                            padding: 8px 10px;
                            text-align: left;
                            vertical-align: top;
                        }
                        th {
                            background: #f3f4f6;
                        }
                        @media print {
                            body {
                                margin: 12px;
                            }
                        }
                    </style>
                </head>
                <body>
                    <h1>Exchange Rates & Corridors</h1>
                    <p>Exported ${new Date().toLocaleString()}</p>
                    <table>
                        <thead>
                            <tr>${exportColumns.map((column) => `<th>${column.label}</th>`).join('')}</tr>
                        </thead>
                        <tbody>
                            ${printableRows || `<tr><td colspan="${exportColumns.length}">No corridors match the current filters.</td></tr>`}
                        </tbody>
                    </table>
                    <script>
                        window.onload = function () {
                            window.print();
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937', margin: '0 0 4px' }}>
                        Exchange Rates & Corridors
                    </h1>
                    <p style={{ color: '#6b7280', margin: 0, fontSize: '0.9rem' }}>
                        View active rates and corridors (read-only)
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button
                        onClick={handleDownloadCsv}
                        style={{
                            padding: '10px 14px',
                            borderRadius: 8,
                            border: '1px solid #d1d5db',
                            background: 'white',
                            color: '#374151',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Download CSV
                    </button>
                    <button
                        onClick={handleDownloadPdf}
                        style={{
                            padding: '10px 14px',
                            borderRadius: 8,
                            border: 'none',
                            background: '#ea580c',
                            color: 'white',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Download PDF
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div style={{
                background: 'white', padding: 16, borderRadius: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                marginBottom: 20, display: 'flex', gap: 16,
                alignItems: 'center', flexWrap: 'wrap'
            }}>
                <select
                    id="filter-from"
                    value={fromFilter}
                    onChange={(e) => setFromFilter(e.target.value)}
                    style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, width: 180, color: '#374151' }}
                >
                    <option value="all">&lt;All From Currency&gt;</option>
                    {fromCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select
                    id="filter-to"
                    value={toFilter}
                    onChange={(e) => setToFilter(e.target.value)}
                    style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, width: 180, color: '#374151' }}
                >
                    <option value="all">&lt;All To Currency&gt;</option>
                    {toCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select
                    id="filter-status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, width: 150, color: '#374151' }}
                >
                    <option value="all">&lt;All Status&gt;</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>

                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    Showing {filtered.length} of {MOCK_RATES.length} corridors
                </div>
            </div>

            {/* Table */}
            <div style={{
                background: 'white', borderRadius: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                overflow: 'hidden'
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                            <tr>
                                <th style={thStyle}>Ref</th>
                                <th style={thStyle}>From-To</th>
                                <th style={thStyle}>Money-R</th>
                                <th style={thStyle}>Mobile-R</th>
                                <th style={thStyle}>Bill-R</th>
                                <th style={thStyle}>Money-W</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(rate => (
                                <tr key={rate.id} style={{ borderBottom: '1px solid #f3f4f6', background: 'white' }}>
                                    <td style={{ ...tdStyle, color: '#2563eb', fontWeight: 500 }}>{rate.id}</td>
                                    <td style={{ ...tdStyle, fontWeight: 600, color: '#111827' }}>{rate.from} - {rate.to}</td>
                                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                        {rate.moneyR}
                                        {rate.override && <OverrideBadge />}
                                    </td>
                                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.8rem' }}>{rate.mobileR}</td>
                                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.8rem' }}>{rate.billR}</td>
                                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                        {rate.moneyW}
                                        {rate.override && <OverrideBadge />}
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                        <StatusBadge active={rate.active} />
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: '#9ca3af' }}>
                                        No corridors match your filters
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SupportRates;
