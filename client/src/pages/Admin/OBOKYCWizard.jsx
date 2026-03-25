import React, { useState, useRef, useEffect } from 'react';
import { COUNTRIES } from './oboMockData';
import OBODueDiligence from './OBODueDiligence';

const DOCUMENT_TYPES = [
  'Passport',
  'Driving Licence',
];

// Mock OCR/scrape results keyed by document type
const MOCK_OCR = {
  'Passport': {
    idNumber: 'P3178775',
    issuingCountry: 'United Kingdom',
    issueDate: '2019-03-15',
    expiryDate: '2029-03-14',
  },
  'Driving Licence': {
    idNumber: 'KHAN912347AB9CD',
    issuingCountry: 'United Kingdom',
    issueDate: '2018-06-20',
    expiryDate: '2028-06-19',
  },
};

const OCCUPATIONS = [
  'Business Analyst', 'Engineer', 'Doctor', 'Teacher', 'Accountant',
  'Lawyer', 'Nurse', 'IT Professional', 'Self-employed', 'Student',
  'Retired', 'Unemployed', 'Other',
];

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

const inputStyle = (hasErr = false) => ({
  width: '100%',
  padding: '8px 12px',
  border: `1px solid ${hasErr ? '#dc2626' : '#d1d5db'}`,
  borderRadius: 6,
  fontSize: '0.875rem',
  outline: 'none',
  fontFamily: "'Inter', sans-serif",
  color: '#1f2937',
  background: '#fff',
  boxSizing: 'border-box',
});

const labelStyle = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#374151',
  marginBottom: 5,
};

const errText = { fontSize: '0.72rem', color: '#dc2626', marginTop: 3 };

const FormField = ({ label, required, error, children }) => (
  <div>
    <label style={labelStyle}>{label}{required && ' *'}</label>
    {children}
    {error && <div style={errText}>{error}</div>}
  </div>
);

