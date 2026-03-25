import React, { useState, useRef } from 'react';

const CURRENCIES = ['GBP', 'USD', 'EUR', 'NGN', 'GHS', 'KES'];

const INHERITANCE_OPTIONS = ['Inheritance', 'Gift', 'Bequest', 'Trust', 'Other'];

const INDUSTRIES = [
  'IT', 'Finance', 'Healthcare', 'Education', 'Legal', 'Retail',
  'Manufacturing', 'Construction', 'Transport', 'Media', 'Government', 'Other',
];

const DURATIONS = [
  'Less than 1', '1 – 2', '2 – 5', '5 – 10', '10+',
];

const inputStyle = (hasErr = false) => ({
  width: '100%',
  padding: '8px 10px',
  border: `1px solid ${hasErr ? '#dc2626' : '#d1d5db'}`,
  borderRadius: 6,
  fontSize: '0.8rem',
  outline: 'none',
  fontFamily: "'Inter', sans-serif",
  color: '#1f2937',
  background: '#fff',
  boxSizing: 'border-box',
});

const labelStyle = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 4 };
const errText = { fontSize: '0.7rem', color: '#dc2626', marginTop: 2 };

const Field = ({ label, required, error, children }) => (
  <div>
    <label style={labelStyle}>{label}{required && ' *'}</label>
    {children}
    {error && <div style={errText}>{error}</div>}
  </div>
);

