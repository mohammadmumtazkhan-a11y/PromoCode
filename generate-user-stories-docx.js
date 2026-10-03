const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak, TabStopType, TabStopPosition
} = require("docx");

// ── Colour palette ──
const C = {
  navy: "0F1B2D",
  orange: "EA580C",
  orangeLight: "FFF7ED",
  purple: "5B21B6",
  green: "166534",
  greenLight: "F0FDF4",
  greenBorder: "86EFAC",
  red: "991B1B",
  redLight: "FEF2F2",
  blue: "1D4ED8",
  blueLight: "EFF6FF",
  amber: "92400E",
  amberLight: "FEF3C7",
  grey: "6B7280",
  greyLight: "F3F4F6",
  greyBorder: "D1D5DB",
  white: "FFFFFF",
  black: "1F2937",
  headerBg: "E2E8F0",
  codeBg: "F8FAFC",
};

// ── Reusable borders ──
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: C.greyBorder };
const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const noBorder = { style: BorderStyle.NONE, size: 0 };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

// ── Table widths (A4 with 1" margins = 9026 DXA) ──
const PAGE_W = 9026;

// ── Helper: empty paragraph spacer ──
function spacer(pts = 120) {
  return new Paragraph({ spacing: { after: pts }, children: [] });
}

// ── Helper: simple paragraph ──
function para(text, opts = {}) {
  const { bold, size, color, font, spacing, alignment, italics } = opts;
  return new Paragraph({
    alignment: alignment || AlignmentType.LEFT,
    spacing: spacing || { after: 80 },
    children: [
      new TextRun({
        text,
        bold: bold || false,
        italics: italics || false,
        size: size || 22,
        color: color || C.black,
        font: font || "Arial",
      }),
    ],
  });
}

// ── Helper: multi-run paragraph ──
function multiPara(runs, opts = {}) {
  return new Paragraph({
    alignment: opts.alignment || AlignmentType.LEFT,
    spacing: opts.spacing || { after: 80 },
    children: runs.map(r => new TextRun({
      text: r.text,
      bold: r.bold || false,
      italics: r.italics || false,
      size: r.size || 22,
      color: r.color || C.black,
      font: r.font || "Arial",
    })),
  });
}

// ── Helper: Gherkin code block line ──
function gherkinLine(keyword, rest, indent = 0) {
  const pad = "    ".repeat(indent);
  return new Paragraph({
    spacing: { after: 20, before: 0 },
    indent: { left: 360 },
    shading: { fill: C.codeBg, type: ShadingType.CLEAR },
    children: [
      new TextRun({ text: pad, font: "Consolas", size: 19, color: C.grey }),
      new TextRun({ text: keyword, font: "Consolas", size: 19, color: C.purple, bold: true }),
      new TextRun({ text: rest ? " " + rest : "", font: "Consolas", size: 19, color: C.black }),
    ],
  });
}

// ── Helper: plain code line (for table rows inside gherkin) ──
function codeLine(text, indent = 0) {
  const pad = "    ".repeat(indent);
  return new Paragraph({
    spacing: { after: 20, before: 0 },
    indent: { left: 360 },
    shading: { fill: C.codeBg, type: ShadingType.CLEAR },
    children: [
      new TextRun({ text: pad + text, font: "Consolas", size: 19, color: C.black }),
    ],
  });
}

// ── Helper: AC title ──
function acTitle(id, title) {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [
      new TextRun({ text: id + ": ", bold: true, size: 22, color: C.orange, font: "Arial" }),
      new TextRun({ text: title, bold: true, size: 22, color: C.black, font: "Arial" }),
    ],
  });
}

// ── Helper: User Story block ──
function userStoryBlock(id, title, asA, iWant, soThat) {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 300, after: 120 },
      children: [new TextRun({ text: `${id}: ${title}`, bold: true, size: 24, color: C.navy, font: "Arial" })],
    }),
    // Story card-style box using a table
    new Table({
      width: { size: PAGE_W, type: WidthType.DXA },
      columnWidths: [PAGE_W],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: { top: { style: BorderStyle.SINGLE, size: 3, color: C.orange }, bottom: thinBorder, left: thinBorder, right: thinBorder },
              shading: { fill: C.orangeLight, type: ShadingType.CLEAR },
              margins: { top: 120, bottom: 120, left: 200, right: 200 },
              width: { size: PAGE_W, type: WidthType.DXA },
              children: [
                multiPara([
                  { text: "As a ", bold: true, color: C.orange },
                  { text: asA },
                ], { spacing: { after: 60 } }),
                multiPara([
                  { text: "I want ", bold: true, color: C.orange },
                  { text: iWant },
                ], { spacing: { after: 60 } }),
                multiPara([
                  { text: "So that ", bold: true, color: C.orange },
                  { text: soThat },
                ], { spacing: { after: 0 } }),
              ],
            }),
          ],
        }),
      ],
    }),
    spacer(80),
    para("Acceptance Criteria", { bold: true, size: 24, color: C.navy, spacing: { before: 160, after: 80 } }),
  ];
}

// ── Helper: simple data table ──
function dataTable(headers, rows, colWidths) {
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      new TableCell({
        borders,
        width: { size: colWidths[i], type: WidthType.DXA },
        shading: { fill: C.headerBg, type: ShadingType.CLEAR },
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, font: "Arial", color: C.black })] })],
      })
    ),
  });
  const dataRows = rows.map(row =>
    new TableRow({
      children: row.map((cell, i) =>
        new TableCell({
          borders,
          width: { size: colWidths[i], type: WidthType.DXA },
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: [new Paragraph({ children: [new TextRun({ text: cell, size: 20, font: "Arial", color: C.black })] })],
        })
      ),
    })
  );
  return new Table({
    width: { size: totalW, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows],
  });
}

// ── Helper: Gherkin AC block ──
function gherkinAC(lines) {
  // lines is array of { kw, text, indent } or { raw, indent }
  const paras = [];
  // top border
  paras.push(new Paragraph({
    spacing: { after: 0 },
    indent: { left: 360 },
    shading: { fill: C.codeBg, type: ShadingType.CLEAR },
    border: { top: { style: BorderStyle.SINGLE, size: 1, color: C.greyBorder } },
    children: [],
  }));
  for (const l of lines) {
    if (l.raw) {
      paras.push(codeLine(l.raw, l.indent || 0));
    } else {
      paras.push(gherkinLine(l.kw, l.text, l.indent || 0));
    }
  }
  // bottom spacer
  paras.push(spacer(40));
  return paras;
}

// ════════════════════════════════════════════
//  BUILD DOCUMENT
// ════════════════════════════════════════════

const children = [];

// ── TITLE PAGE ──
children.push(spacer(600));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 200 },
  children: [new TextRun({ text: "Customer Support Portal", bold: true, size: 56, color: C.navy, font: "Arial" })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 120 },
  children: [new TextRun({ text: "User Stories & Acceptance Criteria", bold: true, size: 36, color: C.orange, font: "Arial" })],
}));
children.push(spacer(200));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 60 },
  children: [new TextRun({ text: "MITO Money Transfer", size: 24, color: C.grey, font: "Arial" })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 60 },
  children: [new TextRun({ text: "Version 1.0  |  March 2026", size: 22, color: C.grey, font: "Arial" })],
}));
children.push(spacer(300));

// Summary table
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 200 },
  children: [new TextRun({ text: "Document Summary", bold: true, size: 26, color: C.navy, font: "Arial" })],
}));
const summaryColWidths = [3400, 5626];
children.push(dataTable(
  ["Item", "Count"],
  [
    ["Epics", "8"],
    ["User Stories", "20"],
    ["Acceptance Criteria", "70+"],
  ],
  summaryColWidths
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ── TABLE OF CONTENTS placeholder ──
children.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 0, after: 200 },
  children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, color: C.navy, font: "Arial" })],
}));

const tocEntries = [
  { level: 0, text: "Epic 1: Support Agent Authentication", page: "" },
  { level: 1, text: "US-1.1: Support Agent Login with Email and Password", page: "" },
  { level: 1, text: "US-1.2: Support Agent Logout and Session Termination", page: "" },
  { level: 1, text: "US-1.3: Restrict Unauthorised Access to Support Portal Pages", page: "" },
  { level: 0, text: "Epic 2: Navigation & Sidebar", page: "" },
  { level: 1, text: "US-2.1: Navigate Between Support Portal Pages via Sidebar", page: "" },
  { level: 0, text: "Epic 3: Dashboard & Operational Overview", page: "" },
  { level: 1, text: "US-3.1: View Transaction Key Performance Indicators on Dashboard", page: "" },
  { level: 1, text: "US-3.2: View Help Ticket Status Distribution on Dashboard", page: "" },
  { level: 1, text: "US-3.3: Receive Escalation Alerts for High Failure Rates", page: "" },
  { level: 0, text: "Epic 4: Transaction Search", page: "" },
  { level: 1, text: "US-4.1: Search Transactions by Reference or Email", page: "" },
  { level: 1, text: "US-4.2: Filter Transaction Search Results by Date Range and Status", page: "" },
  { level: 1, text: "US-4.3: View Transaction Details from Search Results", page: "" },
  { level: 0, text: "Epic 5: Transaction Details", page: "" },
  { level: 1, text: "US-5.1: View Complete Transaction Information", page: "" },
  { level: 1, text: "US-5.2: View Transaction Audit Trail Timeline", page: "" },
  { level: 1, text: "US-5.3: View KYC Verification Status for a Transaction", page: "" },
  { level: 1, text: "US-5.4: Add and View Agent Comments on a Transaction", page: "" },
  { level: 1, text: "US-5.5: View and Create Help Tickets Linked to a Transaction", page: "" },
  { level: 1, text: "US-5.6: Switch Between Transaction Detail Tabs", page: "" },
  { level: 0, text: "Epic 6: Help Tickets Management", page: "" },
  { level: 1, text: "US-6.1: View and Browse Help Tickets by Status Category", page: "" },
  { level: 1, text: "US-6.2: Search and Filter Help Tickets", page: "" },
  { level: 1, text: "US-6.3: View Complete Help Ticket Information and Conversation Thread", page: "" },
  { level: 1, text: "US-6.4: Reply to a Customer Help Ticket", page: "" },
  { level: 1, text: "US-6.5: Change the Status of a Help Ticket", page: "" },
  { level: 1, text: "US-6.6: Create a New Help Ticket on Behalf of a Customer", page: "" },
  { level: 0, text: "Epic 7: Exchange Rates & Corridors", page: "" },
  { level: 1, text: "US-7.1: View Exchange Rate Corridors in Read-Only Mode", page: "" },
  { level: 1, text: "US-7.2: Filter Exchange Rate Corridors", page: "" },
  { level: 1, text: "US-7.3: Export Filtered Exchange Rate Corridors as CSV or PDF", page: "" },
  { level: 0, text: "Epic 8: Change Password", page: "" },
  { level: 1, text: "US-8.1: Change Support Agent Account Password", page: "" },
  { level: 0, text: "Appendix: Status Transition Diagram", page: "" },
  { level: 0, text: "Appendix: PII Masking Rules", page: "" },
];

