"""Create profile.html and wire it into an .org site copy. Usage: make_shell.py <site root> <profile data dir>"""
import re, sys, os, shutil, glob
ROOT, DATA = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))

shell = open(f'{ROOT}/legal.html').read()
head = shell[:shell.index('<main id="main">')]
head = re.sub(r'<title>.*?</title>', '<title>College profiles — Workforce 2100</title>', head)
head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="Free AI and labor-market profiles for 5,668 U.S. colleges and universities: local labor market, programs, a stress test, competition and adult learners to 2035.">', head)
head = re.sub(r'<style>.*?</style>', '', head, flags=re.S)
head = re.sub(r'<link rel="canonical" href="[^"]*">', '', head)
head = head.replace('</head>', '<link rel="canonical" href="https://workforce2100.org/profile.html">\n<link rel="stylesheet" href="assets/profile.css?v=20261119p">\n</head>', 1)
foot = shell[shell.index('</main>'):]
foot = foot.replace('</body>', '<script src="assets/forms.js?v=20261118d"></script>\n<script src="assets/profile.js?v=20261119p"></script>\n</body>', 1)

main = '''<main id="main">
<section class="pf-top" id="pf-top" hidden><div class="wrap"></div></section>
<div id="pf-root">
<section class="pf-sec last"><div class="wrap pf-intro">
<h1>College profiles</h1>
<p class="pf-lead">According to our model and today's data, how might AI change the work your graduates go into? Each profile covers one of 5,668 institutions: its local labor market, its programs, a stress test, the institutions that train for the same jobs, and the adults in the area who may need retraining.</p>
<form class="pf-find pf-find-main" id="pf-form" role="search" autocomplete="off">
<label for="pf-q">Find the free profile for any U.S. college or university</label>
<div class="pf-row"><input id="pf-q" type="search" placeholder="Type a college name, city or state" aria-controls="pf-list"><button type="submit">Show profile</button></div>
<ul id="pf-list" class="pf-list" hidden></ul>
</form>
<p class="note">Free and open, from public federal data. Estimates, not predictions or advice. <a href="work-2035.html">Explore the national data</a> · <a href="research.html">Methods</a></p>
<aside class="pf-study" aria-label="Work 2035 Tracking Study"><div><p class="pf-study-tag">Coming in 2027</p><p><b>Help check these forecasts.</b> The Work 2035 Tracking Study will compare forecasts like these with what actually happens, year by year, and ask college leaders what they changed and why. It opens to presidents and provosts after ethics review, expected in spring 2027.</p></div><p class="pf-study-links"><a class="pf-btn" href="tracking-study.html">Read about the study</a> <span>Want to hear when it opens? <a href="tracking-study.html#notify">Sign up</a> or email <a href="mailto:athalass@gmail.com">athalass@gmail.com</a></span></p></aside>
</div></section>
</div>
<section class="pf-upd" id="updates"><div class="wrap">
<p class="num">Updates</p><h2>Updated quarterly</h2>
<p class="intro">AI is changing faster than the data that measure it. These profiles are updated quarterly as new federal data are released, each update is dated, and the full model is re-run once a year.</p>
<div class="pf-upd-grid">
<div><b>Every quarter.</b> New federal data as they are released, such as county jobs by industry (BLS QCEW) for the Local industries section and how fast employers are adopting AI.</div>
<div><b>Every year.</b> When the BLS employment projections, OEWS wages and IPEDS completions arrive, the full model is re-run: labor markets, programs, the program map, the stress test and competition.</div>
<div><b>Not included yet.</b> Robots and other physical automation, wages responding to AI, and local plans such as a new plant or a base closing.</div>
</div>
<h3 class="h3" style="margin-top:22px">Change log</h3>
<ul class="pf-log"><li><b>Version 2 · November 18, 2026.</b> State and institution data and the headline figures re-run with the November 2026 state workbooks; college profiles added for 5,668 institutions, with local industries from BLS QCEW 2025, the program map and the AI line; data updated quarterly from here on.</li><li><b>Version 1 · October 25, 2026.</b> First release. Study, data and code registered on <a href="https://osf.io/ae95y">OSF</a>.</li></ul>
<p class="note">Data as of November 2026. The full history of the national data is in the <a href="work-2035.html#updates">Work to 2035 change log</a>.</p>
<h3 class="h3" id="corrections" style="margin-top:26px">Corrections log</h3>
<p class="intro" style="margin-top:0">Found a number that looks wrong for your institution? Open its profile and use "Report an error or request a correction", or email <a href="mailto:athalass@gmail.com">athalass@gmail.com</a>. We reply to every request that includes an email address. Each correction we make is listed here by date and institution, without the sender's name, unless the sender asked us not to list it.</p>
<div class="tscroll"><table class="pf-table pf-corr"><thead><tr><th>Date received</th><th>Institution</th><th>What was reported</th><th>Response</th><th>Fixed in</th></tr></thead>
<tbody><tr><td colspan="5" class="muted">No correction requests yet.</td></tr></tbody></table></div>
</div></section>
'''
page = head + main + foot
page = page.replace(' aria-current="page"', '')
open(f'{ROOT}/profile.html', 'w').write(page)

os.makedirs(f'{ROOT}/data/profiles', exist_ok=True)
for f in glob.glob(f'{DATA}/*.json'):
    shutil.copy(f, f'{ROOT}/data/profiles/')
shutil.copy(f'{HERE}/profile.js', f'{ROOT}/assets/profile.js')
shutil.copy(f'{HERE}/profile.css', f'{ROOT}/assets/profile.css')

# menu links disabled: the profiles page is reachable only by its address (Nov 18, 2026)
for f in []:
    s = open(f).read()
    if 'href="profile.html">College profiles</a>' not in s:
        s = s.replace('<a href="work-2035.html">Work to 2035</a>\n<a href="surveys.html">', '<a href="work-2035.html">Work to 2035</a>\n<a href="profile.html">College profiles</a>\n<a href="surveys.html">', 1)
        s = s.replace('<a href="work-2035.html" aria-current="page">Work to 2035</a>\n<a href="surveys.html">', '<a href="work-2035.html" aria-current="page">Work to 2035</a>\n<a href="profile.html">College profiles</a>\n<a href="surveys.html">', 1)
    if f.endswith('/profile.html'):
        s = s.replace('<a href="profile.html">College profiles</a>', '<a href="profile.html" aria-current="page">College profiles</a>', 1)
    open(f, 'w').write(s)

sm = f'{ROOT}/sitemap.xml'
if os.path.exists(sm):
    s = open(sm).read()
    if 'profile.html' not in s:
        open(sm, 'w').write(s.replace('</urlset>', '<url><loc>https://workforce2100.org/profile.html</loc></url>\n</urlset>'))
print('ok')
