(function () {
'use strict';
var V = '20261122';
var $ = function (id) { return document.getElementById(id); };
var root = $('br-root');
var Q = new URLSearchParams(location.search);
var ST = (Q.get('st') || '').toUpperCase(), CTY = Q.get('c') || '';

/* ---------- formatting ---------- */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function round(n) { var a = Math.abs(n); var u = a >= 100000 ? 1000 : a >= 10000 ? 100 : a >= 1000 ? 10 : 1; return Math.round(n / u) * u; }
function N(n) { return n == null ? '—' : Math.round(round(n)).toLocaleString('en-US'); }
function Nx(n) { return n == null ? '—' : Math.round(n).toLocaleString('en-US'); }
function S(n) { return n == null ? '—' : (n > 0 ? '+' : n < 0 ? '−' : '') + N(Math.abs(n)); }
function P(x, d) { return x == null ? '—' : (x * 100).toFixed(d == null ? 1 : d) + '%'; }
function SP(x, d) { return x == null ? '—' : (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x * 100).toFixed(d == null ? 1 : d) + '%'; }
function B(m) { return m >= 1000 ? '$' + (m / 1000).toFixed(m >= 10000 ? 1 : 2).replace(/\.?0+$/, '') + ' billion' : '$' + Math.round(m) + ' million'; }
function ord(n) { return '#' + n; }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function zoneName(z) { return String(z || '').replace(/ (city|CDP|town|village|borough|municipality|city and borough|urban county|consolidated government \(balance\)|metro government \(balance\)|unified government \(balance\))(?=,)/i, ''); }
function cname(c, st) {
  if (/ (City|County|Region|District|Borough|Parish|Municipality|Census Area)$/i.test(c) || st === 'DC' || st === 'AK' || /^Carson City$/.test(c)) return c;
  return c + (st === 'LA' ? ' Parish' : ' County');
}
function occ(t) { // shorter occupation titles
  return t.replace(/, Except Legal, Medical, and Executive/, ' (general)').replace(/, Except Special Education/, '').replace(/, All Other/, ', all other')
    .replace(/First-Line Supervisors of /, 'Supervisors of ').replace(/ and Administrative Assistants/, ' and admin assistants').replace(/, Except Postsecondary/, ' (K-12)')
    .replace(/Laborers and Freight, Stock, and Material Movers, Hand/, 'Laborers and material movers').replace(/, Except [^,]*$/, '').replace(/ and Personal Care Aides/, ' and personal care aides');
}
function ocs(t) { return '<span class="br-oc" data-t="' + esc(t) + '">' + esc(cap(lc(t))) + '</span>'; }
function lc(t) { return occ(t).toLowerCase().replace(/\bk-12\b/, 'K-12').replace(/\b(hvac|it|ai)\b/g, function (m) { return m.toUpperCase(); }); }
function list(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
function rankOf(arr, v) { var r = 1; arr.forEach(function (x) { if (x > v + 1e-12) r++; }); return r; }

function get(u) { return fetch(u + '?v=' + V).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }

get('data/briefs/index.json').then(function (IX) {
  var states = IX.index.slice().sort(function (a, b) { return a[1] < b[1] ? -1 : 1; });
  picker(states);
  if (!ST || !IX.index.some(function (s) { return s[0] === ST; })) { landing(states); return; }
  get('data/briefs/' + ST + '.json').then(function (D) {
    if (CTY && !D.counties[CTY]) CTY = '';
    $('br-c').innerHTML = '<option value="">Whole state</option>' + Object.keys(D.counties).sort().map(function (c) { return '<option' + (c === CTY ? ' selected' : '') + ' value="' + esc(c) + '">' + esc(cname(c, ST)) + '</option>'; }).join('');
    $('br-c').disabled = Object.keys(D.counties).length < 2;
    if (CTY) county(IX, D); else state(IX, D);
    linkOcc(ST, D.state.nm, CTY);
    window.scrollTo(0, 0);
  });
}).catch(function () { root.innerHTML = '<div class="wrap br-land"><p>Sorry, the data could not be loaded. Please try again later.</p></div>'; });

function picker(states) {
  $('br-st').innerHTML = '<option value="">Choose a state</option>' + states.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === ST ? ' selected' : '') + '>' + esc(s[1]) + '</option>'; }).join('');
  $('br-st').onchange = function () { if (this.value) location.search = '?st=' + this.value; };
  $('br-c').onchange = function () { location.search = '?st=' + ST + (this.value ? '&c=' + encodeURIComponent(this.value) : ''); };
  $('br-print').onclick = function () { window.print(); };
}

function landing(states) {
  $('br-c').innerHTML = '<option value="">Choose a state first</option>'; $('br-c').disabled = true; $('br-print').hidden = true;
  document.title = 'State and county briefs — Workforce 2100';
  root.innerHTML = '<section class="wrap br-land"><p class="br-eyebrow">Work to 2035</p><h1>State and county briefs</h1>' +
    '<p class="br-lead">A short summary for every state and every county: the industries it has, how much of their work AI may take on by 2035, a slow-recovery stress test, and how the picture differs county by county. According to our model and today\'s data; estimates, not predictions.</p>' +
    '<div class="grid">' + states.map(function (s) { return '<a href="brief.html?st=' + s[0] + '">' + esc(s[1]) + '</a>'; }).join('') + '</div></section>';
}