for (const entry of tocEntries) {
  children.push(new Paragraph({
    spacing: { after: 40 },
    indent: { left: entry.level * 400 },
    children: [
      new TextRun({
        text: entry.text,
        size: entry.level === 0 ? 22 : 20,
        bold: entry.level === 0,
        color: entry.level === 0 ? C.navy : C.black,
        font: "Arial",
      }),
    ],
  }));
}

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// EPIC 1: SUPPORT AGENT AUTHENTICATION
// ══════════════════════════════════════════════════════════════
children.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 0, after: 200 },
  children: [new TextRun({ text: "Epic 1: Support Agent Authentication", bold: true, size: 32, color: C.navy, font: "Arial" })],
}));

// ── US-1.1 ──
children.push(...userStoryBlock(
  "US-1.1",
  "Support Agent Login with Email and Password",
  "support agent,",
  "to log in to the Customer Support Portal using my email address and password,",
  "I can securely access the support tools and begin assisting customers."
));

// AC-1.1.1
children.push(acTitle("AC-1.1.1", "Successful login with valid credentials"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Support Login page" },
  { kw: "When", text: "the agent enters a valid registered email address in the \"Email Address\" field" },
  { kw: "And", text: "the agent enters the correct password in the \"Password\" field" },
  { kw: "And", text: "the agent clicks the \"Sign In\" button" },
  { kw: "Then", text: "the system shall authenticate the agent" },
  { kw: "And", text: "the system shall redirect the agent to the Support Dashboard" },
  { kw: "And", text: "the system shall store the agent session in session storage" },
]));

// AC-1.1.2
children.push(acTitle("AC-1.1.2", "Login button loading state"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent has entered valid credentials" },
  { kw: "When", text: "the agent clicks the \"Sign In\" button" },
  { kw: "Then", text: "the button text shall change to \"Signing in...\"" },
  { kw: "And", text: "the button shall be disabled to prevent duplicate submissions" },
  { kw: "And", text: "the system shall display the loading state until authentication completes" },
]));

// AC-1.1.3
children.push(acTitle("AC-1.1.3", "Login failure with invalid email"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Support Login page" },
  { kw: "When", text: "the agent enters an unregistered email address in the \"Email Address\" field" },
  { kw: "And", text: "the agent enters any password in the \"Password\" field" },
  { kw: "And", text: "the agent clicks the \"Sign In\" button" },
  { kw: "Then", text: "the system shall display an error message indicating invalid credentials" },
  { kw: "And", text: "the agent shall remain on the Login page" },
  { kw: "And", text: "the password field shall be cleared" },
]));

// AC-1.1.4
children.push(acTitle("AC-1.1.4", "Login failure with incorrect password"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Support Login page" },
  { kw: "When", text: "the agent enters a valid registered email address in the \"Email Address\" field" },
  { kw: "And", text: "the agent enters an incorrect password in the \"Password\" field" },
  { kw: "And", text: "the agent clicks the \"Sign In\" button" },
  { kw: "Then", text: "the system shall display an error message indicating invalid credentials" },
  { kw: "And", text: "the agent shall remain on the Login page" },
  { kw: "And", text: "the password field shall be cleared" },
]));

// AC-1.1.5
children.push(acTitle("AC-1.1.5", "Email field validation"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Support Login page" },
  { kw: "When", text: "the agent enters a value that is not a valid email format (e.g. missing \"@\" or domain)" },
  { kw: "And", text: "the agent clicks the \"Sign In\" button" },
  { kw: "Then", text: "the system shall display a validation error for the email field" },
  { kw: "And", text: "the form shall not be submitted" },
]));

// AC-1.1.6
children.push(acTitle("AC-1.1.6", "Required fields validation"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Support Login page" },
  { kw: "When", text: "the agent leaves the \"Email Address\" field empty" },
  { kw: "Or", text: "the agent leaves the \"Password\" field empty" },
  { kw: "And", text: "the agent clicks the \"Sign In\" button" },
  { kw: "Then", text: "the system shall display a validation error indicating the required fields" },
  { kw: "And", text: "the form shall not be submitted" },
]));

// AC-1.1.7
children.push(acTitle("AC-1.1.7", "Both fields empty submission"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Support Login page" },
  { kw: "When", text: "the agent clicks the \"Sign In\" button without entering any credentials" },
  { kw: "Then", text: "the system shall display validation errors for both the \"Email Address\" and \"Password\" fields" },
  { kw: "And", text: "the form shall not be submitted" },
]));

// ── US-1.2 ──
children.push(...userStoryBlock(
  "US-1.2",
  "Support Agent Logout and Session Termination",
  "support agent,",
  "to log out of the Customer Support Portal,",
  "my session is securely terminated and no unauthorised user can access the portal from my device."
));

children.push(acTitle("AC-1.2.1", "Successful logout"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is logged in and viewing any page in the Support Portal" },
  { kw: "When", text: "the agent clicks the \"Logout\" button in the sidebar footer" },
  { kw: "Then", text: "the system shall clear the agent session from session storage" },
  { kw: "And", text: "the system shall redirect the agent to the Support Login page" },
]));

children.push(acTitle("AC-1.2.2", "Accessing protected pages after logout"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent has logged out of the portal" },
  { kw: "When", text: "the agent attempts to navigate to any protected page (e.g. /support/, /support/transactions)" },
  { kw: "Then", text: "the system shall redirect the agent to the Support Login page" },
  { kw: "And", text: "no support portal content shall be displayed" },
]));

// ── US-1.3 ──
children.push(...userStoryBlock(
  "US-1.3",
  "Restrict Unauthorised Access to Support Portal Pages",
  "system administrator,",
  "all Support Portal pages (except Login) to be accessible only to authenticated agents,",
  "unauthorised users cannot view sensitive customer or transaction data."
));

children.push(acTitle("AC-1.3.1", "Unauthenticated access to protected routes"));
children.push(...gherkinAC([
  { kw: "Given", text: "a user is not authenticated (no valid session exists)" },
  { kw: "When", text: "the user attempts to navigate to any protected Support Portal route" },
  { kw: "Then", text: "the system shall redirect the user to the Support Login page" },
  { kw: "And", text: "no protected content shall be rendered" },
]));

children.push(acTitle("AC-1.3.2", "Authenticated access to protected routes"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is authenticated with a valid session" },
  { kw: "When", text: "the agent navigates to any Support Portal route" },
  { kw: "Then", text: "the system shall render the requested page with full content" },
  { kw: "And", text: "the sidebar navigation shall be visible" },
]));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// EPIC 2: NAVIGATION & SIDEBAR
// ══════════════════════════════════════════════════════════════
children.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 0, after: 200 },
  children: [new TextRun({ text: "Epic 2: Navigation & Sidebar", bold: true, size: 32, color: C.navy, font: "Arial" })],
}));

children.push(...userStoryBlock(
  "US-2.1",
  "Navigate Between Support Portal Pages via Sidebar",
  "support agent,",
  "to navigate between all sections of the Support Portal using a persistent sidebar,",
  "I can quickly access any tool I need without losing my place."
));

children.push(acTitle("AC-2.1.1", "Sidebar displays all navigation links"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is logged in to the Support Portal" },
  { kw: "When", text: "any page is loaded" },
  { kw: "Then", text: "the sidebar shall display the following navigation links:" },
  { raw: "  | Link               | Icon          |", indent: 1 },
  { raw: "  | Dashboard Home      | chart icon    |", indent: 1 },
  { raw: "  | Transaction Search  | search icon   |", indent: 1 },
  { raw: "  | Help Tickets        | ticket icon   |", indent: 1 },
  { raw: "  | Rates               | currency icon |", indent: 1 },
  { kw: "And", text: "each link shall navigate to its corresponding page when clicked" },
]));

children.push(acTitle("AC-2.1.2", "Active page highlighting"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing a page in the Support Portal" },
  { kw: "When", text: "the sidebar is rendered" },
  { kw: "Then", text: "the navigation link corresponding to the current page shall be visually highlighted" },
  { kw: "And", text: "all other links shall appear in their default inactive style" },
]));

children.push(acTitle("AC-2.1.3", "Sidebar footer displays agent profile"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is logged in" },
  { kw: "When", text: "the sidebar is rendered" },
  { kw: "Then", text: "the sidebar footer shall display the agent's initials in an avatar circle" },
  { kw: "And", text: "the agent's full name shall be displayed" },
  { kw: "And", text: "the agent's role shall be displayed" },
  { kw: "And", text: "a \"Logout\" button shall be visible" },
  { kw: "And", text: "a \"Change Password\" link shall be visible" },
]));

children.push(acTitle("AC-2.1.4", "Sidebar branding"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is logged in" },
  { kw: "When", text: "the sidebar is rendered" },
  { kw: "Then", text: "the sidebar header shall display the MITO logo" },
  { kw: "And", text: "the text \"Support Portal\" shall be displayed beneath the logo" },
]));

