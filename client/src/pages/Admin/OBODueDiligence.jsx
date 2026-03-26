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
  padding: '12px 14px',
  border: `1px solid ${hasErr ? '#dc2626' : '#d1d5db'}`,
  borderRadius: 10,
  fontSize: '0.9rem',
  outline: 'none',
  fontFamily: "'Inter', sans-serif",
  fontWeight: 500,
  color: '#111827',
  background: '#fff',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s, box-shadow 0.2s',
});

const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: 8 };
const errText = { fontSize: '0.78rem', color: '#dc2626', fontWeight: 600, marginTop: 4 };

const Field = ({ label, required, error, children }) => (
  <div>
    <label style={labelStyle}>{label}{required && <span style={{ color: '#ea580c' }}> *</span>}</label>
    {children}
    {error && <div style={errText}>{error}</div>}
  </div>
);

const FileRow = ({ label, required, error, fileRef, file, onChange, hint }) => (
  <Field label={label} required={required} error={error}>
    <div
      style={{ ...inputStyle(error), display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', cursor: 'pointer', background: file ? '#f0fdf4' : '#fff' }}
      onClick={() => fileRef.current?.click()}
    >
      <input ref={fileRef} type="file" accept=".pdf,.png,.jpeg,.jpg,.tiff,.gif" style={{ display: 'none' }} onChange={onChange} />
      <span style={{ fontSize: '0.85rem', color: '#6b7280', flexShrink: 0 }}>📎</span>
      <span style={{ fontSize: '0.85rem', color: file ? '#166534' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: file ? 600 : 400 }}>
        {file ? file.name : 'Choose file...'}
      </span>
    </div>
    {hint && <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: 4, fontWeight: 500 }}>{hint}</div>}
  </Field>
);

