export const DOCUMENT_TEMPLATES = {
  blank: { id: "blank", label: "Blank Document", description: "No preset structure.", sections: [], starter: "" },
  letter: { id: "letter", label: "Letter", description: "Sender, date, recipient, body, closing.", sections: ["Sender Address", "Date", "Recipient", "Body", "Closing"], starter: "[Your Name]\n[Your Address]\n[City, Postal Code]\n[Email] | [Phone]\n\n{date}\n\n[Recipient Name]\n[Recipient Address]\n\nDear [Name],\n\n[Opening paragraph]\n\n[Body paragraph]\n\n[Closing paragraph]\n\nYours sincerely,\n[Your Name]" },
  cv: { id: "cv", label: "CV / Resume", description: "Contact, summary, experience, education.", sections: ["Contact", "Summary", "Experience", "Education", "Skills"], starter: "[FULL NAME]\n[Email] | [Phone] | [City] | [LinkedIn]\n\nPROFESSIONAL SUMMARY\n[2-3 lines]\n\nWORK EXPERIENCE\n[Job Title] - [Company] ([Start] - [End])\n- [Achievement]\n\nEDUCATION\n[Degree] - [School] ([Year])\n\nSKILLS\n[Skill 1] | [Skill 2] | [Skill 3]" },
  proposal: { id: "proposal", label: "Business Proposal", description: "Summary, objectives, scope, budget.", sections: ["Title", "Summary", "Objectives", "Scope", "Timeline", "Budget"], starter: "BUSINESS PROPOSAL: [Title]\nPrepared for [Client] by [Company] on {date}\n\nEXECUTIVE SUMMARY\n[3-4 lines]\n\nOBJECTIVES\n1. [Objective 1]\n2. [Objective 2]\n\nSCOPE & DELIVERABLES\n- [Deliverable 1]\n\nTIMELINE\n[Phase 1 - dates]\n\nBUDGET\n[Item]: [Amount]\nTotal: [Amount]" },
  report: { id: "report", label: "Report", description: "Abstract, intro, findings, conclusion.", sections: ["Title", "Abstract", "Intro", "Findings", "Conclusion"], starter: "REPORT: [Title]\nBy [Name] - {date}\n\nABSTRACT\n[150-word summary]\n\n1. INTRODUCTION\n[Background]\n\n2. METHODOLOGY\n[Methods]\n\n3. FINDINGS\n3.1 [Finding 1]\n\n4. CONCLUSION\n[Takeaway]\n\nREFERENCES\n[1] ..." },
  thesis: { id: "thesis", label: "Thesis / Project", description: "Chapters + references, APA ready.", sections: ["Title Page", "Abstract", "Ch1 Intro", "Ch2 Review", "Ch3 Methods", "Ch4 Results", "Ch5 Conclusion"], starter: "[THESIS TITLE]\nBy [Full Name]\n[Department, University] - {date}\n\nABSTRACT\n[250-word summary]\n\nCHAPTER 1: INTRODUCTION\n1.1 Background\n1.2 Objectives\n\nCHAPTER 2: LITERATURE REVIEW\n[Review]\n\nCHAPTER 3: METHODOLOGY\n[Methods]\n\nCHAPTER 5: CONCLUSION\n[Summary]\n\nREFERENCES\n[...]" },
  invoice: { id: "invoice", label: "Invoice", description: "Biller, items, totals.", sections: ["Header", "Items", "Totals"], starter: "INVOICE #[001] - {date}\nFrom: [Business]\nTo: [Client]\n\nITEMS:\nDescription | Qty | Price\n[Service 1] | 1 | [10000]\n\nTotal Due: [..]" },
  minutes: { id: "minutes", label: "Meeting Minutes", description: "Attendance, agenda, actions.", sections: ["Header", "Attendance", "Agenda", "Actions"], starter: "MEETING MINUTES - [Title] - {date}\nVenue: [..]\n\nATTENDANCE\nPresent: [Names]\n\nAGENDA\n1. [Item 1]\n\nACTION ITEMS\n- [Task] - [Owner] - Due [date]" },
  memo: { id: "memo", label: "Memo", description: "To/From/Date/Subject + body.", sections: ["Header", "Body"], starter: "MEMO\nTo: [..]\nFrom: [..]\nDate: {date}\nSubject: [..]\n\n[Body]" },
  profile: { id: "profile", label: "Business Profile", description: "About, services, team.", sections: ["Cover", "About", "Services", "Contact"], starter: "[COMPANY NAME]\n[Tagline]\n\nABOUT US\n[Who you are]\n\nOUR SERVICES\n- [Service 1]\n\nCONTACT\n[Address] | [Phone] | [Email]" },
};

