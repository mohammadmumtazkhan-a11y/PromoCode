import React, { useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import './index.css';

// Layout Components
import StagingSidebar from './components/Layout/StagingSidebar';
import StagingHeader from './components/Layout/StagingHeader';
import StagingFooter from './components/Layout/StagingFooter';

// Pages
import Dashboard from './pages/Dashboard';
import Login from './pages/Auth/Login';
import RewardsHub from './pages/Configuration/RewardsHub';
import PromoCodes from './pages/Financials/PromoCodes';
import DebitLogs from './pages/Financials/DebitLogs';
import Payouts from './pages/Financials/Payouts';
import Commissions from './pages/Financials/Commissions';
import ReceiveMoneyPage from './pages/Financials/ReceiveMoneyPage';

// Growth Engine Pages
import ReferralSettings from './pages/Growth/ReferralSettings';
import ReferralPerformance from './pages/Growth/ReferralPerformance';
import ReferralTracking from './pages/Growth/ReferralTracking';
import UserCreditLedger from './pages/Bonus/UserCreditLedger';
import BonusBlocks from './pages/Bonus/BonusBlocks';
import BonusSchemeManager from './pages/Bonus/BonusSchemeManager';

// Administration & Customer Pages
import OnBehalfOfCustomer from './pages/Admin/OnBehalfOfCustomer';
import MerchantList from './pages/Merchants/MerchantList';
import OnboardingWizard from './pages/Merchants/OnboardingWizard';

// Configuration Pages
import RateManager from './pages/Configuration/RateManager';
import RateSettings from './pages/Configuration/RateSettings';
import RateAuditLog from './pages/Configuration/RateAuditLog';

// Developer & Settings Pages
import ApiKeys from './pages/Settings/ApiKeys';
import TestCheckout from './pages/TestCheckout';

// Profile Placeholder View
const ProfilePage = () => (
  <div style={{ maxWidth: 1000, margin: '0 auto' }}>
    <div className="staging-breadcrumb">
      <span>Home</span> / <span>Account</span> / <span style={{ fontWeight: 600, color: '#323130' }}>Profile</span>
    </div>
    <div className="panel">
      <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', fontWeight: 700, color: '#323130' }}>Admin Profile</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <div>
          <label style={{ fontSize: '0.8rem', color: '#605e5c', fontWeight: 600 }}>Name</label>
          <div style={{ fontWeight: 600, marginTop: 4 }}>Mito Administrator</div>
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', color: '#605e5c', fontWeight: 600 }}>Email</label>
          <div style={{ fontWeight: 600, marginTop: 4 }}>admin@mito.money</div>
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', color: '#605e5c', fontWeight: 600 }}>Role</label>
          <div style={{ fontWeight: 600, marginTop: 4, color: '#FB4B14' }}>Master Admin</div>
        </div>
      </div>
    </div>
  </div>
);

// Settings Placeholder View
const SettingsPage = () => (
  <div style={{ maxWidth: 1000, margin: '0 auto' }}>
    <div className="staging-breadcrumb">
      <span>Home</span> / <span style={{ fontWeight: 600, color: '#323130' }}>Settings</span>
    </div>
    <div className="panel">
      <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', fontWeight: 700, color: '#323130' }}>Portal Settings</h3>
      <p style={{ color: '#605e5c', fontSize: '0.875rem' }}>Global administrative configurations for Mito Money platform.</p>
    </div>
  </div>
);

function App() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // If on login route, render standalone full-screen Login
  if (location.pathname === '/login') {
    return <Login />;
  }

  return (
    <div className="staging-app-layout">
      {/* Staging-Admin Sidebar */}
      <StagingSidebar
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
      />

      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 35
          }}
        />
      )}

      {/* Main Column */}
      <div className="staging-main">
        {/* Sticky Header */}
        <StagingHeader
          onMobileToggle={() => setMobileOpen(true)}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(c => !c)}
        />

        {/* Page Body */}
        <main className="staging-page-content">
          <Routes>
            {/* Dashboard / Home */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Staging Reward$ Unified 9-tab Hub */}
            <Route path="/configuration/rewards" element={<RewardsHub defaultTab="sites" />} />
            <Route path="/configuration/rate-audit-log" element={<RewardsHub defaultTab="audit" />} />
            <Route path="/financials/promocodes" element={<RewardsHub defaultTab="promos" />} />
            <Route path="/growth/referral-settings" element={<RewardsHub defaultTab="referral" />} />
            <Route path="/growth/referral-performance" element={<RewardsHub defaultTab="performance" />} />
            <Route path="/growth/referral-tracking" element={<RewardsHub defaultTab="tracking" />} />
            <Route path="/growth/credit-ledger" element={<RewardsHub defaultTab="ledger" />} />
            <Route path="/growth/bonus-blocks" element={<RewardsHub defaultTab="blocked" />} />
            <Route path="/growth/bonus-schemes" element={<RewardsHub defaultTab="bonus" />} />

            {/* Financials (matching staging-admin Financials sub-menu) */}
            <Route path="/financials/rate-threshold" element={<RateManager />} />
            <Route path="/financials/transactions" element={<DebitLogs />} />
            <Route path="/financials/mto-submissions" element={<DebitLogs />} />
            <Route path="/financials/retail-transactions" element={<DebitLogs />} />
            <Route path="/financials/biller-transactions" element={<DebitLogs />} />
            <Route path="/financials/receive-money" element={<ReceiveMoneyPage />} />
            <Route path="/financials/debits" element={<DebitLogs />} />
            <Route path="/financials/payouts" element={<Payouts />} />
            <Route path="/financials/account-balance" element={<Payouts />} />
            <Route path="/financials/commissions" element={<Commissions />} />

            {/* Customers / Merchants */}
            <Route path="/merchants" element={<MerchantList />} />
            <Route path="/merchants/onboard" element={<OnboardingWizard />} />

            {/* On Behalf of Customer */}
            <Route path="/admin/on-behalf-of-customer" element={<OnBehalfOfCustomer />} />
            <Route path="/customer/obo-customer" element={<OnBehalfOfCustomer />} />

            {/* Configuration */}
            <Route path="/configuration/country" element={<RateManager />} />
            <Route path="/configuration/currency" element={<RateManager />} />
            <Route path="/configuration/website-configuration" element={<SettingsPage />} />
            <Route path="/configuration/rate-manager" element={<RateManager />} />
            <Route path="/configuration/rates-manager" element={<RateManager />} />
            <Route path="/configuration/rate-manager/:id" element={<RateSettings />} />
            <Route path="/configuration/rates-manager/:id" element={<RateSettings />} />
            <Route path="/configuration/email-templates" element={<SettingsPage />} />
            <Route path="/configuration/providers" element={<MerchantList />} />
            <Route path="/configuration/payers" element={<MerchantList />} />
            <Route path="/configuration/single-treasury-account" element={<Payouts />} />
            <Route path="/configuration/lookup-data" element={<RateManager />} />
            <Route path="/configuration/portal-admins" element={<MerchantList />} />

            {/* Developer & Tools */}
            <Route path="/api-keys" element={<ApiKeys />} />
            <Route path="/test-checkout" element={<TestCheckout />} />

            {/* Profile & Settings */}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Catch-all redirect to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Legal Footer */}
        <StagingFooter />
      </div>
    </div>
  );
}

export default App;
