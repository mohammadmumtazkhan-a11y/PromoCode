import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ReceiveMoneyPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const requests = [
    { id: 'REQ-8021', date: '27 Oct 2026 15:10', sender: 'Kwame Mensah', receiver: 'Adwoa Boateng', sendCurr: 'GBP', recvCurr: 'GHS', amount: '120.00', fee: '2.50', promoCode: 'RECEIVE5', discount: '£1.50', status: 'COMPLETED' },
    { id: 'REQ-8020', date: '27 Oct 2026 14:05', sender: 'John Davies', receiver: 'Chinedu Eze', sendCurr: 'EUR', recvCurr: 'NGN', amount: '350.00', fee: '4.00', promoCode: 'WELCOME10', discount: '€2.00', status: 'COMPLETED' },
    { id: 'REQ-8019', date: '27 Oct 2026 11:30', sender: 'Amina Bello', receiver: 'Hassan Bello', sendCurr: 'GBP', recvCurr: 'KES', amount: '80.00', fee: '1.80', promoCode: '', discount: '-', status: 'PENDING' },
    { id: 'REQ-8018', date: '26 Oct 2026 19:40', sender: 'Lucy Kamau', receiver: 'Peter Kamau', sendCurr: 'USD', recvCurr: 'KES', amount: '200.00', fee: '3.50', promoCode: 'RHEMITO20', discount: '$3.50', status: 'COMPLETED' },
    { id: 'REQ-8017', date: '26 Oct 2026 16:15', sender: 'Samuel Osei', receiver: 'Abena Osei', sendCurr: 'GBP', recvCurr: 'GHS', amount: '150.00', fee: '3.00', promoCode: '', discount: '-', status: 'EXPIRED' },
  ];

  const filtered = requests.filter(r => {
    const matchesSearch = r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.receiver.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.promoCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div className="staging-breadcrumb">
        <Link to="/dashboard">Home</Link>
        <span>/</span>
        <Link to="/financials/debits">Financials</Link>
        <span>/</span>
        <span style={{ fontWeight: 600, color: '#323130' }}>Receive Money</span>
      </div>

      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#323130' }}>
              Receive Money Requests &amp; Redemptions
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#605e5c', fontSize: '0.875rem' }}>
              Monitor customer payment requests, applied promo codes, and remittance settlements.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search by ID, sender, recipient, code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                border: '1px solid #edebe9',
                fontSize: '0.875rem',
                minWidth: 260,
                outline: 'none'
              }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                border: '1px solid #edebe9',
                fontSize: '0.875rem',
                background: '#ffffff',
                outline: 'none'
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #edebe9', borderRadius: 8 }}>
          <table className="table-container">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Date</th>
                <th>Sender (Payer)</th>
                <th>Receiver (Creator)</th>
                <th>Corridor</th>
                <th>Amount</th>
                <th>Promo Code</th>
                <th>Discount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, color: '#323130' }}>{r.id}</td>
                  <td style={{ fontSize: '0.8rem', color: '#605e5c' }}>{r.date}</td>
                  <td>{r.sender}</td>
                  <td style={{ fontWeight: 500 }}>{r.receiver}</td>
                  <td>
                    <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#323130' }}>
                      {r.sendCurr} &rarr; {r.recvCurr}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: '#323130' }}>{r.sendCurr} {r.amount}</td>
                  <td>
                    {r.promoCode ? (
                      <span style={{
                        background: '#ffede7',
                        color: '#FB4B14',
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        fontFamily: 'monospace'
                      }}>
                        {r.promoCode}
                      </span>
                    ) : (
                      <span style={{ color: '#a19f9d' }}>-</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 600, color: r.discount !== '-' ? '#166534' : '#605e5c' }}>
                    {r.discount}
                  </td>
                  <td>
                    <span className={`badge ${r.status === 'COMPLETED' ? 'badge-active' : r.status === 'PENDING' ? 'badge-pending' : 'badge-inactive'}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReceiveMoneyPage;