export const ACADEMIC_PRESETS = {
  none: { id: "none", label: "None", font: "Calibri", size: 11, lineSpacing: 1.15, marginsCm: 2.0, align: "left" },
  apa: { id: "apa", label: "APA (7th)", font: "Times New Roman", size: 12, lineSpacing: 2.0, marginsCm: 2.54, align: "left" },
  mla: { id: "mla", label: "MLA (9th)", font: "Times New Roman", size: 12, lineSpacing: 2.0, marginsCm: 2.54, align: "left" },
  harvard: { id: "harvard", label: "Harvard", font: "Arial", size: 11, lineSpacing: 1.5, marginsCm: 2.54, align: "left" },
};

export const THEME_PRESETS = {
  modern: { id: "modern", label: "Modern", accent: "#6d28d9", headingColor: "#1e1b4b", font: "Calibri" },
  classic: { id: "classic", label: "Classic", accent: "#7c2d12", headingColor: "#111827", font: "Times New Roman" },
  minimal: { id: "minimal", label: "Minimal", accent: "#111827", headingColor: "#111827", font: "Arial" },
  corporate: { id: "corporate", label: "Corporate", accent: "#0f3460", headingColor: "#0f3460", font: "Calibri" },
};

export function getTemplateStarter(id) {
  const t = DOCUMENT_TEMPLATES[id || "blank"] || DOCUMENT_TEMPLATES.blank;
  const today = new Date().toLocaleDateString();
  return (t.starter || "").replaceAll("{date}", today);
}
export function applyAcademicPreset(presetId) {
  return ACADEMIC_PRESETS[presetId] || ACADEMIC_PRESETS.none;
}
function isAllCapsHeading(line) {
  const letters = line.replace(/[^A-Za-z]/g, "");
  if (letters.length < 3 || line.length > 90) return false;
  if (letters !== letters.toUpperCase()) return false;
  return line.split(/\s+/).length <= 12;
}
function numberedLevel(line) {
  const m = line.match(/^(\d+(?:\.\d+){0,3})[\.\)\:\-]\s+\S/);
  if (!m) return 0;
  return m[1].split(".").length;
}
export function detectHeadings(lines) {
  return lines.map((raw, idx) => {
    const line = (raw || "").trim();
    if (!line) return { line: raw, level: 0, reason: "blank" };
    if (/^#{1,3}\s+\S/.test(line)) {
      const level = line.startsWith("### ") ? 3 : line.startsWith("## ") ? 2 : 1;
      return { line, level, reason: "markdown", text: line.replace(/^#{1,3}\s+/, "") };
    }
    const nl = numberedLevel(line);
    if (nl === 1 && line.length < 100) return { line, level: 1, reason: "numbered", text: line };
    if (nl === 2) return { line, level: 2, reason: "numbered", text: line };
    if (nl >= 3) return { line, level: 3, reason: "numbered", text: line };
    if (isAllCapsHeading(line)) return { line, level: line.length < 40 ? 1 : 2, reason: "all-caps", text: line };
    if (/:\s*$/.test(line) && line.length < 80) return { line, level: 2, reason: "colon", text: line.replace(/:\s*$/, "") };
    const prevBlank = idx === 0 || !((lines[idx - 1] || "").trim());
    const nextBlank = idx === lines.length - 1 || !((lines[idx + 1] || "").trim());
    if (prevBlank && nextBlank && line.length < 60 && !/[.!?]$/.test(line)) return { line, level: 2, reason: "standalone", text: line };
    if (idx < 3 && prevBlank && line.length < 90 && !/[.!?]$/.test(line)) return { line, level: 1, reason: "title", text: line };
    return { line: raw, level: 0, reason: "body" };
  });
}
export function cleanupParagraphs(text) {
  if (!text) return "";
  let t = (text || "").replace(/\r\n?/g, "\n");
  t = t.replace(/[ \t]+/g, " ");
  t = t.replace(/ +\n/g, "\n");
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/-\n(?=[a-z])/g, "");
  t = t.replace(/\s+([,.!?;:])/g, "$1");
  return t.trim();
}
export function isBulletLine(line) { return /^[\-\*\u2022]\s+\S/.test(line.trim()); }
export function isNumberedListLine(line) { return /^\d+[\.\)]\s+\S/.test(line.trim()); }
export function buildTOC(detected) {
  return detected.filter((d) => d.level > 0).map((d, i) => ({ index: i + 1, level: d.level, text: (d.text || d.line || "").replace(/^#{1,3}\s+/, "").trim() }));
}
export function smartFormatPreview(rawText, opts = {}) {
  const cleaned = cleanupParagraphs(rawText || "");
  const lines = cleaned.split("\n");
  const detected = opts.autoHeadings === false ? lines.map((line) => ({ line, level: 0, reason: "off" })) : detectHeadings(lines);
  const toc = buildTOC(detected);
  return { cleaned, detected, toc, stats: { headings: toc.length, characters: cleaned.length, paragraphs: lines.filter((l) => l.trim()).length } };
}
