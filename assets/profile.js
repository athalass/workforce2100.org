/* Free institution profile: renders one college from data/profiles/<ST>.json */
(function () {
  var V = '20261118b';
  var root = document.getElementById('pf-root');
  var q = document.getElementById('pf-q');
  var list = document.getElementById('pf-list');
  var INDEX = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function n(x) { return x == null ? '—' : Math.round(x).toLocaleString('en-US'); }
  function k(x) {
    if (x == null) return '—';
    var a = Math.abs(x);
    if (a >= 1e6) return (x / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.?0+$/, '') + 'M';
    if (a >= 1e4) return Math.round(x / 1e3).toLocaleString('en-US') + 'k';
    if (a >= 1e3) return (x / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    return Math.round(x).toLocaleString('en-US');
  }
  function pct(x, dp) { return x == null ? '—' : (x * 100).toFixed(dp || 0) + '%'; }
  function spct(x, dp) { if (x == null) return '—'; var s = (x * 100).toFixed(dp || 0); return (x >= 0 ? '+' : '−') + s.replace('-', '') + '%'; }
  function money(x) { return x == null ? '—' : (x >= 1e9 ? '$' + (x / 1e9).toFixed(1) + 'B' : '$' + Math.round(x / 1e6).toLocaleString('en-US') + 'M'); }
  var TC = { Invest: 'inv', Reinvent: 'rei', Review: 'rev' };
  function chip(t) { return t ? '<span class="tchip ' + TC[t] + '">' + esc(t) + '</span>' : '<span class="muted">—</span>'; }
  function cls(x) { return x < 0 ? 'down' : 'up'; }
  function kpi(b, s) { return '<div class="kpi"><b>' + b + '</b><span>' + s + '</span></div>'; }
  var EDU = ['High school or less', 'Certificate or associate', "Bachelor's or higher"];

  function getJSON(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }

  // ---------- search ----------
  function loadIndex() {
    if (INDEX) return Promise.resolve(INDEX);
    return getJSON('data/profiles/index.json?v=' + V).then(function (d) { INDEX = d; return d; });
  }
  function norm(s) { return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function showList() {
    var t = norm(q.value);
    if (t.length < 2 || !INDEX) { list.hidden = true; return; }
    var words = t.split(' ');
    var hits = INDEX.filter(function (r) { var s = norm(r[0] + ' ' + r[1] + ' ' + r[3]); return words.every(function (w) { return s.indexOf(w) >= 0; }); }).slice(0, 12);
    if (!hits.length) { list.innerHTML = '<li class="muted">No institution found</li>'; list.hidden = false; return; }
    list.innerHTML = hits.map(function (r) {
      return '<li><a href="?st=' + r[1] + '&amp;i=' + encodeURIComponent(r[0]) + '"><b>' + esc(r[0]) + '</b><span>' + esc(r[3]) + ', ' + r[1] + ' · ' + esc(r[2]) + '</span></a></li>';
    }).join('');
    list.hidden = false;
  }
  q.addEventListener('focus', function () { loadIndex().then(showList); });
  q.addEventListener('input', function () { loadIndex().then(showList); });
  document.addEventListener('click', function (e) { if (!e.target.closest('.pf-find')) list.hidden = true; });
  document.getElementById('pf-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var a = list.querySelector('a'); if (a) location.href = a.getAttribute('href');
  });

  // ---------- render ----------
  function render(S, name) {
    var I = S.insts[name];
    if (!I) { root.innerHTML = '<div class="wrap pf-empty"><p>We could not find that institution in the ' + esc(S.name) + ' data. Try the search above.</p></div>'; return; }
    var Z = S.zones[I.zone] || {};
    var cty = S.counties[(I.county || '').replace(/ County$/, '').replace(/ Parish$/, '')] || null;
    document.title = name + ' — Institution profile · Workforce 2100';
    q.value = name;
    var tiered = I.p.filter(function (p) { return p[3]; });
    var changed = tiered.filter(function (p) { return p[3] !== p[6]; });
    var changedShown = changed.filter(function (p) { return p[2] >= 5; });
    var small = changed.length - changedShown.length;
    var cg = changed.reduce(function (s, p) { return s + p[2]; }, 0);
    var place = I.county + ', ' + S.name;

    var h = '';
    h += '<section class="pf-hero"><div class="wrap">' +
      '<p class="eyebrow-s">Free institution profile</p><h1>' + esc(name) + '</h1>' +
      '<p class="pf-meta">' + esc(I.sector) + ' · ' + esc(place) + ' · ' + esc(I.zone) + ' commuting zone</p>' +
      '<p class="pf-lead">According to our model and today\'s data, AI could take over about ' + k(Z.ai) + ' jobs\' worth of work in the ' + esc(I.zone) +
      ' commuting zone by 2035 (' + pct(Z.ais) + ' of jobs). About ' + k(Z.lost) + ' people work in occupations expected to shrink and may need to change occupation, while about ' +
      k(Z.new) + ' new jobs are expected to open in growing occupations, ' + k(Z.edu && Z.edu[1][3]) + ' of them at the certificate or associate level. Of ' + esc(name) + '\'s ' + n(I.grads) +
      ' graduates in grouped programs, ' + pct(I.inv) + ' are in programs where the model expects demand to grow by 10% or more.</p>' +
      '<nav class="pf-toc" aria-label="Sections"><a href="#market">Labor market</a><a href="#local">Local industries</a><a href="#programs">Programs</a><a href="#stress">Stress test</a><a href="#competition">Competition</a><a href="#adults">Adult learners</a></nav>' +
      '</div></section>';

    // 1 labor market
    h += '<section class="pf-sec" id="market"><div class="wrap"><p class="num">1 · Your labor market</p><h2>The ' + esc(I.zone) + ' commuting zone</h2>' +
      '<p class="intro">A commuting zone is the group of counties where people live in one and work in another. It is the closest match to a college\'s labor market. ' + esc(I.county) + ' is one of its counties.</p>' +
      '<div class="kpis">' + kpi(k(Z.jobs), 'jobs in 2025') +
      kpi(k(Z.ai), 'jobs\' worth of work AI could take over by 2035 (' + pct(Z.ais) + '); ' + money(Z.wages) + ' a year in wages today') +
      kpi(k(Z.lost), 'people in occupations expected to shrink, who may need to change occupation') +
      kpi(k(Z.new), 'new jobs expected in growing occupations') +
      kpi(k(Z.open), 'openings expected over ten years, counting retirements and people leaving') + '</div>' +
      '<h3 class="h3">By the education an occupation needs at entry</h3><div class="tscroll"><table class="pf-table"><thead><tr><th>Entry education</th><th class="r">Jobs, 2025</th><th class="r">Work AI could take over</th><th class="r">Jobs in shrinking occupations</th><th class="r">New jobs in growing occupations</th><th class="r">Openings over 10 years</th></tr></thead><tbody>' +
      (Z.edu || []).map(function (e, i) { return '<tr' + (i === 1 ? ' class="hl"' : '') + '><td>' + EDU[i] + '</td><td class="r">' + n(e[0]) + '</td><td class="r">' + n(e[1]) + '</td><td class="r">' + n(e[2]) + '</td><td class="r">' + n(e[3]) + '</td><td class="r">' + n(e[4]) + '</td></tr>'; }).join('') +
      '</tbody></table></div><p class="note">The highlighted row is the community college market. Openings show the training demand; new jobs show the direction. Openings are much larger than new jobs because most replace people who retire or leave.</p></div></section>';

    // 2 local industries (QCEW), with statewide occupation groups as a fallback
    if (Z.ind && Z.ind.length) {
      h += '<section class="pf-sec" id="local"><div class="wrap"><p class="num">2 · Local industries</p><h2>The industries in the ' + esc(I.zone) + ' commuting zone</h2>' +
        '<p class="intro">The largest industries in the ' + (Z.indc > 1 ? Z.indc + ' ' + esc(S.name) + ' counties' : esc(S.name) + ' county') + ' of this commuting zone, how much of their work AI could take over by 2035 according to our model, and the growth BLS projects for each industry before AI.</p>' +
        '<div class="tscroll"><table class="pf-table"><thead><tr><th>Industry</th><th class="r">Jobs, 2025</th><th class="r">Share of local jobs</th><th class="r">Work AI could take over by 2035</th><th class="r">BLS projected growth, 2025–35</th></tr></thead><tbody>' +
        Z.ind.map(function (g) { return '<tr><td>' + esc(g[0]) + '</td><td class="r">' + n(g[1]) + '</td><td class="r">' + pct(g[2]) + '</td><td class="r">' + pct(g[3]) + '</td><td class="r ' + cls(g[4]) + '">' + spct(g[4], 1) + '</td></tr>'; }).join('') +
        '</tbody></table></div><p class="note">Jobs: BLS Quarterly Census of Employment and Wages, 2025, all employers including government; cells BLS does not publish are left out. The AI share uses each industry\'s national mix of occupations (BLS National Employment Matrix). Education and health care include public schools and hospitals.</p></div></section>';
    } else {
      h += '<section class="pf-sec" id="local"><div class="wrap"><p class="num">2 · Local work</p><h2>The work done in ' + esc(S.name) + '</h2>' +
        '<p class="intro">The largest occupation groups in the state, how much of their work AI could take over by 2035, and the expected net change in jobs once new demand is counted.</p>' +
        '<div class="tscroll"><table class="pf-table"><thead><tr><th>Occupation group</th><th class="r">Jobs, 2025</th><th class="r">Work AI could take over by 2035</th><th class="r">Expected net change in jobs, 2025–35</th></tr></thead><tbody>' +
        S.groups.map(function (g) { return '<tr><td>' + esc(g[0]) + '</td><td class="r">' + n(g[1]) + '</td><td class="r">' + pct(g[2]) + '</td><td class="r ' + cls(g[3]) + '">' + spct(g[3]) + '</td></tr>'; }).join('') +
        '</tbody></table></div></div></section>';
    }

    // 3 programs
    h += '<section class="pf-sec" id="programs"><div class="wrap"><p class="num">3 · Your programs</p><h2>' + tiered.length + ' programs, grouped by expected demand to 2035</h2>' +
      '<p class="intro">Each program is grouped by the expected change in demand for the occupations its graduates go into, weighted by where they work. The groups are signals from the model, not recommendations. Invest: demand expected to grow 10% or more. Reinvent: between −10% and +10%, where the work itself is changing. Review: expected to fall more than 10%.</p>' +
      '<div class="mix" role="img" aria-label="Graduates by group: Invest ' + pct(I.inv) + ', Reinvent ' + pct(I.rei) + ', Review ' + pct(I.rev) + '"><i class="inv" style="width:' + (I.inv * 100).toFixed(1) + '%"></i><i class="rei" style="width:' + (I.rei * 100).toFixed(1) + '%"></i><i class="rev" style="width:' + (I.rev * 100).toFixed(1) + '%"></i></div>' +
      '<div class="legend"><span><i style="background:#3E8F5E"></i>Invest ' + pct(I.inv) + ' of graduates</span><span><i style="background:#5D88AC"></i>Reinvent ' + pct(I.rei) + '</span><span><i style="background:#C2654F"></i>Review ' + pct(I.rev) + '</span></div>' +
      '<h3 class="h3" style="margin-top:22px">Largest programs</h3><div class="tscroll"><table class="pf-table"><thead><tr><th>Program</th><th>Level</th><th class="r">Graduates, 2023–24</th><th class="r">Expected demand change, 2025–35</th><th>Group</th></tr></thead><tbody>' +
      tiered.slice(0, 15).map(function (p) { return '<tr><td>' + esc(p[0]) + '</td><td>' + esc(p[1]) + '</td><td class="r">' + n(p[2]) + '</td><td class="r ' + cls(p[4]) + '">' + spct(p[4]) + '</td><td>' + chip(p[3]) + '</td></tr>'; }).join('') +
      '</tbody></table></div><p class="note">Showing the ' + Math.min(15, tiered.length) + ' largest of ' + tiered.length + ' programs. Transfer-oriented arts and sciences programs are not grouped.</p></div></section>';

    // 4 stress test
    h += '<section class="pf-sec" id="stress"><div class="wrap"><p class="num">4 · Stress test</p><h2>' + (changed.length ? changed.length + ' programs could change group in a slow recovery' : 'No program changes group in a slow recovery') + '</h2>' +
      '<div class="two"><p class="intro" style="margin-top:10px">Our main case assumes, as BLS does, that the work AI takes over is replaced by new demand elsewhere in the economy by 2035. The stress test asks what happens if only 75% is replaced. In this commuting zone that would mean about ' + k(Z.slost) + ' people in shrinking occupations instead of ' + k(Z.lost) +
      ', and an expected net change in jobs of ' + spct(Z.snet / Z.jobs, 1) + ' instead of ' + spct(Z.net / Z.jobs, 1) + '.</p>' +
      '<div class="callout"><b>How to read it.</b> A program that changes group in the stress test sits close to a cut-off, so its outlook is less certain. It is worth looking at under both cases, alongside what you know about your region and your students.' + (changed.length ? ' These programs had ' + n(cg) + ' graduates in 2023–24.' : '') + '</div></div>' +
      (changedShown.length ? '<div class="tscroll" style="margin-top:18px"><table class="pf-table"><thead><tr><th>Program</th><th>Level</th><th class="r">Graduates</th><th class="r">Expected demand change: main case → stress test</th><th>Group: main case → stress test</th></tr></thead><tbody>' +
        changedShown.map(function (p) { return '<tr><td>' + esc(p[0]) + '</td><td>' + esc(p[1]) + '</td><td class="r">' + n(p[2]) + '</td><td class="r">' + spct(p[4]) + ' → ' + spct(p[5]) + '</td><td>' + chip(p[3]) + ' → ' + chip(p[6]) + '</td></tr>'; }).join('') +
        '</tbody></table></div>' : '') +
      (small ? '<p class="note">Plus ' + small + ' program' + (small > 1 ? 's' : '') + ' with fewer than five graduates, not listed.</p>' : '') + '</div></section>';

    // 5 competition
    h += '<section class="pf-sec" id="competition"><div class="wrap"><p class="num">5 · Competition</p><h2>Who else trains for the same jobs</h2>' +
      '<p class="intro">Other institutions in the ' + esc(I.zone) + ' commuting zone with graduates in the same program families at the same level (certificate or associate, or bachelor\'s and above).</p>' +
      (I.r.length ? '<h3 class="h3">Largest overlaps</h3><div class="tscroll" style="max-width:760px"><table class="pf-table"><thead><tr><th>Institution</th><th>Type</th><th class="r">Graduates in your fields</th></tr></thead><tbody>' +
        I.r.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[2]) + '</td><td class="r">' + n(r[1]) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="muted">No other institution in the zone offers the same program families at the same level.</p>') +
      '<h3 class="h3" style="margin-top:26px">Your share of local graduates, by program</h3><div class="tscroll"><table class="pf-table"><thead><tr><th>Program family</th><th class="r">Your graduates</th><th class="r">All graduates in the zone</th><th class="r">Your share</th><th class="r">Other institutions</th><th>Largest of them</th></tr></thead><tbody>' +
      I.c.map(function (c) { return '<tr><td>' + esc(c[0]) + '<div class="muted sm">' + (c[1] === 's' ? 'Certificate or associate' : "Bachelor's or higher") + '</div></td><td class="r">' + n(c[2]) + '</td><td class="r">' + n(c[3]) + '</td><td class="r">' + pct(c[3] ? c[2] / c[3] : 0) + '</td><td class="r">' + c[4] + '</td><td>' + (c[5].length ? esc(c[5].join(', ')) : '<span class="muted">None in the zone</span>') + '</td></tr>'; }).join('') +
      '</tbody></table></div><p class="note">Graduates in 2023–24, in program families and levels you also offer, at institutions in this state\'s part of the commuting zone. Institutions that enroll mostly online are counted where IPEDS places them.</p></div></section>';

    // 6 adult learners
    var poolHead = cty && cty.pool ? 'About ' + k(cty.pool) + ' ' + esc(I.county) + ' residents may join the retraining pool' : 'About ' + k(Z.pool) + ' people may join the retraining pool in this commuting zone';
    h += '<section class="pf-sec" id="adults"><div class="wrap"><p class="num">6 · Adult learners</p><h2>' + poolHead + '</h2>' +
      '<p class="intro">People expected to lose jobs in shrinking occupations who stay in the area. For a college they are a likely market for short credentials and evening programs; for a program they also compete with its graduates for openings.</p>' +
      '<div class="kpis k4">' + kpi(k(Z.pool), 'expected adult retraining pool in the whole commuting zone') + kpi(k(Z.local), 'expected to change occupation in the area') + kpi(k(Z.away), 'expected to move away for work, over ten years') + kpi(k(Z.stay), 'may stay without a matching job') + '</div>' +
      '<p class="note">Commuting-zone figures. Moving rates come from research on displaced workers; low and high versions are in the state workbook.</p></div></section>';

    h += '<section class="pf-sec last"><div class="wrap"><p class="note" style="font-size:14.5px">These are estimates from our Work to 2035 model and public federal data, 2025–2035, with ranges. They are not predictions or advice. Robots and other physical automation are not yet included. <a href="work-2035.html">Explore the data</a> · <a href="research.html">Methods and papers</a> · <a href="license.html">Data sources and credits</a></p>' +
      '<button class="pf-btn" type="button" onclick="window.print()">Save as PDF</button></div></section>';
    root.innerHTML = h;
    root.querySelectorAll('.pf-table').forEach(function (t) {
      var names = [].map.call(t.querySelectorAll('thead th'), function (th) { return th.textContent.trim(); });
      t.querySelectorAll('tbody tr').forEach(function (tr) { [].forEach.call(tr.children, function (td, i) { if (names[i]) td.setAttribute('data-label', names[i]); }); });
    });
    if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  }

  var P = new URLSearchParams(location.search);
  var st = (P.get('st') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2), nm = P.get('i');
  if (st && nm) {
    root.innerHTML = '<div class="wrap pf-empty"><p class="muted">Loading…</p></div>';
    getJSON('data/profiles/' + st + '.json?v=' + V).then(function (S) { render(S, nm); })
      .catch(function () { root.innerHTML = '<div class="wrap pf-empty"><p>We could not load that profile. Try the search above.</p></div>'; });
  }
})();
