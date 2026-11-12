(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var fmtInt = function (x) { return Math.round(x).toLocaleString('en-US'); };
  var pct = function (x, dp) { return (x * 100).toFixed(dp == null ? 0 : dp) + '%'; };
  var spct = function (x) { var v = Math.round(x * 100); return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '%'; };
  var catChip = { 'Growing': 'chip-green', 'Stable': 'chip-gray', 'Moderate decline': 'chip-amber', 'Substantially reduced': 'chip-red', 'Eliminated': 'chip-red' };
  var tierChip = { 'Invest': 'chip-green', 'Reinvent': 'chip-blue', 'Consolidate or Review': 'chip-amber', 'Transfer-oriented': 'chip-gray' };
  var D = null;
  var st = { tab: 'occupations', olim: 25, plim: 25, meas: 'wi', sel: 'MD' };

  // ---------- Tabs ----------
  var TABS = ['occupations', 'stateimpact', 'programs', 'institutions', 'states', 'value'];
  function setTab(t, push) {
    if (TABS.indexOf(t) < 0) t = 'occupations';
    st.tab = t;
    Array.prototype.forEach.call(document.querySelectorAll('#tabs [data-tab]'), function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === t)); });
    TABS.forEach(function (x) { $('tab-' + x).hidden = !D || x !== t; });
    if (push) history.replaceState(null, '', '#' + t);
  }
  $('tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) setTab(b.getAttribute('data-tab'), true); });

  // ---------- Occupations ----------
  function renderOcc() {
    var q = $('oq').value.toLowerCase().trim(), g = $('og').value, c = $('oc').value, qd = $('oqd').value, s = $('os').value;
    var rows = D.occ.filter(function (o) {
      return (!q || o.t.toLowerCase().indexOf(q) >= 0 || o.s.indexOf(q) >= 0) && (g === 'all' || o.g === g) && (c === 'all' || o.c === c) && (qd === 'all' || o.q === qd);
    });
    var sorters = {
      r: function (a, b) { return b.r - a.r; }, n: function (a, b) { return a.n - b.n; }, e: function (a, b) { return b.e - a.e; },
      v: function (a, b) { return (b.v == null ? -999 : b.v) - (a.v == null ? -999 : a.v); }, t: function (a, b) { return a.t < b.t ? -1 : 1; }
    };
    rows.sort(sorters[s]);
    $('occCount').textContent = rows.length.toLocaleString('en-US') + ' of ' + D.occ.length + ' occupations' + (rows.length > st.olim ? ' · showing ' + st.olim : '');
    $('occBody').innerHTML = rows.slice(0, st.olim).map(function (o) {
      var v = o.v == null ? 'No data' : (o.v < 0 ? '−$' + Math.abs(o.v).toFixed(2) : '$' + o.v.toFixed(2));
      return '<tr><td style="min-width: 240px"><div style="font-weight: 600">' + esc(o.t) + '</div><div class="sub">' + esc(o.s) + ' · ' + esc(o.g) + '</div></td>' +
        '<td class="num">' + fmtInt(o.e) + '</td><td class="num">' + (o.w == null ? '—' : '$' + o.w.toFixed(2) + '/hr') + '</td>' +
        '<td style="min-width: 150px"><div class="bar"><div class="track" aria-hidden="true"><div class="fill" style="width: ' + Math.min(100, o.r / 0.45 * 100).toFixed(1) + '%"></div></div><span style="font-weight: 600; min-width: 40px; text-align: right">' + pct(o.r) + '</span></div></td>' +
        '<td style="min-width: 190px"><span class="chip ' + catChip[o.c] + '">' + spct(o.n) + ' · ' + esc(o.c) + '</span><div class="sub" style="margin-top: 6px">Range ' + spct(o.lo) + ' to ' + spct(o.hi) + '</div></td>' +
        '<td style="white-space: nowrap">' + esc(o.q) + '</td><td class="num">' + v + '</td></tr>';
    }).join('') || '<tr><td colspan="7" class="muted" style="text-align: center; padding: 28px">No occupations match. Try a different search or clear the filters.</td></tr>';
    $('occMore').hidden = rows.length <= st.olim;
  }
  ['oq', 'og', 'oc', 'oqd'].forEach(function (id) { $(id).addEventListener('input', function () { st.olim = 25; renderOcc(); }); });
  $('os').addEventListener('change', renderOcc);
  $('occMore').addEventListener('click', function () { st.olim += 50; renderOcc(); });

  // ---------- Programs ----------
  function renderProg() {
    var q = $('pq').value.toLowerCase().trim(), l = $('pl').value, t = $('pt').value, c = $('pc').value;
    var base = D.prog.filter(function (p) { return (!q || p.f.toLowerCase().indexOf(q) >= 0 || p.c.indexOf(q) >= 0) && (l === 'all' || p.l === l) && (c === 'all' || p.cc === c); });
    var rows = base.filter(function (p) { return t === 'all' || p.k === t; }).sort(function (a, b) { return b.n - a.n; });
    var counts = {}; base.forEach(function (p) { counts[p.k] = (counts[p.k] || 0) + 1; });
    $('tierSummary').innerHTML = ['Invest', 'Reinvent', 'Consolidate or Review', 'Transfer-oriented'].map(function (k) {
      return '<div style="background: var(--tint); border-radius: 8px; padding: 10px 14px; font-size: 14px"><span class="chip ' + tierChip[k] + '">' + k + '</span> <strong style="margin-left: 6px">' + (counts[k] || 0).toLocaleString('en-US') + '</strong></div>';
    }).join('');
    $('progCount').textContent = rows.length.toLocaleString('en-US') + ' program families, largest first' + (rows.length > st.plim ? ' · showing ' + st.plim : '');
    $('progBody').innerHTML = rows.slice(0, st.plim).map(function (p) {
      var col = p.cc === 'High' ? '#1F5F8B' : p.cc === 'Medium' ? '#5D88AC' : '#9DB3C6';
      return '<tr><td style="min-width: 260px"><div style="font-weight: 600">' + esc(p.f) + '</div><div class="sub">CIP ' + esc(p.c) + ' · ' + fmtInt(p.i) + ' institutions</div></td>' +
        '<td>' + (p.l === 'Bachelor' ? "Bachelor's" : esc(p.l)) + '</td><td class="num">' + fmtInt(p.n) + '</td><td class="num" style="font-weight: 600">' + spct(p.d) + '</td>' +
        '<td style="white-space: nowrap"><span class="chip ' + tierChip[p.k] + '">' + esc(p.k) + '</span></td>' +
        '<td style="min-width: 170px"><div class="bar"><div class="track" aria-hidden="true"><div class="fill" style="width: ' + Math.min(100, p.h * 100).toFixed(1) + '%; background: ' + col + '"></div></div><span style="min-width: 110px">' + pct(p.h) + ' · ' + esc(p.cc) + '</span></div></td></tr>';
    }).join('') || '<tr><td colspan="6" class="muted" style="text-align: center; padding: 28px">No programs match. Try a different search or clear the filters.</td></tr>';
    $('progMore').hidden = rows.length <= st.plim;
  }
  ['pq', 'pl', 'pt', 'pc'].forEach(function (id) { $(id).addEventListener('input', function () { st.plim = 25; renderProg(); }); });
  $('progMore').addEventListener('click', function () { st.plim += 50; renderProg(); });

  // ---------- States ----------
  var POS = { AK:[0,0],ME:[11,0],VT:[10,1],NH:[11,1],WA:[1,2],ID:[2,2],MT:[3,2],ND:[4,2],MN:[5,2],IL:[6,2],WI:[7,2],MI:[8,2],NY:[9,2],RI:[10,2],MA:[11,2],OR:[1,3],NV:[2,3],WY:[3,3],SD:[4,3],IA:[5,3],IN:[6,3],OH:[7,3],PA:[8,3],NJ:[9,3],CT:[10,3],CA:[1,4],UT:[2,4],CO:[3,4],NE:[4,4],MO:[5,4],KY:[6,4],WV:[7,4],VA:[8,4],MD:[9,4],DE:[10,4],AZ:[2,5],NM:[3,5],KS:[4,5],AR:[5,5],TN:[6,5],NC:[7,5],SC:[8,5],DC:[9,5],OK:[4,6],LA:[5,6],MS:[6,6],AL:[7,6],GA:[8,6],HI:[0,7],TX:[4,7],FL:[9,7] };
  var COLORS = ['#E3ECF4', '#B9D0E3', '#86AECE', '#4F86B3', '#1F5F8B'], FG = ['#16202A', '#16202A', '#16202A', '#FFFFFF', '#FFFFFF'];
  var MEAS = {
    wi: { label: 'Wages at stake (U.S. = 100)', note: 'Wages of the work AI can profitably take on, per worker-hour, compared with the U.S. average (The Price of Judgment). AI pays first where labor costs most, so high-wage states feel the change first.', fmt: function (s) { return s.wi.toFixed(0); } },
    sd: { label: 'Workers in shrinking occupations', note: 'Share of all workers whose occupation shrinks by 2035 and who may need to change occupation (Where Work Is Moving, our own model). Places differ through their mix of occupations.', fmt: function (s) { return pct(s.sd, 1); } }
  };
  function renderStates() {
    var m = st.meas, M = MEAS[m];
    $('measures').innerHTML = Object.keys(MEAS).map(function (k) { return '<button type="button" class="pill blue" data-m="' + k + '" aria-pressed="' + (k === m) + '">' + MEAS[k].label + '</button>'; }).join('');
    $('measureNote').textContent = M.note;
    var asc = D.states.slice().sort(function (a, b) { return a[m] - b[m]; });
    var bin = {}; asc.forEach(function (s, i) { bin[s.ab] = Math.min(4, Math.floor(i * 5 / asc.length)); });
    var ranked = asc.slice().reverse(); var rank = {}; ranked.forEach(function (s, i) { rank[s.ab] = i + 1; });
    $('map').innerHTML = D.states.filter(function (s) { return POS[s.ab]; }).map(function (s) {
      var p = POS[s.ab], b = bin[s.ab];
      return '<button type="button" class="tile" data-ab="' + s.ab + '" aria-pressed="' + (s.ab === st.sel) + '" aria-label="' + esc(s.nm) + ': ' + M.fmt(s) + '" title="' + esc(s.nm) + ': ' + M.fmt(s) + '" style="grid-column: ' + (p[0] + 1) + '; grid-row: ' + (p[1] + 1) + '; background: ' + COLORS[b] + '; color: ' + FG[b] + '">' + s.ab + '</button>';
    }).join('');
    $('legend').innerHTML = '<span>Lower</span>' + COLORS.map(function (c) { return '<i style="background: ' + c + '"></i>'; }).join('') + '<span>Higher</span><span class="muted" style="margin-left: 8px">Five equal groups of states</span>';
    var s = D.states.filter(function (x) { return x.ab === st.sel; })[0] || D.states[0];
    $('selPanel').innerHTML = '<div class="label" style="font-size: 12px; font-weight: 600; letter-spacing: 0.06em; color: var(--ink-3)">SELECTED STATE</div><div style="margin-top: 6px; font-family: var(--serif); font-size: 26px; font-weight: 700">' + esc(s.nm) + '</div>' +
      '<dl class="kv"><div><dt>Wages at stake</dt><dd>$' + s.ws.toFixed(2) + ' per worker-hour</dd></div><div><dt>Index (U.S. = 100)</dt><dd>' + s.wi.toFixed(0) + '</dd></div><div><dt>Workers in shrinking occupations</dt><dd>' + pct(s.sd, 1) + '</dd></div><div><dt>Number of workers</dt><dd>' + fmtInt(s.jd) + '</dd></div></dl>' +
      '<p class="muted" style="margin: 14px 0 0; font-size: 13px">Rank ' + rank[s.ab] + ' of 51 on the measure shown.</p>';
    $('top').innerHTML = ranked.slice(0, 10).map(function (x) { return '<li>' + esc(x.nm) + ' <span class="muted">· ' + M.fmt(x) + '</span></li>'; }).join('');
  }
  $('measures').addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (b) { st.meas = b.getAttribute('data-m'); renderStates(); } });
  $('map').addEventListener('click', function (e) { var b = e.target.closest('[data-ab]'); if (b) { st.sel = b.getAttribute('data-ab'); renderStates(); } });

  // ---------- Value ----------
  function renderValue() {
    var wf = [['Headline: AI always succeeds, priced at the median wage', 3009.7], ['Task priced at the entry-level (25th percentile) wage', 2211.7], ['Review done by senior (75th percentile) staff', 2035.3], ['Failed tasks redone by the worker, at observed success rates', 1038.9], ['Some errors slip past review', 649.0]];
    $('waterfall').innerHTML = wf.map(function (w, i) {
      return '<div class="wf"><div class="lbl">' + w[0] + '</div><div class="val"><div class="track" aria-hidden="true"><div class="fill" style="width: ' + (w[1] / 3009.7 * 100).toFixed(1) + '%; background: ' + (i === wf.length - 1 ? '#1F5F8B' : '#9DB3C6') + '"></div></div><span style="min-width: 76px; text-align: right; font-weight: 600">$' + Math.round(w[1]).toLocaleString('en-US') + 'B</span></div></div>';
    }).join('');
    var Q = [
      ['Person in charge', 'Errors are costly and the work is complex. AI supports the work; a person makes the call.'],
      ['AI assists', 'Errors are costly but the work is more routine. AI drafts; a person checks the result.'],
      ['AI recommends', 'Errors cost less but the work is complex. AI proposes; a person approves.'],
      ['AI runs', 'Errors cost less and the work is routine. AI does the work, with checks.']
    ];
    $('quads').innerHTML = Q.map(function (q) {
      var xs = D.occ.filter(function (o) { return o.q === q[0]; });
      var emp = xs.reduce(function (a, o) { return a + o.e; }, 0);
      var rs = xs.map(function (o) { return o.r; }).sort(function (a, b) { return a - b; });
      return '<div class="quad"><h3>' + q[0] + '</h3><div style="font-size: 14px; line-height: 1.5; color: var(--ink-2)">' + q[1] + '</div>' +
        '<div style="margin-top: 6px; font-size: 14px"><strong>' + xs.length + '</strong> occupations · <strong>' + (emp / 1e6).toFixed(1) + 'M</strong> jobs</div>' +
        '<div style="font-size: 14px">Median AI reduction by 2035: <strong>' + pct(rs[Math.floor(rs.length / 2)] || 0) + '</strong></div>' +
        '<button type="button" class="btn btn-light" data-q="' + q[0] + '" style="margin-top: 6px; align-self: flex-start; padding: 10px 14px; font-size: 14px; color: var(--blue) !important">See these occupations</button></div>';
    }).join('');
  }
  $('quads').addEventListener('click', function (e) {
    var b = e.target.closest('[data-q]'); if (!b) return;
    $('oqd').value = b.getAttribute('data-q'); st.olim = 25; renderOcc(); setTab('occupations', true); window.scrollTo(0, $('tabs').getBoundingClientRect().top + window.scrollY - 16);
  });

  // ---------- Load ----------
  fetch('data/work2035_data.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
    D = d;
    var groups = {}; d.occ.forEach(function (o) { groups[o.g] = 1; });
    $('og').insertAdjacentHTML('beforeend', Object.keys(groups).sort().map(function (g) { return '<option>' + esc(g) + '</option>'; }).join(''));
    $('loading').hidden = true;
    renderOcc(); renderProg(); renderStates(); renderValue();
    setTab((location.hash || '').replace('#', ''), false);
  }).catch(function () {
    $('loading').textContent = 'The data could not be loaded. Please refresh the page.';
  });
  window.addEventListener('hashchange', function () { if (D) setTab(location.hash.replace('#', ''), false); });
})();
