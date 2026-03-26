import React, { useState } from 'react';
import OBOStep1Search from './OBOStep1Search';
import OBOStep1Register from './OBOStep1Register';
import OBOStep2Transaction from './OBOStep2Transaction';
import OBOStep3Recipient from './OBOStep3Recipient';
// import OBOStep4Payment from './OBOStep4Payment'; // replaced by OBOSummary payment flow
import OBOKYCWizard from './OBOKYCWizard';
import OBODueDiligence from './OBODueDiligence';
import OBOSummary from './OBOSummary';

const STEPS = [
  { number: 1, label: 'Customer' },
  { number: 2, label: 'Transaction' },
  { number: 3, label: 'Recipient' },
  { number: 4, label: 'Summary' },
];

const StepIndicator = ({ currentStep, onStepClick }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 44, padding: '0 8px', maxWidth: 800, margin: '0 auto 44px' }}>
    {STEPS.map((step, idx) => {
      const isDone = currentStep > step.number;
      const isActive = currentStep === step.number;
      const canClick = isDone;
      return (
        <React.Fragment key={step.number}>
          <div
            onClick={() => canClick && onStepClick(step.number)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              flex: idx < STEPS.length - 1 ? 'none' : 1, width: 80,
              cursor: canClick ? 'pointer' : 'default',
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: isDone ? 'linear-gradient(135deg, #f97316, #ea580c)' : isActive ? '#fff' : '#f9fafb',
              border: isActive ? '2px solid #ea580c' : isDone ? '2px solid #ea580c' : '2px solid #e5e7eb',
              color: isDone ? '#fff' : isActive ? '#ea580c' : '#9ca3af',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '1rem',
              boxShadow: isActive ? '0 0 0 4px rgba(234,88,12,0.15)' : 'none',
              transition: 'all 0.3s ease',
            }}>
              {isDone ? '✓' : step.number}
            </div>
            <span style={{
              fontSize: '0.8rem', fontWeight: isActive ? 700 : 600,
              color: isActive ? '#1f2937' : isDone ? '#4b5563' : '#9ca3af',
              whiteSpace: 'nowrap',
              textAlign: 'center'
            }}>
              {step.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div style={{
              flex: 1, height: 3, margin: '20px 4px 0', borderRadius: 2,
              background: isDone ? '#ea580c' : '#e5e7eb',
              transition: 'background 0.3s ease',
            }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

const OnBehalfOfCustomer = () => {
  const [step, setStep] = useState(1);
  const [subView, setSubView] = useState('search'); // 'search' | 'register' | 'kyc'

  const [customer, setCustomer] = useState(null);
  const [txData, setTxData] = useState(null);
  const [recipient, setRecipient] = useState(null);
  const [kycReturnTo, setKycReturnTo] = useState('step2'); // 'step2' | 'step1'
  const [pendingKycCustomer, setPendingKycCustomer] = useState(null);
  const [kycType, setKycType] = useState('full'); // 'full' | 'mini'
  const [ddCompleted, setDdCompleted] = useState(false);
  const [showTxDD, setShowTxDD] = useState(false); // DD form triggered from Step 2

  const handleCustomerSelected = (c) => {
    setCustomer(c);
    setSubView('search');
    setStep(2);
  };

  const handleRegistered = (c) => {
    setCustomer(c);
    setSubView('search');
    setStep(2);
  };

  // Called from Register — "KYC by Admin" button after account creation
  const handleKycByAdmin = (c, type = 'full') => {
    setPendingKycCustomer(c);
    setKycType(type);
    setKycReturnTo('step2');
    setSubView('kyc');
  };

  // Called from Search — "Complete KYC" button for Not Done customers (Full KYC only, no DD)
  const handleCompleteKyc = (c) => {
    setPendingKycCustomer(c);
    setKycType('full');
    setKycReturnTo('step1');
    setSubView('kyc');
  };

  const handleKycComplete = (updatedCustomer) => {
    setSubView('search');
    setPendingKycCustomer(null);
    setCustomer(updatedCustomer);
    if (kycReturnTo === 'step3') {
      // If DD was requested on Step 2 and not yet done, show DD form before proceeding
      if (txData?.addDD && !ddCompleted) {
        setStep(2);
        setShowTxDD(true);
      } else {
        setStep(3);
      }
    } else {
      setStep(2);
    }
  };

  const handleKycSkip = () => {
    setSubView('search');
    if ((kycReturnTo === 'step2' || kycReturnTo === 'step3') && pendingKycCustomer) {
      setCustomer(pendingKycCustomer);
      setStep(2);
    }
    setPendingKycCustomer(null);
  };

  const handleTxContinue = (data) => {
    setTxData(data);

    if (data.requiresFullKyc) {
      setPendingKycCustomer(customer);
      setKycType(data.kycType || 'full');
      setKycReturnTo('step3');
      setSubView('kyc');
      return;
    }

    // If DD was requested on Step 2 and not already done, show DD form first
    if (data.addDD && !ddCompleted) {
      setShowTxDD(true);
    } else {
      setStep(3);
    }
  };

  const handleTxDDComplete = () => {
    setDdCompleted(true);
    setShowTxDD(false);
    setStep(3);
  };

  const handleTxDDBack = () => {
    setShowTxDD(false);
  };

  const handleRecipientSelected = (rec) => {
    setRecipient(rec);
    setStep(4); // Summary
  };

  const handleStepClick = (targetStep) => {
    if (targetStep < step) {
      setStep(targetStep);
      if (targetStep === 1) {
        setSubView('search');
      }
    }
  };

  const handleDone = () => {
    // Reset everything
    setStep(1);
    setSubView('search');
    setCustomer(null);
    setTxData(null);
    setRecipient(null);
    setDdCompleted(false);
    setShowTxDD(false);
  };

  if (subView === 'kyc') {
    return (
      <div style={{ fontFamily: "'Inter', sans-serif", background: '#fff', border: '1px solid #f3f4f6', borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <OBOKYCWizard
          customer={pendingKycCustomer}
          kycType={kycType}
          onComplete={handleKycComplete}
          onSkip={handleKycSkip}
        />
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'Inter', sans-serif",
      maxWidth: 1140, margin: '0 auto', padding: '0 16px', boxSizing: 'border-box'
    }}>
      {/* Page Title */}
      <div style={{ marginBottom: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem', boxShadow: '0 4px 12px rgba(234,88,12,0.3)'
          }}>
            🤝
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
            On Behalf Of Customer
          </h1>
        </div>
        <p style={{ fontSize: '0.95rem', color: '#6b7280', margin: 0, maxWidth: 460 }}>
          Manage the full transaction lifecycle seamlessly on behalf of your customers.
        </p>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={step} onStepClick={handleStepClick} />

      {/* Step Card */}
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        padding: '24px 28px',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01)',
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        {step === 1 && subView === 'search' && (
          <OBOStep1Search
            onSelectCustomer={handleCustomerSelected}
            onRegisterNew={() => setSubView('register')}
            onCompleteKyc={handleCompleteKyc}
          />
        )}
        {step === 1 && subView === 'register' && (
          <OBOStep1Register
            onBack={() => setSubView('search')}
            onRegistered={handleRegistered}
            onKycByAdmin={handleKycByAdmin}
          />
        )}
        {step === 2 && !showTxDD && (
          <OBOStep2Transaction
            customer={customer}
            txData={txData}
            ddCompleted={ddCompleted}
            onBack={() => setStep(1)}
            onContinue={handleTxContinue}
          />
        )}
        {step === 2 && showTxDD && (
          <div>
            {/* Customer Banner */}
            <div style={{
              background: '#fff7ed', border: '1px solid #ffedd5',
              borderRadius: 10, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                {customer?.firstName?.[0]}{customer?.lastName?.[0]}
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1f2937' }}>{customer?.firstName} {customer?.lastName}</div>
                <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{customer?.id} · {customer?.email}</div>
              </div>
            </div>
            <OBODueDiligence
              onDoAml={handleTxDDComplete}
              onBack={handleTxDDBack}
            />
          </div>
        )}
        {step === 3 && (
          <OBOStep3Recipient
            customer={customer}
            txData={txData}
            onBack={() => setStep(2)}
            onContinue={handleRecipientSelected}
          />
        )}
        {step === 4 && (
          <OBOSummary
            customer={customer}
            txData={txData}
            recipient={recipient}
            onBack={() => setStep(3)}
            onContinue={() => handleDone()}
          />
        )}
      </div>
    </div>
  );
};

export default OnBehalfOfCustomer;
