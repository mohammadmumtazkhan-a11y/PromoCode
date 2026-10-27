import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import mitoLogo from '../../assets/Mito_logo.svg';

// Exact SVG Icons from staging-admin.mito.money (_app chunk 96972)
const IconDashboard = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="shrink-0" style={{ color: active ? '#FB4B14' : 'currentColor' }}>
    <path fill="currentColor" d="M10 6V0H18V6H10ZM0 10V0H8V10H0ZM10 18V8H18V18H10ZM0 18V12H8V18H0ZM2 8H6V2H2V8ZM12 16H16V10H12V16ZM12 4H16V2H12V4ZM2 16H6V14H2V16Z" />
  </svg>
);

const IconUsers = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0" style={{ color: active ? '#FB4B14' : 'currentColor' }}>
    <circle opacity="0.5" cx="15" cy="6" r="3" fill="currentColor" />
    <ellipse opacity="0.5" cx="16" cy="17" rx="5" ry="3" fill="currentColor" />
    <circle cx="9.00098" cy="6" r="4" fill="currentColor" />
    <ellipse cx="9.00098" cy="17.001" rx="7" ry="4" fill="currentColor" />
  </svg>
);

const IconFinancials = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="shrink-0" style={{ color: active ? '#FB4B14' : 'currentColor' }}>
    <path fill="currentColor" d="M16.7481 2H21.3021L21.4021 2.014L21.5011 2.042L21.5611 2.068C21.6411 2.10267 21.7141 2.15267 21.7801 2.218L21.8201 2.262L21.8641 2.319L21.9181 2.409L21.9571 2.499L21.9761 2.563L21.9901 2.627L21.9991 2.722V7.254C21.999 7.44402 21.9269 7.62694 21.7971 7.76579C21.6674 7.90464 21.4898 7.98907 21.3002 8.00203C21.1106 8.01498 20.9232 7.95548 20.7758 7.83557C20.6284 7.71565 20.532 7.54425 20.5061 7.356L20.4991 7.254V4.559L14.0591 10.999C13.9321 11.126 13.7638 11.2032 13.5847 11.2166C13.4055 11.23 13.2276 11.1787 13.0831 11.072L12.9991 11L9.96911 8.09L4.27911 13.779C4.14528 13.9132 3.96562 13.9917 3.77623 13.9989C3.58685 14.006 3.40179 13.9412 3.25826 13.8174C3.11474 13.6936 3.02339 13.5201 3.00258 13.3317C2.98178 13.1434 3.03305 12.9541 3.14611 12.802L3.21911 12.718L9.43911 6.498C9.56622 6.37113 9.73464 6.29409 9.91374 6.28088C10.0929 6.26766 10.2708 6.31916 10.4151 6.426L10.4991 6.498L13.5291 9.408L19.4371 3.5H16.7471C16.566 3.49975 16.3912 3.43401 16.2548 3.3149C16.1184 3.1958 16.0297 3.03138 16.0051 2.852L15.9981 2.75C15.9981 2.56876 16.0637 2.39366 16.1829 2.25707C16.302 2.12048 16.4666 2.03165 16.6461 2.007L16.7481 2ZM3.74911 17C3.94802 17 4.13878 17.079 4.27944 17.2197C4.42009 17.3603 4.49911 17.5511 4.49911 17.75V21.25C4.49911 21.4489 4.42009 21.6397 4.27944 21.7803C4.13878 21.921 3.94802 22 3.74911 22C3.55019 22 3.35943 21.921 3.21878 21.7803C3.07812 21.6397 2.99911 21.4489 2.99911 21.25V17.75C2.99911 17.5511 3.07812 17.3603 3.21878 17.2197C3.35943 17.079 3.55019 17 3.74911 17ZM9.49911 13.75C9.49911 13.5511 9.42009 13.3603 9.27944 13.2197C9.13878 13.079 8.94802 13 8.74911 13C8.55019 13 8.35943 13.079 8.21878 13.2197C8.07812 13.3603 7.99911 13.5511 7.99911 13.75V21.25C7.99911 21.4489 8.07812 21.6397 8.21878 21.7803C8.35943 21.921 8.55019 22 8.74911 22C8.94802 22 9.13878 21.921 9.27944 21.7803C9.42009 21.6397 9.49911 21.4489 9.49911 21.25V13.75ZM13.7491 15C13.948 15 14.1388 15.079 14.2794 15.2197C14.4201 15.3603 14.4991 15.5511 14.4991 15.75V21.25C14.4991 21.4489 14.4201 21.6397 14.2794 21.7803C14.1388 21.921 13.948 22 13.7491 22C13.5502 22 13.3594 21.921 13.2188 21.7803C13.0781 21.6397 12.9991 21.4489 12.9991 21.25V15.75C12.9991 15.5511 13.0781 15.3603 13.2188 15.2197C13.3594 15.079 13.5502 15 13.7491 15ZM19.4991 10.75C19.4991 10.5511 19.4201 10.3603 19.2794 10.2197C19.1388 10.079 18.948 10 18.7491 10C18.5502 10 18.3594 10.079 18.2188 10.2197C18.0781 10.3603 17.9991 10.5511 17.9991 10.75V21.25C17.9991 21.4489 18.0781 21.6397 18.2188 21.7803C18.3594 21.921 18.5502 22 18.7491 22C18.948 22 19.1388 21.921 19.2794 21.7803C19.4201 21.6397 19.4991 21.4489 19.4991 21.25V10.75Z" />
  </svg>
);

