// The admin's access token for actions limited to a role (for example Growth Manager approvals).
// It lives in sessionStorage so it is forgotten when the tab closes. The server decides the person's name and role from it.
const KEY = 'mito_admin_token';

export const getAdminToken = () => {
    try { return window.sessionStorage.getItem(KEY) || ''; } catch { return ''; }
};

export const setAdminToken = (token) => {
    try {
        if (token) window.sessionStorage.setItem(KEY, token.trim());
        else window.sessionStorage.removeItem(KEY);
    } catch { /* storage unavailable: the token is simply not remembered */ }
};

export const adminHeaders = (extra = {}) => {
    const token = getAdminToken();
    return { ...extra, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};
