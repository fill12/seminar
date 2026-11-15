// Google Apps Script - ito ang "backend" (database = Google Sheet).
const ADMIN_PASSWORD    = 'NVC2026';   // PALITAN BAGO I-DEPLOY
const REGISTRATION_OPEN = true;               // false = sarado na ang registration
const SHEET_NAME        = 'Registrations';

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange('A:F').setNumberFormat('@');
    sh.appendRow(['id', 'name', 'email', 'registered_at', 'views', 'first_viewed']);
    sh.setFrozenRows(1);
  }
  return sh;
}
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function now_() { return Utilities.formatDate(new Date(), 'Asia/Manila', 'yyyy-MM-dd HH:mm:ss'); }
function rows_() {
  const v = sheet_().getDataRange().getValues(); v.shift();
  return v.filter(r => r[0]).map((r, i) => ({
    row: i + 2, id: String(r[0]), name: String(r[1]), email: String(r[2]),
    registered_at: String(r[3]), views: Number(r[4]) || 0, first_viewed: String(r[5] || '')
  }));
}
function cleanName_(s) {
  s = String(s || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (s && (s === s.toLowerCase() || s === s.toUpperCase()))
    s = s.toLowerCase().replace(/(^|[\s\-'.])([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase());
  return s;
}

function doGet(e) {
  const p = e.parameter || {};
  if (p.action !== 'cert') return out_({ ok: true, message: 'Seminar certificate API is running.' });
  const id = String(p.id || '');
  if (!/^[a-f0-9]{12}$/.test(id)) return out_({ ok: false, error: 'not_found' });
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const r = rows_().find(x => x.id === id);
    if (!r) return out_({ ok: false, error: 'not_found' });
    if (p.noview !== '1') {
      const sh = sheet_();
      sh.getRange(r.row, 5).setValue(String(r.views + 1));
      if (!r.first_viewed) sh.getRange(r.row, 6).setValue(now_());
    }
    return out_({ ok: true, id: r.id, name: r.name });
  } finally { lock.releaseLock(); }
}

function doPost(e) {
  let b = {};
  try { b = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, error: 'bad_request' }); }

  if (b.action === 'register') {
    if (!REGISTRATION_OPEN) return out_({ ok: false, error: 'Registration is closed.' });
    if (b.website) return out_({ ok: false, error: 'Something went wrong. Please try again.' });   // honeypot
    const name = cleanName_(b.name), email = String(b.email || '').trim();
    if (name.length < 2) return out_({ ok: false, error: 'Please enter your full name.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return out_({ ok: false, error: 'Please enter a valid email address.' });
    const lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      const old = rows_().find(r => r.email.toLowerCase() === email.toLowerCase());
      if (old) return out_({ ok: true, id: old.id, name: old.name });
      const id = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
      sheet_().appendRow([id, name, email, now_(), '0', '']);
      return out_({ ok: true, id: id, name: name });
    } finally { lock.releaseLock(); }
  }

  // Admin actions
  if (b.password !== ADMIN_PASSWORD) return out_({ ok: false, error: 'Wrong password.' });
  if (b.action === 'list') return out_({ ok: true, people: rows_().reverse() });
  if (b.action === 'delete') {
    const lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      const r = rows_().find(x => x.id === String(b.id));
      if (r) sheet_().deleteRow(r.row);
      return out_({ ok: true });
    } finally { lock.releaseLock(); }
  }
  return out_({ ok: false, error: 'unknown_action' });
}