/* ---------- charts ---------- */
function scatter(o) {
  // o: {pts:[{x,y,r,lab,me,tip,url}], xl, yl, xref, yref, xrefl, yrefl, w, h, xfmt, yfmt}
  var W = o.w || 640, H = o.h || 380, m = { l: 54, r: 18, t: 16, b: 44 };
  var xs = o.pts.map(function (p) { return p.x; }).concat(o.xref != null ? [o.xref] : []);
  var ys = o.pts.map(function (p) { return p.y; }).concat(o.yref != null ? [o.yref] : []);
  function nice(lo, hi, n) { var span = hi - lo || Math.abs(hi) || 0.01, st = Math.pow(10, Math.floor(Math.log10(span / n))), e = span / n / st; st *= e > 5 ? 10 : e > 2 ? 5 : e > 1 ? 2 : 1; return [Math.floor(lo / st) * st, Math.ceil(hi / st) * st, st]; }
  var xn = nice(Math.min.apply(0, xs), Math.max.apply(0, xs), 4), yn = nice(Math.min.apply(0, ys), Math.max.apply(0, ys), 4);
  if (o.y0) yn[0] = Math.min(0, yn[0]);
  var X = function (v) { return m.l + (v - xn[0]) / (xn[1] - xn[0]) * (W - m.l - m.r); };
  var Y = function (v) { return H - m.b - (v - yn[0]) / (yn[1] - yn[0]) * (H - m.t - m.b); };
  var g = '';
  for (var v = yn[0]; v <= yn[1] + 1e-9; v += yn[2]) g += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="#E3E7EC"/><text class="ax" x="' + (m.l - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + o.fmt(v, yn[2]) + '</text>';
  for (v = xn[0]; v <= xn[1] + 1e-9; v += xn[2]) g += '<text class="ax" x="' + X(v) + '" y="' + (H - m.b + 18) + '" text-anchor="middle">' + o.fmt(v, xn[2]) + '</text>';
  g += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + (H - m.b) + '" y2="' + (H - m.b) + '" stroke="#A9B4BF"/>';
  g += '<text class="axt" x="' + ((m.l + W - m.r) / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(o.xl) + '</text>';
  g += '<text class="axt" transform="translate(14,' + ((m.t + H - m.b) / 2) + ') rotate(-90)" text-anchor="middle">' + esc(o.yl) + '</text>';
  if (o.xref != null) g += '<line x1="' + X(o.xref) + '" x2="' + X(o.xref) + '" y1="' + m.t + '" y2="' + (H - m.b) + '" stroke="#8A96A3" stroke-dasharray="4 4"/><text class="ref" x="' + (X(o.xref) - 6) + '" y="' + (m.t + 10) + '" text-anchor="end">' + esc(o.xrefl) + '</text>';
  if (o.yref != null) g += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(o.yref) + '" y2="' + Y(o.yref) + '" stroke="#8A96A3" stroke-dasharray="4 4"/><text class="ref" x="' + (W - m.r) + '" y="' + (Y(o.yref) + 15) + '" text-anchor="end">' + esc(o.yrefl) + '</text>';
  var pts = o.pts.slice().sort(function (a, b) { return (a.me ? 1 : 0) - (b.me ? 1 : 0) || b.r - a.r; });
  var dots = pts.map(function (p, i) {
    return '<circle data-i="' + o.pts.indexOf(p) + '" cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="' + p.r.toFixed(1) + '" fill="' + (p.me ? '#2F6FBF' : '#C9CDC4') + '" fill-opacity="' + (p.me ? 1 : 0.85) + '" stroke="#fff" stroke-width="2"/>';
  }).join('');
  // labels: greedy placement right of dot, else left, skip on collision
  var boxes = [], labs = '';
  o.pts.filter(function (p) { return p.lab; }).sort(function (a, b) { return (b.me ? 1 : 0) - (a.me ? 1 : 0); }).forEach(function (p) {
    var cx = X(p.x), cy = Y(p.y), w = p.lab.length * (p.me ? 7.6 : 6.6) + 4, h = 15;
    var cands = p.me ? [['start', cx + p.r + 6, cy + 4], ['end', cx - p.r - 6, cy + 4], ['middle', cx, cy - p.r - 7], ['middle', cx, cy + p.r + 15]]
      : [['start', cx + p.r + 5, cy + 4], ['end', cx - p.r - 5, cy + 4], ['middle', cx, cy - p.r - 6], ['middle', cx, cy + p.r + 14]];
    for (var i = 0; i < cands.length; i++) {
      var c = cands[i], x0 = c[0] === 'start' ? c[1] : c[0] === 'end' ? c[1] - w : c[1] - w / 2, b = [x0, c[2] - 12, x0 + w, c[2] - 12 + h];
      if (b[0] < m.l || b[2] > W - 2 || b[1] < 0 || b[3] > H - m.b) continue;
      if (boxes.some(function (q) { return !(b[2] < q[0] || b[0] > q[2] || b[3] < q[1] || b[1] > q[3]); })) continue;
      var hitDot = o.pts.some(function (q) { if (q === p) return false; var qx = X(q.x), qy = Y(q.y); return qx + q.r > b[0] && qx - q.r < b[2] && qy + q.r > b[1] && qy - q.r < b[3] && (q.me || q.r > 9); });
      if (hitDot && i < cands.length - 1) continue;
      boxes.push(b); labs += '<text class="lab' + (p.me ? ' me' : '') + '" x="' + c[1].toFixed(1) + '" y="' + c[2].toFixed(1) + '" text-anchor="' + c[0] + '">' + esc(p.lab) + '</text>'; break;
    }
  });
  var id = 'sc' + Math.random().toString(36).slice(2, 8);
  setTimeout(function () {
    var el = $(id); if (!el) return; var tip = el.parentNode.querySelector('.br-tip');
    el.addEventListener('mousemove', function (e) {
      var c = e.target.closest('circle'); if (!c) { tip.hidden = true; return; }
      var p = o.pts[+c.getAttribute('data-i')], r = el.parentNode.getBoundingClientRect(), cr = c.getBoundingClientRect();
      tip.innerHTML = p.tip; tip.hidden = false; tip.style.left = (cr.left + cr.width / 2 - r.left) + 'px'; tip.style.top = (cr.top - r.top) + 'px';
    });
    el.addEventListener('mouseleave', function () { tip.hidden = true; });
    el.addEventListener('click', function (e) { var c = e.target.closest('circle'); if (c) { var p = o.pts[+c.getAttribute('data-i')]; if (p.url) location.href = p.url; } });
  }, 0);
  return '<svg id="' + id + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria) + '">' + g + dots + labs + '</svg><div class="br-tip" hidden></div>';
}
function pctTick(v, st) { var d = st < 0.001 ? 2 : st < 0.01 ? 1 : 0; return (v * 100).toFixed(d) + '%'; }

function bar(v, max) {
  var w = Math.min(50, Math.abs(v) / max * 50);
  return '<div class="bar"><div class="tr"><i class="' + (v >= 0 ? 'up' : 'dn') + '" style="' + (v >= 0 ? 'left:50%' : 'right:50%') + ';width:' + w.toFixed(1) + '%"></i></div><span class="' + (v >= 0 ? 'pos' : 'neg') + '">' + SP(v) + '</span></div>';
}

/* ---------- shared pieces ---------- */
function kpi(b, span, small) { return '<div class="br-kpi"><b>' + b + '</b><span>' + span + '</span>' + (small ? '<small>' + small + '</small>' : '') + '</div>'; }

function industryTable(rows, opts) {
  // row: [key, name, jobs, aiShare, net, lost, new, snet, slost, snew, wagesM, tops?]
  var tot = rows.reduce(function (a, r) { a[0] += r[2]; a[1] += r[2] * r[3]; a[2] += r[4]; a[3] += r[5]; a[4] += r[6]; a[5] += r[7]; return a; }, [0, 0, 0, 0, 0, 0]);
  var show = rows.filter(function (r) { return r[2] / tot[0] >= 0.01; }).slice(0, opts.max || 14);
  var rest = rows.filter(function (r) { return show.indexOf(r) < 0; });
  var max = Math.max.apply(0, rows.map(function (r) { return Math.abs(r[4] / r[2]); }).concat([Math.abs(tot[2] / tot[0])]));
  function tr(r, cls, nm) {
    var ratio = r[5] > 0 ? r[6] / r[5] : null;
    return '<tr class="' + (cls || '') + '"><td>' + (nm || esc(r[1])) + '</td><td class="r">' + N(r[2]) + '</td><td class="r">' + P(r[3], 0) + '</td><td>' + bar(r[4] / r[2], max) + '</td><td class="r ' + (r[4] < 0 ? 'neg' : 'pos') + '">' + S(r[4]) + '</td><td class="r ' + (r[7] < 0 ? 'neg' : 'pos') + '">' + S(r[7]) + '</td><td class="r">' + (ratio == null ? '—' : ratio >= 10 ? ratio.toFixed(0) : ratio.toFixed(1)) + '</td></tr>';
  }
  var other = null;
  if (rest.length) {
    var o = rest.reduce(function (a, r) { a[2] += r[2]; a[3] += r[2] * r[3]; a[4] += r[4]; a[5] += r[5]; a[6] += r[6]; a[7] += r[7]; return a; }, ['', '', 0, 0, 0, 0, 0, 0]);
    o[3] = o[3] / o[2]; other = tr(o, '', 'Other industries (' + rest.length + ')');
  }
  var all = ['', '', tot[0], tot[1] / tot[0], tot[2], tot[3], tot[4], tot[5]];
  return '<div class="tscroll"><table class="br-table"><thead><tr><th>Industry</th><th class="r">Jobs 2025</th><th class="r">Work AI<br>takes over</th><th>Net change to 2035</th><th class="r">Net jobs</th><th class="r">Slow<br>recovery</th><th class="r">New jobs per<br>job lost</th></tr></thead><tbody>' +
    show.map(function (r) { return tr(r); }).join('') + (other || '') + tr(all, 'tot', 'All industries') + '</tbody></table></div>';
}


