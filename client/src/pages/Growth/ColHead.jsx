import React, { useRef, useState } from 'react';
import infoGrey from '../../assets/figma-referrals/info-grey.svg';

const TIP_WIDTH = 260;

// A label with a plain-English help tooltip (mouse hover or keyboard focus).
// The tooltip is positioned against the viewport so a scrolling table or card never clips it.
export const ColHead = ({ label, tip, showIcon = false }) => {
    const ref = useRef(null);
    const [pos, setPos] = useState(null);
    const open = () => {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const left = Math.max(8, Math.min(r.left, window.innerWidth - TIP_WIDTH - 8));
        setPos({ top: r.bottom + 8, left });
    };
    const close = () => setPos(null);
    return (
        <span ref={ref} className="rf-th" tabIndex={0} aria-label={`${label}. ${tip}`}
            onMouseEnter={open} onMouseLeave={close} onFocus={open} onBlur={close}>
            <span>{label}</span>
            {showIcon && <img src={infoGrey} alt="" className="rf-colhead-icon" aria-hidden="true" />}
            <span className={`rf-tip${pos ? ' show' : ''}`} style={pos || undefined} role="tooltip">{tip}</span>
        </span>
    );
};

export default ColHead;
