/* Program skills view: workforce2100.org
   Data: data/skills/index.json and data/skills/{CIP2}.json (tools/skills/build_skills.py) */
(function () {
  var V = '20261122';
  var $ = function (id) { return document.getElementById(id); };
  var q = $('sk-q'), list = $('sk-list'), root = $('sk-root'), tryp = $('sk-try');
  var IX = null, LV = {}, CACHE = {}, CUR = null;
  var LEVEL = { Certificate: 'certificate', Associate: 'associate degree', Bachelor: "bachelor's degree", Graduate: 'graduate degree' };
  var TYPES = {
    B: ['Builders', 'The work shifts toward specifying, testing and owning AI-built systems.', 'Add writing precise specifications, testing and reviewing AI-generated work, and taking responsibility for systems once they run.'],
    A: ['Analysts and managers', 'The human core becomes observing the work on site, putting new systems in place with staff, and training people.', 'Add field observation, leading change with staff, and teaching others to work with AI.'],
    H: ['High-consequence professions', 'AI supports the work, but a person stays in charge of decisions with real consequences.', 'Add checking AI recommendations against the case in front of you, documenting decisions, and knowing when to override.'],
    O: ['Other High programs', 'AI can do much of the routine task time, but no single plan fits these fields.', 'The common thread still applies: directing AI, checking what it produces and owning the result.']
  };
  var GROUPS = [
    ['people', 'Stays with people', 'AI takes on less than 30% of the work that uses it. Protect it and give students more practice.', '#2E7D50'],
    ['shared', 'Shared with AI', 'AI takes on 30–60%. Teach doing it with AI, and checking what AI produces.', '#1F5F8B'],
    ['ai', 'AI takes on much of it', 'AI takes on 60% or more. Shift time from doing it by hand to directing AI and checking its work.', '#C9821B']
  ];
  function grp(x) { return x < 0.3 ? 0 : x < 0.6 ? 1 : 2; }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function N(x) { return x == null ? '—' : Math.round(x).toLocaleString('en-US'); }
  function P(x) { return x == null ? '—' : Math.round(x * 100) + '%'; }
  function get(u) { return fetch(u + '?v=' + V).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function lvl(x) { return x >= 0.5 ? 'High' : x >= 0.3 ? 'Medium' : 'Lower'; }

  get('data/skills/index.json').then(function (d) {
    IX = d.index; LV = d.levels;
    var ex = ['51.38|Associate', '52.03|Associate', '11.10|Certificate', '51.08|Certificate'].filter(function (k) { return IX.some(function (r) { return r[0] === k; }); });
    tryp.innerHTML = 'Try: ' + ex.map(function (k) { var r = IX.filter(function (x) { return x[0] === k; })[0]; return '<a href="?p=' + encodeURIComponent(k) + '" data-k="' + k + '">' + esc(r[1]) + ' (' + esc(r[2].toLowerCase()) + ')</a>'; }).join(' · ');
    var p = new URLSearchParams(location.search).get('p');
    if (p) show(p);
  });
  tryp.addEventListener('click', function (e) { var a = e.target.closest('a[data-k]'); if (!a) return; e.preventDefault(); pick(a.dataset.k); });

  q.addEventListener('input', function () {
    var w = q.value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    if (!w.length || !IX) { list.hidden = true; return; }
    var hits = IX.filter(function (r) { var t = (r[1] + ' ' + r[2] + ' ' + r[0]).toLowerCase(); return w.every(function (x) { return t.indexOf(x) >= 0; }); }).slice(0, 14);
    list.innerHTML = hits.length ? hits.map(function (r) { return '<li><a href="?p=' + encodeURIComponent(r[0]) + '" data-k="' + r[0] + '"><b>' + esc(r[1]) + '</b><span>' + esc(r[2]) + ' · ' + N(r[3]) + ' graduates a year nationally · AI ' + P(r[4]) + '</span></a></li>'; }).join('') : '<li class="muted">No program matches. Try a shorter word.</li>';
    list.hidden = false;
  });
  list.addEventListener('click', function (e) { var a = e.target.closest('a[data-k]'); if (!a) return; e.preventDefault(); pick(a.dataset.k); });
  document.addEventListener('click', function (e) { if (!e.target.closest('.bf-occ')) list.hidden = true; });
  $('sk-form').addEventListener('submit', function (e) { e.preventDefault(); var a = list.querySelector('a[data-k]'); if (a) pick(a.dataset.k); });
  root.addEventListener('click', function (e) { if (e.target.closest('#sk-csv')) { e.preventDefault(); csv(); } });

  function pick(k) { list.hidden = true; q.value = ''; history.replaceState(null, '', location.pathname + '?p=' + encodeURIComponent(k)); show(k); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  function show(k) {
    var c2 = k.slice(0, 2);
    (CACHE[c2] ? Promise.resolve(CACHE[c2]) : get('data/skills/' + c2 + '.json').then(function (d) { CACHE[c2] = d; return d; })).then(function (d) {
      var r = d[k];
      if (!r) { root.innerHTML = '<div class="wrap bf-empty">We do not have a skills view for this program. Try searching for a related program.</div>'; return; }
      CUR = r; render(r);
    }).catch(function () { root.innerHTML = '<div class="wrap bf-empty">Sorry, the data could not be loaded.</div>'; });
  }

  function bar(v, max, col) { return '<span class="sk-bar"><i style="width:' + Math.max(2, Math.min(100, v / max * 100)).toFixed(0) + '%;background:' + col + '"></i></span>'; }

  function render(r) {
    document.title = r.t + ' (' + r.lv + '): skills view — Workforce 2100';
    $('sk-h1').textContent = r.t;
    $('sk-lede').innerHTML = esc(r.lv) + ' programs nationally · ' + N(r.n) + ' graduates a year (IPEDS 2023–24). Which skills behind this program AI is likely to take on by 2035, which stay with people, and what to change, according to our model and today\'s data.';
    var sk = r.skills.filter(function (s) { return s[1] >= 3; });
    if (sk.length < 8) sk = r.skills.slice(0, 10);
    var tm = [0, 0, 0], tt = 0; r.acts.forEach(function (a) { tm[grp(a[2])] += a[3]; tt += a[3]; });
    var L = lvl(r.ai);
    var acts = r.acts.filter(function (a) { return a[3] >= 0.02; }).slice(0, 14);
    var h = '<section class="bf-sec"><div class="wrap">' +
      '<div class="sk-top"><div class="bf-kpis sk-k3">' +
      '<div class="bf-kpi"><b>' + P(r.ai) + '</b><span>of graduates\' task-hours AI can take on · <span class="cl cl-' + L.toLowerCase() + '">' + L + ' curriculum change</span></span><small>' + esc(r.lv) + ' programs on average: ' + P(LV[r.lv]) + '</small></div>' +
      GROUPS.map(function (g, i) { return '<div class="bf-kpi"><b style="color:' + g[3] + '">' + P(tt ? tm[i] / tt : 0) + '</b><span>of graduates\' time is in work that ' + ['stays with people', 'is shared with AI', 'AI takes on for the most part'][i] + '</span></div>'; }).join('') +
      '</div>' +
      '<div class="sk-occ"><h3>Where graduates work</h3><ul>' + r.occ.map(function (o) { return '<li><span>' + esc(o[0]) + '</span><b>' + P(o[1]) + '</b></li>'; }).join('') + '</ul></div></div>' +
      (r.type ? '<p class="bf-tip"><b>' + TYPES[r.type][0] + '.</b> ' + TYPES[r.type][1] + ' ' + TYPES[r.type][2] + '</p>' : '') +
      '</div></section>';

    h += '<section class="bf-sec bf-tint"><div class="wrap"><h2>What graduates do, and what AI can take on</h2>' +
      '<p class="intro">The work activities that take the most of graduates\' task time (O*NET), with the share of each that AI can take on.</p>' +
      '<div class="sk-legend">' + GROUPS.map(function (g) { return '<span><i style="background:' + g[3] + '"></i><b>' + g[1] + '.</b> ' + g[2] + '</span>'; }).join('') + '</div>' +
      '<div class="tscroll"><table class="pf-table sk-table"><thead><tr><th>Work activity</th><th>Share of task time</th><th>Share AI can take on</th><th>What it means</th></tr></thead><tbody>' +
      acts.map(function (a) { var g = GROUPS[grp(a[2])]; return '<tr><td><b>' + esc(a[0]) + '</b></td><td class="sk-num">' + bar(a[3], acts[0][3], '#9DB3C6') + P(a[3]) + '</td><td class="sk-num">' + bar(a[2], 1, g[3]) + P(a[2]) + '</td><td><span class="sk-tag" style="color:' + g[3] + ';border-color:' + g[3] + '">' + g[1] + '</span></td></tr>'; }).join('') +
      '</tbody></table></div></div></section>';

    h += '<section class="bf-sec"><div class="wrap"><h2>The skills behind this program</h2>' +
      '<p class="intro">The skills the program\'s jobs rate as important (O*NET, 3 or higher on a 1–5 scale). The second column is the share of the work activities linked to each skill that AI can take on. Skills are used across many activities, so read it as a guide, not a verdict: judgment, for example, still decides whether AI\'s work is right.</p>' +
      '<div class="tscroll"><table class="pf-table sk-table"><thead><tr><th>Skill</th><th>Importance</th><th>Share of related work AI can take on</th></tr></thead><tbody>' +
      sk.map(function (s) { var g = GROUPS[grp(s[2])]; return '<tr><td><b>' + esc(s[0]) + '</b></td><td class="sk-num">' + bar(s[1], 5, '#5D88AC') + s[1].toFixed(1) + '</td><td class="sk-num">' + bar(s[2], 1, g[3]) + P(s[2]) + '</td></tr>'; }).join('') +
      '</tbody></table></div>' +
      '<div class="sk-tasks"><div><h3>Tasks AI can take on <span class="muted">(graduates direct and check)</span></h3><ul>' + r.tai.map(function (t) { return '<li>' + esc(t[0]) + ' <span class="muted">· ' + esc(t[1]) + '</span></li>'; }).join('') + '</ul></div>' +
      '<div><h3>Human-core tasks <span class="muted">(stay with people)</span></h3><ul>' + r.tcore.map(function (t) { return '<li>' + esc(t[0]) + ' <span class="muted">· ' + esc(t[1]) + '</span></li>'; }).join('') + '</ul></div></div>' +
      '</div></section>';

    h += '<section class="bf-sec bf-tint"><div class="wrap"><h2>A curriculum review in four steps</h2><ol class="sk-steps">' +
      '<li><b>Protect.</b> Map where the program teaches the skills that stay with people, and add practice with real stakes: clinicals, labs, field work, client projects.</li>' +
      '<li><b>Teach checking.</b> For the shared skills, have students do the work with AI and grade how well they check and correct its output, not only the final product.</li>' +
      '<li><b>Rebalance.</b> Where AI takes on most of the work, cut drill on doing it by hand and teach students to set up the task, direct AI and verify the result.</li>' +
      '<li><b>Ask employers.</b> Bring this list to the advisory board: which tasks are already shifting to AI locally, and what new hires are expected to check and own.</li>' +
      '</ol><p class="bf-dl"><a class="pf-btn" href="#" id="sk-csv">Download the skills and activities (CSV) for a review worksheet</a></p></div></section>';
    root.innerHTML = h;
  }

  function csv() {
    if (!CUR) return;
    var rows = [['program', 'level', 'kind', 'name', 'importance_1_to_5', 'share_of_task_time', 'share_ai_can_take_on', 'group']];
    CUR.skills.forEach(function (s) { rows.push([CUR.t, CUR.lv, 'skill', s[0], s[1], '', s[2], GROUPS[grp(s[2])][1]]); });
    CUR.acts.forEach(function (a) { rows.push([CUR.t, CUR.lv, 'work activity', a[0], a[1] == null ? '' : a[1], a[3], a[2], GROUPS[grp(a[2])][1]]); });
    var s = rows.map(function (r) { return r.map(function (v) { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([s], { type: 'text/csv' }));
    a.download = (CUR.t.replace(/[^A-Za-z0-9]+/g, '_') + '_' + CUR.lv + '_skills.csv'); a.click();
  }
})();