/* ---------- the work people do: occupation groups, work-change levels, four types (Nov 2026) ---------- */
var WTYPES = [
  ['B', 'Builders', 'Computer, engineering and science occupations.', 'The work shifts toward specifying, testing and owning AI-built systems.', '#1F5F8B'],
  ['A', 'Analysts and managers', 'Management, business and finance occupations.', 'The human core becomes observing the work on site, putting new systems in place with staff, and training people.', '#3E8F5E'],
  ['H', 'High-consequence professions', 'Health care practitioners, counselors, lawyers, teachers and protective service.', 'AI supports the work, but a person stays in charge of decisions with real consequences.', '#B5483B'],
  ['O', 'Other High occupations', 'Mostly office and administrative support and sales.', 'Here AI is more likely to take over tasks outright than to change them.', '#8FA6BA']
];
function workSections(W, nm, occs, cty) {
  if (!W) return '<section class="br-sec br-page2"><div class="wrap"><h2>Occupations: what shrinks and what grows</h2>' + occs + '</div></section>';
  var tot = W.grp.reduce(function (a, r) { return a + r[1]; }, 0);
  var show = W.grp.slice(0, 12), rest = W.grp.slice(12);
  var max = Math.max.apply(0, W.grp.map(function (r) { return Math.abs(r[4] / r[1]); }));
  function tr(r, cls, label) {
    return '<tr class="' + (cls || '') + '"><td>' + (label || esc(r[0])) + '</td><td class="r">' + N(r[1]) + '</td><td class="r">' + P(r[2], 0) + '</td><td class="r">' + P(r[3], 0) + '</td><td>' + bar(r[4] / r[1], max) + '</td><td class="r ' + (r[4] < 0 ? 'neg' : 'pos') + '">' + S(r[4]) + '</td><td class="r ' + (r[5] < 0 ? 'neg' : 'pos') + '">' + S(r[5]) + '</td></tr>';
  }
  function sum(rows, label, cls) {
    var a = rows.reduce(function (a, r) { a[1] += r[1]; a[2] += r[1] * r[2]; a[3] += r[1] * r[3]; a[4] += r[4]; a[5] += r[5]; return a; }, ['', 0, 0, 0, 0, 0]);
    a[2] /= a[1]; a[3] /= a[1]; return tr(a, cls, label);
  }
  var tbl = '<div class="tscroll"><table class="br-table br-wtable"><thead><tr><th>Occupation group</th><th class="r">Jobs 2025</th><th class="r">Work AI<br>takes over</th><th class="r">Work changes<br>most</th><th>Net change to 2035</th><th class="r">Net jobs</th><th class="r">Slow<br>recovery</th></tr></thead><tbody>' +
    show.map(function (r, i) { return tr(r, i >= 10 ? 'br-noprint' : ''); }).join('') + (rest.length ? sum(rest, 'Other groups (' + rest.length + ')', 'br-noprint') : '') + sum(W.grp, 'All occupations', 'tot') + '</tbody></table></div>';
  var L = W.lvl, Lt = L[0] + L[1] + L[2];
  var s1 = '<section class="br-sec br-page2"><div class="wrap"><h2>The work people do' + (cty ? ' in ' + esc(nm) : '') + '</h2>' +
    '<p class="intro">The same jobs as above, grouped by occupation instead of industry: what people do, wherever they work. <i>Work changes most</i> is the share of jobs in occupations where AI can do half or more of the task-hours more cheaply than a worker, counting AI errors, the time spent checking its work and how high the stakes are.</p>' + tbl +
    '<h3 class="br-h3">Occupations: what shrinks and what grows</h3>' + occs + '<div class="br-bsearch" id="br-bsearch"></div></div></section>';
  var s2 = '<section class="br-sec"><div class="wrap"><h2>How much the work itself changes</h2>' +
    '<p class="intro">Net change asks whether jobs grow or shrink. The work-change level asks how much the job itself changes, even where the number of jobs stays the same.</p>' +
    '<div class="br-kpis br-k3">' + kpi(N(L[0]), 'jobs (' + P(L[0] / Lt, 0) + ') in <b>High</b> occupations: AI pays for 50% or more of the task-hours') +
    kpi(N(L[1]), 'jobs (' + P(L[1] / Lt, 0) + ') in <b>Medium</b> occupations: 30–50%') + kpi(N(L[2]), 'jobs (' + P(L[2] / Lt, 0) + ') in <b>Lower</b> occupations: under 30%') + '</div>' +
    '<div class="br-lvbar" role="img" aria-label="Jobs by work-change level"><i style="width:' + (L[0] / Lt * 100).toFixed(1) + '%;background:#1F5F8B"></i><i style="width:' + (L[1] / Lt * 100).toFixed(1) + '%;background:#5D88AC"></i><i style="width:' + (L[2] / Lt * 100).toFixed(1) + '%;background:#9DB3C6"></i></div>' +
    '<p class="note">Most High jobs are not expected to disappear. In most of them AI takes over part of the work, and what people do changes.</p></div></section>';
  var cards = WTYPES.map(function (t) {
    var d = W.typ[t[0]]; if (!d || !d[0]) return '';
    var g = W.grads ? W.grads[t[0]] : null;
    var gl = g && g[0] ? N(g[0]) + ' (' + g[1].map(function (x) { return esc(x[0].replace(/^United States /, 'U.S. ')) + ' ' + N(x[1]); }).join(', ') + (g[1].length < 3 ? '' : ' and others') + ')' : null;
    return '<div class="br-wcard" style="border-top-color:' + t[4] + '"><h3>' + t[1] + '</h3><p class="who">' + t[2] + '</p>' +
      '<p class="big"><b>' + N(d[0]) + '</b> jobs, ' + P(d[0] / Lt, 0) + ' of all jobs</p>' +
      '<p class="chg">Net change to 2035: <b class="' + (d[1] < 0 ? 'neg' : 'pos') + '">' + S(d[1]) + '</b> (' + SP(d[1] / d[0]) + ') · slow recovery <b class="' + (d[2] < 0 ? 'neg' : 'pos') + '">' + S(d[2]) + '</b></p>' +
      '<p class="what">' + t[3] + '</p>' +
      '<p class="lab">Largest occupations · jobs · net change</p><ul>' + d[3].map(function (o, i) { return '<li' + (i >= 3 ? ' class="br-noprint"' : '') + '>' + ocs(o[0]) + ' <span class="muted">· ' + N(o[1]) + ' · <span class="' + (o[2] < 0 ? 'neg' : 'pos') + '">' + S(o[2]) + '</span></span></li>'; }).join('') + '</ul>' +
      (W.grads ? '<p class="grads"><b>Graduates a year from ' + (cty ? 'colleges in the county' : 'the state\'s colleges') + ' in these fields:</b> ' + (gl || 'none') + '</p>' : '') + '</div>';
  }).join('');
  var s3 = '<section class="br-sec br-wtypes"><div class="wrap"><h2>Four kinds of change in High occupations</h2>' +
    '<p class="intro">The ' + N(L[0]) + ' jobs in High occupations, grouped by how the work is likely to change. The same four groups appear in each <a href="profile.html">college profile</a>, so the jobs here can be set next to the graduates colleges produce.</p>' +
    '<div class="br-wgrid">' + cards + '</div>' +
    '<p class="note">' + (cty ? 'Occupations by county are estimates: county jobs by industry (BLS QCEW 2025) times each industry\'s mix of occupations, adjusted to the state\'s occupation totals, so totals match the industry table above. ' : 'Jobs by occupation: the state\'s occupation totals, so totals match the industry table above. ') +
    'Graduates: IPEDS completions 2023–24 in programs where AI pays for half or more of graduates\' task-hours.</p></div></section>';
  return s1 + s2 + s3;
}