const CurrencyAmountInput = ({ currency, onCurrencyChange, amount, onAmountChange, error }) => (
  <div style={{ display: 'flex', gap: 6 }}>
    <select
      value={currency}
      onChange={e => onCurrencyChange(e.target.value)}
      style={{ ...inputStyle(), width: 80, flexShrink: 0, padding: '12px 8px', fontWeight: 600 }}
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

/* ── Section Card ── */
const SectionCard = ({ icon, title, subtitle, children, accentColor = '#ea580c' }) => (
  <div style={{
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16,
    padding: '28px', marginBottom: 24,
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: accentColor,
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.1rem', flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#111827' }}>{title}</div>
        {subtitle && <div style={{ fontSize: '0.82rem', color: '#6b7280', fontWeight: 500, marginTop: 2 }}>{subtitle}</div>}
      </div>
    </div>
    {children}
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

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.01em' }}>Due Diligence (Additional KYC)</h3>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: '6px 0 0', fontWeight: 500 }}>Complete enhanced compliance review for this customer.</p>
        </div>
        <button onClick={onBack} style={{
          padding: '10px 20px', background: '#fff', color: '#4b5563',
          border: '1px solid #d1d5db', borderRadius: 10, fontSize: '0.85rem',
          fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
          transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }} onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
          ← Back
        </button>
      </div>

      {/* ══════ SECTION 1: Mandatory Employment & Income ══════ */}
      <SectionCard icon="💼" title="Employment & Income" subtitle="All fields in this section are mandatory" accentColor="#ea580c">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Field label="Employer Name" required error={errors.employerName}>
            <input style={inputStyle(errors.employerName)} value={form.employerName} onChange={e => set('employerName', e.target.value)} placeholder="Company name" />
          </Field>
          <Field label="Job Title / Position" required error={errors.jobTitle}>
            <input style={inputStyle(errors.jobTitle)} value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)} placeholder="e.g. Software Engineer" />
          </Field>
          <Field label="Industry / Sector" required error={errors.industrySector}>
            <select style={inputStyle(errors.industrySector)} value={form.industrySector} onChange={e => set('industrySector', e.target.value)}>
              <option value="">Select…</option>
              {INDUSTRIES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Duration of Employment (Years)" required error={errors.durationOfEmployment}>
            <select style={inputStyle(errors.durationOfEmployment)} value={form.durationOfEmployment} onChange={e => set('durationOfEmployment', e.target.value)}>
              <option value="">Select…</option>
              {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Employment Income" required error={errors.employmentIncome}>
            <CurrencyAmountInput
              currency={form.employmentIncomeCurrency}
              onCurrencyChange={v => set('employmentIncomeCurrency', v)}
              amount={form.employmentIncome}
              onAmountChange={v => set('employmentIncome', v)}
              error={errors.employmentIncome}
            />
          </Field>
          <Field label="Annual Gross Income" required error={errors.annualGrossIncome}>
            <CurrencyAmountInput
              currency={form.annualGrossIncomeCurrency}
              onCurrencyChange={v => set('annualGrossIncomeCurrency', v)}
              amount={form.annualGrossIncome}
              onAmountChange={v => set('annualGrossIncome', v)}
              error={errors.annualGrossIncome}
            />
          </Field>
          <FileRow label="Upload Employment Income Document" required error={errors.employmentIncomeDoc} fileRef={fileRefs.employmentIncomeDoc} file={files.employmentIncomeDoc} onChange={e => setFile('employmentIncomeDoc', e.target.files[0])} />
        </div>
      </SectionCard>

      {/* ══════ SECTION 2: Additional Income Sources ══════ */}
      <SectionCard icon="💰" title="Additional Income Sources" subtitle="Optional — provide details of any other income" accentColor="#2563eb">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Field label="Sale of Assets (e.g. Property, Shares)">
            <input style={inputStyle()} value={form.saleOfAssets} onChange={e => set('saleOfAssets', e.target.value)} placeholder="Amount" />
          </Field>
          <FileRow label="Upload Sale of Assets Document" fileRef={fileRefs.saleOfAssetsDoc} file={files.saleOfAssetsDoc} onChange={e => setFile('saleOfAssetsDoc', e.target.files[0])} />

          <Field label="Inheritance / Gifts">
            <select style={inputStyle()} value={form.inheritanceGifts} onChange={e => set('inheritanceGifts', e.target.value)}>
              <option value="">Select…</option>
              {INHERITANCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <FileRow label="Upload Inheritance / Gifts Document" fileRef={fileRefs.inheritanceDoc} file={files.inheritanceDoc} onChange={e => setFile('inheritanceDoc', e.target.files[0])} />

          <Field label="Investments (dividends, crypto)">
            <input style={inputStyle()} value={form.investments} onChange={e => set('investments', e.target.value)} placeholder="Amount" />
          </Field>
          <FileRow label="Upload Investments Document" fileRef={fileRefs.investmentsDoc} file={files.investmentsDoc} onChange={e => setFile('investmentsDoc', e.target.files[0])} />

          <Field label="Savings / Accumulated Wealth">
            <input style={inputStyle()} value={form.savings} onChange={e => set('savings', e.target.value)} placeholder="Amount" />
          </Field>
          <FileRow label="Upload Savings Document" fileRef={fileRefs.savingsDoc} file={files.savingsDoc} onChange={e => setFile('savingsDoc', e.target.files[0])} />

          <Field label="Other (Please specify)">
            <input style={inputStyle()} value={form.other} onChange={e => set('other', e.target.value)} placeholder="Describe other income" />
          </Field>
          <FileRow label="Upload Other Document" fileRef={fileRefs.otherDoc} file={files.otherDoc} onChange={e => setFile('otherDoc', e.target.files[0])} />
        </div>
      </SectionCard>

      {/* ══════ SECTION 3: Bank Documents & Comments ══════ */}
      <SectionCard icon="🏦" title="Bank Documents & Comments" subtitle="Upload relevant bank documents and add any comments" accentColor="#059669">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <FileRow label="Account Agreement with Bank" fileRef={fileRefs.accountAgreement} file={files.accountAgreement} onChange={e => setFile('accountAgreement', e.target.files[0])} hint="Clearly showing the bank account details" />
          <FileRow label="Loan Agreement with Bank" fileRef={fileRefs.loanAgreement} file={files.loanAgreement} onChange={e => setFile('loanAgreement', e.target.files[0])} />
          <FileRow label="Proof of Address (Bank)" fileRef={fileRefs.proofOfAddress} file={files.proofOfAddress} onChange={e => setFile('proofOfAddress', e.target.files[0])} />
        </div>
        <Field label="Additional Comments (optional)">
          <textarea
            style={{ ...inputStyle(), height: 100, resize: 'vertical', paddingTop: 12 }}
            value={form.additionalComments}
            onChange={e => set('additionalComments', e.target.value)}
            placeholder="Any additional notes for the compliance team..."
          />
        </Field>
      </SectionCard>

      {/* ══════ SECTION 4: Additional Documents ══════ */}
      <SectionCard icon="📄" title="Additional Documents" subtitle="Attach any extra supporting documents" accentColor="#7c3aed">
        {addDocs.map((doc, idx) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 16, marginBottom: idx < addDocs.length - 1 ? 16 : 0, alignItems: 'end' }}>
            <Field label={`Document ${idx + 1} — Type`}>
              <input
                style={inputStyle()}
                value={doc.type}
                placeholder="e.g. Payslip, Bank Statement"
                onChange={e => setAddDocs(prev => prev.map((d, i) => i === idx ? { ...d, type: e.target.value } : d))}
              />
            </Field>
            <Field label={`Upload Document ${idx + 1}`}>
              <div
                style={{ ...inputStyle(), display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', cursor: 'pointer', background: doc.file ? '#f0fdf4' : '#fff' }}
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
                <span style={{ fontSize: '0.85rem', color: doc.file ? '#166534' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: doc.file ? 600 : 400 }}>
                  {doc.file ? doc.file.name : 'Choose file...'}
                </span>
              </div>
            </Field>
            <div style={{ display: 'flex', gap: 8, paddingBottom: 2 }}>
              {idx === addDocs.length - 1 && (
                <button
                  onClick={() => setAddDocs(prev => [...prev, { type: '', file: null }])}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f97316, #ea580c)',
                    color: '#fff', border: 'none', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(234,88,12,0.25)',
                  }}
                >+</button>
              )}
              {idx > 0 && (
                <button
                  onClick={() => setAddDocs(prev => prev.filter((_, i) => i !== idx))}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: '#fee2e2', border: '1px solid #fecaca',
                    color: '#dc2626', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer',
                  }}
                >−</button>
              )}
            </div>
          </div>
        ))}
      </SectionCard>

      {/* Action */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleDoAml}
          style={{
            padding: '14px 40px',
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            color: '#fff', border: 'none', borderRadius: 12,
            fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            boxShadow: '0 4px 14px rgba(234,88,12,0.25)',
            transition: 'transform 0.1s ease',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          Submit Due Diligence →
        </button>
      </div>

      {/* Success Confirmation Popup */}
      {showSuccess && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 20,
            width: 480, maxWidth: '92vw', padding: '48px 40px 36px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
            fontFamily: "'Inter', sans-serif",
            textAlign: 'center',
            position: 'relative',
          }}>
            <button
              onClick={() => setShowSuccess(false)}
              style={{
                position: 'absolute', top: 12, right: 12,
                width: 32, height: 32, borderRadius: '50%',
                background: '#f3f4f6', border: 'none', color: '#6b7280',
                fontSize: '1.1rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#e5e7eb'; e.currentTarget.style.color = '#1f2937'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#6b7280'; }}
            >
              ×
            </button>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803d', margin: '0 0 8px' }}>
              Due Diligence Complete!
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#166534', lineHeight: 1.6, margin: '0 0 32px' }}>
              The enhanced compliance review has been submitted successfully.<br />
              You can now proceed to create the transaction.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              <button
                onClick={() => setShowSuccess(false)}
                style={{
                  padding: '14px 28px', background: '#fff', color: '#4b5563',
                  border: '1px solid #d1d5db', borderRadius: 12,
                  fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  transition: 'all 0.2s',
                }}
              >
                Close
              </button>
              <button
                onClick={() => { setShowSuccess(false); onDoAml({ form, files, addDocs }); }}
                style={{
                  padding: '14px 32px',
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  color: '#fff', border: 'none', borderRadius: 12,
                  fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  boxShadow: '0 4px 12px rgba(234,88,12,0.25)',
                }}
              >
                Add Recipient →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OBODueDiligence;
