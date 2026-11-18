/* workforce2100.org forms: Tracking Study interest list and profile correction requests.
   Both post to one Google Apps Script web app. Until FORMS_URL is set, the forms stay hidden
   and the pages fall back to email links. */
(function () {
  var FORMS_URL = 'https://script.google.com/macros/s/AKfycbzP8vs7tUEhD-rvPac8ffLboZB62KmFjSqAMJGALViiIkRTs82ciLsXjvd22f2w-FYr5A/exec';
  var EMAIL = 'athalass@gmail.com';
  var t0 = Date.now();

  var ROLES = ['President or chancellor', 'Provost or chief academic officer', 'Other senior leader',
    'Institutional research or planning', 'Association or system office', 'Researcher', 'Other'];
  var SECTIONS = ['Labor market', 'Local industries', 'Program map', 'Stress test', 'Competition',
    'Adult learners', 'Institution details', 'Other'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function opts(list, first) { return (first ? '<option value="">' + first + '</option>' : '') + list.map(function (r) { return '<option>' + esc(r) + '</option>'; }).join(''); }
  function val(f, n) { var el = f.elements[n]; if (!el) return ''; if (el.type === 'checkbox') return el.checked ? 'yes' : ''; return (el.value || '').trim(); }
  function okEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  var TRAP = '<div class="wf-trap" aria-hidden="true"><label>Leave this empty <input name="website" tabindex="-1" autocomplete="off"></label></div>';

  function send(f, form, fields, onOk, mailFallback) {
    var note = f.querySelector('.wf-note'), btn = f.querySelector('button[type=submit]'), label = btn.textContent;
    var data = new URLSearchParams();
    data.append('form', form);
    fields.concat(['website']).forEach(function (n) { data.append(n, val(f, n)); });
    data.append('t0', t0); data.append('page', location.href);
    btn.disabled = true; btn.textContent = 'Sending…'; note.textContent = '';
    var fail = function () {
      btn.disabled = false; btn.textContent = label;
      note.innerHTML = 'Something went wrong sending the form. Please <a href="' + mailFallback() + '">email us instead</a>.';
    };
    fetch(FORMS_URL, { method: 'POST', body: data }).then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.ok) onOk(j); else fail(); }).catch(fail);
  }
  function mailto(subj, body) { return 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(body); }

  // ---------- Tracking Study interest list ----------
  function mountInterest(box) {
    if (!box || !FORMS_URL) return;
    var qs = new URLSearchParams(location.search);
    box.innerHTML =
      '<form class="wf-form" novalidate>' +
      '<div class="wf-grid">' +
      '<label>Name<input name="name" autocomplete="name" required></label>' +
      '<label>Title<input name="title" autocomplete="organization-title" placeholder="e.g. Provost"></label>' +
      '<label>Role<select name="role">' + opts(ROLES, 'Choose one') + '</select></label>' +
      '<label>Email<input name="email" type="email" autocomplete="email" required></label>' +
      '<label class="wide">Institution or organization<input name="institution" autocomplete="organization" required value="' + esc(qs.get('i') || '') + '"></label>' +
      '<label>State<input name="state" value="' + esc(qs.get('st') || '') + '"></label>' +
      '<label class="full">Anything you would like us to know (optional)<textarea name="note" rows="3"></textarea></label>' +
      '<label class="full wf-check"><input type="checkbox" name="consent"> <span>Please contact me about the Work 2035 Tracking Study. I understand this list is used only for the study, is never shared, and that I can ask to be removed at any time.</span></label>' +
      '</div>' + TRAP +
      '<p class="wf-actions"><button type="submit" class="btn btn-primary">Notify me when it opens</button> <span class="wf-note" role="status" aria-live="polite"></span></p>' +
      '<p class="wf-small">Signing up is not agreeing to take part. You will get an invitation, with full study information, after ethics review. See the <a href="privacy.html">Privacy notice</a>.</p>' +
      '</form>';
    var f = box.querySelector('form');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = f.querySelector('.wf-note');
      var miss = ['name', 'email', 'institution'].filter(function (n) { return !val(f, n); })[0];
      if (miss) { f.elements[miss].focus(); note.textContent = 'Please add your name, email and institution.'; return; }
      if (!okEmail(val(f, 'email'))) { f.elements.email.focus(); note.textContent = 'Please check your email address.'; return; }
      if (!val(f, 'consent')) { f.elements.consent.focus(); note.textContent = 'Please tick the box so we may contact you.'; return; }
      send(f, 'interest', ['name', 'title', 'role', 'email', 'institution', 'state', 'note', 'consent'], function () {
        box.innerHTML = '<div class="wf-done" role="status"><b>Thank you, you are on the list.</b> We will write to ' + esc(val(f, 'email')) + ' when recruitment opens, expected in spring 2027.</div>';
      }, function () {
        return mailto('Work 2035 Tracking Study: notify me', 'Name: ' + val(f, 'name') + '\nTitle: ' + val(f, 'title') + '\nInstitution: ' + val(f, 'institution') + '\nState: ' + val(f, 'state') + '\n\n' + val(f, 'note'));
      });
    });
    var alt = document.querySelectorAll('[data-wf-hide-when-form]');
    [].forEach.call(alt, function (el) { el.hidden = true; });
    box.hidden = false;
  }

  // ---------- correction request on a college profile ----------
  function correctionLinkAttrs(name, st, mailHref) {
    return FORMS_URL ? 'href="#fix" data-wf-fix' : 'href="' + mailHref + '"';
  }
  function mountCorrection(container, ctx) {
    if (!container || !FORMS_URL) return;
    var wrap = document.createElement('div');
    wrap.className = 'wf-fixbox'; wrap.id = 'fix'; wrap.hidden = true;
    wrap.innerHTML =
      '<h3>Report an error or request a correction</h3>' +
      '<p class="wf-small" style="margin-top:0">For ' + esc(ctx.name) + ' (' + esc(ctx.st) + '). Every request gets a reply when you leave an email, and each correction is listed in the <a href="#corrections">corrections log</a> without your name.</p>' +
      '<form class="wf-form" novalidate><div class="wf-grid">' +
      '<label>Section<select name="section">' + opts(SECTIONS, 'Choose one') + '</select></label>' +
      '<label>Your email (for our reply, optional)<input name="email" type="email" autocomplete="email"></label>' +
      '<label class="full">What looks wrong? Name the number or row.<textarea name="wrong" rows="3" required></textarea></label>' +
      '<label class="full">What should it be, and your source if you have one (optional)<textarea name="should" rows="3"></textarea></label>' +
      '<fieldset class="full wf-radio"><legend>May we list this correction in the public log, without your name?</legend>' +
      '<label><input type="radio" name="listok" value="yes" checked> Yes</label><label><input type="radio" name="listok" value="no"> No</label></fieldset>' +
      '<input type="hidden" name="institution" value="' + esc(ctx.name) + '"><input type="hidden" name="state" value="' + esc(ctx.st) + '">' +
      '</div>' + TRAP +
      '<p class="wf-actions"><button type="submit" class="btn btn-primary">Send request</button> <button type="button" class="pf-btn" data-wf-close>Cancel</button> <span class="wf-note" role="status" aria-live="polite"></span></p>' +
      '</form>';
    container.appendChild(wrap);
    var f = wrap.querySelector('form');
    var open = function (e) { if (e) e.preventDefault(); wrap.hidden = false; wrap.scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(function () { f.elements.section.focus({ preventScroll: true }); }, 300); };
    [].forEach.call(document.querySelectorAll('[data-wf-fix]'), function (a) { a.addEventListener('click', open); });
    wrap.querySelector('[data-wf-close]').addEventListener('click', function () { wrap.hidden = true; });
    if (location.hash === '#fix') open();
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = f.querySelector('.wf-note');
      if (!val(f, 'wrong')) { f.elements.wrong.focus(); note.textContent = 'Please describe what looks wrong.'; return; }
      if (val(f, 'email') && !okEmail(val(f, 'email'))) { f.elements.email.focus(); note.textContent = 'Please check your email address.'; return; }
      var listok = (f.querySelector('input[name=listok]:checked') || {}).value || 'yes';
      send(f, 'correction', ['institution', 'state', 'section', 'email', 'wrong', 'should', 'listok'], function (j) {
        wrap.innerHTML = '<div class="wf-done" role="status"><b>Thank you, we have your request' + (j.ref ? ' (reference ' + esc(j.ref) + ')' : '') + '.</b> ' +
          (val(f, 'email') ? 'We will reply to ' + esc(val(f, 'email')) + '.' : 'We will review it and list any correction in the corrections log.') + '</div>';
      }, function () {
        return mailto('Correction request: ' + ctx.name + ' (' + ctx.st + ')', 'Page: ' + location.href + '\nSection: ' + val(f, 'section') + '\n\nWhat looks wrong:\n' + val(f, 'wrong') + '\n\nWhat it should be / source:\n' + val(f, 'should') + '\n\nOK to list publicly: ' + listok);
      });
    });
  }

  window.W2100Forms = { enabled: !!FORMS_URL, mountInterest: mountInterest, mountCorrection: mountCorrection, correctionLinkAttrs: correctionLinkAttrs };
  var go = function () { mountInterest(document.getElementById('notify-form')); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
