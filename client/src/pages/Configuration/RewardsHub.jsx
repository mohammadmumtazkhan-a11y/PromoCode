import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

// Existing full-featured modules
import PromoCodesPage from '../Promo/PromoCodesPage';
import ReferralSettings from '../Growth/ReferralSettings';
import ReferralPerformance from '../Growth/ReferralPerformance';
import ReferralTracking from '../Growth/ReferralTracking';
import UserCreditLedger from '../Bonus/UserCreditLedger';
import BonusBlocks from '../Bonus/BonusBlocks';
import BonusSchemeManager from '../Bonus/BonusSchemeManager';
import RateAuditLog from './RateAuditLog';

const REWARD_TABS = [
  { id: 'sites', label: 'Sites', tip: 'Master Admin: turn Reward$, Refer & Earn, bonus schemes, and promo codes on or off per Rhemito / widget site.' },
  { id: 'promos', label: 'Promo Codes', tip: 'Create fee-discount codes, set corridors and limits, then monitor redemptions. Codes apply at Send Money & Receive Money payment.' },
  { id: 'referral', label: 'Referral Settings', tip: 'Manage Refer & Earn rules (send currency or corridor). Activate, deactivate, or archive rules here.' },
  { id: 'performance', label: 'Referral Performance', tip: 'Aggregate referral KPIs for the selected date range. Drill into Tracking for individual journeys.' },
  { id: 'tracking', label: 'Referral Tracking', tip: 'Search referral journeys. Approve Not eligible cases with a reason of at least 10 characters.' },
  { id: 'ledger', label: 'Bonus Wallet / Ledger', tip: 'Audit one bonus balance per customer and currency. Filter by source (referral / scheme / manual). Export CSV or post manual credit.' },
  { id: 'blocked', label: 'Blocked Customers', tip: 'Customers blocked from earning bonus after cancel/refund strikes. Lift a block only after Master Admin risk review.' },
  { id: 'bonus', label: 'Bonus Scheme Manager', tip: 'Manage rule-based bonus schemes (threshold, loyalty, request-money) and audience segments. Referral rewards stay under Referral Settings.' },
  { id: 'audit', label: 'Rate Audit Log', tip: 'Read-only history of Reward$ rate / referral-rule changes. Export CSV for audit.' },
];

