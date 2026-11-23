/* Home page "Find your answer" box: one search box, four kinds of answer.
   Indexes are loaded only when a tab is first used: data/briefs, data/profiles, data/bridges, data/skills. */
(function () {
  var root = document.getElementById('finder'); if (!root) return;
  var V = '20261123';
  var tabs = root.querySelectorAll('[role="tab"]'), q = root.querySelector('#fd-q'), lab = root.querySelector('#fd-label'),
      list = root.querySelector('#fd-list'), stSel = root.querySelector('#fd-st'), hint = root.querySelector('#fd-hint');
  var KIND = 'place', CACHE = {}, items = [], act = -1;
  var CFG = {
    place: { label: 'State or county', ph: 'e.g. Ohio, or Anne Arundel', hint: 'Opens the state or county brief: jobs to 2035, who is most affected and what people do there.' },
    college: { label: 'College or university', ph: 'e.g. Anne Arundel Community College', hint: 'Opens the college profile: programs, where graduates work and how much curriculum must change.' },
    job: { label: 'Your job', ph: 'e.g. Bookkeeping clerks', hint: 'Opens the Career Bridge Finder: nearby jobs that use the skills you have.' },
    program: { label: 'Academic program', ph: 'e.g. Accounting, Nursing', hint: 'Opens the program skills view: what graduates do and which parts AI can take on.' }
  };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function get(u) { if (!CACHE[u]) CACHE[u] = fetch(u + '?v=' + V).then(function (r) { if (!r.ok) throw r.status; return r.json(); }); return CACHE[u]; }
  function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }

  // each loader returns [{t: label, s: secondary, u: url, k: search text}]
  var LOAD = {
    place: function () { return get('data/briefs/index.json').then(function (d) {
      var out = [];
      d.index.forEach(function (r) {
        out.push({ t: r[1], s: 'State', u: 'brief.html?st=' + r[0], k: norm(r[1] + ' ' + r[0]), w: 2 });
        (r[2] || []).forEach(function (c) { out.push({ t: c, s: (r[0] === 'LA' ? 'Parish' : r[0] === 'AK' ? 'Borough or area' : /city$/i.test(c) ? 'City' : 'County') + ' in ' + r[1], u: 'brief.html?st=' + r[0] + '&c=' + encodeURIComponent(c), k: norm(c + ' ' + r[1]), w: 1 }); });
      });
      return out; }); },
    college: function () { return get('data/profiles/index.json').then(function (d) {
      return d.map(function (r) { return { t: r[0], s: r[3] + ', ' + r[1], u: 'profile.html?st=' + r[1] + '&i=' + encodeURIComponent(r[0]), k: norm(r[0]), w: 1 }; }); }); },
    job: function () { var st = stSel.value; if (!st) return Promise.resolve(null);
      return get('data/bridges/' + st + '.json').then(function (d) {
        return Object.keys(d.occ).map(function (s) { var o = d.occ[s]; return { t: o[0], s: o[1], u: 'bridges.html?st=' + st + '&o=' + s, k: norm(o[0]), w: 1 }; }); }); },
    program: function () { return get('data/skills/index.json').then(function (d) {
      return d.index.map(function (r) { return { t: r[1], s: r[2] + (r[3] ? ' · ' + r[3].toLocaleString('en-US') + ' graduates a year' : ''), u: 'skills.html?p=' + encodeURIComponent(r[0]), k: norm(r[1]), w: Math.log10((r[3] || 0) + 10) }; }); }); }
  };

  function setKind(k) {
    KIND = k;
    tabs.forEach(function (t) { var on = t.dataset.k === k; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    lab.textContent = CFG[k].label; q.placeholder = CFG[k].ph; hint.textContent = CFG[k].hint;
    stSel.hidden = k !== 'job'; q.disabled = k === 'job' && !stSel.value;
    if (q.disabled) q.placeholder = 'Choose your state first';
    close(); items = [];
    var p = LOAD[k](); if (p) p.then(function (x) { if (KIND === k) { items = x || []; if (q.value) search(); } });
  }
  function search() {
    var v = norm(q.value); if (!v || !items.length) return close();
    var words = v.split(' '), res = [];
    for (var i = 0; i < items.length && res.length < 400; i++) {
      var it = items[i], k = ' ' + it.k;
      if (words.every(function (w) { return k.indexOf(' ' + w) >= 0; }))
        res.push([it, (it.k.indexOf(v) === 0 ? 1 : 0) + it.w]);
    }
    res.sort(function (a, b) { return b[1] - a[1] || a[0].t.length - b[0].t.length; });
    show(res.slice(0, 8).map(function (r) { return r[0]; }));
  }
  function show(r) {
    act = -1;
    if (!r.length) { list.innerHTML = '<li class="fd-none">No match. Try fewer letters.</li>'; list.hidden = false; q.setAttribute('aria-expanded', 'true'); return; }
    list.innerHTML = r.map(function (it, i) { return '<li role="option" id="fd-o' + i + '"><a href="' + esc(it.u) + '"><b>' + esc(it.t) + '</b><span>' + esc(it.s) + '</span></a></li>'; }).join('');
    list.hidden = false; q.setAttribute('aria-expanded', 'true');
  }
  function close() { list.hidden = true; list.innerHTML = ''; q.setAttribute('aria-expanded', 'false'); q.removeAttribute('aria-activedescendant'); }
  function move(d) {
    var o = list.querySelectorAll('[role="option"]'); if (!o.length) return;
    if (act >= 0) o[act].classList.remove('on');
    act = (act + d + o.length) % o.length; o[act].classList.add('on'); q.setAttribute('aria-activedescendant', o[act].id);
  }

  tabs.forEach(function (t) { t.addEventListener('click', function () { setKind(t.dataset.k); q.focus(); }); });
  root.querySelector('[role="tablist"]').addEventListener('keydown', function (e) {
    var ks = ['place', 'college', 'job', 'program'], i = ks.indexOf(KIND);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); setKind(ks[(i + (e.key === 'ArrowRight' ? 1 : 3)) % 4]); root.querySelector('[data-k="' + KIND + '"]').focus(); }
  });
  stSel.addEventListener('change', function () { setKind('job'); if (!q.disabled) q.focus(); });
  q.addEventListener('input', search);
  q.addEventListener('focus', function () { if (q.value) search(); });
  q.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Escape') close();
    else if (e.key === 'Enter') { var o = list.querySelectorAll('[role="option"] a'); if (o.length) { e.preventDefault(); location.href = o[act >= 0 ? act : 0].getAttribute('href'); } }
  });
  document.addEventListener('click', function (e) { if (!root.contains(e.target)) close(); });
  get('data/bridges/index.json').then(function (ix) { stSel.insertAdjacentHTML('beforeend', ix.map(function (r) { return '<option value="' + r[0] + '">' + esc(r[1]) + '</option>'; }).join('')); });
  setKind('place');
})();
