export const SUPPORT_HEADING_FONT_FAMILY = "'Inter', system-ui, -apple-system, sans-serif";

export const supportPageTitleStyle = {
    fontFamily: SUPPORT_HEADING_FONT_FAMILY,
    fontSize: '1.5rem',
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
    color: '#1f2937',
    margin: '0 0 4px'
};

export const supportSectionTitleStyle = {
    fontFamily: SUPPORT_HEADING_FONT_FAMILY,
    fontSize: '1.1rem',
    fontWeight: 700,
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
    color: '#1f2937',
    margin: 0
};

export const supportModalTitleStyle = {
    ...supportPageTitleStyle,
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 32
};

export const supportMinorTitleStyle = {
    fontFamily: SUPPORT_HEADING_FONT_FAMILY,
    fontSize: '1rem',
    fontWeight: 700,
    lineHeight: 1.35,
    letterSpacing: '-0.01em',
    color: '#1f2937',
    margin: 0
};

export const supportEmptyStateTitleStyle = {
    ...supportSectionTitleStyle,
    fontSize: '1.25rem',
    justifyContent: 'center'
};