const IconSupport = ({ active }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="shrink-0" style={{ color: active ? '#FB4B14' : '#3B3A39' }}>
    <path d="M20.25 5C21.216 5 22 5.784 22 6.75V9.01C22 9.4 21.7 9.726 21.312 9.758C20.7501 9.80551 20.2265 10.0623 19.8449 10.4775C19.4633 10.8927 19.2516 11.4361 19.2516 12C19.2516 12.5639 19.4633 13.1073 19.8449 13.5225C20.2265 13.9377 20.7501 14.1945 21.312 14.242C21.4996 14.2576 21.6745 14.3431 21.802 14.4817C21.9295 14.6203 22.0001 14.8017 22 14.99V17.25C22 17.7141 21.8156 18.1592 21.4874 18.4874C21.1592 18.8156 20.7141 19 20.25 19H3.75C3.28587 19 2.84075 18.8156 2.51256 18.4874C2.18437 18.1592 2 17.7141 2 17.25V14.99C2 14.6 2.3 14.274 2.689 14.242C3.25092 14.1945 3.7745 13.9377 4.15609 13.5225C4.53767 13.1073 4.74943 12.5639 4.74943 12C4.74943 11.4361 4.53767 10.8927 4.15609 10.4775C3.7745 10.0623 3.25092 9.80551 2.689 9.758C2.50119 9.74267 2.32603 9.65721 2.19836 9.51861C2.07069 9.38001 1.99988 9.19844 2 9.01V6.75C2 5.784 2.784 5 3.75 5H20.25ZM20.5 8.385V6.75C20.5 6.6837 20.4737 6.62011 20.4268 6.57322C20.3799 6.52634 20.3163 6.5 20.25 6.5H3.75C3.6837 6.5 3.62011 6.52634 3.57322 6.57322C3.52634 6.62011 3.5 6.6837 3.5 6.75V8.385C4.29005 8.60456 4.98642 9.07689 5.48258 9.72974C5.97874 10.3826 6.24737 11.18 6.24737 12C6.24737 12.82 5.97874 13.6174 5.48258 14.2703C4.98642 14.9231 4.29005 15.3954 3.5 15.615V17.25C3.5 17.388 3.612 17.5 3.75 17.5H20.25C20.3163 17.5 20.3799 17.4737 20.4268 17.4268C20.4737 17.3799 20.5 17.3163 20.5 17.25V15.615C19.7259 15.4002 19.0412 14.9426 18.5465 14.3096C18.0519 13.6766 17.7736 12.9015 17.7524 12.0984C17.7313 11.2953 17.9684 10.5067 18.429 9.84846C18.8896 9.19025 19.5493 8.69725 20.311 8.442L20.5 8.385Z" />
  </svg>
);