function notes(extra) {
  return '<div class="br-notes"><div><b>How to read.</b> <i>Work AI takes over</i> is the work AI is expected to do instead of people by 2035, in full-time jobs and the wages paid for it today; it is the number for employers. <i>Jobs lost in shrinking occupations</i> counts people who may need to change occupation; it is the number for workforce boards and colleges. Most of the work AI takes over is absorbed inside occupations that keep growing. ' + (extra || '') + '</div>' +
    '<div><b>Method.</b> Our independent model asks, occupation by occupation, which tasks AI can already do at lower cost than a local worker, then applies how fast employers adopt AI and BLS growth to 2035, and places the new jobs created when the money AI saves is spent. Industries: BLS QCEW 2025 jobs (withheld cells estimated) and OEWS May 2025 staffing patterns, adjusted to each state\'s occupations; counties use their state\'s pattern. Full method: <a href="https://papers.ssrn.com/abstract=7679758">Where Work Is Moving</a> · <a href="https://osf.io/ae95y">data and scripts</a>.</div>' +
    '<div><b>Limits.</b> Estimates under stated scenarios, not predictions or advice. Robots, humanoids and agentic AI beyond today\'s capabilities are not yet included, so physical-work industries look better than they will. QCEW leaves out the military and most intelligence-agency jobs. Industry totals differ slightly from the headline figures, which estimate occupations directly. Workforce 2100 · Data as of November 2026 · CC BY 4.0.</div></div>';
}

