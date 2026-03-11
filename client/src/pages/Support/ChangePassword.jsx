import React, { useState } from 'react';
import { useSupportAuth } from '../../SupportApp';

const ChangePassword = () => {
    const { agent } = useSupportAuth();
    const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState(false);

    const validate = () => {
        const e = {};
        if (!form.current) e.current = 'Current password is required';
        if (!form.newPass) e.newPass = 'New password is required';
        else if (form.newPass.length < 8) e.newPass = 'Password must be at least 8 characters';
        if (!form.confirm) e.confirm = 'Please confirm your new password';
        else if (form.newPass !== form.confirm) e.confirm = 'Passwords do not match';
        if (form.current && form.newPass && form.current === form.newPass) e.newPass = 'New password must be different from current';
        return e;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errs = validate();
        setErrors(errs);
        setSuccess(false);

        if (Object.keys(errs).length === 0) {
            // Mock save
            setTimeout(() => {
                setSuccess(true);
                setForm({ current: '', newPass: '', confirm: '' });
            }, 500);
        }
    };

    const inputStyle = (hasError) => ({
        width: '100%', padding: '10px 14px',
        border: `1px solid ${hasError ? '#fca5a5' : '#d1d5db'}`,
        borderRadius: 8, fontSize: '0.9rem',
        outline: 'none', boxSizing: 'border-box',
        background: hasError ? '#fef2f2' : 'white'
    });

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 500 }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937', margin: '0 0 4px' }}>
                    Change Password
                </h1>
                <p style={{ color: '#6b7280', margin: 0, fontSize: '0.9rem' }}>
                    Update your account password for {agent?.email || 'your account'}
                </p>
            </div>

            <div style={{
                background: 'white', borderRadius: 12, padding: 28,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}>
                {/* Success Message */}
                {success && (
                    <div id="password-success" style={{
                        background: '#f0fdf4', color: '#166534',
                        padding: '12px 16px', borderRadius: 8,
                        border: '1px solid #bbf7d0',
                        fontSize: '0.9rem', marginBottom: 20, fontWeight: 500
                    }}>
                        ✅ Password changed successfully!
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Current Password */}
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
                            Current Password <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            id="current-password"
                            type="password"
                            value={form.current}
                            onChange={(e) => { setForm({ ...form, current: e.target.value }); setErrors({}); setSuccess(false); }}
                            style={inputStyle(!!errors.current)}
                            placeholder="Enter current password"
                        />
                        {errors.current && <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: 4 }}>{errors.current}</div>}
                    </div>

                    {/* New Password */}
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
                            New Password <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            id="new-password"
                            type="password"
                            value={form.newPass}
                            onChange={(e) => { setForm({ ...form, newPass: e.target.value }); setErrors({}); setSuccess(false); }}
                            style={inputStyle(!!errors.newPass)}
                            placeholder="Min 8 characters"
                        />
                        {errors.newPass && <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: 4 }}>{errors.newPass}</div>}
                    </div>

                    {/* Confirm Password */}
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
                            Confirm New Password <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            id="confirm-password"
                            type="password"
                            value={form.confirm}
                            onChange={(e) => { setForm({ ...form, confirm: e.target.value }); setErrors({}); setSuccess(false); }}
                            style={inputStyle(!!errors.confirm)}
                            placeholder="Re-enter new password"
                        />
                        {errors.confirm && <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: 4 }}>{errors.confirm}</div>}
                    </div>

                    <button
                        id="save-password-btn"
                        type="submit"
                        style={{
                            width: '100%', padding: '12px',
                            background: '#ea580c', color: 'white',
                            border: 'none', borderRadius: 8,
                            fontSize: '0.95rem', fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(234,88,12,0.3)'
                        }}
                    >
                        Update Password
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePassword;