const IconConfiguration = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0" style={{ color: active ? '#FB4B14' : 'currentColor' }}>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
    <path opacity="0.5" d="M13.7654 2.15224C13.3978 2 12.9319 2 12 2C11.0681 2 10.6022 2 10.2346 2.15224C9.74457 2.35523 9.35522 2.74458 9.15223 3.23463C9.05957 3.45834 9.0233 3.7185 9.00911 4.09799C8.98826 4.65568 8.70226 5.17189 8.21894 5.45093C7.73564 5.72996 7.14559 5.71954 6.65219 5.45876C6.31645 5.2813 6.07301 5.18262 5.83294 5.15102C5.30704 5.08178 4.77518 5.22429 4.35436 5.5472C4.03874 5.78938 3.80577 6.1929 3.33983 6.99993C2.87389 7.80697 2.64092 8.21048 2.58899 8.60491C2.51976 9.1308 2.66227 9.66266 2.98518 10.0835C3.13256 10.2756 3.3397 10.437 3.66119 10.639C4.1338 10.936 4.43789 11.4419 4.43786 12C4.43783 12.5581 4.13375 13.0639 3.66118 13.3608C3.33965 13.5629 3.13248 13.7244 2.98508 13.9165C2.66217 14.3373 2.51966 14.8691 2.5889 15.395C2.64082 15.7894 2.87379 16.193 3.33973 17C3.80568 17.807 4.03865 18.2106 4.35426 18.4527C4.77508 18.7756 5.30694 18.9181 5.83284 18.8489C6.07289 18.8173 6.31632 18.7186 6.65204 18.5412C7.14547 18.2804 7.73556 18.27 8.2189 18.549C8.70224 18.8281 8.98826 19.3443 9.00911 19.9021C9.02331 20.2815 9.05957 20.5417 9.15223 20.7654C9.35522 21.2554 9.74457 21.6448 10.2346 21.8478C10.6022 22 11.0681 22 12 22C12.9319 22 13.3978 22 13.7654 21.8478C14.2554 21.6448 14.6448 21.2554 14.8478 20.7654C14.9404 20.5417 14.9767 20.2815 14.9909 19.9021C15.0117 19.3443 15.2978 18.8281 15.7811 18.549C16.2644 18.27 16.8545 18.2804 17.3479 18.5412C17.6837 18.7186 17.9271 18.8173 18.1671 18.8489C18.693 18.9181 19.2249 18.7756 19.6457 18.4527C19.9613 18.2106 20.1943 17.807 20.6603 17C21.1262 16.193 21.3592 15.7894 21.4111 15.395C21.4803 14.8691 21.3378 14.3373 21.0149 13.9165C20.8675 13.7244 20.6603 13.5629 20.3388 13.3608C19.8662 13.0639 19.5621 12.5581 19.5621 12C19.5621 11.4419 19.8662 10.936 20.3388 10.639C20.6603 10.437 20.8674 10.2756 21.0148 10.0835C21.3377 9.66266 21.4802 9.1308 21.411 8.60491C21.3591 8.21048 21.1261 7.80697 20.6602 6.99993C20.1942 6.1929 19.9612 5.78938 19.6456 5.5472C19.2248 5.22429 18.6929 5.08178 18.167 5.15102C17.927 5.18262 17.6835 5.2813 17.3478 5.45876C16.8544 5.71954 16.2643 5.72996 15.781 5.45093C15.2977 5.17189 15.0117 4.65568 14.9909 4.09799C14.9767 3.7185 14.9404 3.45834 14.8478 3.23463C14.6448 2.74458 14.2554 2.35523 13.7654 2.15224Z" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const IconMitoView = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0" style={{ color: active ? '#FB4B14' : 'currentColor' }}>
    <path d="M12 6.25278V19.2528M12 6.25278C10.8321 5.47686 9.24649 5 7.5 5C5.75351 5 4.16789 5.47686 3 6.25278V19.2528C4.16789 18.4769 5.75351 18 7.5 18C9.24649 18 10.8321 18.4769 12 19.2528M12 6.25278C13.1679 5.47686 14.7535 5 16.5 5C18.2465 5 19.8321 5.47686 21 6.25278V19.2528C19.8321 18.4769 18.2465 18 16.5 18C14.7535 18 13.1679 18.4769 12 19.2528" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconProfile = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0" style={{ color: active ? '#FB4B14' : 'currentColor' }}>
    <circle cx="12" cy="6" r="4" stroke="currentColor" strokeWidth="1.5" />
    <path opacity="0.5" d="M20 17.5C20 19.9853 20 22 12 22C4 22 4 19.9853 4 17.5C4 15.0147 7.58172 13 12 13C16.4183 13 20 15.0147 20 17.5Z" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const IconDeveloper = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0" style={{ color: active ? '#FB4B14' : 'currentColor' }}>
    <path d="M15 9C15 11.2091 13.2091 13 11 13C8.79086 13 7 11.2091 7 9C7 6.79086 8.79086 5 11 5C13.2091 5 15 6.79086 15 9Z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8.5 11.5L3 17V20H6V18H8V16H9.5L10 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconSettings = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <path d="M12.012 2.25C12.746 2.258 13.477 2.343 14.194 2.503C14.3465 2.53705 14.4846 2.6179 14.5889 2.73426C14.6933 2.85062 14.7587 2.99667 14.776 3.152L14.946 4.679C14.97 4.89428 15.0442 5.10093 15.1626 5.28231C15.281 5.46368 15.4404 5.61473 15.6278 5.72329C15.8153 5.83185 16.0256 5.89489 16.2419 5.90735C16.4581 5.9198 16.6743 5.88132 16.873 5.795L18.273 5.18C18.4152 5.11735 18.5734 5.10044 18.7257 5.13161C18.878 5.16278 19.0168 5.24049 19.123 5.354C20.135 6.43516 20.8889 7.73163 21.328 9.146C21.3738 9.29474 21.3723 9.45406 21.3236 9.60189C21.2748 9.74971 21.1813 9.87871 21.056 9.971L19.815 10.887C19.6401 11.0152 19.4979 11.1827 19.3999 11.3761C19.3019 11.5695 19.2508 11.7832 19.2508 12C19.2508 12.2168 19.3019 12.4305 19.3999 12.6239C19.4979 12.8173 19.6401 12.9848 19.815 13.113L21.058 14.028C21.1835 14.1204 21.2772 14.2495 21.3259 14.3976C21.3747 14.5456 21.3761 14.7051 21.33 14.854C20.8912 16.2683 20.1377 17.5647 19.126 18.646C19.02 18.7595 18.8814 18.8372 18.7293 18.8686C18.5772 18.8999 18.4192 18.8833 18.277 18.821L16.871 18.204C16.6726 18.117 16.4565 18.0779 16.2402 18.09C16.0238 18.102 15.8134 18.1648 15.6259 18.2733C15.4383 18.3817 15.279 18.5328 15.1607 18.7143C15.0424 18.8958 14.9685 19.1026 14.945 19.318L14.775 20.844C14.758 20.9975 14.694 21.142 14.5918 21.2578C14.4896 21.3736 14.3542 21.4551 14.204 21.491C12.7556 21.8363 11.2463 21.8363 9.79797 21.491C9.64757 21.4553 9.5119 21.3739 9.4095 21.2581C9.30711 21.1423 9.24301 20.9976 9.22597 20.844L9.05697 19.32C9.03242 19.1053 8.95787 18.8994 8.83931 18.7187C8.72074 18.5381 8.56146 18.3877 8.37426 18.2798C8.18707 18.1718 7.97716 18.1093 7.76141 18.0972C7.54566 18.0851 7.33008 18.1237 7.13197 18.21L5.72597 18.826C5.58363 18.8885 5.42537 18.9053 5.27309 18.8739C5.12081 18.8426 4.98204 18.7647 4.87597 18.651C3.8641 17.5685 3.11088 16.2706 2.67297 14.855C2.62687 14.7061 2.62829 14.5466 2.67703 14.3986C2.72578 14.2505 2.81943 14.1214 2.94497 14.029L4.18797 13.113C4.36282 12.9848 4.50501 12.8173 4.60302 12.6239C4.70103 12.4305 4.75211 12.2168 4.75211 12C4.75211 11.7832 4.70103 11.5695 4.60302 11.3761C4.50501 11.1827 4.36282 11.0152 4.18797 10.887L2.94497 9.973C2.81943 9.88065 2.72578 9.75148 2.67703 9.60345C2.62829 9.45542 2.62687 9.29588 2.67297 9.147C3.11201 7.73263 3.8659 6.43616 4.87797 5.355C4.98416 5.24149 5.12298 5.16378 5.27526 5.13261C5.42753 5.10144 5.58573 5.11835 5.72797 5.181L7.12797 5.796C7.32699 5.88227 7.54347 5.92066 7.76002 5.90809C7.97657 5.89551 8.18715 5.83232 8.37484 5.7236C8.56254 5.61487 8.72212 5.46363 8.84076 5.28204C8.9594 5.10045 9.0338 4.89356 9.05797 4.678L9.22797 3.152C9.24513 2.99635 9.31058 2.84998 9.41513 2.73341C9.51968 2.61684 9.6581 2.53592 9.81097 2.502C10.527 2.34333 11.2606 2.25933 12.012 2.25ZM12 8.25C10.0516 8.25 8.24997 10.0516 8.24997 12C8.24997 13.9484 10.0516 15.75 12 15.75C13.9484 15.75 15.75 13.9484 15.75 12C15.75 10.0516 13.9484 8.25 12 8.25Z" fill={active ? '#FB4B14' : '#C8C6C4'} />
  </svg>
);