/* ---------- state brief ---------- */
function state(IX, D) {
  var s = D.state, us = IX.us, nm = s.nm, C = Object.keys(D.counties).map(function (k) { return D.counties[k]; });
  document.title = nm + ': AI and work to 2035 — Workforce 2100';
  var awayS = s.lost ? s.away / s.lost : 0, usAway = us.away / us.lost;
  var ind = s.ind, byNet = ind.slice().sort(function (a, b) { return a[4] - b[4]; });
  var losers = byNet.filter(function (r) { return r[4] < 0; }), gainers = byNet.slice().reverse().filter(function (r) { return r[4] > 0; });
  var big = ind.filter(function (r) { return r[2] / s.jobs > 0.02; });
  var topAI = big.slice().sort(function (a, b) { return b[3] - a[3]; })[0];
  var nLose = ind.filter(function (r) { return r[4] < 0; }).length, nLoseS = ind.filter(function (r) { return r[7] < 0; }).length;
  var cLose = C.filter(function (c) { return c.net < 0; }).length, cLoseS = C.filter(function (c) { return c.snet < 0; }).length;
  var e = s.edu; // [HS, cert/assoc, BA] each [jobs, ai, lost, new, open]
  var lead = 'According to our model and today\'s data, AI could take over about <b>' + N(s.ai) + ' jobs\' worth of work</b> in ' + nm + ' by 2035, ' + P(s.ais) + ' of its ' + N(s.jobs) + ' jobs (US ' + P(us.ais) + '), work paid ' + B(s.wages) + ' a year at 2025 wages. Most of that change would be absorbed inside occupations that keep growing. About <b>' + N(s.lost) + ' people (' + P(s.lostS) + ')</b> work in occupations projected to shrink and may need to change occupation (US ' + P(us.lostS) + '). With growth expected without AI and the new jobs created when the money AI saves is spent, total jobs ' + (s.net >= 0 ? 'grow by about ' + N(s.net) + ' (' + SP(s.net / s.jobs) + ')' : 'fall by about ' + N(-s.net) + ' (' + SP(s.net / s.jobs) + ')') + '. Under a slow recovery, they would ' + (s.snet >= 0 ? 'still grow by about ' + N(s.snet) : 'fall by about ' + N(-s.snet)) + '.';
  var R = s.rank;
  var k = kpi(P(s.ais), 'of work AI takes over by 2035', ord(R.ai) + ' of ' + R.n + ' · ' + B(s.wages) + ' a year in wages') +
    kpi(N(s.lost), 'in occupations projected to shrink (' + P(s.lostS) + ' of jobs)', ord(R.lost) + ' of ' + R.n + ' · US ' + P(us.lostS)) +
    kpi(N(s.new), 'new jobs in growing occupations (' + P(s.newS) + ')', N(s.open) + ' openings over 10 years') +
    kpi(SP(s.net / s.jobs), 'net change in jobs, 2025–2035', 'Slow recovery: ' + SP(s.snet / s.jobs)) +
    kpi(P(awayS), 'of displaced workers expected to move away', ord(R.away) + ' of ' + R.n + ' · US ' + P(usAway));

  // chart 1: states
  var pts = IX.states.map(function (x) {
    return { x: x[4], y: x[5], r: x[0] === s.ab ? 9 : 6, me: x[0] === s.ab, ab: x[0], lab: x[0] === s.ab ? x[1] : null,
      tip: '<b>' + esc(x[1]) + '</b><br>Jobs lost in shrinking occupations ' + P(x[4]) + '<br>Displaced who move away ' + P(x[5]) + '<br>Work AI takes over ' + P(x[3]), url: 'brief.html?st=' + x[0] };
  });
  // label a few outliers (top 3 by move-away, top 2 by jobs lost, bottom 1 by jobs lost)
  var lx = IX.states.slice();
  [lx.slice().sort(function (a, b) { return b[5] - a[5]; }).slice(0, 4), lx.slice().sort(function (a, b) { return b[4] - a[4]; }).slice(0, 3), lx.slice().sort(function (a, b) { return a[4] - b[4]; }).slice(0, 1)].forEach(function (g) {
    g.forEach(function (x) { var p = pts.filter(function (q) { return q.ab === x[0]; })[0]; if (!p.lab) p.lab = x[0]; });
  });
  var hiLost = R.lost <= 10 ? 'high' : R.lost >= 42 ? 'low' : 'middling', hiAway = R.away <= 10 ? 'many' : R.away >= 42 ? 'few' : 'some';
  var t1 = nm + ': ' + (hiLost === 'high' ? 'high' : hiLost === 'low' ? 'lower' : 'average') + ' job losses, ' + (hiAway === 'many' ? 'and more displaced workers who move' : hiAway === 'few' ? 'and few displaced workers who move' : 'and an average share who move');
  var ch1 = '<div class="br-chart"><h3>' + esc(t1) + '</h3><p class="sub">' + nm + ' ranks ' + ord(R.lost) + ' of ' + R.n + ' on jobs lost in shrinking occupations (' + P(s.lostS) + ') and ' + ord(R.away) + ' on the share of them who move away (' + P(awayS) + '). 50 states and DC, 2025–2035.</p>' +
    scatter({ pts: pts, xl: 'Jobs lost in shrinking occupations, % of 2025 jobs', yl: 'Displaced who move away', xref: us.lostS, yref: usAway, xrefl: 'US ' + P(us.lostS), yrefl: 'US ' + P(usAway), fmt: pctTick, y0: true, aria: 'Scatter of states: jobs lost versus share who move away' }) + '</div>';

  // stands out
  var pts2 = [];
  if (losers.length) pts2.push('<b>' + cap(list(losers.slice(0, 3).map(function (r) { return r[1].toLowerCase().replace(' (civilian)', ''); }))) + '</b> are projected to lose the most jobs on net' + (gainers.length ? '; <b>' + list(gainers.slice(0, 3).map(function (r) { return r[1].toLowerCase(); })) + '</b> to gain the most.' : '.'));
  if (topAI) pts2.push('AI takes over the largest share of work in <b>' + topAI[1].toLowerCase() + '</b> (' + P(topAI[3], 0) + '). In ' + nLose + ' of ' + ind.length + ' industries jobs fall on net; under a slow recovery, ' + nLoseS + '.');
  if (e && e[2][2] > e[2][3]) pts2.push('<b>Bachelor\'s-level work</b> carries the most pressure: AI takes over ' + P(e[2][1] / e[2][0], 0) + ' of it, and jobs lost in shrinking occupations (' + N(e[2][2]) + ') outnumber new jobs in growing ones (' + N(e[2][3]) + ').');
  else if (e) pts2.push('<b>Certificate and associate-level work</b> is the most stable: ' + N(e[1][2]) + ' jobs lost against ' + N(e[1][3]) + ' new, with ' + N(e[1][4]) + ' openings over ten years for community colleges.');
  pts2.push('Of the displaced, about ' + P(s.local / s.lost, 0) + ' are expected to change occupation locally, ' + P(awayS, 0) + ' to move to another labor market and ' + P(s.stay / s.lost, 0) + ' to stay without a matching job.');
  if (C.length > 1) { var cs = C.slice().sort(function (a, b) { return b.lostS - a.lostS; }); pts2.push('Across ' + C.length + ' counties, the share of jobs lost ranges from ' + P(cs[cs.length - 1].lostS) + ' (' + esc(cname(cs[cs.length - 1].nm, s.ab)) + ') to ' + P(cs[0].lostS) + ' (' + esc(cname(cs[0].nm, s.ab)) + '). ' + (cLose ? cLose + ' lose jobs on net' : 'None loses jobs on net') + ' in the main case; ' + cLoseS + ' under a slow recovery.'); }

  var occs = '<div class="br-occ"><div><h3>Largest losses by 2035</h3><ol>' + s.top[0].map(function (o) { return '<li>' + ocs(o[0]) + ' <span class="neg">' + S(o[2]) + '</span> <span class="muted">(' + SP(o[2] / o[1], 0) + ')</span></li>'; }).join('') + '</ol></div><div><h3>Largest gains by 2035</h3><ol>' + s.top[1].map(function (o) { return '<li>' + ocs(o[0]) + ' <span class="pos">' + S(o[2]) + '</span> <span class="muted">(' + SP(o[2] / o[1], 0) + ')</span></li>'; }).join('') + '</ol></div></div>';

  var stress = '<div class="br-stress"><div><table class="br-table"><thead><tr><th>Measure</th><th class="r">Main case</th><th class="r">Slow recovery</th></tr></thead><tbody>' +
    '<tr><td>Net change in jobs</td><td class="r ' + (s.net < 0 ? 'neg' : 'pos') + '">' + S(s.net) + '</td><td class="r ' + (s.snet < 0 ? 'neg' : 'pos') + '">' + S(s.snet) + '</td></tr>' +
    '<tr><td>Jobs lost in shrinking occupations</td><td class="r">' + N(s.lost) + ' (' + P(s.lostS) + ')</td><td class="r">' + N(s.slost) + ' (' + P(s.slost / s.jobs) + ')</td></tr>' +
    '<tr><td>New jobs in growing occupations</td><td class="r">' + N(s.new) + '</td><td class="r">' + N(s.snew) + '</td></tr>' +
    '<tr><td>Industries with fewer jobs than in 2025</td><td class="r">' + nLose + ' of ' + ind.length + '</td><td class="r">' + nLoseS + ' of ' + ind.length + '</td></tr>' +
    (C.length > 1 ? '<tr><td>Counties with fewer jobs than in 2025</td><td class="r">' + cLose + ' of ' + C.length + '</td><td class="r">' + cLoseS + ' of ' + C.length + '</td></tr>' : '') +
    '</tbody></table></div><div class="callout"><b>What the stress test asks.</b> What if only 75% of the work AI takes over is replaced by new demand by 2035? Nationally that is about 6 million fewer jobs than BLS projects, like a recession three quarters the size of 2008 that has not healed. It is a stress test, not a forecast. ' + stressLine(ind) + '</div></div>';

  var html = '<section class="br-hero"><div class="wrap"><p class="br-eyebrow">Work to 2035 · State brief</p><h1>' + esc(nm) + ': AI and work to 2035</h1><p class="br-meta">Executive summary · ' + Nx(s.jobs) + ' jobs at ' + nm + ' workplaces (BLS QCEW 2025) · 2026 edition, data as of November 2026</p><p class="br-lead">' + lead + '</p><div class="br-kpis">' + k + '</div></div></section>' +
    '<section class="br-sec"><div class="wrap"><div class="br-two">' + ch1 + '<div><h2>What stands out</h2><ul class="br-points">' + pts2.map(function (x, i) { return '<li' + (i >= 3 ? ' class="br-hide-print"' : '') + '>' + x + '</li>'; }).join('') + '</ul></div></div></div></section>' +
    '<section class="br-sec"><div class="wrap"><h2>Industries: where AI lands</h2><p class="intro">In almost every industry, office and administrative jobs shrink while hands-on, care and field jobs grow. What differs is the balance. Industries where new jobs per job lost is below 1 cannot absorb their own displaced workers, who will need to change industry as well as occupation.</p>' + '<div class="br-scr">' + industryTable(ind, { max: 14 }) + '</div><div class="br-prt">' + industryTable(ind, { max: 8 }) + '</div>' + '</div></section>' +
    workSections(s.work, s.nm, occs, false) +
    '<section class="br-sec"><div class="wrap"><h2>Stress test: slow recovery</h2><p class="intro">The same model, if new demand replaces only three quarters of the work AI takes over by 2035.</p>' + stress + '</div></section>' +
    (C.length > 1 ? countySection(IX, D) : '') +
    '<section class="br-sec"><div class="wrap">' + notes('Moving rates come from research, not local data.') + '</div></section>';
  root.innerHTML = html;
  wireCounties(D);
}