children.push(acTitle("AC-2.1.5", "Mobile responsive sidebar toggle"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is accessing the portal on a mobile device or narrow screen" },
  { kw: "When", text: "the page is loaded" },
  { kw: "Then", text: "a hamburger menu button shall be displayed" },
  { kw: "When", text: "the agent clicks the hamburger menu button" },
  { kw: "Then", text: "the sidebar shall expand and become visible" },
  { kw: "When", text: "the agent clicks the hamburger menu button again or navigates to a page" },
  { kw: "Then", text: "the sidebar shall collapse and be hidden" },
]));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// EPIC 3: DASHBOARD & OPERATIONAL OVERVIEW
// ══════════════════════════════════════════════════════════════
children.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 0, after: 200 },
  children: [new TextRun({ text: "Epic 3: Dashboard & Operational Overview", bold: true, size: 32, color: C.navy, font: "Arial" })],
}));

// ── US-3.1 ──
children.push(...userStoryBlock(
  "US-3.1",
  "View Transaction Key Performance Indicators on Dashboard",
  "support agent,",
  "to view key transaction performance indicators on the Dashboard,",
  "I can quickly assess the operational health of the money transfer service."
));

children.push(acTitle("AC-3.1.1", "KPI cards display on dashboard load"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is logged in" },
  { kw: "When", text: "the agent navigates to the Support Dashboard" },
  { kw: "Then", text: "the system shall display four KPI cards:" },
  { raw: "  | Card               | Colour |", indent: 1 },
  { raw: "  | Total Transactions | Blue   |", indent: 1 },
  { raw: "  | Successful         | Green  |", indent: 1 },
  { raw: "  | Failed             | Red    |", indent: 1 },
  { raw: "  | In Progress        | Amber  |", indent: 1 },
  { kw: "And", text: "each card shall display the corresponding count for the selected time period" },
]));

children.push(acTitle("AC-3.1.2", "Time period filter for KPIs"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Support Dashboard" },
  { kw: "When", text: "the agent selects a time period filter button" },
  { kw: "Then", text: "the following options shall be available: \"Day\", \"Week\", \"Month\", \"Year\"" },
  { kw: "And", text: "when a period is selected, the KPI card values shall update to reflect data for that period" },
  { kw: "And", text: "the selected period button shall be visually highlighted" },
]));

children.push(acTitle("AC-3.1.3", "Default time period on load"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent navigates to the Support Dashboard" },
  { kw: "When", text: "the page loads for the first time" },
  { kw: "Then", text: "the default time period filter shall be \"Day\"" },
  { kw: "And", text: "the KPI cards shall display data for the current day" },
]));

// ── US-3.2 ──
children.push(...userStoryBlock(
  "US-3.2",
  "View Help Ticket Status Distribution on Dashboard",
  "support agent,",
  "to see a visual breakdown of help ticket statuses on the Dashboard,",
  "I can quickly understand the current workload and prioritise my efforts."
));

children.push(acTitle("AC-3.2.1", "Donut chart displays ticket distribution"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Support Dashboard" },
  { kw: "When", text: "the Help Tickets section is rendered" },
  { kw: "Then", text: "a donut chart shall be displayed showing the distribution of tickets by status" },
  { kw: "And", text: "the chart shall include the following status categories with their respective colours:" },
  { raw: "  | Status   | Colour |", indent: 1 },
  { raw: "  | Resolved | Green  |", indent: 1 },
  { raw: "  | Open     | Blue   |", indent: 1 },
  { raw: "  | New      | Orange |", indent: 1 },
  { raw: "  | Spam     | Grey   |", indent: 1 },
]));

children.push(acTitle("AC-3.2.2", "Ticket chart time period filter"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing the Help Tickets section on the Dashboard" },
  { kw: "When", text: "the agent selects a time period filter (Day, Week, Month, Year)" },
  { kw: "Then", text: "the donut chart shall update to reflect the ticket distribution for the selected period" },
]));

// ── US-3.3 ──
children.push(...userStoryBlock(
  "US-3.3",
  "Receive Escalation Alerts for High Failure Rates",
  "support agent,",
  "to receive an automatic audio and visual alert when the transaction failure or in-progress rate exceeds a critical threshold,",
  "I can immediately investigate and respond to potential service issues."
));

children.push(acTitle("AC-3.3.1", "Escalation alert triggers on threshold breach"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Support Dashboard" },
  { kw: "When", text: "the combined transaction failure and in-progress rate exceeds 3% in the last 30 minutes" },
  { kw: "Then", text: "the system shall play an audio alert (a short beep tone)" },
  { kw: "And", text: "a modal overlay shall appear with a warning icon and red banner" },
  { kw: "And", text: "the modal shall display a message describing the escalation condition" },
  { kw: "And", text: "an \"Acknowledge\" button shall be displayed on the modal" },
]));

children.push(acTitle("AC-3.3.2", "Dismissing the escalation alert"));
children.push(...gherkinAC([
  { kw: "Given", text: "the escalation alert modal is displayed" },
  { kw: "When", text: "the support agent clicks the \"Acknowledge\" button" },
  { kw: "Then", text: "the modal shall close" },
  { kw: "And", text: "the audio alert shall stop" },
  { kw: "And", text: "the agent shall be returned to the Dashboard view" },
]));

children.push(acTitle("AC-3.3.3", "No alert when threshold is not breached"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Support Dashboard" },
  { kw: "When", text: "the combined transaction failure and in-progress rate is at or below 3% in the last 30 minutes" },
  { kw: "Then", text: "no escalation alert modal shall be displayed" },
  { kw: "And", text: "no audio alert shall play" },
]));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// EPIC 4: TRANSACTION SEARCH
// ══════════════════════════════════════════════════════════════
children.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 0, after: 200 },
  children: [new TextRun({ text: "Epic 4: Transaction Search", bold: true, size: 32, color: C.navy, font: "Arial" })],
}));

// ── US-4.1 ──
children.push(...userStoryBlock(
  "US-4.1",
  "Search Transactions by Reference or Email",
  "support agent,",
  "to search for transactions by transaction reference number or sender email address,",
  "I can quickly locate a specific transaction to assist a customer."
));

children.push(acTitle("AC-4.1.1", "Search by transaction reference"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Transaction Search page" },
  { kw: "When", text: "the agent enters a valid transaction reference (e.g. \"MITO-7721003\") in the search input field" },
  { kw: "And", text: "the agent clicks the \"Search\" button" },
  { kw: "Then", text: "the system shall display matching transactions in a results table" },
  { kw: "And", text: "the results table shall show columns: Reference, Date, Beneficiary, Sender, Status, Payout, Action" },
]));

children.push(acTitle("AC-4.1.2", "Search by sender email"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Transaction Search page" },
  { kw: "When", text: "the agent enters a valid sender email address (e.g. \"ogbeide.sender@example.com\") in the search input field" },
  { kw: "And", text: "the agent clicks the \"Search\" button" },
  { kw: "Then", text: "the system shall display all transactions associated with that email address" },
  { kw: "And", text: "date range filters and status filter shall become visible" },
]));

children.push(acTitle("AC-4.1.3", "Search button loading state"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent has entered a search query" },
  { kw: "When", text: "the agent clicks the \"Search\" button" },
  { kw: "Then", text: "the button text shall change to \"Searching...\"" },
  { kw: "And", text: "the button shall be disabled until results are returned" },
]));

children.push(acTitle("AC-4.1.4", "No results found"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Transaction Search page" },
  { kw: "When", text: "the agent enters a search query that does not match any transaction" },
  { kw: "And", text: "the agent clicks the \"Search\" button" },
  { kw: "Then", text: "the system shall display an empty state with a search icon" },
  { kw: "And", text: "the message \"No Transaction Found\" shall be shown" },
]));

children.push(acTitle("AC-4.1.5", "Empty search query"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Transaction Search page" },
  { kw: "When", text: "the search input field is empty" },
  { kw: "Then", text: "the system shall display a placeholder message: \"Enter search criteria above to find transactions.\"" },
  { kw: "And", text: "no results table shall be shown" },
]));

children.push(acTitle("AC-4.1.6", "Demo search tips"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Transaction Search page" },
  { kw: "When", text: "the page is loaded" },
  { kw: "Then", text: "demo tip buttons shall be displayed (e.g. \"MITO-7721003\", \"ogbeide.sender@example.com\")" },
  { kw: "When", text: "the agent clicks a demo tip button" },
  { kw: "Then", text: "the search input shall be populated with the tip value" },
]));

children.push(acTitle("AC-4.1.7", "PII masking in search results"));
children.push(...gherkinAC([
  { kw: "Given", text: "the search results table is displayed" },
  { kw: "When", text: "the agent views the Beneficiary column" },
  { kw: "Then", text: "the beneficiary name shall be masked (showing first letter of each word plus asterisks)" },
  { kw: "And", text: "the beneficiary phone number shall be masked (showing only the last 4 digits)" },
  { kw: "When", text: "the agent views the Sender column" },
  { kw: "Then", text: "the sender name shall be masked" },
  { kw: "And", text: "the sender phone number shall be masked (showing only the last 4 digits)" },
  { kw: "And", text: "the sender email shall be masked (showing first character, asterisks, last character before @, and full domain)" },
]));

// ── US-4.2 ──
children.push(...userStoryBlock(
  "US-4.2",
  "Filter Transaction Search Results by Date Range and Status",
  "support agent,",
  "to filter transaction search results by date range and transaction status when searching by email,",
  "I can narrow down results and find the exact transaction I need."
));

children.push(acTitle("AC-4.2.1", "Date range filters appear for email search"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent has searched by sender email address" },
  { kw: "When", text: "the results are displayed" },
  { kw: "Then", text: "a \"Start Date\" date picker field shall be visible" },
  { kw: "And", text: "an \"End Date\" date picker field shall be visible" },
  { kw: "And", text: "the default date range shall cover the last 30 days" },
]));

children.push(acTitle("AC-4.2.2", "Filter by date range"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent has search results displayed from an email search" },
  { kw: "When", text: "the agent selects a \"Start Date\" and an \"End Date\"" },
  { kw: "Then", text: "the results table shall update to show only transactions within the selected date range" },
]));

