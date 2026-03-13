import React, { useState } from 'react';
import { useSupportAuth } from '../../SupportApp';

// Mock data sets for different time periods
const mockData = {
    day: { transactions: { total: 142, successful: 130, failed: 5, inProgress: 7 }, queries: { new: 3, open: 8, resolved: 22, spam: 1 } },
    week: { transactions: { total: 710, successful: 650, failed: 22, inProgress: 38 }, queries: { new: 8, open: 18, resolved: 54, spam: 3 } },
    month: { transactions: { total: 1420, successful: 1300, failed: 45, inProgress: 75 }, queries: { new: 12, open: 34, resolved: 108, spam: 5 } },
    year: { transactions: { total: 17040, successful: 15600, failed: 540, inProgress: 900 }, queries: { new: 144, open: 408, resolved: 1296, spam: 60 } },
    // Metrics for the last 30 minutes to trigger escalation ( > 3% failure/in-progress)
    recent: { transactions: { total: 100, successful: 96, failed: 2, inProgress: 2 } } // 4/100 = 4% (Triggers alert)
};

// SVG Donut Chart
const DonutChart = ({ data }) => {
    const total = Object.values(data).reduce((sum, v) => sum + v, 0);
    const colors = { resolved: '#22c55e', open: '#3b82f6', new: '#f97316', spam: '#9ca3af' };
    const labels = { resolved: 'Resolved', open: 'Open', new: 'New', spam: 'Spam' };

    let cumulative = 0;
    const segments = Object.entries(data).map(([key, value]) => {
        const startAngle = (cumulative / total) * 360;
        const angle = (value / total) * 360;
        cumulative += value;

        const startRad = ((startAngle - 90) * Math.PI) / 180;
        const endRad = ((startAngle + angle - 90) * Math.PI) / 180;
        const largeArc = angle > 180 ? 1 : 0;

        const outerR = 90;
        const innerR = 55;

        const x1 = 100 + outerR * Math.cos(startRad);
        const y1 = 100 + outerR * Math.sin(startRad);
        const x2 = 100 + outerR * Math.cos(endRad);
        const y2 = 100 + outerR * Math.sin(endRad);
        const x3 = 100 + innerR * Math.cos(endRad);
        const y3 = 100 + innerR * Math.sin(endRad);
        const x4 = 100 + innerR * Math.cos(startRad);
        const y4 = 100 + innerR * Math.sin(startRad);

        const path = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;

        return { key, path, color: colors[key], value, label: labels[key] };
    });

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <svg viewBox="0 0 200 200" style={{ width: 180, height: 180 }}>
                {segments.map(seg => (
                    <path key={seg.key} d={seg.path} fill={seg.color} stroke="white" strokeWidth="2">
                        <title>{seg.label}: {seg.value}</title>
                    </path>
                ))}
                <text x="100" y="96" textAnchor="middle" fontSize="20" fontWeight="700" fill="#1f2937">{total}</text>
                <text x="100" y="114" textAnchor="middle" fontSize="10" fill="#6b7280">Total</text>
            </svg>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {segments.map(seg => (
                    <div key={seg.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem' }}>
                        <div style={{ width: 14, height: 14, borderRadius: 3, background: seg.color, flexShrink: 0 }}></div>
                        <span style={{ color: '#374151', fontWeight: 500 }}>{seg.label}:</span>
                        <span style={{ color: '#6b7280', fontWeight: 600 }}>{seg.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// KPI Card
const KpiCard = ({ title, value, color, icon }) => (
    <div id={`kpi-${title.toLowerCase().replace(/[\s-]+/g, '-')}`} style={{
        background: 'white', borderRadius: 12, padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        borderTop: `3px solid ${color}`,
        minWidth: 0
    }}>
        <div style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 500, marginBottom: 8 }}>{icon} {title}</div>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1f2937' }}>{value.toLocaleString()}</div>
    </div>
);

const EscalationPopup = ({ onClose, rate }) => {
    // Play sound on mount
    React.useEffect(() => {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5); // 0.5s beep
    }, []);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: 'white', borderRadius: 16, width: '400px', padding: '32px',
                textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                border: '1px solid #fee2e2'
            }}>
                <div style={{
                    width: '64px', height: '64px', background: '#fee2e2', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
                    fontSize: '32px', color: '#ef4444'
                }}>
                    ⚠️
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#991b1b', margin: '0 0 12px' }}>
                    Escalation Required!
                </h3>
                <p style={{ color: '#4b5563', fontSize: '0.95rem', lineHeight: '1.5', margin: '0 0 24px' }}>
                    The transaction failure/in-progress rate has reached <span style={{ fontWeight: 700, color: '#ef4444' }}>{rate}%</span> in the last 30 minutes. 
                    <br/><br/>
                    <strong>Escalate to the management and Technical Support immediately.</strong>
                </p>
                <button
                    onClick={onClose}
                    style={{
                        padding: '12px 24px', background: '#ef4444', color: 'white',
                        border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
                        width: '100%', transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#dc2626'}
                    onMouseOut={(e) => e.target.style.background = '#ef4444'}
                >
                    Acknowledge
                </button>
            </div>
        </div>
    );
};

const SupportDashboard = () => {
    const [period, setPeriod] = useState('month');
    const [showAlert, setShowAlert] = useState(false);
    const { agent } = useSupportAuth();
    const data = mockData[period];
    const recentData = mockData.recent;

    // Check escalation threshold on mount
    React.useEffect(() => {
        const total = recentData.transactions.total;
        const critical = recentData.transactions.failed + recentData.transactions.inProgress;
        const rate = (critical / total) * 100;

        if (rate > 3) {
            // Delay slightly for better UX after login
            const timer = setTimeout(() => setShowAlert(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [recentData]);

    const criticalRate = ((recentData.transactions.failed + recentData.transactions.inProgress) / recentData.transactions.total * 100).toFixed(1);

    const periods = ['day', 'week', 'month', 'year'];

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
            {showAlert && <EscalationPopup rate={criticalRate} onClose={() => setShowAlert(false)} />}
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937', margin: '0 0 4px' }}>
                    Welcome back, {agent?.name || 'Support Agent'}
                </h1>
                <p style={{ color: '#6b7280', margin: 0, fontSize: '0.9rem' }}>Operations overview</p>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                <KpiCard title="Total Transactions" value={data.transactions.total} color="#3b82f6" icon="📊" />
                <KpiCard title="Successful" value={data.transactions.successful} color="#22c55e" icon="✅" />
                <KpiCard title="Failed" value={data.transactions.failed} color="#ef4444" icon="❌" />
                <KpiCard title="In Progress" value={data.transactions.inProgress} color="#f59e0b" icon="⏳" />
            </div>

            {/* Ticket Metrics + Time Filter */}
            <div style={{
                background: 'white', borderRadius: 12, padding: 28,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
                        🎫 Help Tickets
                    </h2>

                    {/* Time Filter */}
                    <div id="time-filter" style={{
                        display: 'flex', background: '#f3f4f6', borderRadius: 8, overflow: 'hidden'
                    }}>
                        {periods.map(p => (
                            <button
                                key={p}
                                id={`filter-${p}`}
                                onClick={() => setPeriod(p)}
                                style={{
                                    padding: '8px 16px',
                                    background: period === p ? '#ea580c' : 'transparent',
                                    color: period === p ? 'white' : '#6b7280',
                                    border: 'none', cursor: 'pointer',
                                    fontWeight: period === p ? 600 : 500,
                                    fontSize: '0.85rem',
                                    transition: 'all 0.2s',
                                    textTransform: 'capitalize'
                                }}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                <DonutChart data={data.queries} />
            </div>
        </div>
    );
};

export default SupportDashboard;
