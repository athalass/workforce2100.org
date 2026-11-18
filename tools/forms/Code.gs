/**
 * workforce2100.org: study interest list and correction requests.
 *
 * One script, two separate Google Sheets:
 *   1. "Work 2035 Tracking Study: interest list" (private; used only for the study)
 *   2. "College profiles: correction requests"     (working list behind the public corrections log)
 *
 * SETUP (once, about 5 minutes)
 *   1. Go to https://script.google.com while signed in as athalass@gmail.com and click "New project".
 *   2. Delete the sample code, paste this whole file, and click Save. Name the project
 *      "workforce2100.org forms".
 *   3. In the function menu at the top, choose "setup" and click Run. Approve access when Google asks
 *      (it needs to create the two Sheets and email you when something arrives).
 *      The log at the bottom shows the links to the two new Sheets; they are also in your Drive.
 *   4. Click Deploy > New deployment > type "Web app".
 *        Execute as: Me
 *        Who has access: Anyone
 *      Click Deploy and copy the Web app URL (it ends in /exec). Send that URL to Claude.
 *
 * If you change this code later: Deploy > Manage deployments > Edit (pencil) > Version: New version
 * > Deploy. The URL stays the same.
 */

var NOTIFY = true;                 // email you when a form arrives
var MIN_SECONDS = 3;               // submissions faster than this are treated as bots

var SHEETS = {
  interest: {
    title: 'Work 2035 Tracking Study: interest list',
    tab: 'interest',
    columns: ['received_at', 'name', 'title', 'role', 'institution', 'state', 'email', 'note',
              'consent_to_contact', 'source_page', 'status', 'notes_internal']
  },
  correction: {
    title: 'College profiles: correction requests',
    tab: 'requests',
    columns: ['received_at', 'ref', 'institution', 'state', 'section', 'what_looks_wrong',
              'what_it_should_be_and_source', 'reply_email', 'ok_to_list_in_public_log', 'page',
              'status', 'reply_sent_on', 'fixed_in', 'public_log_text']
  }
};

var ROLES = ['President or chancellor', 'Provost or chief academic officer', 'Other senior leader',
             'Institutional research or planning', 'Association or system office', 'Researcher', 'Other'];
var SECTIONS = ['Labor market', 'Local industries', 'Program map', 'Stress test', 'Competition',
                'Adult learners', 'Institution details', 'Other'];

/** Run once from the editor to create both Sheets. Safe to run again. */
function setup() {
  Object.keys(SHEETS).forEach(function (k) {
    var sh = sheet_(k);
    Logger.log(SHEETS[k].title + ': ' + sh.getParent().getUrl());
  });
}

function doGet() {
  return ContentService.createTextOutput('The workforce2100.org forms collector is running.');
}

function doPost(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.website) return json_({ ok: true });                       // spam trap filled in: drop quietly
    var t0 = Number(p.t0 || 0);
    if (t0 && (Date.now() - t0) / 1000 < MIN_SECONDS) return json_({ ok: true });
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      if (p.form === 'interest') return json_(saveInterest_(p));
      if (p.form === 'correction') return json_(saveCorrection_(p));
      throw new Error('unknown form');
    } finally { lock.releaseLock(); }
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function saveInterest_(p) {
  var name = clean_(p.name, 120), email = clean_(p.email, 160), inst = clean_(p.institution, 200);
  if (!name || !inst || !validEmail_(email)) throw new Error('missing name, institution or email');
  if (p.consent !== 'yes') throw new Error('no consent');
  var row = [new Date(), name, clean_(p.title, 120), pick_(p.role, ROLES), inst, clean_(p.state, 40), email,
             clean_(p.note, 1500), 'yes', clean_(p.page, 300), 'new', ''];
  sheet_('interest').appendRow(row);
  notify_('Tracking Study: new interest from ' + inst,
          name + (p.title ? ', ' + p.title : '') + '\n' + inst + (p.state ? ' (' + p.state + ')' : '') + '\n' + email +
          (p.note ? '\n\n' + p.note : ''));
  return { ok: true };
}

function saveCorrection_(p) {
  var inst = clean_(p.institution, 200), wrong = clean_(p.wrong, 3000);
  if (!inst || !wrong) throw new Error('missing institution or description');
  var email = clean_(p.email, 160);
  if (email && !validEmail_(email)) throw new Error('bad email');
  var sh = sheet_('correction');
  var ref = 'C-' + Utilities.formatDate(new Date(), 'America/New_York', 'yyyyMMdd') + '-' + (sh.getLastRow());
  var row = [new Date(), ref, inst, clean_(p.state, 40), pick_(p.section, SECTIONS), wrong,
             clean_(p.should, 3000), email, p.listok === 'no' ? 'no' : 'yes', clean_(p.page, 400),
             'new', '', '', ''];
  sh.appendRow(row);
  notify_('Correction request ' + ref + ': ' + inst,
          'Section: ' + (p.section || '') + '\n\nWhat looks wrong:\n' + wrong +
          (p.should ? '\n\nWhat it should be / source:\n' + p.should : '') +
          '\n\nReply to: ' + (email || '(no email given)') + '\nOK to list publicly: ' + (p.listok === 'no' ? 'no' : 'yes') +
          '\nPage: ' + (p.page || ''));
  return { ok: true, ref: ref };
}

// ---------- helpers ----------
function sheet_(key) {
  var cfg = SHEETS[key], props = PropertiesService.getScriptProperties();
  var id = props.getProperty('sheet_' + key), ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) { ss = SpreadsheetApp.create(cfg.title); props.setProperty('sheet_' + key, ss.getId()); }
  var sh = ss.getSheetByName(cfg.tab);
  if (!sh) {
    sh = ss.getSheets()[0];
    sh.setName(cfg.tab);
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(cfg.columns);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, cfg.columns.length).setFontWeight('bold');
  }
  return sh;
}
function clean_(v, max) {
  v = String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  if (/^[=+\-@]/.test(v)) v = "'" + v;                               // stop spreadsheet formulas
  return v.slice(0, max);
}
function pick_(v, list) { v = String(v || ''); return list.indexOf(v) >= 0 ? v : ''; }
function validEmail_(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || ''); }
function notify_(subject, body) {
  if (!NOTIFY) return;
  try { MailApp.sendEmail(Session.getEffectiveUser().getEmail(), '[workforce2100.org] ' + subject, body); } catch (e) {}
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