const SearchableSelect = ({ value, onChange, options, placeholder = 'Search…', error }) => {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const filtered = options.filter(o => o.toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: '#9ca3af' }}>🔍</span>
        <input
          style={{ ...inputStyle(error), paddingLeft: 30 }}
          value={open ? q : value}
          placeholder={placeholder}
          onFocus={() => { setOpen(true); setQ(''); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={e => setQ(e.target.value)}
        />
      </div>
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, zIndex: 100, maxHeight: 180, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {filtered.map(o => (
            <div key={o} onMouseDown={() => { onChange(o); setOpen(false); }} style={{ padding: '8px 12px', fontSize: '0.875rem', cursor: 'pointer', color: '#1f2937' }}
              onMouseEnter={e => e.currentTarget.style.background = '#fff7ed'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const KYC_STEPS = [
  { number: 1, label: 'KYC — Document' },
  { number: 2, label: 'AML — Personal Details' },
  { number: 3, label: 'Result' },
];

const StepIndicator = ({ current }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
    {KYC_STEPS.map((s, idx) => {
      const done = current > s.number;
      const active = current === s.number;
      return (
        <React.Fragment key={s.number}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: done || active ? 'linear-gradient(135deg, #f97316, #ea580c)' : '#f3f4f6',
              color: done || active ? '#fff' : '#9ca3af',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.8rem',
              boxShadow: active ? '0 0 0 3px rgba(249,115,22,0.2)' : 'none',
            }}>
              {done ? '✓' : s.number}
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: active ? 700 : 400, color: active ? '#ea580c' : done ? '#374151' : '#9ca3af', whiteSpace: 'nowrap' }}>
              {s.label}
            </span>
          </div>
          {idx < KYC_STEPS.length - 1 && (
            <div style={{ flex: 1, height: 2, margin: '0 8px', marginBottom: 16, background: done ? 'linear-gradient(90deg, #f97316, #ea580c)' : '#e5e7eb' }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ── Mini KYC: success confirmation with auto-advance ──
const MiniKycConfirmation = ({ customer, onComplete }) => {
  const [countdown, setCountdown] = useState(5);

  const handleContinue = () => onComplete({ ...customer, kycStatus: 'Passed' });

  useEffect(() => {
    if (countdown <= 0) { handleContinue(); return; }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>✅</div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#15803d', margin: '0 0 8px', textAlign: 'center' }}>
        Mini KYC Passed
      </h2>
      <p style={{ fontSize: '0.9rem', color: '#166534', margin: '0 0 24px', textAlign: 'center', maxWidth: 420 }}>
        All required information was collected during registration. Mini KYC verification is complete.
      </p>
      <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '0 0 20px' }}>
        Continuing automatically in <strong style={{ color: '#ea580c' }}>{countdown}</strong> second{countdown !== 1 ? 's' : ''}…
      </p>
      <button onClick={handleContinue}
        style={{
          padding: '11px 36px',
          background: 'linear-gradient(135deg, #f97316, #ea580c)',
          color: '#fff', border: 'none', borderRadius: 8,
          fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
          boxShadow: '0 2px 8px rgba(234,88,12,0.25)',
        }}>
        Continue →
      </button>
    </div>
  );
};

const CustomerBanner = ({ customer, badge, badgeColor, badgeBg, onSkip }) => (
  <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
      {customer?.firstName?.[0]}{customer?.lastName?.[0]}
    </div>
    <div>
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1f2937' }}>{customer?.firstName} {customer?.lastName}</div>
      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{customer?.id} · {customer?.email}</div>
    </div>
    <span style={{ marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 600, color: badgeColor, background: badgeBg, padding: '2px 10px', borderRadius: 20 }}>{badge}</span>
    <button onClick={onSkip} style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: 6, padding: '5px 14px', fontSize: '0.78rem', color: '#6b7280', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>Skip</button>
  </div>
);

const OBOKYCWizard = ({ customer, onComplete, onSkip, kycType = 'fullWithDD' }) => {
  const [step, setStep] = useState(1);
  const [subView, setSubView] = useState('aml'); // 'aml' | 'dueDiligence'

  // Step 1 — KYC Document
  const [docFile, setDocFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [docType, setDocType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [issuingCountry, setIssuingCountry] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [kycComments, setKycComments] = useState('');
  const [kycErrors, setKycErrors] = useState({});
  const fileRef = useRef();

  const handleDocUpload = (file) => {
    if (!file) return;
    setDocFile(file);
    setScanning(true);
    setTimeout(() => {
      const type = docType || 'Passport';
      const ocr = MOCK_OCR[type] || MOCK_OCR['Passport'];
      setIdNumber(ocr.idNumber);
      setIssuingCountry(ocr.issuingCountry);
      setIssueDate(ocr.issueDate);
      setExpiryDate(ocr.expiryDate);
      if (!docType) setDocType('Passport');
      setScanning(false);
    }, 1800);
  };

  // Step 2 — AML
  const [aml, setAml] = useState({
    firstName: customer?.firstName || '',
    middleName: '',
    lastName: customer?.lastName || '',
    occupation: '',
    dob: '',
    gender: '',
    birthCountry: '',
    buildingNo: '',
    buildingName: '',
    street: '',
    subStreet: '',
    postcode: '',
    city: '',
    nationality: '',
    residentCountry: '',
    amlIdNumber: '',
    amlIssuingCountry: '',
    amlIssueDate: '',
    amlExpiryDate: '',
    amlComments: '',
  });
  // Dynamic additional documents list: [{ type, file }]
  const [addDocs, setAddDocs] = useState([{ type: '', file: null }]);
  const addDocRefs = useRef([]);
  const [amlErrors, setAmlErrors] = useState({});

  // Step 3 — Result
  const [processing, setProcessing] = useState(false);
  const [amlResult, setAmlResult] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const setA = (key, val) => setAml(prev => ({ ...prev, [key]: val }));

  // ── Validate Step 1 ──
  const validateKyc = () => {
    const e = {};
    // Either upload a document OR enter ID number manually — at least one required
    if (!docFile && !idNumber.trim()) {
      e.docFile = 'Upload a document or enter the ID number below';
      e.idNumber = 'Enter ID number or upload a document above';
    }
    if (!docType) e.docType = 'Required';
    if (!issuingCountry) e.issuingCountry = 'Required';
    if (!issueDate) e.issueDate = 'Required';
    if (!expiryDate) e.expiryDate = 'Required';
    return e;
  };

  const handleSaveKyc = () => {
    const e = validateKyc();
    if (Object.keys(e).length) { setKycErrors(e); return; }
    setKycErrors({});
    // Pre-fill AML ID fields from Step 1 data
    setAml(prev => ({
      ...prev,
      amlIdNumber: idNumber || prev.amlIdNumber,
      amlIssuingCountry: issuingCountry || prev.amlIssuingCountry,
      amlIssueDate: issueDate || prev.amlIssueDate,
      amlExpiryDate: expiryDate || prev.amlExpiryDate,
    }));
    setStep(2);
  };

  // ── Validate Step 2 ──
  const validateAml = () => {
    const e = {};
    const req = ['firstName', 'lastName', 'occupation', 'dob', 'gender', 'birthCountry', 'buildingNo', 'street', 'postcode', 'city', 'nationality', 'residentCountry', 'amlIdNumber', 'amlIssuingCountry', 'amlIssueDate', 'amlExpiryDate'];
    req.forEach(k => { if (!aml[k]?.trim()) e[k] = 'Required'; });
    return e;
  };

  const handleDoAml = () => {
    const e = validateAml();
    if (Object.keys(e).length) { setAmlErrors(e); return; }
    setAmlErrors({});
    setStep(3);
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setAmlResult('Passed');
    }, 2500);
  };

  const handleSaveDueDiligence = () => {
    const e = validateAml();
    if (Object.keys(e).length) { setAmlErrors(e); return; }
    setAmlErrors({});
    setSubView('dueDiligence');
  };

  const handleDueDiligenceAml = () => {
    setSubView('aml');
    setStep(3);
    setProcessing(true);
    setTimeout(() => { setProcessing(false); setAmlResult('Refer'); }, 2500);
  };

  const handleCopyFacialLink = () => {
    navigator.clipboard?.writeText('https://app.mito.com/facial-verify?token=mock456');
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const handleComplete = () => {
    onComplete({ ...customer, kycStatus: amlResult === 'Passed' ? 'Passed' : 'Refer' });
  };

  const btnPrimary = {
    padding: '10px 28px', background: 'linear-gradient(135deg, #f97316, #ea580c)',
    color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.875rem',
    fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
  };
  const btnSecondary = {
    padding: '9px 20px', background: '#fff', color: '#374151',
    border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem',
    fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
  };

  // ── Mini KYC: auto-advance confirmation ──
  if (kycType === 'mini') {
    return <MiniKycConfirmation customer={customer} onComplete={onComplete} />;
  }

  // ── Due Diligence Only ──
  if (kycType === 'ddOnly') {
    return (
      <div style={{ fontFamily: "'Inter', sans-serif" }}>
        <CustomerBanner customer={customer} badge="Due Diligence Only" badgeColor="#7c3aed" badgeBg="#ede9fe" onSkip={onSkip} />
        <OBODueDiligence customer={customer} onBack={onSkip} onDoAml={() => onComplete({ ...customer, kycStatus: 'Refer' })} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg, #f97316, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🆔</div>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1f2937', margin: 0 }}>KYC Verification</h2>
          <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '2px 0 0' }}>Complete identity verification for this customer</p>
        </div>
        <button onClick={onSkip} style={{ marginLeft: 'auto', ...btnSecondary, fontSize: '0.78rem', color: '#9ca3af', padding: '7px 16px' }}>
          Skip for now
        </button>
      </div>

      {/* Customer Banner */}
      <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
          {customer?.firstName?.[0]}{customer?.lastName?.[0]}
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1f2937' }}>{customer?.firstName} {customer?.lastName}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{customer?.id} · {customer?.email}</div>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 600, color: '#92400e', background: '#ffedd5', padding: '2px 10px', borderRadius: 20 }}>KYC Pending</span>
      </div>

      {/* Step Indicator */}
      <StepIndicator current={step} />

      {/* ══════════════════════════════════════════════ */}
      {/* STEP 1 — KYC: Document Upload                  */}
      {/* ══════════════════════════════════════════════ */}
      {step === 1 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1f2937', margin: 0 }}>KYC</h3>
            <button onClick={onSkip} style={{ ...btnSecondary, padding: '6px 16px', fontSize: '0.8rem' }}>← Back</button>
          </div>

          {/* Either/or hint */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '10px 14px', background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: 8 }}>
            <span style={{ fontSize: '0.9rem' }}>ℹ️</span>
            <span style={{ fontSize: '0.8rem', color: '#92400e' }}>
              <strong>Upload a document</strong> or <strong>enter the ID number manually</strong> — at least one is required.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Upload document */}
            <FormField label="Upload document" error={kycErrors.docFile}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ ...inputStyle(kycErrors.docFile), display: 'flex', alignItems: 'center', gap: 8, flex: 1, padding: '6px 10px', cursor: 'pointer' }}
                  onClick={() => fileRef.current.click()}>
                  <input ref={fileRef} type="file" accept=".pdf,.png,.jpeg,.jpg,.tiff,.gif" style={{ display: 'none' }}
                    onChange={e => handleDocUpload(e.target.files[0])} />
                  <span style={{ fontSize: '0.78rem', color: docFile ? '#1f2937' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {docFile ? docFile.name : 'No file chosen'}
                  </span>
                </div>
                <button onClick={() => fileRef.current.click()}
                  style={{ ...btnPrimary, padding: '8px 18px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  Upload
                </button>
              </div>
              {scanning && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '7px 12px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #fdba74', borderTop: '2px solid #ea580c', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <span style={{ fontSize: '0.78rem', color: '#c2410c', fontWeight: 500 }}>Scanning document… extracting ID details</span>
                </div>
              )}
              {!scanning && docFile && idNumber && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '5px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 }}>
                  <span style={{ color: '#16a34a', fontSize: '0.8rem' }}>✓</span>
                  <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 500 }}>ID details auto-filled from document</span>
                </div>
              )}
            </FormField>

            {/* Document Type */}
            <FormField label="Document Type" required error={kycErrors.docType}>
              <select style={inputStyle(kycErrors.docType)} value={docType} onChange={e => {
                const t = e.target.value;
                setDocType(t);
                // Re-scrape with new document type if file already uploaded
                if (docFile && t && MOCK_OCR[t]) {
                  setScanning(true);
                  setTimeout(() => {
                    const ocr = MOCK_OCR[t];
                    setIdNumber(ocr.idNumber);
                    setIssuingCountry(ocr.issuingCountry);
                    setIssueDate(ocr.issueDate);
                    setExpiryDate(ocr.expiryDate);
                    setScanning(false);
                  }, 1200);
                }
              }}>
                <option value="">Select ID Type</option>
                {DOCUMENT_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: 5, lineHeight: 1.4 }}>
                Upload only PDF, PNG, JPEG/JPG, TIFF and GIF files.<br />
                The images should not be blurry, crooked or upside down.
              </div>
            </FormField>

            {/* ID Number */}
            <FormField label={`ID Number${docFile && idNumber && !scanning ? ' ✓' : ''}`} error={kycErrors.idNumber}>
              <input
                style={{ ...inputStyle(kycErrors.idNumber), background: docFile && idNumber && !scanning ? '#f0fdf4' : '#fff' }}
                value={idNumber}
                onChange={e => setIdNumber(e.target.value)}
                placeholder="Enter ID number manually or upload document"
                disabled={scanning}
              />
            </FormField>

            {/* Issuing Country */}
            <FormField label={`Issuing Country *${docFile && issuingCountry && !scanning ? ' ✓' : ''}`} error={kycErrors.issuingCountry}>
              <div style={{ opacity: scanning ? 0.5 : 1, pointerEvents: scanning ? 'none' : 'auto' }}>
                <SearchableSelect value={issuingCountry} onChange={setIssuingCountry} options={COUNTRIES} placeholder="Issuing Country" error={kycErrors.issuingCountry} />
              </div>
            </FormField>

            {/* ID Issue Date */}
            <FormField label={`ID Issue Date *${docFile && issueDate && !scanning ? ' ✓' : ''}`} error={kycErrors.issueDate}>
              <input
                type="date"
                style={{ ...inputStyle(kycErrors.issueDate), background: docFile && issueDate && !scanning ? '#f0fdf4' : '#fff' }}
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                disabled={scanning}
              />
            </FormField>

            {/* ID Expiry Date */}
            <FormField label={`ID Expiry Date *${docFile && expiryDate && !scanning ? ' ✓' : ''}`} error={kycErrors.expiryDate}>
              <input
                type="date"
                style={{ ...inputStyle(kycErrors.expiryDate), background: docFile && expiryDate && !scanning ? '#f0fdf4' : '#fff' }}
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                disabled={scanning}
              />
            </FormField>
          </div>

          {/* Additional comments */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>Additional comments (optional)</label>
            <textarea
              style={{ ...inputStyle(), height: 80, resize: 'vertical', paddingTop: 8 }}
              value={kycComments}
              onChange={e => setKycComments(e.target.value)}
            />
          </div>

          <button onClick={handleSaveKyc} style={{ ...btnPrimary, padding: '11px 36px', fontSize: '0.9rem' }}>
            Save Details
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* STEP 2 — Due Diligence sub-view               */}
      {/* ══════════════════════════════════════════════ */}
      {step === 2 && subView === 'dueDiligence' && (
        <OBODueDiligence
          customer={customer}
          onBack={() => setSubView('aml')}
          onDoAml={handleDueDiligenceAml}
        />
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* STEP 2 — AML: Personal & Address Details       */}
      {/* ══════════════════════════════════════════════ */}
      {step === 2 && subView === 'aml' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1f2937', margin: 0 }}>AML</h3>
            <button onClick={() => setStep(1)} style={{ ...btnSecondary, padding: '6px 16px', fontSize: '0.8rem' }}>← Back</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Row 1: Names */}
            <FormField label="First Name" required error={amlErrors.firstName}>
              <input style={inputStyle(amlErrors.firstName)} value={aml.firstName} onChange={e => setA('firstName', e.target.value)} />
            </FormField>
            <FormField label="Middle Name" error={amlErrors.middleName}>
              <input style={inputStyle()} value={aml.middleName} onChange={e => setA('middleName', e.target.value)} />
            </FormField>
            <FormField label="Last Name" required error={amlErrors.lastName}>
              <input style={inputStyle(amlErrors.lastName)} value={aml.lastName} onChange={e => setA('lastName', e.target.value)} />
            </FormField>

            {/* Row 2: Occupation / DOB / Gender */}
            <FormField label="Occupation" required error={amlErrors.occupation}>
              <select style={inputStyle(amlErrors.occupation)} value={aml.occupation} onChange={e => setA('occupation', e.target.value)}>
                <option value="">Select…</option>
                {OCCUPATIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </FormField>
            <FormField label="Date of Birth" required error={amlErrors.dob}>
              <input type="date" style={inputStyle(amlErrors.dob)} value={aml.dob} onChange={e => setA('dob', e.target.value)} />
            </FormField>
            <FormField label="Gender" required error={amlErrors.gender}>
              <select style={inputStyle(amlErrors.gender)} value={aml.gender} onChange={e => setA('gender', e.target.value)}>
                <option value="">Select…</option>
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </FormField>

            {/* Row 3: Birth Country / Building No / Building Name */}
            <FormField label="Birth Country" required error={amlErrors.birthCountry}>
              <SearchableSelect value={aml.birthCountry} onChange={v => setA('birthCountry', v)} options={COUNTRIES} placeholder="Search country…" error={amlErrors.birthCountry} />
            </FormField>
            <FormField label="Building No./Flat No." required error={amlErrors.buildingNo}>
              <input style={inputStyle(amlErrors.buildingNo)} value={aml.buildingNo} onChange={e => setA('buildingNo', e.target.value)} />
            </FormField>
            <FormField label="Building Name" error={amlErrors.buildingName}>
              <input style={inputStyle()} value={aml.buildingName} onChange={e => setA('buildingName', e.target.value)} />
            </FormField>

            {/* Row 4: Street / Sub Street / Postcode */}
            <FormField label="Street" required error={amlErrors.street}>
              <input style={inputStyle(amlErrors.street)} value={aml.street} onChange={e => setA('street', e.target.value)} />
            </FormField>
            <FormField label="Sub Street" error={amlErrors.subStreet}>
              <input style={inputStyle()} value={aml.subStreet} onChange={e => setA('subStreet', e.target.value)} />
            </FormField>
            <FormField label="Post code/Zip code" required error={amlErrors.postcode}>
              <input style={inputStyle(amlErrors.postcode)} value={aml.postcode} onChange={e => setA('postcode', e.target.value)} />
            </FormField>

            {/* Row 5: City / Nationality / Resident Country */}
            <FormField label="City" required error={amlErrors.city}>
              <input style={inputStyle(amlErrors.city)} value={aml.city} onChange={e => setA('city', e.target.value)} />
            </FormField>
            <FormField label="Nationality" required error={amlErrors.nationality}>
              <SearchableSelect value={aml.nationality} onChange={v => setA('nationality', v)} options={COUNTRIES} placeholder="Search…" error={amlErrors.nationality} />
            </FormField>
            <FormField label="Resident Country" required error={amlErrors.residentCountry}>
              <SearchableSelect value={aml.residentCountry} onChange={v => setA('residentCountry', v)} options={COUNTRIES} placeholder="Search…" error={amlErrors.residentCountry} />
            </FormField>

            {/* Row 6: ID Number / Issuing Country / ID Issue Date */}
            <FormField label="ID Number" required error={amlErrors.amlIdNumber}>
              <input style={{ ...inputStyle(amlErrors.amlIdNumber), background: aml.amlIdNumber && docFile ? '#f0fdf4' : '#fff' }} value={aml.amlIdNumber} onChange={e => setA('amlIdNumber', e.target.value)} />
            </FormField>
            <FormField label="Issuing Country" required error={amlErrors.amlIssuingCountry}>
              <SearchableSelect value={aml.amlIssuingCountry} onChange={v => setA('amlIssuingCountry', v)} options={COUNTRIES} placeholder="Search…" error={amlErrors.amlIssuingCountry} />
            </FormField>
            <FormField label="ID Issue Date" required error={amlErrors.amlIssueDate}>
              <input type="date" style={{ ...inputStyle(amlErrors.amlIssueDate), background: aml.amlIssueDate && docFile ? '#f0fdf4' : '#fff' }} value={aml.amlIssueDate} onChange={e => setA('amlIssueDate', e.target.value)} />
            </FormField>

            {/* Row 7: Expiry Date / Additional Comments */}
            <FormField label="Expiry Date" required error={amlErrors.amlExpiryDate}>
              <input type="date" style={{ ...inputStyle(amlErrors.amlExpiryDate), background: aml.amlExpiryDate && docFile ? '#f0fdf4' : '#fff' }} value={aml.amlExpiryDate} onChange={e => setA('amlExpiryDate', e.target.value)} />
            </FormField>
            <div style={{ gridColumn: '2 / -1' }}>
              <FormField label="Additional comments (optional)">
                <textarea style={{ ...inputStyle(), height: 72, resize: 'vertical', paddingTop: 8 }}
                  value={aml.amlComments} onChange={e => setA('amlComments', e.target.value)} />
              </FormField>
            </div>
          </div>

          {/* Additional Document Upload — dynamic rows */}
          <div style={{ marginBottom: 28, padding: '16px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f3f4f6' }}>
            {addDocs.map((doc, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: idx < addDocs.length - 1 ? 12 : 0 }}>
                <FormField label={idx === 0 ? 'Add Additional Document (Type)' : `Additional Document ${idx + 1} (Type)`}>
                  <input
                    style={inputStyle()}
                    value={doc.type}
                    placeholder="e.g. Utility Bill"
                    onChange={e => setAddDocs(prev => prev.map((d, i) => i === idx ? { ...d, type: e.target.value } : d))}
                  />
                </FormField>
                <FormField label={idx === 0 ? 'Upload Additional Document' : `Upload Document ${idx + 1}`}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div
                      style={{ ...inputStyle(), display: 'flex', alignItems: 'center', gap: 8, flex: 1, padding: '6px 10px', cursor: 'pointer' }}
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
                      <span style={{ fontSize: '0.78rem', color: doc.file ? '#1f2937' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.file ? doc.file.name : 'No file chosen'}
                      </span>
                    </div>
                    {/* + button only on last row */}
                    {idx === addDocs.length - 1 && (
                      <button
                        onClick={() => setAddDocs(prev => [...prev, { type: '', file: null }])}
                        style={{ ...btnPrimary, width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0, fontSize: '1.1rem', lineHeight: 1 }}
                      >+</button>
                    )}
                    {/* − button to remove rows after the first */}
                    {idx > 0 && (
                      <button
                        onClick={() => setAddDocs(prev => prev.filter((_, i) => i !== idx))}
                        style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0, fontSize: '1.1rem', lineHeight: 1, background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
                      >−</button>
                    )}
                  </div>
                </FormField>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {/* For fullWithDD, Due Diligence is the primary action */}
            {kycType === 'fullWithDD' ? (
              <>
                <button onClick={handleSaveDueDiligence} style={{ ...btnPrimary, padding: '11px 28px' }}>
                  Continue to Due Diligence →
                </button>
                <span style={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.875rem' }}>OR</span>
                <button onClick={handleDoAml} style={{ padding: '11px 20px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                  Do AML Only
                </button>
              </>
            ) : (
              <>
                <button onClick={handleDoAml} style={{ ...btnPrimary, padding: '11px 28px' }}>
                  Do AML
                </button>
              </>
            )}
            <button onClick={handleCopyFacialLink} style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              color: linkCopied ? '#16a34a' : '#2563eb', fontSize: '0.82rem',
              cursor: 'pointer', fontFamily: "'Inter', sans-serif", textDecoration: 'underline',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {linkCopied ? '✓ Copied!' : 'Copy Facial verification link'} 🪪
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* STEP 3 — Result                               */}
      {/* ══════════════════════════════════════════════ */}
      {step === 3 && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          {processing ? (
            <div>
              <div style={{ width: 64, height: 64, borderRadius: '50%', border: '4px solid #ffedd5', borderTop: '4px solid #ea580c', margin: '0 auto 20px', animation: 'spin 1s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>Running AML Check…</div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Checking watchlists, PEP lists and sanctions databases</div>
              <div style={{ marginTop: 24, maxWidth: 360, margin: '24px auto 0', textAlign: 'left' }}>
                {['Identity document verified', 'Watchlist screening', 'PEP list check', 'Sanctions database check'].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '9px 12px', background: '#f9fafb', borderRadius: 6 }}>
                    <span style={{ fontSize: '0.85rem' }}>{i < 2 ? '✅' : '⏳'}</span>
                    <span style={{ fontSize: '0.8rem', color: i < 2 ? '#374151' : '#9ca3af' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : amlResult === 'Passed' ? (
            <div>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '2rem', boxShadow: '0 6px 20px rgba(34,197,94,0.3)', color: '#fff', fontWeight: 900 }}>✓</div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#15803d', margin: '0 0 8px' }}>AML Check Passed</h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', maxWidth: 380, margin: '0 auto 24px' }}>
                {customer?.firstName}'s identity and AML checks have passed. KYC status updated to <strong style={{ color: '#15803d' }}>Passed</strong>.
              </p>
              <div style={{ maxWidth: 400, margin: '0 auto 24px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '16px 20px', textAlign: 'left' }}>
                {[['Document Check', '✅ Passed'], ['Watchlist', '✅ Clear'], ['PEP List', '✅ Clear'], ['Sanctions', '✅ Clear'], ['Overall KYC', '✅ Passed']].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #dcfce7' }}>
                    <span style={{ fontSize: '0.82rem', color: '#166534' }}>{label}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#15803d' }}>{val}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleComplete} style={{ ...btnPrimary, padding: '12px 36px', fontSize: '0.9rem' }}>
                Continue to Transaction →
              </button>
            </div>
          ) : (
            <div>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.8rem', boxShadow: '0 6px 20px rgba(245,158,11,0.3)' }}>⚠️</div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#b45309', margin: '0 0 8px' }}>Referred for Due Diligence</h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', maxWidth: 400, margin: '0 auto 24px' }}>
                This customer has been referred for enhanced due diligence review. A compliance officer will review the case.
              </p>
              <div style={{ maxWidth: 400, margin: '0 auto 24px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '16px 20px', textAlign: 'left' }}>
                {[['Document Check', '✅ Passed'], ['Watchlist', '⚠️ Match found'], ['PEP List', '✅ Clear'], ['Sanctions', '✅ Clear'], ['Overall KYC', '⚠️ Refer']].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #fde68a' }}>
                    <span style={{ fontSize: '0.82rem', color: '#78350f' }}>{label}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: label === 'Overall KYC' ? '#b45309' : '#374151' }}>{val}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button onClick={() => setStep(2)} style={btnSecondary}>← Back to AML</button>
                <button onClick={handleComplete} style={{ ...btnPrimary, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                  Continue Anyway (Refer)
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OBOKYCWizard;
