import React from 'react';
import { Link } from 'react-router-dom';
import { Info, QrCode } from 'lucide-react';

const TICKET_DATA = {
  eventName: 'BASKETMOUTH - THE LORDS OF THE RIBS | LEEDS',
  orderNumber: '557427',
  venueName: 'The Glee Club Leeds',
  venueAddress: 'The Glee Club Leeds, 123 Albion St, Leeds LS2 8ES, UK',
  eventDate: '12P6 February 2026, 06:45 PM',
  ticketDelivery: 'E-Ticket',

  age: 'Ages 14+',
  shoeType: 'Not Applicable',
  dressCode: 'Not Applicable',
  idRequired: 'Yes',

  eventInstructions: 'All under 25s may require government-issued photo ID to gain entry. Under 16s must carry photo ID and be accompanied by an adult with a ticket to the show at all times.',
  importantInfo: 'All tickets are non-refundable unless the event is cancelled or postponed due to unforeseen circumstances. In case of cancellation or postponement, ticket holders will be notified, and refund or rescheduling options will be provided as per our policy. Ages 14+. All under 25s may require government-issued photo ID to gain entry. Under 16s must carry photo ID and be accompanied by an adult with a ticket to the show at all times.',

  startDate: '12 Feb 2026, 18:45 HRS',
  endDate: '12 Feb 2026, 22:45 HRS',
  gateCloses: '12 Feb 2026, 19:15 HRS',
  calendarDay: '12',
  calendarMonth: 'Feb',

  orderedBy: 'Ehi Ekoma on 08 Feb 2026; 18:39 hrs',
  ticketDescription: 'General Admission - Second Release',
  price: '27.50',
  refundPolicy: 'Non Refundable',
  ticketCode: '73jLGPVPA',
  name: 'Ehi Umeh',
  entrance: 'N/A',
  ticketType: 'General Admission - Second Release',
  allocation: 'General Admission'
};