children.push(acTitle("AC-4.2.3", "Filter by transaction status"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent has search results displayed from an email search" },
  { kw: "When", text: "the agent selects a status from the Status dropdown" },
  { kw: "Then", text: "the following options shall be available: \"All Statuses\", \"Processed\", \"Completed\", \"Failed\", \"In Progress\"" },
  { kw: "And", text: "the results table shall update to show only transactions matching the selected status" },
]));

children.push(acTitle("AC-4.2.4", "Filters hidden for reference search"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent has searched by transaction reference number" },
  { kw: "When", text: "the results are displayed" },
  { kw: "Then", text: "the date range filters and status dropdown shall not be visible" },
]));

// ── US-4.3 ──
children.push(...userStoryBlock(
  "US-4.3",
  "View Transaction Details from Search Results",
  "support agent,",
  "to click on a transaction in the search results to view its full details,",
  "I can investigate the transaction thoroughly and assist the customer."
));

children.push(acTitle("AC-4.3.1", "Navigate via row click"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing transaction search results" },
  { kw: "When", text: "the agent clicks on any row in the results table" },
  { kw: "Then", text: "the system shall navigate to the Transaction Details page for that transaction" },
  { kw: "And", text: "the search context shall be stored in session storage so the agent can return to their results" },
]));

children.push(acTitle("AC-4.3.2", "Navigate via View button"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing transaction search results" },
  { kw: "When", text: "the agent clicks the \"View\" button in the Action column of a transaction row" },
  { kw: "Then", text: "the system shall navigate to the Transaction Details page for that transaction" },
]));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// EPIC 5: TRANSACTION DETAILS
// ══════════════════════════════════════════════════════════════
children.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 0, after: 200 },
  children: [new TextRun({ text: "Epic 5: Transaction Details", bold: true, size: 32, color: C.navy, font: "Arial" })],
}));

// ── US-5.1 ──
children.push(...userStoryBlock(
  "US-5.1",
  "View Complete Transaction Information",
  "support agent,",
  "to view the complete details of a transaction including sender, beneficiary, and service information,",
  "I can fully understand the transaction and resolve any customer queries."
));

children.push(acTitle("AC-5.1.1", "Transaction details tab displays all fields"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Transaction Details page" },
  { kw: "When", text: "the \"Details\" tab is active (default)" },
  { kw: "Then", text: "the following transaction information shall be displayed:" },
  { raw: "  | Field           | Description                             |", indent: 1 },
  { raw: "  | MTN             | Money Transfer Number                   |", indent: 1 },
  { raw: "  | Affiliate       | Affiliate partner name                  |", indent: 1 },
  { raw: "  | Status          | Current transaction status (colour-coded)|", indent: 1 },
  { raw: "  | Type            | Transaction type (e.g. MONEYTRANSFER)   |", indent: 1 },
  { raw: "  | Sending Country | Country code of origin                  |", indent: 1 },
]));

children.push(acTitle("AC-5.1.2", "Beneficiary section with masked PII"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing the Details tab" },
  { kw: "When", text: "the Beneficiary section is rendered" },
  { kw: "Then", text: "the following fields shall be displayed with PII masking:" },
  { raw: "  | Field         | Masking Rule                              |", indent: 1 },
  { raw: "  | Name          | First letter of each word plus asterisks  |", indent: 1 },
  { raw: "  | Contact Phone | Only last 4 digits visible                |", indent: 1 },
  { raw: "  | Email         | First char, asterisks, last char before @ |", indent: 1 },
  { raw: "  | Address       | Only country/state visible after 1st comma|", indent: 1 },
]));

children.push(acTitle("AC-5.1.3", "Sender section with masked PII"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing the Details tab" },
  { kw: "When", text: "the Sender section is rendered" },
  { kw: "Then", text: "the following fields shall be displayed with PII masking:" },
  { raw: "  | Field         | Masking Rule                              |", indent: 1 },
  { raw: "  | Name          | First letter of each word plus asterisks  |", indent: 1 },
  { raw: "  | Contact Phone | Only last 4 digits visible                |", indent: 1 },
  { raw: "  | Email         | First char, asterisks, last char before @ |", indent: 1 },
  { raw: "  | Address       | Only country/state visible after 1st comma|", indent: 1 },
]));

children.push(acTitle("AC-5.1.4", "Service and financial section"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing the Details tab" },
  { kw: "When", text: "the Service section is rendered" },
  { kw: "Then", text: "the following fields shall be displayed:" },
  { raw: "  | Field             | Format                             |", indent: 1 },
  { raw: "  | Service Name      | Full name (e.g. \"ZENITH BANK PLC\") |", indent: 1 },
  { raw: "  | Service Code      | Monospace font (e.g. \"1011\")       |", indent: 1 },
  { raw: "  | Collection Method | e.g. \"BANKACCOUNT\"                 |", indent: 1 },
  { raw: "  | Account Number    | Masked (only last 4 digits)        |", indent: 1 },
  { raw: "  | Rate              | Exchange rate number                |", indent: 1 },
  { raw: "  | Payout            | Local currency amount (green text)  |", indent: 1 },
  { raw: "  | Settle Amount     | Intermediate currency amount        |", indent: 1 },
  { raw: "  | Total Paid        | Final amount paid                   |", indent: 1 },
]));

children.push(acTitle("AC-5.1.5", "Transaction not found"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent navigates to a Transaction Details page" },
  { kw: "When", text: "the transaction reference does not match any known transaction" },
  { kw: "Then", text: "the system shall display a \"Transaction Not Found\" message" },
  { kw: "And", text: "a \"Back to Search\" button shall be displayed" },
  { kw: "When", text: "the agent clicks the \"Back to Search\" button" },
  { kw: "Then", text: "the agent shall be redirected to the Transaction Search page" },
]));

children.push(acTitle("AC-5.1.6", "Back navigation to search results"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent navigated to Transaction Details from the search results" },
  { kw: "When", text: "the agent clicks the \"Back\" link at the top of the page" },
  { kw: "Then", text: "the agent shall be returned to the Transaction Search page" },
  { kw: "And", text: "the previous search query shall be restored" },
]));

// ── US-5.2 ──
children.push(...userStoryBlock(
  "US-5.2",
  "View Transaction Audit Trail Timeline",
  "support agent,",
  "to view the audit trail of a transaction as a visual timeline,",
  "I can trace the transaction's journey through each processing step and identify where issues occurred."
));

children.push(acTitle("AC-5.2.1", "Audit trail tab displays timeline"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Transaction Details page" },
  { kw: "When", text: "the agent clicks the \"Trail\" tab" },
  { kw: "Then", text: "a vertical timeline shall be displayed showing each processing step" },
  { kw: "And", text: "each step shall show the event name and timestamp" },
]));

children.push(acTitle("AC-5.2.2", "Colour-coded status indicators on timeline"));
children.push(...gherkinAC([
  { kw: "Given", text: "the audit trail timeline is displayed" },
  { kw: "When", text: "the agent views the timeline steps" },
  { kw: "Then", text: "each step shall have a colour-coded status dot:" },
  { raw: "  | Status   | Dot Colour |", indent: 1 },
  { raw: "  | Complete | Green      |", indent: 1 },
  { raw: "  | Current  | Amber      |", indent: 1 },
  { raw: "  | Failed   | Red        |", indent: 1 },
  { kw: "And", text: "completed steps shall appear above current or failed steps in chronological order" },
]));

// ── US-5.3 ──
children.push(...userStoryBlock(
  "US-5.3",
  "View KYC Verification Status for a Transaction",
  "support agent,",
  "to view the KYC verification status associated with a transaction,",
  "I can inform the customer of their verification outcome and escalate if needed."
));

children.push(acTitle("AC-5.3.1", "KYC tab displays verification status"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Transaction Details page" },
  { kw: "When", text: "the agent clicks the \"KYC\" tab" },
  { kw: "Then", text: "the KYC verification status shall be displayed prominently with a large icon" },
  { kw: "And", text: "a colour-coded status badge shall indicate the result:" },
  { raw: "  | Status  | Colour | Icon       |", indent: 1 },
  { raw: "  | Passed  | Green  | tick mark  |", indent: 1 },
  { raw: "  | Pending | Amber  | hourglass  |", indent: 1 },
  { raw: "  | Failed  | Red    | cross mark |", indent: 1 },
  { kw: "And", text: "the last updated timestamp shall be displayed beneath the status" },
]));

// ── US-5.4 ──
children.push(...userStoryBlock(
  "US-5.4",
  "Add and View Agent Comments on a Transaction",
  "support agent,",
  "to add comments to a transaction and view the existing comment thread,",
  "I can document my actions and communicate with other agents handling the same case."
));

children.push(acTitle("AC-5.4.1", "View existing comment thread"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Transaction Details page" },
  { kw: "When", text: "the agent clicks the \"Comments\" tab" },
  { kw: "Then", text: "the system shall display all existing comments in a scrollable thread" },
  { kw: "And", text: "system messages shall be displayed in italic, centred text with a grey background" },
  { kw: "And", text: "agent messages shall be displayed left-aligned with a white background and border" },
  { kw: "And", text: "each message shall show the sender name and timestamp" },
]));

children.push(acTitle("AC-5.4.2", "Post a new comment"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing the Comments tab" },
  { kw: "When", text: "the agent enters text in the comment input field" },
  { kw: "And", text: "the agent clicks the \"Post\" button" },
  { kw: "Then", text: "the new comment shall be appended to the thread immediately" },
  { kw: "And", text: "the comment shall display the agent's name and the current timestamp" },
  { kw: "And", text: "the input field shall be cleared" },
]));

children.push(acTitle("AC-5.4.3", "Empty comment prevention"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing the Comments tab" },
  { kw: "When", text: "the comment input field is empty or contains only whitespace" },
  { kw: "And", text: "the agent clicks the \"Post\" button" },
  { kw: "Then", text: "no comment shall be added to the thread" },
  { kw: "And", text: "the input field shall remain unchanged" },
]));

