import React, { useEffect } from 'react';
import '../pages/Growth/referral.css';

export const ToastStack = ({ toasts, onDismiss }) => (
    <div className="rf-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
            <div key={t.id} className={`rf-toast rf-toast-${t.tone}`}>
                <span>{t.message}</span>
                <button type="button" aria-label="Close" onClick={() => onDismiss(t.id)}>×</button>
            </div>
        ))}
    </div>
);

// Accessible confirmation dialog (replaces window.confirm)
export const ConfirmDialog = ({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'primary', onConfirm, onCancel, children }) => {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onCancel]);
    if (!open) return null;
    return (
        <div className="rf-dialog-backdrop" onClick={onCancel}>
            <div className="rf-dialog" role="dialog" aria-modal="true" aria-labelledby="rf-dialog-title" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="rf-dialog-close" aria-label="Close" onClick={onCancel}>×</button>
                <h3 id="rf-dialog-title">{title}</h3>
                <p>{message}</p>
                {children}
                <div className="rf-dialog-actions">
                    <button type="button" className="btn-secondary" onClick={onCancel}>{cancelLabel}</button>
                    <button type="button" className={tone === 'danger' ? 'rf-btn-danger' : 'btn-primary'} onClick={onConfirm} autoFocus>{confirmLabel}</button>
                </div>
            </div>
        </div>
    );
};