const CaretDown = ({ className = '', style = {} }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <path d="M19 9L12 15L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Routes that live as tabs inside Configuration -> Reward$
const REWARD_TAB_PATHS = [
  '/configuration/rewards',
  '/configuration/rate-audit-log',
  '/financials/promocodes',
  '/growth/referral-settings',
  '/growth/referral-performance',
  '/growth/referral-tracking',
  '/growth/credit-ledger',
  '/growth/bonus-blocks',
  '/growth/bonus-schemes',
];

const isRewardTabRoute = (pathname) =>
  REWARD_TAB_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

// Menu definition matching staging-admin.mito.money (module 34602 & 96972)
const ROUTING_ITEMS = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: IconDashboard,
  },
  {
    title: 'Customers',
    icon: IconUsers,
    subMenu: [
      { title: 'Users', path: '/merchants' },
      { title: 'On Behalf of Customer', path: '/customer/obo-customer' },
    ],
  },
  {
    title: 'Financials',
    icon: IconFinancials,
    subMenu: [
      { title: 'Rate', path: '/financials/rate-threshold' },
      { title: 'Transactions', path: '/financials/transactions' },
      { title: 'MTO Submissions', path: '/financials/mto-submissions' },
      { title: 'Retail Submissions', path: '/financials/retail-transactions' },
      { title: 'Biller Submissions', path: '/financials/biller-transactions' },
      { title: 'Receive Money', path: '/financials/receive-money' },
    ],
  },
  {
    title: 'Support',
    icon: IconSupport,
    subMenu: [
      { title: 'Support overview', path: '/support/dashboard' },
      { title: 'Search payments', path: '/support/transactions' },
      { title: 'Help tickets', path: '/support/help-tickets' },
      { title: 'Notifications', path: '/support/inbox' },
      { title: 'Command Centre', path: '/support/ccc-support' },
    ],
  },
  {
    title: 'Partners',
    icon: IconUsers,
    subMenu: [
      { title: 'Affiliate settings', path: '/merchants' },
      { title: 'Create Affiliate', path: '/merchants/onboard' },
      { title: 'Portal Admins', path: '/configuration/portal-admins' },
    ],
  },
  {
    title: 'Configuration',
    icon: IconConfiguration,
    subMenu: [
      { title: 'Country', path: '/configuration/country' },
      { title: 'Currency', path: '/configuration/currency' },
      { title: 'Website', path: '/configuration/website-configuration' },
      { title: 'Rates Manager', path: '/configuration/rate-manager' },
      { title: 'Email templates', path: '/configuration/email-templates' },
      { title: 'Service Providers', path: '/configuration/providers' },
      { title: 'Service Payers', path: '/configuration/payers' },
      { title: 'Reward$', path: '/configuration/rewards' },
      { title: 'Single Treasury Account', path: '/configuration/single-treasury-account' },
      { title: 'Look Up Data', path: '/configuration/lookup-data' },
    ],
  },
  {
    title: 'MitoView',
    path: '/administration/mitoview',
    icon: IconMitoView,
  },
];