children.push(acTitle("AC-5.4.4", "Unread comment notification indicator"));
children.push(...gherkinAC([
  { kw: "Given", text: "a transaction has new comments that the agent has not viewed" },
  { kw: "When", text: "the agent is on any tab other than the \"Comments\" tab" },
  { kw: "Then", text: "a red notification dot shall appear on the \"Comments\" tab label" },
  { kw: "When", text: "the agent clicks the \"Comments\" tab" },
  { kw: "Then", text: "the red notification dot shall be cleared" },
]));

// ── US-5.5 ──
children.push(...userStoryBlock(
  "US-5.5",
  "View and Create Help Tickets Linked to a Transaction",
  "support agent,",
  "to view help tickets linked to a transaction and create new linked tickets,",
  "I can track all customer issues related to a specific transaction in one place."
));

children.push(acTitle("AC-5.5.1", "View linked tickets list"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Transaction Details page" },
  { kw: "When", text: "the agent clicks the \"Help Tickets\" tab" },
  { kw: "Then", text: "the system shall display a list of help tickets linked to this transaction" },
  { kw: "And", text: "each ticket shall show: Ticket ID, Subject, Customer Name, Created Date, Status" },
]));

children.push(acTitle("AC-5.5.2", "Filter linked tickets by status"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing the Help Tickets tab on Transaction Details" },
  { kw: "When", text: "the agent clicks a status filter tab (New, Open, In Progress, Resolved)" },
  { kw: "Then", text: "only tickets matching the selected status shall be displayed" },
]));

children.push(acTitle("AC-5.5.3", "Search linked tickets"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing the Help Tickets tab on Transaction Details" },
  { kw: "When", text: "the agent enters text in the ticket search field" },
  { kw: "Then", text: "the ticket list shall be filtered to show only tickets matching the search query" },
  { kw: "And", text: "the search shall match against ticket ID, subject, or customer name" },
]));

children.push(acTitle("AC-5.5.4", "Create new linked ticket via modal"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing the Help Tickets tab on Transaction Details" },
  { kw: "When", text: "the agent clicks the button to create a new linked ticket" },
  { kw: "Then", text: "a modal dialogue shall appear with the following fields:" },
  { raw: "  | Field       | Type     | Required |", indent: 1 },
  { raw: "  | Subject     | Text     | Yes      |", indent: 1 },
  { raw: "  | Message     | Textarea | Yes      |", indent: 1 },
  { raw: "  | Attachments | File     | No       |", indent: 1 },
  { kw: "When", text: "the agent fills in the required fields and submits" },
  { kw: "Then", text: "the new ticket shall be created and linked to the current transaction" },
  { kw: "And", text: "the modal shall close" },
  { kw: "And", text: "the new ticket shall appear in the linked tickets list" },
]));

children.push(acTitle("AC-5.5.5", "Unread ticket notification indicator"));
children.push(...gherkinAC([
  { kw: "Given", text: "a transaction has new linked tickets that the agent has not viewed" },
  { kw: "When", text: "the agent is on any tab other than the \"Help Tickets\" tab" },
  { kw: "Then", text: "a red notification dot shall appear on the \"Help Tickets\" tab label" },
  { kw: "When", text: "the agent clicks the \"Help Tickets\" tab" },
  { kw: "Then", text: "the red notification dot shall be cleared" },
]));

// ── US-5.6 ──
children.push(...userStoryBlock(
  "US-5.6",
  "Switch Between Transaction Detail Tabs",
  "support agent,",
  "to switch between the Details, Trail, KYC, Comments, and Help Tickets tabs on the Transaction Details page,",
  "I can view different aspects of the transaction without navigating away."
));

children.push(acTitle("AC-5.6.1", "Tab navigation and persistence"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Transaction Details page" },
  { kw: "When", text: "the agent clicks on any of the following tabs: \"Details\", \"Trail\", \"KYC\", \"Comments\", \"Help Tickets\"" },
  { kw: "Then", text: "the content area shall update to display the corresponding section" },
  { kw: "And", text: "the selected tab shall be visually highlighted" },
  { kw: "And", text: "the tab selection shall be reflected in the URL query parameter (e.g. ?tab=Comments)" },
]));

children.push(acTitle("AC-5.6.2", "Default tab on page load"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent navigates to the Transaction Details page without a tab query parameter" },
  { kw: "When", text: "the page loads" },
  { kw: "Then", text: "the \"Details\" tab shall be active by default" },
  { kw: "And", text: "the transaction detail information shall be displayed" },
]));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// EPIC 6: HELP TICKETS MANAGEMENT
// ══════════════════════════════════════════════════════════════
children.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 0, after: 200 },
  children: [new TextRun({ text: "Epic 6: Help Tickets Management", bold: true, size: 32, color: C.navy, font: "Arial" })],
}));

// ── US-6.1 ──
children.push(...userStoryBlock(
  "US-6.1",
  "View and Browse Help Tickets by Status Category",
  "support agent,",
  "to view all help tickets organised by status category in a tabular list,",
  "I can prioritise and manage my ticket workload effectively."
));

children.push(acTitle("AC-6.1.1", "Ticket list table structure"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Help Tickets page" },
  { kw: "When", text: "the page loads" },
  { kw: "Then", text: "a table shall be displayed with the following columns:" },
  { raw: "  | Column    | Description                     |", indent: 1 },
  { raw: "  | Ticket no | Unique ticket identifier        |", indent: 1 },
  { raw: "  | Date      | Ticket creation date and time   |", indent: 1 },
  { raw: "  | Name      | Customer name                   |", indent: 1 },
  { raw: "  | Subject   | Brief description of the issue  |", indent: 1 },
  { raw: "  | Status    | Colour-coded status badge       |", indent: 1 },
  { kw: "And", text: "each row shall be clickable to navigate to the ticket detail view" },
]));

children.push(acTitle("AC-6.1.2", "Status tab navigation with counts"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Help Tickets page" },
  { kw: "When", text: "the page loads" },
  { kw: "Then", text: "the following status tabs shall be displayed with their respective ticket counts:" },
  { raw: "  | Tab      |", indent: 1 },
  { raw: "  | New      |", indent: 1 },
  { raw: "  | Open     |", indent: 1 },
  { raw: "  | Resolved |", indent: 1 },
  { raw: "  | Spam     |", indent: 1 },
  { raw: "  | Blocked  |", indent: 1 },
  { raw: "  | All      |", indent: 1 },
  { kw: "And", text: "the \"New\" tab shall be active by default" },
  { kw: "And", text: "clicking a tab shall filter the list to show only tickets of that status" },
  { kw: "And", text: "the \"All\" tab shall display tickets across all statuses" },
]));

children.push(acTitle("AC-6.1.3", "Status badge colours"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing the ticket list" },
  { kw: "When", text: "ticket status badges are rendered" },
  { kw: "Then", text: "each status shall have a distinct colour scheme:" },
  { raw: "  | Status   | Badge Background | Text Colour |", indent: 1 },
  { raw: "  | New      | Light red        | Red         |", indent: 1 },
  { raw: "  | Open     | Light blue       | Blue        |", indent: 1 },
  { raw: "  | Resolved | Light green      | Green       |", indent: 1 },
  { raw: "  | Spam     | Light yellow     | Amber       |", indent: 1 },
  { raw: "  | Blocked  | Light purple     | Purple      |", indent: 1 },
  { raw: "  | Reopened | Light amber      | Brown       |", indent: 1 },
]));

children.push(acTitle("AC-6.1.4", "Empty state for no tickets"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Help Tickets page" },
  { kw: "When", text: "a status tab is selected that has no matching tickets" },
  { kw: "Then", text: "the message \"No tickets in this category\" shall be displayed" },
  { kw: "And", text: "no table rows shall be rendered" },
]));

children.push(acTitle("AC-6.1.5", "Tab count updates after status change"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent changes the status of a ticket (e.g. from \"New\" to \"Resolved\")" },
  { kw: "When", text: "the agent returns to the Help Tickets list" },
  { kw: "Then", text: "the counts on the status tabs shall be updated to reflect the change" },
]));

// ── US-6.2 ──
children.push(...userStoryBlock(
  "US-6.2",
  "Search and Filter Help Tickets Using Quick Search and Advanced Filters",
  "support agent,",
  "to search tickets by keyword and apply advanced filters,",
  "I can quickly find specific tickets from a potentially large list."
));

children.push(acTitle("AC-6.2.1", "Quick search by keyword"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Help Tickets page" },
  { kw: "When", text: "the agent enters text in the search input field" },
  { kw: "Then", text: "the ticket list shall filter in real time to show only tickets where the search query matches:" },
  { raw: "  | Searchable Field |", indent: 1 },
  { raw: "  | Ticket ID        |", indent: 1 },
  { raw: "  | Customer name    |", indent: 1 },
  { raw: "  | Subject          |", indent: 1 },
  { raw: "  | Email address    |", indent: 1 },
  { kw: "And", text: "the filtering shall be case-insensitive" },
]));

children.push(acTitle("AC-6.2.2", "Open advanced filter panel"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Help Tickets page" },
  { kw: "When", text: "the agent clicks the \"Filter\" button" },
  { kw: "Then", text: "an expandable filter panel shall appear with the following fields:" },
  { raw: "  | Field        | Type | Placeholder      |", indent: 1 },
  { raw: "  | Ticket no    | Text | Enter ticket no  |", indent: 1 },
  { raw: "  | Email        | Text | Enter email      |", indent: 1 },
  { raw: "  | Name         | Text | Enter name       |", indent: 1 },
  { raw: "  | Subject      | Text | Enter subject    |", indent: 1 },
  { raw: "  | Created From | Text | Created From     |", indent: 1 },
  { raw: "  | Created Till | Text | Created Till     |", indent: 1 },
]));

children.push(acTitle("AC-6.2.3", "Apply advanced filters"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent has entered values in one or more advanced filter fields" },
  { kw: "When", text: "the agent clicks the \"Apply\" button" },
  { kw: "Then", text: "the ticket list shall be filtered to show only tickets matching all applied filter criteria" },
  { kw: "And", text: "the filters shall work in combination with the currently active status tab" },
]));