const FileRow = ({ label, required, error, fileRef, file, onChange, hint }) => (
  <Field label={label} required={required} error={error}>
    <div
      style={{ ...inputStyle(error), display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', cursor: 'pointer' }}
      onClick={() => fileRef.current?.click()}
    >
      <input ref={fileRef} type="file" accept=".pdf,.png,.jpeg,.jpg,.tiff,.gif" style={{ display: 'none' }} onChange={onChange} />
      <span style={{ fontSize: '0.75rem', color: '#6b7280', flexShrink: 0 }}>📎</span>
      <span style={{ fontSize: '0.75rem', color: file ? '#1f2937' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {file ? file.name : 'No file chosen'}
      </span>
    </div>
    {hint && <div style={{ fontSize: '0.68rem', color: '#2563eb', marginTop: 2 }}>{hint}</div>}
  </Field>
);

const CurrencyAmountInput = ({ currency, onCurrencyChange, amount, onAmountChange, error }) => (
  <div style={{ display: 'flex', gap: 4 }}>
    <select
      value={currency}
      onChange={e => onCurrencyChange(e.target.value)}
      style={{ ...inputStyle(), width: 72, flexShrink: 0, padding: '8px 4px' }}
    >
      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
    </select>
    <input
      type="number"
      value={amount}
      onChange={e => onAmountChange(e.target.value)}
      style={{ ...inputStyle(error), flex: 1 }}
      placeholder="0.00"
    />
  </div>
);

const OBODueDiligence = ({ customer, onBack, onDoAml }) => {
  const [form, setForm] = useState({
    employmentIncomeCurrency: 'GBP',
    employmentIncome: '',
    employerName: '',
    saleOfAssets: '',
    jobTitle: '',
    inheritanceGifts: '',
    industrySector: '',
    investments: '',
    annualGrossIncomeCurrency: 'GBP',
    annualGrossIncome: '',
    savings: '',
    durationOfEmployment: '',
    other: '',
    additionalComments: '',
  });
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  // File states
  const [files, setFiles] = useState({
    employmentIncomeDoc: null,
    saleOfAssetsDoc: null,
    inheritanceDoc: null,
    investmentsDoc: null,
    savingsDoc: null,
    otherDoc: null,
    accountAgreement: null,
    loanAgreement: null,
    proofOfAddress: null,
  });

  // Dynamic additional docs
  const [addDocs, setAddDocs] = useState([{ type: '', file: null }]);
  const addDocRefs = useRef([]);

  // File refs
  const fileRefs = {
    employmentIncomeDoc: useRef(),
    saleOfAssetsDoc: useRef(),
    inheritanceDoc: useRef(),
    investmentsDoc: useRef(),
    savingsDoc: useRef(),
    otherDoc: useRef(),
    accountAgreement: useRef(),
    loanAgreement: useRef(),
    proofOfAddress: useRef(),
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setFile = (key, f) => setFiles(prev => ({ ...prev, [key]: f }));

  const validate = () => {
    const e = {};
    if (!form.employmentIncome) e.employmentIncome = 'Required';
    if (!files.employmentIncomeDoc) e.employmentIncomeDoc = 'Required';
    if (!form.employerName.trim()) e.employerName = 'Required';
    if (!form.jobTitle.trim()) e.jobTitle = 'Required';
    if (!form.industrySector) e.industrySector = 'Required';
    if (!form.annualGrossIncome) e.annualGrossIncome = 'Required';
    if (!form.durationOfEmployment) e.durationOfEmployment = 'Required';
    return e;
  };

  const handleDoAml = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setShowSuccess(true);
  };

  const secHead = (title) => (
    <div style={{ gridColumn: '1 / -1', fontSize: '0.7rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #ffedd5', paddingBottom: 6, marginTop: 4 }}>
      {title}
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1f2937', margin: 0 }}>Due Diligence (Additional KYC)</h3>
        <button onClick={onBack} style={{ padding: '6px 16px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
          ← Back
        </button>
      </div>

      {/* ── INCOME SOURCES + EMPLOYMENT DETAILS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>

        {/* Employment Income */}
        <Field label="Employment Income" required error={errors.employmentIncome}>
          <CurrencyAmountInput
            currency={form.employmentIncomeCurrency}
            onCurrencyChange={v => set('employmentIncomeCurrency', v)}
            amount={form.employmentIncome}
            onAmountChange={v => set('employmentIncome', v)}
            error={errors.employmentIncome}
          />
        </Field>
        <FileRow label="Upload Employment Income Document" required error={errors.employmentIncomeDoc} fileRef={fileRefs.employmentIncomeDoc} file={files.employmentIncomeDoc} onChange={e => setFile('employmentIncomeDoc', e.target.files[0])} />
        <Field label="Employer Name" required error={errors.employerName}>
          <input style={inputStyle(errors.employerName)} value={form.employerName} onChange={e => set('employerName', e.target.value)} />
        </Field>

        {/* Sale of Assets */}
        <Field label="Sale of Assets (e.g. Property, Shares)" error={errors.saleOfAssets}>
          <input style={inputStyle()} value={form.saleOfAssets} onChange={e => set('saleOfAssets', e.target.value)} placeholder="Amount" />
        </Field>
        <FileRow label="Upload Sale of Assets Document" fileRef={fileRefs.saleOfAssetsDoc} file={files.saleOfAssetsDoc} onChange={e => setFile('saleOfAssetsDoc', e.target.files[0])} />
        <Field label="Job Title/Position" required error={errors.jobTitle}>
          <input style={inputStyle(errors.jobTitle)} value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)} />
        </Field>

        {/* Inheritance/Gifts */}
        <Field label="Inheritance/Gifts" error={errors.inheritanceGifts}>
          <select style={inputStyle()} value={form.inheritanceGifts} onChange={e => set('inheritanceGifts', e.target.value)}>
            <option value="">Select…</option>
            {INHERITANCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <FileRow label="Upload Inheritance/Gifts Document" fileRef={fileRefs.inheritanceDoc} file={files.inheritanceDoc} onChange={e => setFile('inheritanceDoc', e.target.files[0])} />
        <Field label="Industry/Sector" required error={errors.industrySector}>
          <select style={inputStyle(errors.industrySector)} value={form.industrySector} onChange={e => set('industrySector', e.target.value)}>
            <option value="">Select…</option>
            {INDUSTRIES.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>

        {/* Investments */}
        <Field label="Investments (dividends, crypto)" error={errors.investments}>
          <input style={inputStyle()} value={form.investments} onChange={e => set('investments', e.target.value)} placeholder="Amount" />
        </Field>
        <FileRow label="Upload Investments Document" fileRef={fileRefs.investmentsDoc} file={files.investmentsDoc} onChange={e => setFile('investmentsDoc', e.target.files[0])} />
        <Field label="Annual Gross Income" required error={errors.annualGrossIncome}>
          <CurrencyAmountInput
            currency={form.annualGrossIncomeCurrency}
            onCurrencyChange={v => set('annualGrossIncomeCurrency', v)}
            amount={form.annualGrossIncome}
            onAmountChange={v => set('annualGrossIncome', v)}
            error={errors.annualGrossIncome}
          />
        </Field>

        {/* Savings */}
        <Field label="Savings/Accumulated wealth" error={errors.savings}>
          <input style={inputStyle()} value={form.savings} onChange={e => set('savings', e.target.value)} placeholder="Amount" />
        </Field>
        <FileRow label="Upload Savings/Accumulated wealth Document" fileRef={fileRefs.savingsDoc} file={files.savingsDoc} onChange={e => setFile('savingsDoc', e.target.files[0])} />
        <Field label="Duration of Employment in Years" required error={errors.durationOfEmployment}>
          <select style={inputStyle(errors.durationOfEmployment)} value={form.durationOfEmployment} onChange={e => set('durationOfEmployment', e.target.value)}>
            <option value="">Select…</option>
            {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>

        {/* Other */}
        <Field label="Other (Please specify)" error={errors.other}>
          <input style={inputStyle()} value={form.other} onChange={e => set('other', e.target.value)} />
        </Field>
        <FileRow label="Other Document" fileRef={fileRefs.otherDoc} file={files.otherDoc} onChange={e => setFile('otherDoc', e.target.files[0])} />
        <div /> {/* empty cell */}
      </div>

      {/* ── BANK DOCUMENTS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 20, padding: '14px 16px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FileRow label="Upload Account Agreement with Bank" fileRef={fileRefs.accountAgreement} file={files.accountAgreement} onChange={e => setFile('accountAgreement', e.target.files[0])} hint="Clearly showing the bank a/c" />
          <FileRow label="Upload Loan Agreement with Bank" fileRef={fileRefs.loanAgreement} file={files.loanAgreement} onChange={e => setFile('loanAgreement', e.target.files[0])} />
          <FileRow label="Upload Proof of address associated with Bank" fileRef={fileRefs.proofOfAddress} file={files.proofOfAddress} onChange={e => setFile('proofOfAddress', e.target.files[0])} />
        </div>
        <Field label="Additional comments (optional)">
          <textarea
            style={{ ...inputStyle(), height: 120, resize: 'vertical', paddingTop: 8 }}
            value={form.additionalComments}
            onChange={e => set('additionalComments', e.target.value)}
          />
        </Field>
      </div>

      {/* ── ADDITIONAL DOCUMENTS ── */}
      <div style={{ marginBottom: 24, padding: '14px 16px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f3f4f6' }}>
        {addDocs.map((doc, idx) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: idx < addDocs.length - 1 ? 10 : 0 }}>
            <Field label={idx === 0 ? 'Add Additional Document (Type)' : `Additional Document ${idx + 1} (Type)`} required={idx === 0}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  style={{ ...inputStyle(), flex: 1 }}
                  value={doc.type}
                  onChange={e => setAddDocs(prev => prev.map((d, i) => i === idx ? { ...d, type: e.target.value } : d))}
                />
                <span style={{ color: '#9ca3af', fontSize: '1rem', flexShrink: 0 }}>⇌</span>
              </div>
            </Field>
            <Field label={idx === 0 ? 'Upload Additional Document' : `Upload Document ${idx + 1}`} required={idx === 0}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div
                  style={{ ...inputStyle(), display: 'flex', alignItems: 'center', gap: 6, flex: 1, padding: '5px 8px', cursor: 'pointer' }}
                  onClick={() => addDocRefs.current[idx]?.click()}
                >
                  <input
                    ref={el => addDocRefs.current[idx] = el}
                    type="file"
                    accept=".pdf,.png,.jpeg,.jpg,.tiff,.gif"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files[0];
                      if (f) setAddDocs(prev => prev.map((d, i) => i === idx ? { ...d, file: f } : d));
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: doc.file ? '#1f2937' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.file ? doc.file.name : 'No file chosen'}
                  </span>
                </div>
                {idx === addDocs.length - 1 && (
                  <button
                    onClick={() => setAddDocs(prev => [...prev, { type: '', file: null }])}
                    style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', cursor: 'pointer', flexShrink: 0, fontFamily: "'Inter', sans-serif" }}
                  >+</button>
                )}
                {idx > 0 && (
                  <button
                    onClick={() => setAddDocs(prev => prev.filter((_, i) => i !== idx))}
                    style={{ width: 30, height: 30, borderRadius: '50%', background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', cursor: 'pointer', flexShrink: 0, fontFamily: "'Inter', sans-serif" }}
                  >−</button>
                )}
              </div>
            </Field>
          </div>
        ))}
      </div>

      {/* Action */}
      <div>
        <button
          onClick={handleDoAml}
          style={{ padding: '11px 32px', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
        >
          Submit Details
        </button>
      </div>

      {/* Success Confirmation Popup */}
      {showSuccess && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(200,200,200,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 8,
            width: 480, padding: '48px 40px 36px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            fontFamily: "'Inter', sans-serif",
            textAlign: 'center',
          }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 500, color: '#1f2937', margin: '0 0 24px' }}>
              Success !
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#374151', lineHeight: 1.6, margin: '0 0 40px' }}>
              The KYC of the user has been done successfully.<br />
              Now you can create the transaction.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <button
                onClick={() => setShowSuccess(false)}
                style={{
                  flex: 1, padding: '12px', background: '#fff', color: '#374151',
                  border: '1px solid #d1d5db', borderRadius: 8,
                  fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Close
              </button>
              <button
                onClick={() => { setShowSuccess(false); onDoAml({ form, files, addDocs }); }}
                style={{
                  flex: 1, padding: '12px', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff',
                  border: 'none', borderRadius: 8,
                  fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Add Recipient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OBODueDiligence;
