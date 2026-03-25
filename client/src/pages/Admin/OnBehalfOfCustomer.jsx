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

const StepIndicator = ({ currentStep }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
    {STEPS.map((step, idx) => {
      const isDone = currentStep > step.number;
      const isActive = currentStep === step.number;
      return (
        <React.Fragment key={step.number}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: idx < STEPS.length - 1 ? 'none' : 1 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: isDone
                ? 'linear-gradient(135deg, #f97316, #ea580c)'
                : isActive
                  ? 'linear-gradient(135deg, #f97316, #ea580c)'
                  : '#f3f4f6',
              color: isActive || isDone ? '#fff' : '#9ca3af',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.875rem',
              boxShadow: isActive ? '0 0 0 4px rgba(249,115,22,0.2)' : 'none',
              transition: 'all 0.3s',
            }}>
              {isDone ? '✓' : step.number}
            </div>
            <span style={{
              fontSize: '0.72rem', fontWeight: isActive ? 700 : 400,
              color: isActive ? '#ea580c' : isDone ? '#374151' : '#9ca3af',
              whiteSpace: 'nowrap',
            }}>
              {step.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div style={{
              flex: 1, height: 2, margin: '0 8px',
              background: isDone ? 'linear-gradient(90deg, #f97316, #ea580c)' : '#e5e7eb',
              marginBottom: 18,
              transition: 'background 0.3s',
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

  // Called from Search — "Complete KYC" button for Not Done customers
  const handleCompleteKyc = (c) => {
    setPendingKycCustomer(c);
    setKycReturnTo('step1');
    setSubView('kyc');
  };

  const handleKycComplete = (updatedCustomer) => {
    setSubView('search');
    setPendingKycCustomer(null);
    // Track if DD was completed during KYC
    if (kycType === 'ddOnly' || kycType === 'fullWithDD') {
      setDdCompleted(true);
    }
    // Always advance to Transaction Details after KYC completion
    setCustomer(updatedCustomer);
    setStep(2);
  };

  const handleKycSkip = () => {
    setSubView('search');
    if (kycReturnTo === 'step2' && pendingKycCustomer) {
      setCustomer(pendingKycCustomer);
      setStep(2);
    }
    setPendingKycCustomer(null);
  };

  const handleTxContinue = (data) => {
    setTxData(data);
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

  return (
    <div style={{
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Page Title */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem',
          }}>
            🤝
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2937', margin: 0 }}>
            Create Transactions On Behalf of Customers
          </h1>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0, paddingLeft: 46 }}>
          Manage the full transaction lifecycle as a concierge for your customers.
        </p>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={step} />

      {/* Step Card */}
      <div style={{
        background: '#fff',
        border: '1px solid #f3f4f6',
        borderRadius: 16,
        padding: 32,
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
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
        {subView === 'kyc' && (
          <OBOKYCWizard
            customer={pendingKycCustomer}
            kycType={kycType}
            onComplete={handleKycComplete}
            onSkip={handleKycSkip}
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
            onContinue={(action) => handleDone()}
          />
        )}
      </div>
    </div>
  );
};

export default OnBehalfOfCustomer;
