import { useCallback, useEffect, useRef, useState } from 'react';

// Lightweight toast stack used by the Growth pages (replaces window.alert)
export const useToasts = () => {
    const [toasts, setToasts] = useState([]);
    const timers = useRef([]);
    useEffect(() => () => timers.current.forEach(clearTimeout), []);
    const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
    const push = useCallback((message, tone = 'success') => {
        const id = Date.now() + Math.random();
        setToasts((t) => [...t, { id, message, tone }]);
        timers.current.push(setTimeout(() => dismiss(id), 4500));
    }, [dismiss]);
    return { toasts, push, dismiss };
};