const TicketDesign = () => {
  const d = TICKET_DATA;

  const labelStyle = {
    fontSize: '0.75rem',
    color: '#6b7280',
    fontWeight: 600,
    marginBottom: 2
  };

  const valueStyle = {
    fontSize: '0.875rem',
    color: '#1f2937',
    fontWeight: 500
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', margin: 0 }}>
          Ticket Design Preview
        </h1>
        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: 4 }}>
          <Link to="/" style={{ color: '#4b5563', textDecoration: 'none' }}>Home</Link>
          {' > '}
          <span style={{ color: '#9ca3af' }}>Configuration</span>
          {' > '}
          <span style={{ color: '#ea580c', fontWeight: 500 }}>Ticket Design</span>
        </div>
      </div>

      {/* Ticket Container */}
      <div className="glass-panel" style={{ maxWidth: 700, margin: '0 auto', overflow: 'hidden', borderRadius: 12 }}>

        {/* ── SECTION 1: HEADER BANNER ── */}
        <div style={{ background: '#4a1a2e', padding: '20px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', color: '#e8a0b8', fontWeight: 600 }}>TicketSir</span>
          </div>
          <h2 style={{
            fontSize: '1.2rem', fontWeight: 700, color: '#fff',
            margin: 0, letterSpacing: '0.5px', lineHeight: 1.3
          }}>
            {d.eventName}
          </h2>
        </div>

        {/* ── SECTION 1b: EVENT DETAILS + QR ── */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1f2937', margin: 0 }}>Event Details</h3>
            <span style={{ fontSize: '0.85rem', color: '#4b5563', fontWeight: 600 }}>Order No {d.orderNumber}</span>
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {/* Details */}
            <div style={{ flex: 1, minWidth: 300 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['Venue Name', d.venueName],
                    ['Venue Address', d.venueAddress],
                    ['Event Date', d.eventDate],
                    ['Ticket Delivery', d.ticketDelivery]
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td style={{ padding: '6px 0', fontSize: '0.8rem', color: '#6b7280', fontWeight: 600, width: 130, verticalAlign: 'top' }}>{label}</td>
                      <td style={{ padding: '6px 0', fontSize: '0.85rem', color: '#1f2937', fontWeight: 400 }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* QR Placeholder */}
            <div style={{
              width: 120, height: 120, flexShrink: 0,
              background: '#f9fafb', border: '2px dashed #d1d5db', borderRadius: 8,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6
            }}>
              <QrCode size={40} color="#d1d5db" />
              <span style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 500 }}>QR CODE</span>
            </div>
          </div>
        </div>

        {/* ── SECTION 2a: EVENT INSTRUCTIONS + IMPORTANT INFO ── */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Event Instructions */}
            <div style={{
              background: '#fff7ed', borderRadius: 8, padding: 16,
              borderLeft: '4px solid #ea580c'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ea580c' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c2410c' }}>Event Instructions</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#4b5563', lineHeight: 1.5 }}>
                <div><strong>Age:</strong> {d.age}. {d.eventInstructions}</div>
                <div style={{ marginTop: 4 }}><strong>Dress code:</strong> Not Applicable</div>
                <div><strong>ID required:</strong> YES</div>
                <div><strong>Hat Accepted:</strong> No</div>
                <div><strong>Shoe Type:</strong> Not Applicable</div>
              </div>
            </div>

            {/* Important Information */}
            <div style={{
              background: '#eff6ff', borderRadius: 8, padding: 16,
              borderLeft: '4px solid #3b82f6'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1d4ed8' }}>Important Information</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#4b5563', lineHeight: 1.5 }}>
                {d.importantInfo}
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 2b: INSTRUCTIONS ROW (Clean version) ── */}
        <div style={{
          borderBottom: '1px solid #e5e7eb',
          padding: '4px 28px'
        }}>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, padding: '12px 0 8px', fontWeight: 600 }}>
            INSTRUCTIONS
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0
          }}>
            {[
              { label: 'Age', value: d.age, hasIcon: true },
              { label: 'Shoe Type', value: d.shoeType },
              { label: 'Dress code', value: d.dressCode },
              { label: 'ID required', value: d.idRequired }
            ].map((item, i) => (
              <div key={i} style={{
                padding: '12px 16px 16px',
                borderRight: i < 3 ? '1px solid #f3f4f6' : 'none'
              }}>
                <div style={{
                  fontSize: '0.7rem', color: '#9ca3af', marginBottom: 6,
                  display: 'flex', alignItems: 'center', gap: 4
                }}>
                  {item.label}:
                  {item.hasIcon && <Info size={12} color="#9ca3af" />}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#1f2937', fontWeight: 600 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION 3: DATES ── */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', background: '#fff9f5', borderRadius: 12, padding: 20 }}>
            {/* Calendar Block */}
            <div style={{
              width: 100, minHeight: 100, flexShrink: 0,
              background: '#ffffff',
              borderRadius: 12,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '20px 16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: '1px solid #f3f4f6'
            }}>
              <div style={{ fontSize: '2.8rem', fontWeight: 700, color: '#1f2937', lineHeight: 1 }}>
                {d.calendarDay}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#6b7280', marginTop: 4 }}>
                {d.calendarMonth}
              </div>
            </div>

            {/* Date Rows */}
            <div style={{ flex: 1 }}>
              {[
                { label: 'Start Date', value: d.startDate },
                { label: 'End Date', value: d.endDate },
                { label: 'Gate Closes', value: d.gateCloses }
              ].map((row, i) => (
                <div key={i} style={{
                  padding: '12px 0',
                  borderBottom: i < 2 ? '1px dashed #e5d5c5' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.85rem', color: '#4b5563', fontWeight: 500 }}>{row.label}</span>
                  <span style={{ fontSize: '0.9rem', color: '#c0392b', fontWeight: 700 }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── SECTION 4: ORDER / TICKET INFO ── */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 12 }}>
            Ordered by <strong style={{ color: '#1f2937' }}>{d.orderedBy}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <div style={{ ...labelStyle }}>Ticket Description</div>
              <div style={{ ...valueStyle }}>{d.ticketDescription}</div>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 2 }}>
                Price is inclusive of booking fees and venue facility fee. Non-refundable.
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: '#ea580c', fontWeight: 600 }}>price</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1f2937' }}>{d.price}</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1f2937' }}>Refund policy: </span>
              <span style={{ fontSize: '0.8rem', color: '#c0392b', fontWeight: 600 }}>{d.refundPolicy}</span>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700, color: '#6b7280' }}>
              {d.ticketCode}
            </div>
          </div>
        </div>

        {/* ── SECTION 4b: ATTENDEE INFO ── */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #e5e7eb' }}>
          {[
            { label: 'Name', value: d.name },
            { label: 'Entrance', value: d.entrance },
            { label: 'Ticket Type', value: d.ticketType },
            { label: 'Allocation', value: d.allocation }
          ].map((item, i) => (
            <div key={i} style={{
              padding: '8px 0',
              borderBottom: i < 3 ? '1px solid #f3f4f6' : 'none'
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1f2937' }}>{item.label}: </span>
              <span style={{ fontSize: '0.85rem', color: '#4b5563' }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* ── SECTION 5: FOOTER ── */}
        <div style={{
          background: '#4a1a2e', padding: '16px 28px', textAlign: 'center'
        }}>
          <div style={{
            color: '#e8a0b8', fontWeight: 700, fontSize: '0.85rem',
            letterSpacing: '2px', textTransform: 'uppercase'
          }}>
            THANK YOU FOR CHOOSING TICKETSIR
          </div>
        </div>

        <div style={{ padding: '16px 28px', textAlign: 'left' }}>
          <p style={{ fontSize: '0.7rem', color: '#9ca3af', lineHeight: 1.6, margin: '0 0 6px' }}>
            Please keep your tickets safe at all times. Ensure the QR Code area is dry and not ruffled at all times.
          </p>
          <p style={{ fontSize: '0.7rem', color: '#9ca3af', lineHeight: 1.6, margin: '0 0 6px' }}>
            The QR Code allows one entry per scan. Unauthorised duplication of this ticket may prevent your attendance to the event. Unlawful resale (or attempted) is grounds for seizure or cancellation. Subsequent scans (whether of the original or copies) will be denied entry.
          </p>
          <p style={{ fontSize: '0.7rem', color: '#9ca3af', lineHeight: 1.6, margin: 0 }}>
            Terms and Conditions apply. To see the full terms and conditions please visit <span style={{ color: '#3b82f6', textDecoration: 'underline' }}>www.ticketsir.com</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TicketDesign;