const BOTTOM_NAV_ITEMS = [
  { title: 'Profile', path: '/profile', icon: IconProfile },
  { title: 'Developer', path: '/api-keys', icon: IconDeveloper },
  { title: 'Settings', path: '/settings', icon: IconSettings },
];

const StagingSidebar = ({ isOpen, onClose, collapsed, onToggleCollapse }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  // Single active accordion menu title, matching staging_app.js: const [u, f] = useState("")
  const [currentMenu, setCurrentMenu] = useState('');

  const toggleMenu = (title) => {
    setCurrentMenu((prev) => (prev === title ? '' : title));
  };

  useEffect(() => {
    if (isRewardTabRoute(pathname) || pathname.startsWith('/configuration/rates-manager')) {
      setCurrentMenu('Configuration');
      return;
    }
    if (pathname.startsWith('/admin/on-behalf-of-customer')) {
      setCurrentMenu('Customers');
      return;
    }
    if (pathname === '/financials/debits' || pathname === '/financials/payouts' || pathname === '/financials/commissions') {
      setCurrentMenu('Financials');
      return;
    }
    const activeGroup = ROUTING_ITEMS.find((item) =>
      item.subMenu?.some((sub) => sub.path && (pathname === sub.path || pathname.startsWith(sub.path + '/')))
    );
    if (activeGroup?.title) {
      setCurrentMenu(activeGroup.title);
    }
  }, [pathname]);

  if (collapsed) {
    return null;
  }

  return (
    <nav className={`staging-sidebar ${isOpen ? 'open' : ''}`}>
      <div style={{ height: '100%', background: '#ffffff', display: 'flex', flexDirection: 'column' }}>
        {/* Top Logo + Collapse Icon: flex items-center justify-between px-4 py-3.5 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
          <Link to="/dashboard" onClick={onClose} style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: 6 }}>
            <img
              src={mitoLogo}
              alt="Mito Logo"
              style={{ height: 48, width: 'auto', maxWidth: 170, objectFit: 'contain' }}
            />
          </Link>
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            style={{
              display: 'flex',
              height: 32,
              width: 32,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 16,
              background: '#edebe9',
              border: 'none',
              cursor: 'pointer',
              color: '#323130',
              transition: 'background-color 0.3s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(107, 114, 128, 0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#edebe9')}
          >
            <CaretDown style={{ transform: 'rotate(90deg)' }} />
          </button>
        </div>

        {/* Scrollable Menu + Bottom Pinned Section: relative flex h-[calc(100vh-80px)] flex-col */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <ul style={{ listStyle: 'none', margin: '24px 0 0 0', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {ROUTING_ITEMS.map((item) => {
                const hasSub = item.subMenu && item.subMenu.length > 0;
                const isDirectActive =
                  (item.path === '/dashboard' && (pathname === '/' || pathname === '/dashboard')) ||
                  (item.path && pathname === item.path);
                const isGroupActive =
                  isDirectActive ||
                  Boolean(
                    hasSub &&
                      item.subMenu.some(
                        (s) =>
                          (s.path && (pathname === s.path || pathname.startsWith(s.path + '/'))) ||
                          (s.path === '/customer/obo-customer' && pathname.startsWith('/admin/on-behalf-of-customer')) ||
                          (s.path === '/configuration/rate-manager' && pathname.startsWith('/configuration/rates-manager')) ||
                          (s.path === '/configuration/rewards' && isRewardTabRoute(pathname)) ||
                          (s.path === '/financials/transactions' && pathname === '/financials/debits')
                      )
                  );
                const isHighlighted = !hasSub ? isDirectActive : currentMenu === item.title;
                const IconComponent = item.icon;

                return (
                  <li key={item.title} className="menu nav-item">
                    <button
                      type="button"
                      className={`staging-nav-group-btn ${isHighlighted ? 'active' : ''}`}
                      onClick={() => {
                        if (item.path) {
                          navigate(item.path);
                          setCurrentMenu('');
                          onClose?.();
                        } else {
                          toggleMenu(item.title);
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {IconComponent && <IconComponent active={isGroupActive} />}
                        <span
                          className="staging-nav-label"
                          style={{
                            color: isHighlighted ? '#FB4B14' : '#000000',
                            fontSize: '16px',
                            fontWeight: 700,
                            paddingLeft: 8,
                          }}
                        >
                          {item.title}
                        </span>
                      </div>
                      {hasSub && (
                        <div
                          style={{
                            color: currentMenu === item.title ? '#FB4B14' : '#323130',
                            transform: currentMenu !== item.title ? 'rotate(-90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <CaretDown />
                        </div>
                      )}
                    </button>

                    {hasSub && currentMenu === item.title && (
                      <ul className="staging-sub-menu">
                        {item.subMenu.map((sub) => {
                          const subActive =
                            pathname === sub.path ||
                            (sub.path === '/customer/obo-customer' && pathname.startsWith('/admin/on-behalf-of-customer')) ||
                            (sub.path === '/configuration/rate-manager' && pathname.startsWith('/configuration/rates-manager')) ||
                            (sub.path === '/configuration/rewards' && isRewardTabRoute(pathname)) ||
                            (sub.path === '/financials/transactions' && pathname === '/financials/debits');
                          return (
                            <li key={`${sub.path}-${sub.title}`}>
                              <Link
                                to={sub.path}
                                onClick={onClose}
                                className={`staging-sub-item ${subActive ? 'active' : ''}`}
                              >
                                {sub.title}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Bottom Pinned Items: border-t border-[#edebe9] bg-white p-4 pb-6 pt-4 space-y-1 */}
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: '16px 16px 24px 16px',
              borderTop: '1px solid #edebe9',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              flexShrink: 0,
            }}
          >
            {BOTTOM_NAV_ITEMS.map((item) => {
              const active =
                pathname === item.path ||
                pathname.startsWith(item.path + '/') ||
                (item.path === '/api-keys' && pathname === '/test-checkout');
              const IconComponent = item.icon;
              return (
                <li key={item.title} className="menu nav-item">
                  <Link
                    to={item.path}
                    onClick={onClose}
                    className={`staging-nav-group-btn ${active ? 'active' : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {IconComponent && <IconComponent active={active} />}
                      <span
                        className="staging-nav-label"
                        style={{
                          color: active ? '#FB4B14' : '#000000',
                          fontSize: '16px',
                          fontWeight: 700,
                          paddingLeft: 8,
                        }}
                      >
                        {item.title}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default StagingSidebar;