// Sites tab component matching staging-admin
const SitesTab = () => {
  const [search, setSearch] = useState('');
  const [sites, setSites] = useState([
    { siteKey: 'rhemito_main', displayName: 'Rhemito UK (Direct)', siteKind: 'rhemito', domain: 'rhemito.com', enabled: true, referral: true, bonusScheme: true, promo: true },
    { siteKey: 'affiliate_001', displayName: 'Mito Money Staging', siteKind: 'affiliate', domain: 'staging-admin.mito.money', enabled: true, referral: true, bonusScheme: true, promo: true },
    { siteKey: 'affiliate_widget_ng', displayName: 'Nigeria Corridor Widget', siteKind: 'affiliate', domain: 'ng.mito.money', enabled: true, referral: true, bonusScheme: true, promo: true },
    { siteKey: 'affiliate_widget_gh', displayName: 'Ghana Remittance Widget', siteKind: 'affiliate', domain: 'ghana.mito.money', enabled: true, referral: true, bonusScheme: true, promo: false },
    { siteKey: 'affiliate_widget_ke', displayName: 'Kenya Pesa Widget', siteKind: 'affiliate', domain: 'kenya.mito.money', enabled: true, referral: true, bonusScheme: false, promo: true },
  ]);

  const toggleSiteFlag = (siteKey, flag) => {
    setSites(prev => prev.map(s => {
      if (s.siteKey !== siteKey) return s;
      const updated = { ...s, [flag]: !s[flag] };
      // If disabling master Reward$, disable sub-features too
      if (flag === 'enabled' && !updated.enabled) {
        updated.referral = false;
        updated.bonusScheme = false;
        updated.promo = false;
      }
      return updated;
    }));
  };

  const filtered = sites.filter(s =>
    s.displayName.toLowerCase().includes(search.toLowerCase()) ||
    s.domain.toLowerCase().includes(search.toLowerCase()) ||
    s.siteKey.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#323130' }}>
            Rhemito & Affiliate Sites Configuration
          </h4>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#605e5c' }}>
            Master Admin control: turn individual reward programmes on or off per site/domain.
          </p>
        </div>
        <div>
          <input
            type="text"
            placeholder="Search sites by name or domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid #edebe9',
              fontSize: '0.875rem',
              width: 280,
              outline: 'none'
            }}
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #edebe9', borderRadius: 8, background: '#ffffff' }}>
        <table className="table-container">
          <thead>
            <tr>
              <th>Site / Domain</th>
              <th style={{ textAlign: 'center' }}>Reward$ (Master)</th>
              <th style={{ textAlign: 'center' }}>Referral</th>
              <th style={{ textAlign: 'center' }}>Bonus Schemes</th>
              <th style={{ textAlign: 'center' }}>Promo Codes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.siteKey}>
                <td>
                  <div style={{ fontWeight: 600, color: '#323130' }}>{s.displayName}</div>
                  <div style={{ fontSize: '0.75rem', color: '#605e5c' }}>
                    {s.siteKind === 'rhemito' ? 'Rhemito Primary (Direct)' : s.domain} • <span style={{ fontFamily: 'monospace' }}>{s.siteKey}</span>
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    onChange={() => toggleSiteFlag(s.siteKey, 'enabled')}
                    style={{ accentColor: '#FB4B14', width: 16, height: 16, cursor: 'pointer' }}
                  />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={s.referral}
                    disabled={!s.enabled}
                    onChange={() => toggleSiteFlag(s.siteKey, 'referral')}
                    style={{ accentColor: '#FB4B14', width: 16, height: 16, cursor: s.enabled ? 'pointer' : 'not-allowed' }}
                  />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={s.bonusScheme}
                    disabled={!s.enabled}
                    onChange={() => toggleSiteFlag(s.siteKey, 'bonusScheme')}
                    style={{ accentColor: '#FB4B14', width: 16, height: 16, cursor: s.enabled ? 'pointer' : 'not-allowed' }}
                  />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={s.promo}
                    disabled={!s.enabled}
                    onChange={() => toggleSiteFlag(s.siteKey, 'promo')}
                    style={{ accentColor: '#FB4B14', width: 16, height: 16, cursor: s.enabled ? 'pointer' : 'not-allowed' }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const RewardsHub = ({ defaultTab = 'sites' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState(
    urlTab && REWARD_TABS.some(t => t.id === urlTab) ? urlTab : defaultTab
  );

  useEffect(() => {
    if (urlTab && REWARD_TABS.some(t => t.id === urlTab)) {
      setActiveTab(urlTab);
    } else if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [urlTab, defaultTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Breadcrumb matching staging-admin */}
      <div className="staging-breadcrumb">
        <Link to="/dashboard">Home</Link>
        <span>/</span>
        <Link to="/configuration/rewards">Configuration</Link>
        <span>/</span>
        <span style={{ fontWeight: 600, color: '#323130' }}>Reward$</span>
      </div>

      {/* Main Panel Shell */}
      <div className="panel" style={{ padding: '24px 28px' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#323130' }}>
              Reward$
            </h2>
            <span
              title="Master Admin configuration for bonus programmes across Rhemito and MITO widget sites. Use the tabs below to manage each programme type."
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#edebe9',
                color: '#605e5c',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'help'
              }}
            >
              i
            </span>
          </div>
          <p style={{ margin: '8px 0 0 0', color: '#605e5c', fontSize: '0.9rem', lineHeight: 1.5, maxWidth: 900 }}>
            Manage rule-based bonus schemes, Refer &amp; Earn, promo codes, and the customer bonus wallet. A Reward$ scheme credits bonus balance when a customer meets a rule you configure (large transfer, loyalty, or request-money paid). Hover the <strong>i</strong> icons for what each screen is and what to do.
          </p>
        </div>

        {/* 9 Horizontal Tabs */}
        <div className="reward-tabs-bar">
          {REWARD_TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`reward-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
                title={tab.tip}
              >
                <span>{tab.label}</span>
                <span className="info-bubble">i</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panes (100% functionality preserved) */}
        <div>
          {activeTab === 'sites' && <SitesTab />}
          {activeTab === 'promos' && <PromoCodesPage />}
          {activeTab === 'referral' && <ReferralSettings />}
          {activeTab === 'performance' && <ReferralPerformance />}
          {activeTab === 'tracking' && <ReferralTracking />}
          {activeTab === 'ledger' && <UserCreditLedger />}
          {activeTab === 'blocked' && <BonusBlocks />}
          {activeTab === 'bonus' && <BonusSchemeManager />}
          {activeTab === 'audit' && <RateAuditLog />}
        </div>
      </div>
    </div>
  );
};

export default RewardsHub;