children.push(acTitle("AC-6.2.4", "Clear all filters"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent has applied one or more advanced filters" },
  { kw: "When", text: "the agent clicks the \"Clear all\" button" },
  { kw: "Then", text: "all advanced filter fields shall be emptied" },
  { kw: "And", text: "the ticket list shall revert to showing all tickets for the active status tab" },
]));

children.push(acTitle("AC-6.2.5", "Close filter panel"));
children.push(...gherkinAC([
  { kw: "Given", text: "the advanced filter panel is open" },
  { kw: "When", text: "the agent clicks the \"Filter\" button again" },
  { kw: "Then", text: "the filter panel shall collapse and be hidden" },
  { kw: "And", text: "any entered filter values shall be retained" },
]));

// ── US-6.3 ──
children.push(...userStoryBlock(
  "US-6.3",
  "View Complete Help Ticket Information and Conversation Thread",
  "support agent,",
  "to view the full details and conversation thread of a help ticket,",
  "I can understand the customer's issue and provide an informed response."
));

children.push(acTitle("AC-6.3.1", "Ticket detail view displays all information"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Help Tickets page" },
  { kw: "When", text: "the agent clicks on a ticket row in the list" },
  { kw: "Then", text: "the system shall navigate to the ticket detail view" },
  { kw: "And", text: "the following ticket information shall be displayed:" },
  { raw: "  | Field           | Description                             |", indent: 1 },
  { raw: "  | Ticket No.      | Unique ticket identifier                |", indent: 1 },
  { raw: "  | Request date    | Date and time the ticket was created    |", indent: 1 },
  { raw: "  | Name            | Customer name                           |", indent: 1 },
  { raw: "  | Email           | Customer email address                  |", indent: 1 },
  { raw: "  | User type       | e.g. Registered user, Unregistered user |", indent: 1 },
  { raw: "  | Transaction Ref#| Associated order number or \"N/A\"        |", indent: 1 },
  { raw: "  | Platform        | Source platform (e.g. Mito.Money (iOS)) |", indent: 1 },
  { raw: "  | Ticket status   | Colour-coded status badge               |", indent: 1 },
  { raw: "  | Subject         | Issue summary                           |", indent: 1 },
]));

children.push(acTitle("AC-6.3.2", "Conversation thread display"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing a ticket detail" },
  { kw: "When", text: "the conversation thread is rendered" },
  { kw: "Then", text: "each message shall be displayed with:" },
  { raw: "  | Element      | Description                                |", indent: 1 },
  { raw: "  | Avatar       | Circular avatar with sender's initial      |", indent: 1 },
  { raw: "  | Sender name  | \"Support Agent\" for agents, name for custs |", indent: 1 },
  { raw: "  | Timestamp    | Time the message was sent                  |", indent: 1 },
  { raw: "  | Message body | Full text of the message                   |", indent: 1 },
  { kw: "And", text: "agent messages shall have a purple left border and light purple background" },
  { kw: "And", text: "customer messages shall have a grey left border and light grey background" },
  { kw: "And", text: "messages shall appear in chronological order (oldest first)" },
]));

children.push(acTitle("AC-6.3.3", "Back navigation from ticket detail"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing a ticket detail" },
  { kw: "When", text: "the agent clicks the \"Back to list\" button" },
  { kw: "Then", text: "the agent shall be returned to the Help Tickets list page" },
  { kw: "And", text: "the previously active status tab shall be preserved" },
]));

children.push(acTitle("AC-6.3.4", "Ticket not found"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent navigates to a ticket detail URL with an invalid ticket ID" },
  { kw: "When", text: "the page loads" },
  { kw: "Then", text: "the message \"Ticket not found\" shall be displayed" },
  { kw: "And", text: "a \"Back to help tickets\" button shall be provided" },
]));

// ── US-6.4 ──
children.push(...userStoryBlock(
  "US-6.4",
  "Reply to a Customer Help Ticket with Rich Text and Attachments",
  "support agent,",
  "to compose and send a reply to a customer's help ticket with formatting and file attachments,",
  "I can communicate clearly and provide supporting documents to resolve the customer's issue."
));

children.push(acTitle("AC-6.4.1", "Initiate reply"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing a ticket detail" },
  { kw: "When", text: "the agent clicks the \"Reply\" button" },
  { kw: "Or", text: "the agent clicks the placeholder text \"Click 'Reply' or type here to start replying...\"" },
  { kw: "Then", text: "the rich text reply editor shall expand and become visible" },
  { kw: "And", text: "the editor shall include a formatting toolbar with: Bold, Italic, Underline, Strikethrough, Quote, Link, Lists, Sub/Superscript, Text style, Font colour" },
]));

children.push(acTitle("AC-6.4.2", "Send a reply"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent has typed a message in the reply editor" },
  { kw: "When", text: "the agent clicks the \"Send\" button" },
  { kw: "Then", text: "the reply shall be appended to the conversation thread as an agent message" },
  { kw: "And", text: "the reply editor shall collapse" },
  { kw: "And", text: "the reply text shall be cleared" },
  { kw: "And", text: "the timestamp of the reply shall reflect the current time" },
]));

children.push(acTitle("AC-6.4.3", "Auto-update ticket status on first reply"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is replying to a ticket with status \"New\"" },
  { kw: "When", text: "the agent sends the reply" },
  { kw: "Then", text: "the ticket status shall automatically change from \"New\" to \"Open\"" },
]));

children.push(acTitle("AC-6.4.4", "Empty reply prevention"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent has the reply editor open" },
  { kw: "When", text: "the reply text area is empty or contains only whitespace" },
  { kw: "And", text: "the agent clicks the \"Send\" button" },
  { kw: "Then", text: "no reply shall be sent" },
  { kw: "And", text: "the reply editor shall remain open" },
]));

children.push(acTitle("AC-6.4.5", "Cancel reply"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent has the reply editor open" },
  { kw: "When", text: "the agent clicks the close button on the reply editor" },
  { kw: "Then", text: "the reply editor shall collapse" },
  { kw: "And", text: "any typed text shall be discarded" },
]));

children.push(acTitle("AC-6.4.6", "Add attachment to reply"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent has the reply editor open" },
  { kw: "When", text: "the agent clicks the \"Add Attachment\" button" },
  { kw: "Then", text: "a file selection dialogue shall appear" },
  { kw: "And", text: "the agent shall be able to select one or more files to attach to the reply" },
]));

// ── US-6.5 ──
children.push(...userStoryBlock(
  "US-6.5",
  "Change the Status of a Help Ticket",
  "support agent,",
  "to change the status of a help ticket based on the resolution progress,",
  "the ticket lifecycle is accurately tracked and other agents can see the current state."
));

children.push(acTitle("AC-6.5.1", "Available actions for New/Open/Reopened tickets"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing a ticket with status \"New\", \"Open\", or \"Reopened\"" },
  { kw: "When", text: "the ticket detail action bar is rendered" },
  { kw: "Then", text: "the following action buttons shall be available:" },
  { raw: "  | Button            | Action                        |", indent: 1 },
  { raw: "  | Reply             | Opens the reply editor         |", indent: 1 },
  { raw: "  | Mark as resolved  | Changes status to \"Resolved\"  |", indent: 1 },
  { raw: "  | Mark as spam      | Changes status to \"Spam\"      |", indent: 1 },
]));

children.push(acTitle("AC-6.5.2", "Mark ticket as resolved"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing a ticket with status \"New\", \"Open\", or \"Reopened\"" },
  { kw: "When", text: "the agent clicks the \"Mark as resolved\" button" },
  { kw: "Then", text: "the ticket status shall change to \"Resolved\"" },
  { kw: "And", text: "the status badge shall update to show \"Resolved\" in green" },
]));

children.push(acTitle("AC-6.5.3", "Available actions for Resolved tickets"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing a ticket with status \"Resolved\"" },
  { kw: "When", text: "the ticket detail action bar is rendered" },
  { kw: "Then", text: "the following action buttons shall be available:" },
  { raw: "  | Button   | Action                        |", indent: 1 },
  { raw: "  | Reply    | Opens the reply editor         |", indent: 1 },
  { raw: "  | Re-Open  | Changes status to \"Reopened\"  |", indent: 1 },
]));

children.push(acTitle("AC-6.5.4", "Re-open a resolved ticket"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing a ticket with status \"Resolved\"" },
  { kw: "When", text: "the agent clicks the \"Re-Open\" button" },
  { kw: "Then", text: "the ticket status shall change to \"Reopened\"" },
  { kw: "And", text: "the status badge shall update to show \"Reopened\" in amber" },
]));

children.push(acTitle("AC-6.5.5", "Available actions for Spam tickets"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing a ticket with status \"Spam\"" },
  { kw: "When", text: "the ticket detail action bar is rendered" },
  { kw: "Then", text: "the following action buttons shall be available:" },
  { raw: "  | Button      | Action                        |", indent: 1 },
  { raw: "  | Reply       | Opens the reply editor         |", indent: 1 },
  { raw: "  | Re-Open     | Changes status to \"Reopened\"  |", indent: 1 },
  { raw: "  | Block user  | Changes status to \"Blocked\"   |", indent: 1 },
]));

children.push(acTitle("AC-6.5.6", "Block a user from a spam ticket"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing a ticket with status \"Spam\"" },
  { kw: "When", text: "the agent clicks the \"Block user\" button" },
  { kw: "Then", text: "the ticket status shall change to \"Blocked\"" },
  { kw: "And", text: "the status badge shall update to show \"Blocked\" in purple" },
]));

children.push(acTitle("AC-6.5.7", "Available actions for Blocked tickets"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing a ticket with status \"Blocked\"" },
  { kw: "When", text: "the ticket detail action bar is rendered" },
  { kw: "Then", text: "the following action buttons shall be available:" },
  { raw: "  | Button   | Action                       |", indent: 1 },
  { raw: "  | Reply    | Opens the reply editor        |", indent: 1 },
  { raw: "  | Unblock  | Changes status to \"Open\"     |", indent: 1 },
]));

