import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const CHANGE_TYPE_STYLES = {
    RATE: { bg: '#dbeafe', color: '#1e40af', label: 'Rate' },
    FACTOR: { bg: '#fef3c7', color: '#92400e', label: 'Factor' },
    OVERRIDE: { bg: '#fce7f3', color: '#9d174d', label: 'Override' },
};

const ChangeBadge = ({ type }) => {
    const style = CHANGE_TYPE_STYLES[type] || { bg: '#f3f4f6', color: '#374151', label: type };
    return (
        <span style={{
            background: style.bg, color: style.color,
            padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem',
            fontWeight: 600, letterSpacing: '0.02em', whiteSpace: 'nowrap'
        }}>
            {style.label}
        </span>
    );
};

const ValueDiff = ({ oldVal, newVal }) => (
    <span style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>
        <span style={{ color: '#dc2626', textDecoration: 'line-through', opacity: 0.7 }}>{oldVal || '—'}</span>
        <span style={{ color: '#6b7280', margin: '0 6px' }}>→</span>
        <span style={{ color: '#16a34a', fontWeight: 600 }}>{newVal || '—'}</span>
    </span>
);

const RateAuditLog = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('ALL');
    const [filterCorridor, setFilterCorridor] = useState('');

    useEffect(() => {
        fetch('/api/rate-audit-log')
            .then(res => res.json())
            .then(data => { setLogs(data.data || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    // Derive unique corridors from data
    const corridors = [...new Set(logs.map(l => l.corridor).filter(Boolean))];

    // Apply filters
    const filtered = logs.filter(l => {
        if (filterType !== 'ALL' && l.change_type !== filterType) return false;
        if (filterCorridor && l.corridor !== filterCorridor) return false;
        return true;
    });

    const formatTimestamp = (ts) => {
        if (!ts) return '—';
        const d = new Date(ts);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
            ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* Filters */}
            <div className="glass-panel" style={{ padding: 16, marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: '0.82rem', color: '#374151', fontWeight: 500 }}>Change Type:</label>
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        style={{ padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem', color: '#374151', background: '#fff' }}
                    >
                        <option value="ALL">All Types</option>
                        <option value="RATE">Rate</option>
                        <option value="FACTOR">Factor</option>
                        <option value="OVERRIDE">Override</option>
                    </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: '0.82rem', color: '#374151', fontWeight: 500 }}>Corridor:</label>
                    <select
                        value={filterCorridor}
                        onChange={e => setFilterCorridor(e.target.value)}
                        style={{ padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem', color: '#374151', background: '#fff' }}
                    >
                        <option value="">All Corridors</option>
                        {corridors.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#6b7280' }}>
                    Showing <strong style={{ color: '#111827' }}>{filtered.length}</strong> of {logs.length} entries
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading audit log...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: 48, textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', marginBottom: 8 }}>📋</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#374151' }}>No audit records found</div>
                        <div style={{ fontSize: '0.82rem', color: '#9ca3af', marginTop: 4 }}>
                            {filterType !== 'ALL' || filterCorridor ? 'Try adjusting your filters.' : 'Rate changes will appear here once saved.'}
                        </div>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <tr>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Timestamp</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Admin</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Corridor</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Rate ID</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280', fontWeight: 600 }}>Change Type</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Field</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Value Change</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((log, idx) => (
                                    <tr key={log.id} style={{
                                        borderBottom: '1px solid #f3f4f6',
                                        background: idx % 2 === 0 ? 'white' : '#fafafa',
                                        transition: 'background 0.15s'
                                    }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#fff7ed'}
                                        onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#fafafa'}
                                    >
                                        <td style={{ padding: '12px 16px', color: '#374151', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                                            {formatTimestamp(log.created_at)}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{
                                                    width: 28, height: 28, borderRadius: '50%',
                                                    background: log.admin_id === 'admin_john' ? '#ea580c' : '#7c3aed',
                                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '0.7rem', fontWeight: 600, flexShrink: 0
                                                }}>
                                                    {(log.admin_name || 'U').split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 500, color: '#111827', fontSize: '0.82rem' }}>{log.admin_name}</div>
                                                    <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{log.admin_id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
                                            {log.corridor}
                                        </td>
                                        <td style={{ padding: '12px 16px', color: '#2563eb', fontWeight: 500, fontFamily: 'monospace' }}>
                                            {log.rate_id}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <ChangeBadge type={log.change_type} />
                                        </td>
                                        <td style={{ padding: '12px 16px', color: '#374151', fontWeight: 500 }}>
                                            {log.field_name}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <ValueDiff oldVal={log.old_value} newVal={log.new_value} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RateAuditLog;
