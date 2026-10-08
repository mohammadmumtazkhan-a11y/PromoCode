import React, { useEffect, useState } from 'react';
import { CURRENCIES } from '../lib/bonusUtils';

export const Field = ({ id, label, required, error, hint, children }) => (
    <div className="rf-field">
        <label htmlFor={id}>{label}{required && <span className="rf-req">*</span>}</label>
        {children}
        {error ? <div className="rf-error" id={`${id}-error`}>{error}</div> : hint ? <div className="rf-hint">{hint}</div> : null}
    </div>
);

export const Toggle = ({ on, onClick, label, disabled }) => (
    <button type="button" className="rf-toggle" onClick={onClick} disabled={disabled} aria-pressed={on} aria-label={label}>
        <span className={`rf-toggle-track ${on ? 'on' : ''}`}><span className="rf-toggle-knob" /></span>
    </button>
);

// Currency picker: type to search, pick from the list (the 13 supported currencies)
export const CurrencyPicker = ({ id, value, onChange, invalid, disabled }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const current = CURRENCIES.find((c) => c.code === value);
    const shown = open ? search : (current ? `${current.name} (${current.code})` : value || '');
    const filtered = CURRENCIES.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()));
    return (
        <div className="bn-picker">
            <input
                id={id} type="text" className={`rf-input${invalid ? ' rf-invalid' : ''}`} value={shown} disabled={disabled}
                placeholder="Search currency..." autoComplete="off" aria-autocomplete="list" aria-controls={`${id}-list`}
                onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
                onFocus={() => { setSearch(''); setOpen(true); }}
                onBlur={() => setTimeout(() => setOpen(false), 180)}
            />
            {open && (
                <ul className="bn-picker-list" id={`${id}-list`} role="listbox">
                    {filtered.map((c) => (
                        <li key={c.code} role="option" aria-selected={c.code === value}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { onChange(c.code); setOpen(false); }}>
                            <b>{c.code}</b> - {c.name}
                        </li>
                    ))}
                    {!filtered.length && <li className="bn-picker-empty">No results</li>}
                </ul>
            )}
        </div>
    );
};

// Search box with name suggestions
export const SuggestInput = ({ id, value, onChange, options, placeholder }) => {
    const [open, setOpen] = useState(false);
    const filtered = options.filter((o) => value && o.toLowerCase().includes(value.toLowerCase()) && o !== value).slice(0, 8);
    return (
        <div className="bn-picker">
            <input id={id} type="search" className="rf-input" value={value} placeholder={placeholder} autoComplete="off"
                onChange={(e) => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 180)} />
            {open && filtered.length > 0 && (
                <ul className="bn-picker-list">
                    {filtered.map((o) => <li key={o} onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(o); setOpen(false); }}>{o}</li>)}
                </ul>
            )}
        </div>
    );
};

// Modal with × and Esc (§5 shared)
export const Modal = ({ open, title, subtitle, onClose, children, wide, footer, closeLabel = 'Close' }) => {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);
    if (!open) return null;
    return (
        <div className="rf-dialog-backdrop" onClick={onClose}>
            <div className={`rf-dialog${wide ? ' bn-dialog-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="bn-modal-title" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="rf-dialog-close" aria-label={closeLabel} onClick={onClose}>×</button>
                <h3 id="bn-modal-title">{title}</h3>
                {subtitle && <p className="bn-modal-sub">{subtitle}</p>}
                <div className="bn-modal-body">{children}</div>
                {footer && <div className="rf-dialog-actions">{footer}</div>}
            </div>
        </div>
    );
};
