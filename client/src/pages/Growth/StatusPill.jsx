import React from 'react';
import { STATUS_META } from './referralUtils';

export const StatusPill = ({ status, title }) => {
    const meta = STATUS_META[status] || { label: status, tone: 'grey' };
    return <span className={`rf-pill rf-pill-${meta.tone}`} title={title || undefined}>{meta.label}</span>;
};

export default StatusPill;