function stressLine(ind) {
  var hold = ind.filter(function (r) { return r[7] > 0 && r[2] > 0; }).sort(function (a, b) { return b[7] - a[7]; }).slice(0, 3).map(function (r) { return r[1].toLowerCase(); });
  var worst = ind.filter(function (r) { return r[7] < 0; }).sort(function (a, b) { return a[7] - b[7]; }).slice(0, 2).map(function (r) { return r[1].toLowerCase().replace(' (civilian)', ''); });
  return (hold.length ? 'Under it, ' + list(hold) + ' still grow' + (worst.length ? ', while ' + list(worst) + ' lose the most jobs.' : '.') : '') + ' Decisions that change between the two cases are best treated as uncertain.';
}

/* ---------- counties (in the state brief) ---------- */
var cN = 15, cSort = 'jobs';
function countySection(IX, D) {
  var s = D.state, C = Object.keys(D.counties).map(function (k) { return D.counties[k]; });
  return '<section class="br-sec"><div class="wrap"><h2>Counties</h2><p class="intro">According to our model, county differences come from the kind of work done in each. Select a county for its own brief.</p>' +
    '<div class="br-two br-cty"><div class="br-chart">' + countyChart(D, null) + '</div><div><div class="tscroll"><table class="br-table" id="ctab"></table></div><div class="br-more br-noprint" id="cmore"></div><p class="br-note">Jobs located in each county (place of work). Slow recovery: 75% of the work AI takes over is replaced by 2035. Counties with fewer than 25,000 jobs are best read as ranges.</p></div></div></div></section>';
}
function countyChart(D, me) {
  var s = D.state, C = Object.keys(D.counties).map(function (k) { return D.counties[k]; }), mc = me ? D.counties[me] : null;
  var maxJ = Math.max.apply(0, C.map(function (c) { return c.jobs; }));
  var pts = C.map(function (c) {
    return { x: c.ais, y: c.lostS, r: Math.max(3.5, Math.sqrt(c.jobs / maxJ) * 22), me: c.nm === me, nm: c.nm,
      tip: '<b>' + esc(cname(c.nm, s.ab)) + '</b><br>' + Nx(c.jobs) + ' jobs<br>Work AI takes over ' + P(c.ais) + '<br>Jobs lost in shrinking occupations ' + P(c.lostS), url: 'brief.html?st=' + s.ab + '&c=' + encodeURIComponent(c.nm) };
  });
  var lab = {}; if (me) lab[me] = 1;
  [C.slice().sort(function (a, b) { return b.lostS - a.lostS; }).slice(0, 1), C.slice().sort(function (a, b) { return a.ais - b.ais; }).slice(0, 1), C.slice().sort(function (a, b) { return b.ais - a.ais; }).slice(0, 3), C.slice().sort(function (a, b) { return b.jobs - a.jobs; }).slice(0, 3)]
    .forEach(function (g) { g.forEach(function (c) { lab[c.nm] = 1; }); });
  pts.forEach(function (p) { if (lab[p.nm]) p.lab = p.nm.replace(/ Planning Region$/, ''); });
  var title, sub;
  if (mc) {
    var aiR = rankOf(C.map(function (c) { return c.ais; }), mc.ais), lR = rankOf(C.map(function (c) { return c.lostS; }), mc.lostS);
    var more = mc.ais > s.ais, fewer = mc.lostS < s.lostS;
    title = cname(me, s.ab) + ': ' + (more ? 'more' : 'less') + ' AI exposure than most counties, ' + (fewer ? 'fewer' : 'more') + ' jobs lost';
    more = aiR <= C.length / 2; fewer = lR > C.length / 2;
    title = cname(me, s.ab) + ': ' + (more ? 'more' : 'less') + ' AI exposure than most counties, ' + (fewer ? 'fewer' : 'more') + ' jobs lost';
    if (C.length < 3) title = cname(me, s.ab) + ': work AI takes over and jobs lost';
    sub = ord(aiR) + ' of ' + C.length + ' counties on work AI takes over (' + P(mc.ais) + '), ' + ord(lR) + ' on jobs lost in shrinking occupations (' + P(mc.lostS) + '). ' + esc(D.state.nm) + ' counties, 2025–2035, jobs located in each county; dot size = jobs.';
  } else {
    title = esc(s.nm) + ' counties: work AI takes over and jobs lost';
    sub = 'Each dot is a county; dot size = jobs located there. Dashed lines show the state. 2025–2035.';
  }
  return '<h3>' + esc(title) + '</h3><p class="sub">' + sub + '</p>' + scatter({ pts: pts, xl: 'Work AI takes over, % of 2025 jobs', yl: 'Jobs lost in shrinking occupations', xref: s.ais, yref: s.lostS, xrefl: s.nm + ' ' + P(s.ais), yrefl: s.nm + ' ' + P(s.lostS), fmt: pctTick, aria: 'Scatter of counties: work AI takes over versus jobs lost' });
}
function wireCounties(D) {
  var t = $('ctab'); if (!t) return;
  var s = D.state, C = Object.keys(D.counties).map(function (k) { return D.counties[k]; });
  function draw() {
    var rows = C.slice().sort(function (a, b) { return cSort === 'name' ? (a.nm < b.nm ? -1 : 1) : cSort === 'lost' ? b.lostS - a.lostS : cSort === 'ai' ? b.ais - a.ais : cSort === 'slow' ? a.snet / a.jobs - b.snet / b.jobs : b.jobs - a.jobs; });
    function th(k, l, r) { return '<th class="' + (r ? 'r' : '') + '"><a href="#" data-s="' + k + '" style="color:inherit' + (cSort === k ? ';text-decoration:underline' : '') + '">' + l + '</a></th>'; }
    t.innerHTML = '<thead><tr>' + th('name', 'County') + th('jobs', 'Jobs 2025', 1) + th('ai', 'Work AI<br>takes over', 1) + th('lost', 'Jobs lost', 1) + '<th class="r br-hide-print">New jobs</th><th class="r">Net change</th>' + th('slow', 'Slow<br>recovery', 1) + '</tr></thead><tbody>' +
      rows.slice(0, cN).map(function (c, i) {
        return '<tr' + (i >= 10 ? ' class="br-hide-print"' : '') + '><td class="cn"><a href="brief.html?st=' + s.ab + '&c=' + encodeURIComponent(c.nm) + '">' + esc(c.nm) + '</a></td><td class="r">' + N(c.jobs) + '</td><td class="r">' + P(c.ais) + '</td><td class="r">' + P(c.lostS) + '</td><td class="r br-hide-print">' + P(c.newS) + '</td><td class="r ' + (c.net < 0 ? 'neg' : 'pos') + '">' + SP(c.net / c.jobs) + '</td><td class="r ' + (c.snet < 0 ? 'neg' : 'pos') + '">' + SP(c.snet / c.jobs) + '</td></tr>';
      }).join('') + '</tbody>';
    Array.prototype.forEach.call(t.querySelectorAll('[data-s]'), function (a) { a.onclick = function (e) { e.preventDefault(); cSort = a.getAttribute('data-s'); cN = 15; draw(); }; });
    var left = rows.length - cN;
    $('cmore').innerHTML = left > 0 ? '<button type="button" class="br-btn" id="cm1">Show all ' + rows.length + ' counties</button>' : '';
    if (left > 0) $('cm1').onclick = function () { cN = 9999; draw(); };
  }
  draw();
}

