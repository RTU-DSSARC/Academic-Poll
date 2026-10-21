/**
 * RTU Program Needs Poll — Google Apps Script backend
 * Data Science and Smart Analytics Research Center
 *
 * Receives poll submissions from the GitHub Pages site and writes them to
 * the Google Sheet this script is attached to.
 *   • "Responses" sheet: one row per respondent. A respondent who submits
 *     again from the same device updates their row instead of adding one.
 *   • "Summary" sheet: live formulas (mean, count, % rating 4–5) per program.
 *
 * Setup: see README.md. Run setup() once, then Deploy → New deployment → Web app.
 */

const PROGRAMS = [
  ['dsa',    'BS Data Science and Analytics'],
  ['bsba',   'BSBA Business Analytics'],
  ['psci',   'BS Planetary Science'],
  ['met',    'BS Meteorology'],
  ['drrm',   'BS Disaster Risk Reduction Management'],
  ['iss',    'BS Innovation and Sustainability Science'],
  ['daet',   'BS Data Analytics Engineering Technology'],
  ['gdba',   'Graduate Diploma in Business Analytics'],
  ['gdea',   'Graduate Diploma in Engineering Analytics'],
  ['maese',  'Master of Arts in Earth and Space Education'],
  ['phdese', 'PhD in Earth and Space Education']
];
const ROLES = ['Senior high school student', 'College student', 'Graduate or working professional',
  'Industry / employer', 'Community / LGU / NGO', 'Faculty / educator', 'Parent or guardian', 'Other'];

const RESP = 'Responses';
const SUMM = 'Summary';
const FIXED_BEFORE = ['Respondent ID', 'First submitted', 'Last updated', 'Times submitted', 'Role'];
const FIXED_AFTER = ['Suggested program', 'Comment'];

function headers_() {
  return FIXED_BEFORE
    .concat(PROGRAMS.map(p => 'NEED · ' + p[1]))
    .concat(PROGRAMS.map(p => 'ENROLL · ' + p[1]))
    .concat(FIXED_AFTER);
}

/** Run once from the Apps Script editor to create and format both sheets. */
function setup() {
  const ss = SpreadsheetApp.getActive();
  const h = headers_();
  let sh = ss.getSheetByName(RESP) || ss.insertSheet(RESP, 0);
  sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold').setWrap(true)
    .setBackground('#1f4fc4').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.setFrozenColumns(1);
  sh.setColumnWidths(6, PROGRAMS.length * 2, 110);
  buildSummary_(ss);
  const first = ss.getSheets().find(s => ![RESP, SUMM].includes(s.getName()) && s.getLastRow() === 0);
  if (first) ss.deleteSheet(first);
}

function buildSummary_(ss) {
  const sm = ss.getSheetByName(SUMM) || ss.insertSheet(SUMM, 1);
  sm.clear();
  sm.getRange('A1').setValue('RTU Program Needs Poll — Summary (updates automatically)').setFontWeight('bold').setFontSize(13);
  sm.getRange('A2').setValue('NEED: "This program responds to a real and growing need of industry, the community, and future careers." (1 Strongly disagree – 5 Strongly agree)');
  sm.getRange('A3').setValue('ENROLL: "Would you, or someone you know, take this program?" (1 Definitely not – 5 Definitely yes)');
  sm.getRange('A4').setFormula('="Respondents: "&COUNTA(' + RESP + '!A2:A)');
  const head = ['Program', 'Need · mean', 'Need · n', 'Need · % 4–5', 'Enroll · mean', 'Enroll · n', 'Enroll · % 4–5'];
  sm.getRange(6, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#f2c318');
  const rows = PROGRAMS.map((p, i) => {
    const need = colLetter_(FIXED_BEFORE.length + 1 + i);
    const enr = colLetter_(FIXED_BEFORE.length + 1 + PROGRAMS.length + i);
    const r = rng => RESP + '!' + rng + '2:' + rng;
    return [p[1],
      '=IFERROR(AVERAGE(' + r(need) + '),"")', '=COUNT(' + r(need) + ')', '=IFERROR(COUNTIF(' + r(need) + ',">=4")/COUNT(' + r(need) + '),"")',
      '=IFERROR(AVERAGE(' + r(enr) + '),"")', '=COUNT(' + r(enr) + ')', '=IFERROR(COUNTIF(' + r(enr) + ',">=4")/COUNT(' + r(enr) + '),"")'];
  });
  sm.getRange(7, 1, rows.length, head.length).setValues(rows);
  sm.getRange(7, 2, rows.length, 1).setNumberFormat('0.00');
  sm.getRange(7, 5, rows.length, 1).setNumberFormat('0.00');
  sm.getRange(7, 4, rows.length, 1).setNumberFormat('0%');
  sm.getRange(7, 7, rows.length, 1).setNumberFormat('0%');
  sm.setColumnWidth(1, 340);
  sm.setFrozenRows(6);
}

function colLetter_(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/** Text that starts with = + - @ would run as a formula in Sheets; neutralise it. */
function clean_(v, max) {
  let s = String(v == null ? '' : v).slice(0, max).trim();
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}
function score_(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : '';
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return json_({ ok: true, service: 'RTU Program Needs Poll', time: new Date().toISOString() });
}

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Bad request' }); }

  const id = clean_(d.respondentId, 64);
  if (!/^[A-Za-z0-9\-]{8,64}$/.test(id)) return json_({ ok: false, error: 'Missing respondent id' });
  if (!ROLES.includes(d.role)) return json_({ ok: false, error: 'Unknown role' });
  const need = PROGRAMS.map(p => score_((d.ratings || {})[p[0]]));
  const enroll = PROGRAMS.map(p => score_((d.enroll || {})[p[0]]));
  if (!need.concat(enroll).some(v => v !== '')) return json_({ ok: false, error: 'No ratings' });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActive();
    let sh = ss.getSheetByName(RESP);
    if (!sh) { setup(); sh = ss.getSheetByName(RESP); }
    const now = new Date();
    const last = sh.getLastRow();
    let rowIdx = -1, first = now, times = 1;
    if (last > 1) {
      const ids = sh.getRange(2, 1, last - 1, 1).getValues();
      const k = ids.findIndex(r => r[0] === id);
      if (k >= 0) {
        rowIdx = k + 2;
        const prev = sh.getRange(rowIdx, 2, 1, 3).getValues()[0];
        first = prev[0] || now;
        times = (Number(prev[2]) || 1) + 1;
      }
    }
    const row = [id, first, now, times, d.role].concat(need, enroll, [clean_(d.suggest, 160), clean_(d.comment, 1000)]);
    if (rowIdx > 0) sh.getRange(rowIdx, 1, 1, row.length).setValues([row]);
    else sh.appendRow(row);
    return json_({ ok: true, updated: rowIdx > 0 });
  } finally {
    lock.releaseLock();
  }
}
