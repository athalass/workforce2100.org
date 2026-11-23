/* Career Bridge Finder: workforce2100.org
   Data: data/bridges/{ST}.json (tools/bridges/build_bridges.py), county split from data/briefs/{ST}.json */
(function () {
  var V = '20261123';
  var $ = function (id) { return document.getElementById(id); };
  var st = $('bf-st'), q = $('bf-q'), list = $('bf-list'), role = $('bf-role'), root = $('bf-root'), tryp = $('bf-try');
  var IX = [], D = null, BR = null, CUR = null, LIST = [];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function N(x) { return x == null ? '—' : Math.round(x).toLocaleString('en-US'); }
  function K(x) { if (x == null) return '—'; var a = Math.abs(x); return a >= 1000 ? (Math.round(x / 100) * 100).toLocaleString('en-US') : Math.round(x).toLocaleString('en-US'); }
  function P(x, d) { return x == null ? '—' : (x * 100).toFixed(d == null ? 0 : d) + '%'; }
  function SP(x) { return x == null ? '—' : (x >= 0 ? '+' : '−') + Math.abs(x * 100).toFixed(0) + '%'; }
  function $$(x) { return x == null ? '—' : '$' + (Math.round(x / 100) * 100).toLocaleString('en-US'); }
  function short(t) { return t.replace(/, Except .*$/, '').replace(/, All Other$/, ' (other)'); }
  function cls(x) { return x == null ? '' : x < 0 ? 'neg' : 'pos'; }
  function get(u) { return fetch(u + '?v=' + V).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function O(s) { var o = D.occ[s]; return o && { soc: s, t: o[0], grp: o[1], jobs: o[2], wage: o[3], ai: o[4], chg: o[5], slow: o[6], pays: o[7], out: o[8], br: o[9], weak: o[10] || 0 }; }

  // ---------- state and search ----------
  get('data/bridges/index.json').then(function (ix) {
    IX = ix;
    st.insertAdjacentHTML('beforeend', ix.map(function (r) { return '<option value="' + r[0] + '">' + esc(r[1]) + '</option>'; }).join(''));
    var p = new URLSearchParams(location.search);
    if (p.get('r')) role.value = p.get('r');
    if (p.get('st')) { st.value = p.get('st').toUpperCase(); loadState(st.value, p.get('o')); }
  });
  st.addEventListener('change', function () { CUR = null; root.innerHTML = ''; loadState(st.value); push(); });
  role.addEventListener('change', function () { if (CUR) show(CUR); push(); });

  function loadState(ab, soc) {
    if (!ab) { q.disabled = true; tryp.innerHTML = ''; return; }
    q.disabled = true; q.placeholder = 'Loading…';
    get('data/bridges/' + ab + '.json').then(function (d) {
      D = d; BR = null;
      LIST = Object.keys(d.occ).map(O).sort(function (a, b) { return b.jobs - a.jobs; });
      q.disabled = false; q.placeholder = 'Type a job title, such as bookkeeping or cashier'; q.value = '';
      var ex = LIST.filter(function (o) { return o.br.length; }).slice(0, 4);
      tryp.innerHTML = 'Try: ' + ex.map(function (o) { return '<a href="#" data-soc="' + o.soc + '">' + esc(short(o.t)) + '</a>'; }).join(' · ');
      if (soc && d.occ[soc]) show(O(soc));
    }).catch(function () { root.innerHTML = '<div class="wrap bf-empty">Sorry, the data for this state could not be loaded.</div>'; });
  }
  tryp.addEventListener('click', function (e) { var a = e.target.closest('a[data-soc]'); if (!a) return; e.preventDefault(); pick(a.dataset.soc); });

  function words(s) { return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean); }
  q.addEventListener('input', function () {
    var w = words(q.value);
    if (!w.length || !D) { list.hidden = true; return; }
    var hits = LIST.filter(function (o) { var t = o.t.toLowerCase(); return w.every(function (x) { return t.indexOf(x) >= 0; }); }).slice(0, 12);
    list.innerHTML = hits.length ? hits.map(function (o) {
      return '<li><a href="#" data-soc="' + o.soc + '"><b>' + esc(o.t) + '</b><span>' + K(o.jobs) + ' jobs · ' + SP(o.chg) + ' to 2035' + (o.br.length ? ' · <em>bridges</em>' : '') + '</span></a></li>';
    }).join('') : '<li class="muted">No occupation matches. Try a shorter word.</li>';
    list.hidden = false;
  });
  list.addEventListener('click', function (e) { var a = e.target.closest('a[data-soc]'); if (!a) return; e.preventDefault(); pick(a.dataset.soc); });
  document.addEventListener('click', function (e) { if (!e.target.closest('.bf-occ')) list.hidden = true; });
  $('bf-form').addEventListener('submit', function (e) { e.preventDefault(); var a = list.querySelector('a[data-soc]'); if (a) pick(a.dataset.soc); });
  root.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-soc]'); if (a) { e.preventDefault(); pick(a.dataset.soc); return; }
    if (e.target.closest('#bf-csv')) { e.preventDefault(); csv(); }
  });

  function pick(soc) { list.hidden = true; var o = O(soc); q.value = o.t; show(o); push(); window.scrollTo({ top: root.getBoundingClientRect().top + scrollY - 70, behavior: 'smooth' }); }
  function push() {
    var p = new URLSearchParams(); if (st.value) p.set('st', st.value); if (CUR) p.set('o', CUR.soc); if (role.value !== 'w') p.set('r', role.value);
    history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
  }

  // ---------- results ----------
  var TYPE = { Close: 'Most skills carry over, no extra training, similar or better pay.', Stretch: 'At least half the skills carry over, with some training.', Retrain: 'Longer training, fewer skills in common, or lower pay.' };
  var TIP = {
    w: 'These are starting points, not the only options. A career counselor at your local American Job Center or community college can help you weigh them.',
    c: 'Use the skills in common and the training lines to plan next steps with a client. Retrain options usually need a funded training plan.',
    b: 'The panel below shows where this occupation\'s displaced workers are expected to go, and the retraining pool by county.'
  };
  function kpi(b, s, sm, c) { return '<div class="bf-kpi"><b' + (c ? ' class="' + c + '"' : '') + '>' + b + '</b><span>' + s + '</span>' + (sm ? '<small>' + sm + '</small>' : '') + '</div>'; }
  function lines(s, n) {
    if (!s) return '';
    var a = String(s).split(/;\s*/).filter(Boolean), more = a.length - n;
    return '<ul>' + a.slice(0, n).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' + (more > 0 ? '<p class="muted sm">and ' + more + ' more</p>' : '');
  }

  function show(o) {
    CUR = o;
    var h = '<section class="bf-sec"><div class="wrap">' +
      '<p class="bf-eyebrow">' + esc(D.nm) + ' · ' + esc(o.grp) + '</p><h2>' + esc(o.t) + '</h2>' +
      '<div class="bf-kpis">' + kpi(K(o.jobs), 'jobs in ' + esc(D.nm) + ' today') +
      kpi(SP(o.chg), 'expected change to 2035', SP(o.slow) + ' if the recovery is slow', cls(o.chg)) +
      kpi(P(o.ai), 'of the work AI can take on by 2035') + kpi($$(o.wage), 'median wage in ' + esc(D.nm)) + '</div>' +
      '<p class="bf-tip">' + TIP[role.value] + '</p></div></section>';

    if (o.br.length) {
      h += '<section class="bf-sec bf-tint"><div class="wrap"><h2>Your ' + (o.br.length === 3 ? 'three ' : o.br.length === 2 ? 'two ' : '') + 'closest bridge' + (o.br.length > 1 ? 's' : '') + '</h2>' +
        '<p class="intro">Growing occupations in ' + esc(D.nm) + ' that use the most of the same skills, ranked by our model. Compare pay, training time and outlook.</p><div class="bf-cards">' +
        o.br.map(function (b, i) { return card(b, i, o); }).join('') + '</div></div></section>';
    } else {
      var into = LIST.filter(function (s) { return s.br.some(function (b) { return b.soc === o.soc; }); });
      h += '<section class="bf-sec bf-tint"><div class="wrap"><h2>' + (o.chg >= 0 ? 'This occupation is expected to grow or hold' : o.weak ? 'No strong bridge for this occupation' : 'No bridge listed for this occupation') + '</h2>' +
        '<p class="intro">' + (o.chg >= 0 ? 'According to our model and today\'s data, jobs in this occupation are not expected to shrink in ' + esc(D.nm) + ' by 2035, so we do not list bridges away from it. The work itself may still change: AI can take on ' + P(o.ai) + ' of it.'
          : o.weak ? 'The closest growing occupations in ' + esc(D.nm) + ' share less than 40% of the skills this job uses, so we do not show them. A move from here usually means starting new training; a career counselor can help find the best fit.' : 'Our model lists bridges for the occupations expected to shrink the most in each state. This one is not among them.') + '</p>' +
        (into.length ? '<h3 class="bf-h3">Workers from these shrinking occupations may move into it</h3><ul class="bf-into">' + into.slice(0, 8).map(function (s) { return '<li><a href="#" data-soc="' + s.soc + '">' + esc(s.t) + '</a> <span class="muted">· ' + K(s.jobs) + ' jobs · <span class="neg">' + SP(s.chg) + '</span></span></li>'; }).join('') + '</ul>' : '') +
        '</div></section>';
    }
    h += board(o);
    root.innerHTML = h;
    if (role.value === 'b') { var p = root.querySelector('#bf-board'); if (p) root.insertBefore(p, root.children[1]); }
    loadCounties();
  }

  function card(b, i, o) {
    var pay = b.ratio == null ? '' : b.ratio >= 1.05 ? 'higher than now' : b.ratio >= 0.95 ? 'about the same as now' : 'lower than now';
    var train = [];
    if (b.np) train.push('<div><b>College programs</b> <span class="muted">' + N(b.np) + ' in ' + esc(D.nm) + ', ' + N(b.nc) + ' graduates a year</span>' + lines(b.progs, 3) + (b.ctys ? '<p class="muted sm">Offered in: ' + esc(b.ctys) + '</p>' : '') + '</div>');
    if (b.ne) train.push('<div><b>Short-term training</b> <span class="muted">' + N(b.ne) + ' program' + (b.ne > 1 ? 's' : '') + ' from ' + N(b.nep) + ' provider' + (b.nep > 1 ? 's' : '') + (b.weeks ? ', typically ' + N(b.weeks) + ' weeks' : '') + (b.tuition ? ', about ' + $$(b.tuition) : '') + '</span>' + lines(b.etpl, 3) + '</div>');
    if (b.appr) train.push('<div><b>Apprenticeship</b>' + lines(b.appr, 3) + '</div>');
    if (!train.length) train.push('<div class="muted">No program at this level is listed in ' + esc(D.nm) + '. Check with a local college or American Job Center.</div>');
    return '<article class="bf-card bf-' + (b.type || '').toLowerCase() + '">' +
      '<p class="bf-rank">Bridge ' + (i + 1) + ' <span class="bf-type" title="' + esc(TYPE[b.type] || '') + '">' + esc(b.type || '') + '</span></p>' +
      '<h3><a href="#" data-soc="' + b.soc + '">' + esc(b.t) + '</a></h3>' +
      '<p class="bf-typetext">' + esc(TYPE[b.type] || '') + '</p>' +
      '<dl class="bf-facts">' +
      '<div><dt>Skills in common</dt><dd>' + P(b.cov) + '</dd></div>' +
      '<div><dt>Change to 2035</dt><dd class="' + cls(b.chg) + '">' + SP(b.chg) + '</dd></div>' +
      '<div><dt>Median wage</dt><dd>' + $$(b.wage) + '</dd></div>' +
      '<div><dt>Pay compared with now</dt><dd>' + (pay || '—') + '</dd></div>' +
      '<div><dt>New jobs to 2035</dt><dd>' + K(b.add) + '</dd></div>' +
      '<div><dt>Extra training</dt><dd>' + (b.months ? N(b.months) + ' months' : 'none needed') + '</dd></div>' +
      '<div><dt>Entry level</dt><dd>' + esc(b.fit || '—') + '</dd></div>' +
      '<div><dt>Work AI can take on</dt><dd>' + P(b.ai) + '</dd></div>' +
      '</dl>' +
      (b.have && b.have.length ? '<p class="bf-sk"><b>You already have</b>' + b.have.map(function (s) { return '<span class="chip have">' + esc(s) + '</span>'; }).join('') + '</p>' : '') +
      (b.need && b.need.length ? '<p class="bf-sk"><b>Skills to add</b>' + b.need.map(function (s) { return '<span class="chip need">' + esc(s) + '</span>'; }).join('') + '</p>' : '') +
      '<div class="bf-train"><h4>How to get there</h4>' + train.join('') + '</div></article>';
  }

  function board(o) {
    var L = D.lost || 1;
    var f = [['Change occupation in the state', D.local / L, '#1F5F8B'], ['Move to another state', D.away / L, '#5D88AC'], ['Stay without a matching job', D.stay / L, '#B5483B']];
    var lost = o.chg < 0 ? -o.chg * o.jobs : 0;
    return '<section class="bf-sec" id="bf-board"><div class="wrap"><h2>For workforce boards and colleges</h2>' +
      '<p class="intro">' + (lost ? 'Our model expects about <b>' + K(lost) + '</b> fewer ' + esc(short(o.t).toLowerCase()) + ' jobs in ' + esc(D.nm) + ' by 2035. ' : '') +
      'Of all workers in ' + esc(D.nm) + ' who may need to change occupation by 2035, our model expects:</p>' +
      '<div class="bf-flow">' + f.map(function (x) { return '<div><b style="color:' + x[2] + '">' + P(x[1]) + '</b><span>' + x[0] + '</span><i style="width:' + (x[1] * 100).toFixed(1) + '%;background:' + x[2] + '"></i></div>'; }).join('') + '</div>' +
      '<div id="bf-counties"></div>' +
      '<p class="note">State-wide shares for all occupations, low and high cases in the <a href="brief.html?st=' + D.st + '">' + esc(D.nm) + ' brief</a>. The retraining pool counts residents in shrinking occupations who are likely to change occupation locally.</p></div></section>';
  }
  function loadCounties() {
    var box = $('bf-counties'); if (!box) return;
    (BR ? Promise.resolve(BR) : get('data/briefs/' + D.st + '.json').then(function (b) { BR = b; return b; })).then(function (b) {
      var C = Object.keys(b.counties).map(function (k) { var c = b.counties[k]; return [c.nm || k, c.lost, c.local, c.away, c.stay, c.pool, k]; }).sort(function (a, z) { return z[5] - a[5]; });
      box.innerHTML = '<h3 class="bf-h3">Retraining pool by county</h3><div class="tscroll"><table class="pf-table bf-ctab"><thead><tr><th>County</th><th class="r">Jobs lost in shrinking occupations</th><th class="r">Change occupation locally</th><th class="r">Move away</th><th class="r">Stay without a matching job</th><th class="r">Adult retraining pool</th></tr></thead><tbody>' +
        C.slice(0, 8).map(function (c) { return '<tr><td><a href="brief.html?st=' + D.st + '&amp;c=' + encodeURIComponent(c[6]) + '">' + esc(c[0]) + '</a></td><td class="r">' + N(c[1]) + '</td><td class="r">' + N(c[2]) + '</td><td class="r">' + N(c[3]) + '</td><td class="r">' + N(c[4]) + '</td><td class="r"><b>' + N(c[5]) + '</b></td></tr>'; }).join('') +
        '</tbody></table></div><p class="bf-dl"><a class="pf-btn" href="#" id="bf-csv">Download all ' + C.length + ' counties (CSV)</a></p>';
    }).catch(function () { box.innerHTML = ''; });
  }
  function csv() {
    if (!BR) return;
    var rows = [['county', 'jobs_lost_in_shrinking_occupations', 'change_occupation_locally', 'move_away', 'stay_without_matching_job', 'adult_retraining_pool']];
    Object.keys(BR.counties).forEach(function (k) { var c = BR.counties[k]; rows.push([c.nm || k, c.lost, c.local, c.away, c.stay, c.pool].map(function (v) { return typeof v === 'number' ? Math.round(v) : v; })); });
    var s = rows.map(function (r) { return r.map(function (v) { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([s], { type: 'text/csv' })); a.download = D.st + '_retraining_pool_by_county.csv'; a.click();
  }
})();
