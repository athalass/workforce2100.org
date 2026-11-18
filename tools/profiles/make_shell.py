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
head = head.replace('</head>', '<link rel="canonical" href="https://workforce2100.org/profile.html">\n<link rel="stylesheet" href="assets/profile.css?v=20261118e">\n</head>', 1)
foot = shell[shell.index('</main>'):]
foot = foot.replace('</body>', '<script src="assets/profile.js?v=20261118f"></script>\n</body>', 1)

main = '''<main id="main">
<section class="pf-top"><div class="wrap">
<form class="pf-find" id="pf-form" role="search" autocomplete="off">
<label for="pf-q">Free profile for any U.S. college or university</label>
<div class="pf-row"><input id="pf-q" type="search" placeholder="Type a college name, city or state" aria-controls="pf-list"><button type="submit">Show profile</button></div>
<ul id="pf-list" class="pf-list" hidden></ul>
</form>
</div></section>
<div id="pf-root">
<section class="pf-sec last"><div class="wrap pf-intro">
<h1>College profiles</h1>
<p class="pf-lead">According to our model and today's data, how might AI change the work your graduates go into? Each profile covers one of 5,668 institutions: its local labor market, its programs, a stress test, the institutions that train for the same jobs, and the adults in the area who may need retraining.</p>
<p class="muted">Example: <a href="?st=MD&amp;i=Anne%20Arundel%20Community%20College">Anne Arundel Community College</a> · <a href="?st=OH&amp;i=Columbus%20State%20Community%20College">Columbus State Community College</a> · <a href="?st=TX&amp;i=Austin%20Community%20College%20District">Austin Community College</a></p>
<p class="note">Free and open, from public federal data. Estimates, not predictions or advice. <a href="work-2035.html">Explore the national data</a> · <a href="research.html">Methods</a></p>
</div></section>
</div>
'''
page = head + main + foot
page = page.replace(' aria-current="page"', '')
open(f'{ROOT}/profile.html', 'w').write(page)

os.makedirs(f'{ROOT}/data/profiles', exist_ok=True)
for f in glob.glob(f'{DATA}/*.json'):
    shutil.copy(f, f'{ROOT}/data/profiles/')
shutil.copy(f'{HERE}/profile.js', f'{ROOT}/assets/profile.js')
shutil.copy(f'{HERE}/profile.css', f'{ROOT}/assets/profile.css')

# menu link on every page, and links from home and Work to 2035
for f in glob.glob(f'{ROOT}/*.html'):
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