children.push(acTitle("AC-6.5.8", "Unblock a user"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing a ticket with status \"Blocked\"" },
  { kw: "When", text: "the agent clicks the \"Unblock\" button" },
  { kw: "Then", text: "the ticket status shall change to \"Open\"" },
  { kw: "And", text: "the status badge shall update to show \"Open\" in blue" },
]));

// ── US-6.6 ──
children.push(...userStoryBlock(
  "US-6.6",
  "Create a New Help Ticket on Behalf of a Customer",
  "support agent,",
  "to create a new help ticket on behalf of a customer,",
  "I can log customer issues received through channels outside the self-service portal (e.g. phone or email)."
));

children.push(acTitle("AC-6.6.1", "Open create ticket modal"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Help Tickets list page" },
  { kw: "When", text: "the agent clicks the \"Create ticket\" button" },
  { kw: "Then", text: "a modal dialogue shall appear with the title \"Create a new ticket\"" },
  { kw: "And", text: "a close button shall be displayed at the top right of the modal" },
]));

children.push(acTitle("AC-6.6.2", "Create ticket form fields"));
children.push(...gherkinAC([
  { kw: "Given", text: "the create ticket modal is open" },
  { kw: "Then", text: "the following form fields shall be displayed:" },
  { raw: "  | Field       | Type      | Required | Validation                       |", indent: 1 },
  { raw: "  | Select user | Dropdown  | Yes      | Must select a user from the list  |", indent: 1 },
  { raw: "  | Subject     | Text      | Yes      | Not empty; max 200 characters     |", indent: 1 },
  { raw: "  | Message     | Rich text | Yes      | Must not be empty                 |", indent: 1 },
  { raw: "  | Attachments | File      | No       | Optional file upload              |", indent: 1 },
  { kw: "And", text: "the \"Select user\" dropdown shall list existing users" },
  { kw: "And", text: "the Message field shall include a rich text toolbar with formatting options" },
]));

children.push(acTitle("AC-6.6.3", "Submit new ticket"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent has filled in all required fields in the create ticket form" },
  { kw: "When", text: "the agent clicks the \"Create ticket\" button" },
  { kw: "Then", text: "the new ticket shall be created with status \"New\"" },
  { kw: "And", text: "the modal shall close" },
  { kw: "And", text: "the new ticket shall appear in the Help Tickets list under the \"New\" tab" },
  { kw: "And", text: "the ticket count on the \"New\" tab shall increment by one" },
]));

children.push(acTitle("AC-6.6.4", "Required field validation on create"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent has the create ticket modal open" },
  { kw: "When", text: "the agent clicks \"Create ticket\" without selecting a user" },
  { kw: "Or", text: "without entering a subject" },
  { kw: "Or", text: "without entering a message" },
  { kw: "Then", text: "the system shall display validation errors on the empty required fields" },
  { kw: "And", text: "the ticket shall not be created" },
]));

children.push(acTitle("AC-6.6.5", "Close create ticket modal"));
children.push(...gherkinAC([
  { kw: "Given", text: "the create ticket modal is open" },
  { kw: "When", text: "the agent clicks the close button" },
  { kw: "Then", text: "the modal shall close" },
  { kw: "And", text: "no ticket shall be created" },
  { kw: "And", text: "any entered data shall be discarded" },
]));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// EPIC 7: EXCHANGE RATES & CORRIDORS
// ══════════════════════════════════════════════════════════════
children.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 0, after: 200 },
  children: [new TextRun({ text: "Epic 7: Exchange Rates & Corridors", bold: true, size: 32, color: C.navy, font: "Arial" })],
}));

// ── US-7.1 ──
children.push(...userStoryBlock(
  "US-7.1",
  "View Exchange Rate Corridors in Read-Only Mode",
  "support agent,",
  "to view the current exchange rate corridors in a read-only table,",
  "I can verify rates for customers and identify any rate-related issues."
));

children.push(acTitle("AC-7.1.1", "Rates page header and read-only indicator"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent navigates to the Rates page" },
  { kw: "When", text: "the page loads" },
  { kw: "Then", text: "the page header shall display the title \"Exchange Rates & Corridors\"" },
  { kw: "And", text: "a \"Read Only\" badge shall be prominently displayed in orange" },
  { kw: "And", text: "the description text shall read: \"Review the exact table currently on screen, then export the filtered result set in CSV or PDF format.\"" },
]));

children.push(acTitle("AC-7.1.2", "Corridor table structure"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Rates page" },
  { kw: "When", text: "the corridor data is loaded" },
  { kw: "Then", text: "a table shall be displayed with the following columns:" },
  { raw: "  | Column          | Description                            |", indent: 1 },
  { raw: "  | Ref             | Corridor reference ID (orange, bold)   |", indent: 1 },
  { raw: "  | Send Country    | Sending country or \"ALL\"               |", indent: 1 },
  { raw: "  | Receive Country | Receiving country or \"ALL\"             |", indent: 1 },
  { raw: "  | From-To         | Currency pair (e.g. \"EUR - SGD\")       |", indent: 1 },
  { raw: "  | Rates           | Exchange rate in monospace format       |", indent: 1 },
  { raw: "  | Status          | Active (green) or Inactive (red) badge |", indent: 1 },
]));

children.push(acTitle("AC-7.1.3", "Rate override indicator"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is viewing the corridor table" },
  { kw: "When", text: "a corridor has an overridden rate" },
  { kw: "Then", text: "a small amber \"Override\" badge shall be displayed next to the rate value" },
]));

children.push(acTitle("AC-7.1.4", "Filter summary display"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent has applied filters on the Rates page" },
  { kw: "When", text: "the filter summary bar is rendered" },
  { kw: "Then", text: "it shall display the current filter selections in the format:" },
  { raw: "  \"Affiliate: [value] | From: [value] | To: [value] | Status: [value]\"", indent: 1 },
  { kw: "And", text: "a count shall be displayed: \"Showing X of Y corridors\"" },
]));

// ── US-7.2 ──
children.push(...userStoryBlock(
  "US-7.2",
  "Filter Exchange Rate Corridors by Affiliate, Currency, and Status",
  "support agent,",
  "to filter the corridor table by affiliate, sending currency, receiving currency, and status,",
  "I can quickly find the specific rate information I need."
));

children.push(acTitle("AC-7.2.1", "Affiliate filter dropdown"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Rates page" },
  { kw: "When", text: "the agent clicks the \"Affiliate\" dropdown" },
  { kw: "Then", text: "the following options shall be available:" },
  { raw: "  | Option         |", indent: 1 },
  { raw: "  | All Affiliates |", indent: 1 },
  { raw: "  | Rhemito        |", indent: 1 },
  { raw: "  | BasketMouth    |", indent: 1 },
  { raw: "  | Sika           |", indent: 1 },
  { raw: "  | FastPay        |", indent: 1 },
  { raw: "  | GlobalSend     |", indent: 1 },
  { kw: "And", text: "the default selection shall be \"Rhemito\"" },
  { kw: "And", text: "a search input shall be available within the dropdown for typeahead filtering" },
]));

children.push(acTitle("AC-7.2.2", "From Currency filter dropdown"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Rates page" },
  { kw: "When", text: "the agent clicks the \"From Currency\" dropdown" },
  { kw: "Then", text: "the dropdown shall display currency options with:" },
  { raw: "  | Element       | Example         |", indent: 1 },
  { raw: "  | Country flag  | (flag icon)     |", indent: 1 },
  { raw: "  | Currency name | British Pound   |", indent: 1 },
  { raw: "  | ISO 4217 code | GBP             |", indent: 1 },
  { raw: "  | Symbol        | pound sign      |", indent: 1 },
  { kw: "And", text: "a search input shall allow filtering by currency name, code, or symbol" },
  { kw: "And", text: "the selected option shall be highlighted with a checkmark" },
]));

children.push(acTitle("AC-7.2.3", "To Currency filter dropdown"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Rates page" },
  { kw: "When", text: "the agent clicks the \"To Currency\" dropdown" },
  { kw: "Then", text: "the dropdown shall display the same currency options as the \"From Currency\" dropdown" },
  { kw: "And", text: "the agent shall be able to search and select a receiving currency" },
]));

children.push(acTitle("AC-7.2.4", "Status filter"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Rates page" },
  { kw: "When", text: "the agent interacts with the Status filter" },
  { kw: "Then", text: "the following options shall be available: \"All Status\", \"Active\", \"Inactive\"" },
  { kw: "And", text: "selecting a status shall filter the table to show only corridors matching that status" },
]));

children.push(acTitle("AC-7.2.5", "Combined filter application"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent has selected values in multiple filter dropdowns" },
  { kw: "When", text: "the filters are applied" },
  { kw: "Then", text: "the corridor table shall update to show only corridors matching all selected criteria" },
  { kw: "And", text: "the filter summary shall update to reflect the current selections" },
  { kw: "And", text: "the corridor count shall update to show \"Showing X of Y corridors\"" },
]));

children.push(acTitle("AC-7.2.6", "Searchable dropdown interaction"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent has opened a searchable dropdown (Affiliate, From Currency, or To Currency)" },
  { kw: "When", text: "the agent types in the search input within the dropdown" },
  { kw: "Then", text: "the options shall be filtered in real time based on the entered text" },
  { kw: "When", text: "the agent clicks an option" },
  { kw: "Then", text: "the dropdown shall close and the selected value shall be displayed" },
  { kw: "When", text: "the agent clicks outside the dropdown" },
  { kw: "Then", text: "the dropdown shall close without changing the selection" },
]));

// ── US-7.3 ──
children.push(...userStoryBlock(
  "US-7.3",
  "Export Filtered Exchange Rate Corridors as CSV or PDF",
  "support agent,",
  "to export the currently filtered corridor data as a CSV or branded PDF file,",
  "I can share rate information with customers or internal teams."
));

children.push(acTitle("AC-7.3.1", "Export as CSV"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Rates page with filtered corridor data displayed" },
  { kw: "When", text: "the agent clicks the \"Download CSV\" button" },
  { kw: "Then", text: "a CSV file shall be downloaded with the filename \"exchange-rates-corridors.csv\"" },
  { kw: "And", text: "the CSV shall contain the columns: Ref, Send Country, Receive Country, From-To, Rates, Status" },
  { kw: "And", text: "only the currently filtered corridors shall be included in the export" },
  { kw: "And", text: "values shall be properly quoted with escaped special characters" },
]));