/* ---------- county brief ---------- */
function county(IX, D) {
  var s = D.state, c = D.counties[CTY], us = IX.us, nm = cname(CTY, s.ab), full = nm + ', ' + s.nm, z = D.zones[c.zone];
  var C = Object.keys(D.counties).map(function (k) { return D.counties[k]; }), n = C.length;
  document.title = full + ': AI and work to 2035 — Workforce 2100';
  var aiR = rankOf(C.map(function (x) { return x.ais; }), c.ais), lR = rankOf(C.map(function (x) { return x.lostS; }), c.lostS);
  var ind = c.ind, byNet = ind.slice().sort(function (a, b) { return a[4] - b[4]; });
  var losers = byNet.filter(function (r) { return r[4] < 0; }), gainers = byNet.slice().reverse().filter(function (r) { return r[4] > 0; });
  var tot = ind.reduce(function (a, r) { return a + r[2]; }, 0);
  var res = c.res;
  var lead = 'According to our model and today\'s data, AI could take over about <b>' + N(c.ai) + ' jobs\' worth of work</b> at ' + nm + ' workplaces by 2035, ' + P(c.ais) + ' of its ' + N(c.jobs) + ' jobs (' + s.nm + ' ' + P(s.ais) + '), work paid ' + B(c.wages) + ' a year at 2025 wages. About <b>' + N(c.lost) + ' jobs (' + P(c.lostS) + ')</b> are in occupations projected to shrink, where people may need to change occupation (' + s.nm + ' ' + P(s.lostS) + '). Total jobs ' + (c.net >= 0 ? 'grow by about ' + N(c.net) + ' (' + SP(c.net / c.jobs) + ')' : 'fall by about ' + N(-c.net) + ' (' + SP(c.net / c.jobs) + ')') + ' in the main case' + (c.snet < 0 ? ', and fall by about ' + N(-c.snet) + ' under a slow recovery.' : ', and still grow by about ' + N(c.snet) + ' under a slow recovery.');
  var k = kpi(P(c.ais), 'of work AI takes over by 2035', ord(aiR) + ' of ' + n + ' counties · ' + B(c.wages) + ' a year') +
    kpi(N(c.lost), 'jobs in occupations projected to shrink (' + P(c.lostS) + ')', ord(lR) + ' of ' + n + ' · ' + s.nm + ' ' + P(s.lostS)) +
    kpi(N(c.new), 'new jobs in growing occupations (' + P(c.newS) + ')', N(c.open) + ' openings over 10 years') +
    kpi(SP(c.net / c.jobs), 'net change in jobs, 2025–2035', 'Slow recovery: ' + SP(c.snet / c.jobs)) +
    (res && res.disp ? kpi(N(res.pool), 'displaced residents who stay: the adult retraining pool', N(res.disp) + ' residents in shrinking occupations') : kpi('—', 'resident data not available', ''));

  var pts2 = [];
  if (losers.length) pts2.push('<b>' + cap(list(losers.slice(0, 3).map(function (r) { return r[1].toLowerCase().replace(' (civilian)', ''); }))) + '</b> are projected to lose the most jobs on net' + (gainers.length ? '; <b>' + list(gainers.slice(0, 3).map(function (r) { return r[1].toLowerCase(); })) + '</b> to gain the most.' : '.'));
  else if (gainers.length) pts2.push('Every large industry is projected to gain jobs on net, led by <b>' + list(gainers.slice(0, 3).map(function (r) { return r[1].toLowerCase(); })) + '</b>.');
  var lq = ind.filter(function (r) { return r[2] / tot > 0.03; }).map(function (r) { var st = s.ind.filter(function (q) { return q[0] === r[0]; })[0]; return [r, st ? (r[2] / tot) / (st[2] / s.ind.reduce(function (a, q) { return a + q[2]; }, 0)) : 1]; }).sort(function (a, b) { return b[1] - a[1]; });
  if (lq.length && lq[0][1] > 1.25) pts2.push('Compared with ' + s.nm + ', the county leans toward <b>' + list(lq.filter(function (x) { return x[1] > 1.25; }).slice(0, 3).map(function (x) { return x[0][1].toLowerCase() + ' (' + x[1].toFixed(1) + ' times the state share)'; })) + '</b>.');
  var self = ind.filter(function (r) { return r[5] > 0 && r[2] / tot > 0.02; });
  var absorb = self.filter(function (r) { return r[6] >= r[5]; }).map(function (r) { return r[1].toLowerCase(); }), cross = self.filter(function (r) { return r[6] < r[5]; }).map(function (r) { return r[1].toLowerCase().replace(' (civilian)', ''); });
  if (absorb.length && cross.length) pts2.push('<b>' + cap(list(absorb.slice(0, 4))) + '</b> add more jobs than they lose and could redeploy their own workers. ' + cap(list(cross.slice(0, 4))) + ' do not; their displaced workers will need to change industry.');
  if (res && res.disp) pts2.push('Of the county\'s ' + N(res.disp) + ' residents in shrinking occupations, about ' + N(res.local) + ' are expected to change occupation locally, ' + N(res.away) + ' to move to another labor market and ' + N(res.stay) + ' to stay without a matching job.' + (Math.abs(c.rlost / c.rjobs - c.lostS) > 0.004 ? ' Residents are ' + (c.rlost / c.rjobs > c.lostS ? 'more' : 'less') + ' exposed (' + P(c.rlost / c.rjobs) + ') than the jobs located in the county, because many commute.' : ''));
  if (c.jobs < 25000) pts2.push('With fewer than 25,000 jobs, the county\'s figures are best read as ranges.');

  var ch = '<div class="br-chart">' + countyChart(D, CTY) + '</div>';
  var cmp = function (lab, x, y, u, f) { return '<tr><td>' + lab + '</td><td class="r"><b>' + f(x) + '</b></td><td class="r">' + f(y) + '</td><td class="r">' + f(u) + '</td></tr>'; };
  var compare = '<div class="tscroll"><table class="br-table"><thead><tr><th>Measure</th><th class="r">' + esc(nm) + '</th><th class="r">' + esc(s.nm) + '</th><th class="r">US</th></tr></thead><tbody>' +
    cmp('Work AI takes over', c.ais, s.ais, us.ais, P) + cmp('Jobs lost in shrinking occupations', c.lostS, s.lostS, us.lostS, P) + cmp('New jobs in growing occupations', c.newS, s.newS, us.newS, P) +
    cmp('Net change in jobs', c.net / c.jobs, s.net / s.jobs, us.net / us.jobs, SP) + cmp('Net change, slow recovery', c.snet / c.jobs, s.snet / s.jobs, us.snet / us.jobs, SP) +
    cmp('Displaced who move away', c.lost ? c.away / c.lost : 0, s.away / s.lost, us.away / us.lost, P) + '</tbody></table></div>';
  var zone = z ? '<p class="br-note">' + esc(nm) + ' is in the <b>' + esc(zoneName(c.zone)) + '</b> commuting zone' + (z.states && z.states.indexOf(',') > 0 ? ' (' + esc(z.states) + ')' : '') + ': ' + N(z.jobs) + ' jobs, ' + P(z.ais) + ' of work taken over by AI, ' + P(z.lostS) + ' of jobs lost and ' + P(z.newS) + ' new jobs. Of the zone\'s displaced workers, ' + P(z.lost ? z.away / z.lost : 0, 0) + ' are expected to move away and ' + P(z.lost ? z.stay / z.lost : 0, 0) + ' to stay without a matching job.</p>' : '';

  var stress = '<div class="br-stress"><div><table class="br-table"><thead><tr><th>Measure</th><th class="r">Main case</th><th class="r">Slow recovery</th></tr></thead><tbody>' +
    '<tr><td>Net change in jobs</td><td class="r ' + (c.net < 0 ? 'neg' : 'pos') + '">' + S(c.net) + '</td><td class="r ' + (c.snet < 0 ? 'neg' : 'pos') + '">' + S(c.snet) + '</td></tr>' +
    '<tr><td>Jobs lost in shrinking occupations</td><td class="r">' + N(c.lost) + ' (' + P(c.lostS) + ')</td><td class="r">' + N(c.slost) + ' (' + P(c.slost / c.jobs) + ')</td></tr>' +
    '<tr><td>New jobs in growing occupations</td><td class="r">' + N(c.new) + '</td><td class="r">' + N(c.snew) + '</td></tr>' +
    '<tr><td>Industries with fewer jobs than in 2025</td><td class="r">' + ind.filter(function (r) { return r[4] < 0; }).length + ' of ' + ind.length + '</td><td class="r">' + ind.filter(function (r) { return r[7] < 0; }).length + ' of ' + ind.length + '</td></tr>' +
    '</tbody></table></div><div class="callout"><b>What the stress test asks.</b> What if only 75% of the work AI takes over is replaced by new demand by 2035? It is a stress test, not a forecast. ' + stressLine(ind) + '</div></div>';

  var occs = '<div class="br-occ"><div><h3>Largest losses in the county by 2035</h3><ol>' + c.top[0].map(function (o) { return '<li>' + ocs(o[0]) + ' <span class="neg">' + S(o[2]) + '</span></li>'; }).join('') + '</ol></div><div><h3>Largest gains in the county by 2035</h3><ol>' + c.top[1].map(function (o) { return '<li>' + ocs(o[0]) + ' <span class="pos">' + S(o[2]) + '</span></li>'; }).join('') + '</ol></div></div>';

  root.innerHTML = '<section class="br-hero"><div class="wrap"><p class="br-eyebrow">Work to 2035 · County brief · <a href="brief.html?st=' + s.ab + '">' + esc(s.nm) + ' brief</a></p><h1>' + esc(full) + ': AI and work to 2035</h1><p class="br-meta">Executive summary · ' + Nx(c.jobs) + ' jobs located in the county (BLS QCEW 2025) · 2026 edition, data as of November 2026</p><p class="br-lead">' + lead + '</p><div class="br-kpis">' + k + '</div></div></section>' +
    '<section class="br-sec"><div class="wrap"><div class="br-two">' + ch + '<div><h2>What stands out</h2><ul class="br-points">' + pts2.map(function (x, i) { return '<li' + (i >= 3 ? ' class="br-hide-print"' : '') + '>' + x + '</li>'; }).join('') + '</ul></div></div></div></section>' +
    '<section class="br-sec"><div class="wrap"><h2>' + esc(nm) + ' industries</h2><p class="intro">Each industry uses ' + esc(s.nm) + '\'s mix of occupations for that industry, so the jobs inside an industry mirror the state; what differs is the county\'s mix of industries. Industries where new jobs per job lost is below 1 cannot absorb their own displaced workers.</p>' + '<div class="br-scr">' + industryTable(ind, { max: 12 }) + '</div><div class="br-prt">' + industryTable(ind, { max: 8 }) + '</div>' + '</div></section>' +
    workSections(c.work, nm, occs, true) +
    '<section class="br-sec"><div class="wrap"><h2>Stress test: slow recovery</h2><p class="intro">The same model, if new demand replaces only three quarters of the work AI takes over by 2035.</p>' + stress + '</div></section>' +
    '<section class="br-sec"><div class="wrap"><h2>How ' + esc(nm) + ' compares</h2><div style="max-width:760px">' + compare + zone + '</div></div></section>' +
    '<section class="br-sec"><div class="wrap">' + notes('County rows count jobs located in the county; resident figures count where workers live (LODES commuting).') + '</div></section>';
}
/* ---------- links to the Career Bridge Finder ---------- */
function linkOcc(st, snm, cty) {
  get('data/bridges/' + st + '.json').then(function (B) {
    var bytitle = {}, all = [];
    Object.keys(B.occ).forEach(function (soc) { var o = B.occ[soc]; bytitle[o[0]] = soc; all.push([soc, o[0], o[2], o[5], o[9].length]); });
    all.sort(function (a, b) { return b[2] - a[2]; });
    function href(soc) { return 'bridges.html?st=' + st + '&o=' + soc; }
    [].forEach.call(document.querySelectorAll('.br-oc[data-t]'), function (el) {
      var soc = bytitle[el.getAttribute('data-t')]; if (!soc) return;
      var a = document.createElement('a'); a.className = 'br-oc'; a.href = href(soc); a.innerHTML = el.innerHTML; a.title = 'Career bridges for this occupation';
      el.parentNode.replaceChild(a, el);
    });
    var box = document.getElementById('br-bsearch'); if (!box) return;
    box.innerHTML = '<h3 class="br-h3">Career Bridge Finder</h3><p class="br-bs-intro">Click an occupation above, or search any occupation in ' + esc(snm) + ', to see where its workers\' skills can take them' + (cty ? ' (bridges use state data)' : '') + '.</p>' +
      '<div class="br-bs"><input type="search" id="br-bq" placeholder="Type a job title, such as bookkeeping or cashier" autocomplete="off" aria-controls="br-bl"><ul id="br-bl" hidden></ul></div>';
    var q = document.getElementById('br-bq'), ul = document.getElementById('br-bl');
    q.addEventListener('input', function () {
      var w = q.value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
      if (!w.length) { ul.hidden = true; return; }
      var hits = all.filter(function (r) { var t = r[1].toLowerCase(); return w.every(function (x) { return t.indexOf(x) >= 0; }); }).slice(0, 10);
      ul.innerHTML = hits.length ? hits.map(function (r) { return '<li><a href="' + href(r[0]) + '"><b>' + esc(r[1]) + '</b><span>' + N(r[2]) + ' jobs · ' + SP(r[3]) + ' to 2035' + (r[4] ? ' · bridges' : '') + '</span></a></li>'; }).join('') : '<li class="muted">No occupation matches.</li>';
      ul.hidden = false;
    });
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var a = ul.querySelector('a'); if (a) location.href = a.href; } });
  }).catch(function () {});
}
})();
