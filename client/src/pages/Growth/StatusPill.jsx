import React from 'react';
import { STATUS_META } from './referralUtils';
import statusGreen from '../../assets/figma-referrals/status-green.svg';
import statusGrey from '../../assets/figma-referrals/status-grey.svg';
import statusBlue from '../../assets/figma-referrals/status-blue.svg';
import statusRed from '../../assets/figma-referrals/status-red.svg';

const TONE_ICONS = {
    green: statusGreen,
    grey: statusGrey,
    blue: statusBlue,
    red: statusRed,
    amber: statusGrey,
};

export const StatusPill = ({ status, title }) => {
    const meta = STATUS_META[status] || { label: status, tone: 'grey' };
    const icon = TONE_ICONS[meta.tone] || statusGrey;
    return (
        <span className={`rf-pill rf-pill-${meta.tone}`} title={title || undefined}>
            <img src={icon} alt="" className="rf-status-dot-icon" aria-hidden="true" />
            <span>{meta.label}</span>
        </span>
    );
};

export default StatusPill;