children.push(acTitle("AC-7.3.2", "Export as PDF"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Rates page with filtered corridor data displayed" },
  { kw: "When", text: "the agent clicks the \"Download PDF\" button" },
  { kw: "Then", text: "a PDF file shall be downloaded with the filename \"exchange-rates-corridors.pdf\"" },
  { kw: "And", text: "the PDF shall be in landscape orientation" },
  { kw: "And", text: "the PDF header shall include:" },
  { raw: "  | Element             | Description                        |", indent: 1 },
  { raw: "  | MITO logo           | Brand logo image                   |", indent: 1 },
  { raw: "  | Title               | \"MITO | Exchange Rates & Corridors\"|", indent: 1 },
  { raw: "  | Generated timestamp | Date and time of export            |", indent: 1 },
  { raw: "  | Filter summary      | Currently applied filter values    |", indent: 1 },
  { kw: "And", text: "the PDF shall contain a formatted table with alternating row colours" },
  { kw: "And", text: "only the currently filtered corridors shall be included" },
]));

children.push(acTitle("AC-7.3.3", "Export reflects current filters"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent has applied specific filters on the Rates page" },
  { kw: "When", text: "the agent exports data as CSV or PDF" },
  { kw: "Then", text: "the exported file shall contain exactly the same rows visible in the on-screen table" },
  { kw: "And", text: "no additional or omitted rows shall be present" },
]));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// EPIC 8: CHANGE PASSWORD
// ══════════════════════════════════════════════════════════════
children.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 0, after: 200 },
  children: [new TextRun({ text: "Epic 8: Change Password", bold: true, size: 32, color: C.navy, font: "Arial" })],
}));

children.push(...userStoryBlock(
  "US-8.1",
  "Change Support Agent Account Password",
  "support agent,",
  "to change my account password from within the Support Portal,",
  "I can maintain the security of my account by updating my credentials periodically."
));

children.push(acTitle("AC-8.1.1", "Change password form fields"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent navigates to the Change Password page" },
  { kw: "When", text: "the page loads" },
  { kw: "Then", text: "the following form fields shall be displayed:" },
  { raw: "  | Field                | Type     | Placeholder            | Required |", indent: 1 },
  { raw: "  | Current Password     | Password | Enter current password | Yes      |", indent: 1 },
  { raw: "  | New Password         | Password | Min 8 characters       | Yes      |", indent: 1 },
  { raw: "  | Confirm New Password | Password | Re-enter new password  | Yes      |", indent: 1 },
  { kw: "And", text: "an \"Update Password\" button shall be displayed" },
]));

children.push(acTitle("AC-8.1.2", "Successful password change"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent has entered a valid current password" },
  { kw: "And", text: "the agent has entered a new password that meets all validation rules" },
  { kw: "And", text: "the agent has entered the same new password in the confirmation field" },
  { kw: "When", text: "the agent clicks the \"Update Password\" button" },
  { kw: "Then", text: "a green success banner shall be displayed with a tick icon" },
  { kw: "And", text: "all form fields shall be cleared" },
]));

children.push(acTitle("AC-8.1.3", "Current password validation"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Change Password page" },
  { kw: "When", text: "the agent enters an incorrect current password" },
  { kw: "And", text: "the agent clicks the \"Update Password\" button" },
  { kw: "Then", text: "an error message shall be displayed below the \"Current Password\" field" },
  { kw: "And", text: "the password shall not be changed" },
]));

children.push(acTitle("AC-8.1.4", "New password minimum length validation"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Change Password page" },
  { kw: "When", text: "the agent enters a new password shorter than 8 characters" },
  { kw: "And", text: "the agent clicks the \"Update Password\" button" },
  { kw: "Then", text: "an error message shall be displayed below the \"New Password\" field indicating the minimum length requirement" },
  { kw: "And", text: "the password shall not be changed" },
]));

children.push(acTitle("AC-8.1.5", "New password must differ from current"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Change Password page" },
  { kw: "When", text: "the agent enters the same value in both the \"Current Password\" and \"New Password\" fields" },
  { kw: "And", text: "the agent clicks the \"Update Password\" button" },
  { kw: "Then", text: "an error message shall be displayed indicating the new password must be different from the current password" },
  { kw: "And", text: "the password shall not be changed" },
]));

children.push(acTitle("AC-8.1.6", "Confirm password mismatch"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Change Password page" },
  { kw: "When", text: "the agent enters a value in the \"Confirm New Password\" field that does not match the \"New Password\" field" },
  { kw: "And", text: "the agent clicks the \"Update Password\" button" },
  { kw: "Then", text: "an error message shall be displayed below the \"Confirm New Password\" field indicating the passwords do not match" },
  { kw: "And", text: "the password shall not be changed" },
]));

children.push(acTitle("AC-8.1.7", "Required fields validation"));
children.push(...gherkinAC([
  { kw: "Given", text: "the support agent is on the Change Password page" },
  { kw: "When", text: "the agent leaves any required field empty" },
  { kw: "And", text: "the agent clicks the \"Update Password\" button" },
  { kw: "Then", text: "error messages shall be displayed below each empty required field" },
  { kw: "And", text: "the password shall not be changed" },
]));

children.push(acTitle("AC-8.1.8", "Real-time error clearing"));
children.push(...gherkinAC([
  { kw: "Given", text: "an error message is displayed below a form field on the Change Password page" },
  { kw: "When", text: "the agent starts typing in that field" },
  { kw: "Then", text: "the error message for that field shall be cleared immediately" },
]));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// APPENDIX: STATUS TRANSITION DIAGRAM
// ══════════════════════════════════════════════════════════════
children.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 0, after: 200 },
  children: [new TextRun({ text: "Appendix A: Help Ticket Status Transition Diagram", bold: true, size: 32, color: C.navy, font: "Arial" })],
}));

const transitionData = [
  ["New", "Open", "Agent sends first reply"],
  ["New / Open / Reopened", "Resolved", "Agent clicks \"Mark as resolved\""],
  ["New / Open / Reopened", "Spam", "Agent clicks \"Mark as spam\""],
  ["Resolved", "Reopened", "Agent clicks \"Re-Open\""],
  ["Spam", "Reopened", "Agent clicks \"Re-Open\""],
  ["Spam", "Blocked", "Agent clicks \"Block user\""],
  ["Blocked", "Open", "Agent clicks \"Unblock\""],
];

children.push(dataTable(
  ["From Status", "To Status", "Trigger Action"],
  transitionData,
  [2500, 2200, 4326]
));

children.push(spacer(300));

// ── STATUS LIFECYCLE ──
children.push(para("Status Lifecycle Summary", { bold: true, size: 26, color: C.navy, spacing: { before: 200, after: 120 } }));

const lifecycleData = [
  ["New", "Ticket just received, not yet acknowledged by any agent."],
  ["Open", "Agent has acknowledged the ticket or sent a reply."],
  ["Reopened", "Previously resolved, spam, or blocked ticket re-opened for further action."],
  ["Resolved", "Issue has been addressed and the ticket is closed."],
  ["Spam", "Ticket identified as spam or unsolicited content."],
  ["Blocked", "User associated with the ticket has been blocked from the platform."],
];

children.push(dataTable(
  ["Status", "Definition"],
  lifecycleData,
  [2000, 7026]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// APPENDIX: PII MASKING RULES
// ══════════════════════════════════════════════════════════════
children.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 0, after: 200 },
  children: [new TextRun({ text: "Appendix B: PII Masking Rules", bold: true, size: 32, color: C.navy, font: "Arial" })],
}));

children.push(para(
  "All personally identifiable information (PII) displayed in the Support Portal is masked to protect customer privacy. The following rules apply consistently across all pages.",
  { spacing: { after: 200 } }
));

const piiData = [
  ["Name", "First letter of each word + asterisks (75%+ masked)", "John Doe", "J*** D**"],
  ["Phone", "Show only last 4 digits", "2348136931833", "***1833"],
  ["Email", "First char + asterisks + last char before @ + domain", "ogbeide.sender@example.com", "o*****r@example.com"],
  ["Address", "Show only country/state after first comma", "12, Osayande St, Benin City, Nigeria", "***, Benin City, Nigeria"],
  ["Account No.", "Show only last 4 digits", "2086208819", "****8819"],
  ["Balance", "Fully masked", "1,250.00", "****"],
];

children.push(dataTable(
  ["Data Type", "Masking Rule", "Example Input", "Masked Output"],
  piiData,
  [1400, 3200, 2200, 2226]
));

// ── BUILD & WRITE ──
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Arial", size: 22 },
      },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: C.navy },
        paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: C.navy },
        paragraph: { spacing: { before: 200, after: 160 }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: C.navy },
        paragraph: { spacing: { before: 160, after: 120 }, outlineLevel: 2 },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { after: 0 },
              border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: C.orange, space: 4 } },
              tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
              children: [
                new TextRun({ text: "MITO  |  Customer Support Portal", size: 16, color: C.grey, font: "Arial", bold: true }),
                new TextRun({ text: "\tUser Stories & Acceptance Criteria", size: 16, color: C.grey, font: "Arial" }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 1, color: C.greyBorder, space: 4 } },
              children: [
                new TextRun({ text: "Page ", size: 16, color: C.grey, font: "Arial" }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: C.grey, font: "Arial" }),
                new TextRun({ text: "  |  Confidential", size: 16, color: C.grey, font: "Arial" }),
              ],
            }),
          ],
        }),
      },
      children,
    },
  ],
});

Packer.toBuffer(doc).then(buffer => {
  const outPath = "C:\\Users\\Khan1\\OneDrive\\Desktop\\drive d data\\PromoCode\\Customer-Support-Portal-User-Stories-and-ACs.docx";
  fs.writeFileSync(outPath, buffer);
  console.log("DOCX created successfully at: " + outPath);
});
