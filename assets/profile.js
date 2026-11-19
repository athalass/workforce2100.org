/* Free institution profile: renders one college from data/profiles/<ST>.json */
(function () {
  var V = '20261119r';
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

  var EMAIL = 'athalass@gmail.com';
  function fixLink(name, st, cls) {
    var subj = 'Correction request: ' + name + ' (' + st + ') college profile, data as of November 2026';
    var body = 'Page: ' + location.href + '\n\nWhat looks wrong (section and number):\n\nWhat it should be, and your source if you have one:\n\nMay we list this correction, without your name, in the public corrections log? (yes/no)\n';
    var href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subj) + '&amp;body=' + encodeURIComponent(body);
    var attrs = window.W2100Forms ? W2100Forms.correctionLinkAttrs(name, st, href) : 'href="' + href + '"';
    return '<a class="' + (cls || 'pf-fix') + '" ' + attrs + '>Report an error or request a correction</a>';
  }
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
      '<p class="pf-fixline">' + fixLink(name, S.st) + '</p>' +
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

    // 3 programs: program map
    var mapped = tiered.filter(function (p) { return p[8] != null && p[8] > 0 && p[4] != null; });
    var mtot = 0, mhi = 0; mapped.forEach(function (p) { mtot += p[2]; if (p[8] >= 0.5) mhi += p[2]; });
    h += '<section class="pf-sec" id="programs"><div class="wrap"><p class="num">3 · Your programs</p><h2>The program map</h2>' +
      '<p class="intro">According to our model and today\'s data, each program is placed by how demand for its graduates may change to 2035 and how much of their work AI can do. The groups are signals from the model, not recommendations.</p>' +
      '<div class="pm-grid"><div class="pm-defs">' +
      '<div class="tdef"><span class="sw inv"></span><div><h3>Invest</h3><p class="rule">Our model expects demand for graduates to grow 10% or more by 2035.</p><p>Today\'s data point to room to grow. If the program sits above the AI line, growth will likely also need investment in adapting the curriculum to AI.</p></div></div>' +
      '<div class="tdef"><span class="sw rei"></span><div><h3>Reinvent</h3><p class="rule">Expected demand changes between −10% and +10%.</p><p>The program likely stays, but the work it prepares for is changing. Consider investing in curriculum that teaches directing AI, checking its work, and the human skills AI cannot do, most of all above the AI line.</p></div></div>' +
      '<div class="tdef"><span class="sw rev"></span><div><h3>Review</h3><p class="rule">Expected demand falls more than 10%.</p><p>Worth a closer look: re-aiming toward growing occupations, merging or other options, after checking local placement.</p></div></div>' +
      '<div class="tdef"><span class="sw line"></span><div><h3>The AI line</h3><p class="rule">According to our model, AI can do half or more of graduates\' task time.</p><p>Programs above the dashed line likely need new curriculum whatever their group, including growing ones.</p><p>Our research suggests that above the line the work shifts from doing tasks to directing AI, checking what it produces and owning the result. Curriculum can teach those skills: when to hand work to AI, how to verify it, and how to judge the consequences of errors.</p><p class="rd">Read more: <a href="research.html#delegation">AI Fluency Under Delegation</a> · <a href="research.html#judgment">The Price of Judgment</a> · <a href="research.html#program">From Framework to Program</a>, an applied AI degree example</p></div></div>' +
      '</div><div class="pm-card"><h3>' + esc(name) + '</h3><p class="muted">' + mapped.length + ' programs, ' + n(mtot) + ' awards a year. ' + (mtot ? pct(mhi / mtot) : '—') + ' of these awards sit above the AI line.</p>' +
      '<div id="pm-svg"></div><p class="pm-tip" id="pm-tip" aria-live="polite">Tap or hover a circle to see the program.</p>' +
      '<p class="note">How to read the map. Left to right: expected demand change for graduates. Bottom to top: share of their task time AI can do. Circle size: awards per year.</p></div></div>' +
      '<div class="mix" style="margin-top:26px" role="img" aria-label="Graduates by group: Invest ' + pct(I.inv) + ', Reinvent ' + pct(I.rei) + ', Review ' + pct(I.rev) + '"><i class="inv" style="width:' + (I.inv * 100).toFixed(1) + '%"></i><i class="rei" style="width:' + (I.rei * 100).toFixed(1) + '%"></i><i class="rev" style="width:' + (I.rev * 100).toFixed(1) + '%"></i></div>' +
      '<div class="legend"><span><i style="background:#3E8F5E"></i>Invest ' + pct(I.inv) + ' of graduates</span><span><i style="background:#5D88AC"></i>Reinvent ' + pct(I.rei) + '</span><span><i style="background:#C2654F"></i>Review ' + pct(I.rev) + '</span></div>' +
      '<p class="grp-note"><b>What the groups mean.</b> Invest, Reinvent and Review are signals from our model about expected demand for graduates, based on today\'s data. They do not judge a program\'s quality, outcomes or faculty, and they are not recommendations to grow, change or close it.</p>' +
      '<h3 class="h3" style="margin-top:22px">Largest programs</h3><div class="tscroll"><table class="pf-table"><thead><tr><th>Program</th><th>Level</th><th class="r">Graduates, 2023–24</th><th class="r">Expected demand change, 2025–35</th><th class="r">AI can do</th><th>Group</th></tr></thead><tbody>' +
      tiered.slice(0, 15).map(function (p) { return '<tr><td>' + esc(p[0]) + (p[8] >= 0.5 ? ' <span class="ail" title="Above the AI line">Above AI line</span>' : '') + '</td><td>' + esc(p[1]) + '</td><td class="r">' + n(p[2]) + '</td><td class="r ' + cls(p[4]) + '">' + spct(p[4]) + '</td><td class="r">' + (p[8] ? pct(p[8]) : '—') + '</td><td>' + chip(p[3]) + '</td></tr>'; }).join('') +
      '</tbody></table></div><p class="note">Showing the ' + Math.min(15, tiered.length) + ' largest of ' + tiered.length + ' programs. "AI can do" is the national share of graduates\' task time AI can do for each program family and level. Transfer-oriented arts and sciences programs are not grouped.</p></div></section>';

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

    h += '<section class="pf-sec last"><div class="wrap"><p class="note" style="font-size:14.5px">Data as of November 2026, updated quarterly (<a href="#updates">change log</a>). These are estimates from our Work to 2035 model and public federal data, 2025–2035, with ranges. They are not predictions or advice. Robots and other physical automation are not yet included, and we do not yet track agentic AI, which carries out multi-step work on its own. <a href="work-2035.html">Explore the data</a> · <a href="research.html">Methods and papers</a> · <a href="license.html">Data sources and credits</a></p>' +
      '<p class="pf-actions"><button class="pf-btn" type="button" onclick="window.print()">Save as PDF</button> ' + fixLink(name, S.st, 'pf-btn pf-fixbtn') + '</p><p class="note">We reply to every request that includes an email address, and corrections are listed in the <a href="#corrections">corrections log</a> without the sender\x27s name.</p><aside class="pf-study" aria-label="Work 2035 Tracking Study"><div><p class="pf-study-tag">Coming in 2027</p><p><b>Help check these forecasts.</b> The Work 2035 Tracking Study will compare forecasts like these with what actually happens, year by year, and ask college leaders what they changed and why. It opens to presidents and provosts after ethics review, expected in spring 2027.</p></div><p class="pf-study-links"><a class="pf-btn" href="tracking-study.html">Read about the study</a> <span>Want to hear when it opens? <a href="tracking-study.html#notify">Sign up</a> or email <a href="mailto:athalass@gmail.com">athalass@gmail.com</a></span></p></aside></div></section>';
    root.innerHTML = h;
    drawMap(mapped);
    if (window.W2100Forms) { var lastW = root.querySelector('.pf-sec.last .wrap'); W2100Forms.mountCorrection(lastW && lastW.querySelector('.pf-actions') ? lastW : null, { name: name, st: S.st }); var fb = lastW && lastW.querySelector('#fix'); if (fb) lastW.insertBefore(fb, lastW.querySelector('.pf-study')); }
    root.querySelectorAll('.pf-table').forEach(function (t) {
      var names = [].map.call(t.querySelectorAll('thead th'), function (th) { return th.textContent.trim(); });
      t.querySelectorAll('tbody tr').forEach(function (tr) { [].forEach.call(tr.children, function (td, i) { if (names[i]) td.setAttribute('data-label', names[i]); }); });
    });
    if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  }



  var SHORT = [[/^Computer and Information Systems Security/i, 'Cybersecurity'], [/^Computer and Information Sciences/i, 'Computer & info sciences'],
    [/^Business Administration and Management/i, 'Business administration'], [/^Business\/Commerce/i, 'Business'], [/^Registered Nursing/i, 'Nursing (RN)'],
    [/^Licensed Practical/i, 'Practical nursing (LPN)'], [/^Emergency Medical Technology/i, 'EMT/paramedic'], [/^Criminal Justice and Corrections/i, 'Criminal justice'],
    [/^Cooking and Related Culinary/i, 'Culinary arts'], [/^Mental Health Counseling/i, 'Mental health counseling'], [/^Elementary Education/i, 'Elementary education'],
    [/^Medical\/Clinical Assistant/i, 'Medical assistant'], [/^Liberal Arts/i, 'Liberal arts'], [/^Psychology, General/i, 'Psychology'], [/^Biology\/Biological Sciences/i, 'Biology'],
    [/^Accounting/i, 'Accounting'], [/^Mechanical Engineering$/i, 'Mechanical engineering'], [/^Electrical, Electronics/i, 'Electrical engineering'],
    [/^Computer Systems Networking/i, 'Networking'], [/^Drafting and Design/i, 'Drafting and design'], [/^Child Care/i, 'Child care'],
    [/^Allied Health Diagnostic, Intervention/i, 'Allied health'], [/^Health\/Health Care Administration/i, 'Health administration'], [/^Cosmetology/i, 'Cosmetology']];
  function shortName(s) {
    for (var i = 0; i < SHORT.length; i++) if (SHORT[i][0].test(s)) return SHORT[i][1];
    var t = s.replace(/\/.*$/, '').replace(/, (General|Other)$/, '').replace(/ and Related.*$/, '').replace(/ and /g, ' & ');
    return t.length > 26 ? t.slice(0, 24).replace(/\s+\S*$/, '') + '…' : t;
  }
  function drawMap(rows) {
    var box = document.getElementById('pm-svg'); if (!box || !rows.length) return;
    var W = 760, H = 520, x0 = 64, x1 = 744, yA = 40, yB = 450;
    var dmin = -0.3, dmax = 0.4;
    rows.forEach(function (r) { dmin = Math.min(dmin, Math.floor(r[4] * 10) / 10); dmax = Math.max(dmax, Math.ceil(r[4] * 10) / 10); });
    dmin = Math.max(dmin, -0.6); dmax = Math.min(dmax, 0.8);
    function cx(d) { return Math.max(dmin, Math.min(dmax, d)); }
    function sx(d) { return x0 + (cx(d) - dmin) / (dmax - dmin) * (x1 - x0); }
    function sy(a) { return yB - a / 0.9 * (yB - yA); }
    function col(t) { return t === 'Invest' ? '#2E7D50' : t === 'Review' ? '#B5483B' : '#3E6A8E'; }
    var ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Program map: programs placed by expected demand change and the share of graduates\' task time AI can do');
    function el(nm, a, p, t) { var e = document.createElementNS(ns, nm); for (var q in a) e.setAttribute(q, a[q]); if (t != null) e.textContent = t; (p || svg).appendChild(e); return e; }
    el('rect', { x: sx(dmin), y: yA, width: sx(-0.1) - sx(dmin), height: yB - yA, fill: '#B5483B', 'fill-opacity': '.07' });
    el('rect', { x: sx(0.1), y: yA, width: x1 - sx(0.1), height: yB - yA, fill: '#2E7D50', 'fill-opacity': '.05' });
    [0, 0.25, 0.5, 0.75].forEach(function (t) { el('line', { x1: x0, x2: x1, y1: sy(t), y2: sy(t), stroke: '#E6EBF0' }); el('text', { x: x0 - 8, y: sy(t) + 4, 'text-anchor': 'end', 'class': 'ax' }, null, Math.round(t * 100) + '%'); });
    for (var t = Math.ceil(dmin * 10) / 10; t <= dmax + 1e-9; t += 0.1) { var tt = Math.round(t * 10) / 10; el('text', { x: sx(tt), y: yB + 20, 'text-anchor': 'middle', 'class': 'ax' }, null, (tt > 0 ? '+' : tt < 0 ? '−' : '') + Math.abs(Math.round(tt * 100)) + '%'); }
    [-0.1, 0.1].forEach(function (t) { el('line', { x1: sx(t), x2: sx(t), y1: yA, y2: yB, stroke: '#9AA6B3', 'stroke-dasharray': '4 4' }); });
    el('line', { x1: x0, x2: x1, y1: sy(0.5), y2: sy(0.5), stroke: '#C9821B', 'stroke-width': '1.5', 'stroke-dasharray': '6 4' });
    el('text', { x: x0 + 6, y: sy(0.5) + 18, 'text-anchor': 'start', 'class': 'lab', fill: '#8A5A12' }, null, 'AI line: AI can do half the work');
    el('text', { x: (sx(dmin) + sx(-0.1)) / 2, y: yA - 12, 'text-anchor': 'middle', 'class': 'zone', fill: '#B5483B' }, null, 'REVIEW');
    el('text', { x: sx(0), y: yA - 12, 'text-anchor': 'middle', 'class': 'zone', fill: '#3E6A8E' }, null, 'REINVENT');
    el('text', { x: (sx(0.1) + x1) / 2, y: yA - 12, 'text-anchor': 'middle', 'class': 'zone', fill: '#2E7D50' }, null, 'INVEST');
    el('text', { x: (x0 + x1) / 2, y: yB + 46, 'text-anchor': 'middle', 'class': 'ax' }, null, 'Expected demand change for graduates, 2025–2035 →');
    el('text', { x: 16, y: (yA + yB) / 2, 'text-anchor': 'middle', transform: 'rotate(-90 16 ' + (yA + yB) / 2 + ')', 'class': 'ax' }, null, 'Share of graduates\' task time AI can do →');
    var mx = rows.reduce(function (m, r) { return Math.max(m, r[2]); }, 1);
    function rad(v) { return 4 + Math.sqrt(v / mx) * 22; }
    var tip = document.getElementById('pm-tip'), g = el('g', {});
    rows.slice().sort(function (a, b) { return b[2] - a[2]; }).forEach(function (r) {
      var c = el('circle', { cx: sx(r[4]), cy: sy(r[8]), r: rad(r[2]), fill: col(r[3]), 'fill-opacity': '.45', stroke: col(r[3]), 'stroke-width': '1.2', tabindex: '0' }, g);
      var msg = r[0] + ' (' + r[1] + '): ' + n(r[2]) + ' awards · expected demand ' + spct(r[4]) + ' · AI can do ' + pct(r[8]) + ' · ' + r[3];
      el('title', {}, c, msg);
      function show() { tip.textContent = msg; c.setAttribute('fill-opacity', '.85'); } function hide() { c.setAttribute('fill-opacity', '.45'); }
      c.addEventListener('mouseenter', show); c.addEventListener('focus', show); c.addEventListener('click', show); c.addEventListener('mouseleave', hide); c.addEventListener('blur', hide);
    });
    // label the largest programs, skipping labels that would collide
    var placed = [], seenNames = {};
    rows.slice().sort(function (a, b) { return b[2] - a[2]; }).slice(0, 12).forEach(function (r) {
      var nm = shortName(r[0]);
      if (seenNames[nm]) return;
      var x = sx(r[4]), y = sy(r[8]), rr = rad(r[2]), w = nm.length * 6.6;
      var right = x + rr + 4 + w < x1, lx = right ? x + rr + 4 : x - rr - 4, ly = y + 4;
      var bx = right ? lx : lx - w;
      var hit = placed.some(function (b) { return bx < b[0] + b[2] && bx + w > b[0] && Math.abs(ly - b[1]) < 14; });
      if (hit) return;
      placed.push([bx, ly, w]); seenNames[nm] = 1;
      el('text', { x: lx, y: ly, 'text-anchor': right ? 'start' : 'end', 'class': 'lab' }, null, nm);
    });
    box.appendChild(svg);
  }

  var P = new URLSearchParams(location.search);
  var st = (P.get('st') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2), nm = P.get('i');
  if (st && nm) {
    var top = document.getElementById('pf-top'), form = document.getElementById('pf-form');
    if (top && form) { top.querySelector('.wrap').appendChild(form); form.classList.remove('pf-find-main'); form.querySelector('label').textContent = 'Find another college or university'; top.hidden = false; }
    root.innerHTML = '<div class="wrap pf-empty"><p class="muted">Loading…</p></div>';
    getJSON('data/profiles/' + st + '.json?v=' + V).then(function (S) { render(S, nm); })
      .catch(function () { root.innerHTML = '<div class="wrap pf-empty"><p>We could not load that profile. Try the search above.</p></div>'; });
  }
})();
