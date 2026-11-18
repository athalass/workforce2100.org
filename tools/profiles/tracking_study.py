"""Add the Work 2035 Tracking Study page and its card on surveys.html. Usage: tracking_study.py <site root>"""
import re, sys
R = sys.argv[1]
E = '<a href="mailto:athalass@gmail.com">athalass@gmail.com</a>'

src = open(f'{R}/participation.html').read()
head = src[:src.index('<main id="main">')]
head = re.sub(r'<title>.*?</title>', '<title>Work 2035 Tracking Study — Workforce 2100</title>', head)
head = re.sub(r'<meta name="description" content="[^"]*">',
              '<meta name="description" content="A multi-year study comparing the Work 2035 forecasts with what actually happens in college programs and local job markets. Recruitment opens after ethics review, expected spring 2027.">', head)
head = re.sub(r'<style>.*?</style>\n?', '', head, flags=re.S)
head = head.replace('</head>', '''<style>
.ts-hero .status{display:inline-flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}
.ts-hero .lede{margin:14px 0 0;max-width:70ch;font-size:18px;line-height:1.6;color:var(--ink-2)}
.ts-body{display:grid;grid-template-columns:220px minmax(0,1fr);gap:48px;align-items:start}
.ts-toc{position:sticky;top:96px;display:grid;gap:2px;font-size:14.5px}
.ts-toc a{padding:6px 10px;border-radius:6px;color:var(--ink-2);text-decoration:none}
.ts-toc a:hover{background:var(--tint);color:var(--ink)}
.legal h2{scroll-margin-top:90px}
.legal h3{font-size:17px;color:var(--ink);margin:18px 0 6px}
.ts-table{width:100%;border-collapse:collapse;font-size:15px;margin:4px 0 12px}
.ts-table th{text-align:left;font-size:13px;font-weight:600;color:var(--ink-3);padding:8px 10px;border-bottom:2px solid var(--line);background:var(--tint)}
.ts-table td{padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
.ts-table td:first-child{white-space:nowrap;font-weight:600;color:var(--ink)}
.ts-faq dt{font-weight:600;color:var(--ink);margin-top:14px}.ts-faq dd{margin:4px 0 0}
.ts-contact{margin-top:28px;padding:18px 20px;border:1px solid var(--line);border-left:4px solid var(--blue);border-radius:10px;background:#fff}
@media (max-width:860px){.ts-body{grid-template-columns:1fr;gap:16px}.ts-toc{position:static;display:flex;flex-wrap:wrap;gap:4px}}
@media (max-width:520px){.ts-table td:first-child{white-space:normal}}
</style>
</head>''', 1)
head = head.replace(' aria-current="page"', '')
foot = src[src.index('</main>'):]

S = [('summary', 'Summary'), ('why', 'Why this study'), ('what', 'What the study will do'),
     ('timeline', 'Timeline'), ('taking-part', 'Taking part'), ('data', 'How data are handled'),
     ('ethics', 'Ethics review'), ('open', 'Open science'), ('questions', 'Questions institutions ask'),
     ('involved', 'How to get involved')]
toc = ''.join(f'<a href="#{i}">{t}</a>' for i, t in S)

body = f'''<main id="main">
<section class="legal-hero org ts-hero"><div class="wrap">
<p class="eyebrow"><a href="surveys.html" style="color:inherit;text-decoration:none">Surveys</a> · Research study</p>
<div class="status"><span class="chip chip-amber">In development: opens 2027</span><span class="chip chip-gray">For presidents and provosts</span></div>
<h1>Tracking AI's Effect on College Programs: A Multi-Year Study</h1>
<p class="lede">The Work 2035 Tracking Study. Recruitment opens after independent ethics review, expected spring 2027.</p>
<p class="legal-meta">Last updated November 18, 2026</p>
</div></section>
<section class="legal-wrap"><div class="wrap ts-body">
<nav class="ts-toc" aria-label="On this page">{toc}</nav>
<article class="legal">

<h2 id="summary" style="margin-top:0">Summary</h2>
<p>The Work 2035 tracking study checks, every year and in public, how well the <a href="work-2035.html">Work 2035</a> model's forecasts match what actually happens. For every college and university in the country, it publishes a yearly comparison of what the model expected with what happened. For a group of 30 to 50 participating institutions, followed over at least five years, it also asks leaders what they changed and why. The goal is to learn how well AI's effect on work can be forecast, and which college responses work.</p>

<h2 id="why">Why this study</h2>
<p>Colleges are making program, budget and hiring decisions about AI with little evidence. The Work 2035 model, published openly at workforce2100.org, estimates how demand for work may shift through 2035 for every occupation, region and college program in the country. According to the model and today's data, AI will reshape far more programs than it eliminates, and the effects differ sharply from one region to the next.</p>
<p>Those are forecasts, and forecasts need checking. Most AI-and-jobs studies are published once and never tested. This study tests the model in public, year by year, and records how institutions respond. The results will improve the model and give colleges evidence they can use.</p>

<h2 id="what">What the study will do</h2>
<h3>Research questions</h3>
<ol>
<li>How closely do the model's forecasts match what happens in each institution's programs and local job market?</li>
<li>How are colleges and universities responding to AI: redesigning curricula, opening or closing programs, serving displaced adult workers?</li>
<li>Which responses are associated with better outcomes for graduates and regions?</li>
</ol>
<h3>Data</h3>
<ul>
<li><b>Public data, every year:</b> program completions reported to the federal government (IPEDS), regional employment and wage data, and other public labor-market indicators. These need nothing from any institution.</li>
<li><b>A public yearly comparison for every institution:</b> what the model expected for its programs and local job market, set beside what happened. It is added to each free <a href="profile.html">college profile</a>.</li>
<li><b>A short annual survey</b> of participating institutions' leaders (about 15 minutes) on the decisions they made and why.</li>
<li><b>An optional interview</b> (about 45 minutes) with a small number of participating institutions each year.</li>
</ul>

<h2 id="timeline">Timeline</h2>
<table class="ts-table"><thead><tr><th scope="col">When</th><th scope="col">Step</th></tr></thead><tbody>
<tr><td>Winter 2026–27</td><td>Conversations with associations and institutions; ethics (IRB) review</td></tr>
<tr><td>Spring 2027</td><td>Invite institutions, after review approval</td></tr>
<tr><td>Fall 2027</td><td>Baseline survey of participating institutions</td></tr>
<tr><td>Each fall after</td><td>Updated forecasts; public yearly comparison added to every profile; annual survey of participants</td></tr>
<tr><td>Each spring after</td><td>Combined findings published openly</td></tr>
</tbody></table>

<h2 id="taking-part">Taking part</h2>
<p><b>Who can join.</b> Accredited US community colleges, universities and university systems. We aim for a mix of sizes, regions and missions, including institutions that serve many adult and working learners.</p>
<h3>What it involves</h3>
<ul>
<li>One short survey a year, completed by the president, provost or someone they name.</li>
<li>An optional interview in some years.</li>
<li>No internal data, unless an institution chooses to share it.</li>
<li>Institutions can leave the study at any time, without giving a reason.</li>
</ul>
<h3>What participants receive, at no cost</h3>
<ul>
<li>A personal walkthrough each year of the institution's profile and its yearly comparison.</li>
<li>How the institution's comparison sits beside those of similar participating institutions, shown without naming them.</li>
<li>Early access to the combined findings before publication.</li>
<li>A chance to shape what the next edition of the model measures, including the effects of agentic AI.</li>
</ul>
<p class="note">The profiles and yearly comparisons themselves are free and public for every institution, whether or not it takes part.</p>

<h2 id="data">How data are handled</h2>
<ul>
<li><b>Public data stays public.</b> Profiles and yearly comparisons are built from public data, cover every institution and are published openly under each institution's name.</li>
<li><b>What participants tell us stays confidential.</b> Survey and interview responses are stored securely. Findings that draw on them are reported in aggregate, and an institution is named only with its written permission.</li>
<li><b>Used only for this study.</b> Participants' contact details and responses are never shared with any company and never used for marketing.</li>
<li><b>Corrections.</b> Any institution can report an error in its profile or comparison at {E}, and every report gets a reply.</li>
</ul>

<h2 id="ethics">Ethics review</h2>
<p>The study will be reviewed by an independent Institutional Review Board (IRB) before any survey or interview data are collected. No institution will be asked to take part until that review is approved. Once approved, the board's name, the approval reference and a contact for participants' rights will be listed here.</p>
<p>The public profiles and yearly comparisons use only public data about institutions, not information about people, so they do not require this review.</p>

<h2 id="open">Open science</h2>
<p>The Work 2035 model, its methods and the study's combined findings are published openly at workforce2100.org under a Creative Commons Attribution (CC BY) license. The study, data and code are registered on the Open Science Framework (<a href="https://osf.io/ae95y">osf.io/ae95y</a>). The model is re-run every year, and local industry data are refreshed quarterly.</p>

<h2 id="questions">Questions institutions ask</h2>
<dl class="ts-faq">
<dt>Is anything for sale?</dt><dd>No. The profiles, yearly comparisons, data and findings are free and openly licensed.</dd>
<dt>Will our survey answers be made public?</dt><dd>Not under your name without written permission. Published findings that use survey or interview answers are reported in aggregate.</dd>
<dt>Our profile already appears on the site. Do we have to take part?</dt><dd>No. Every institution's profile and yearly comparison are published from public data either way. Taking part adds your leaders' perspective and the benefits listed above.</dd>
<dt>What if the forecast for us looks wrong?</dt><dd>It may be. The forecasts are model estimates based on today's data, not verdicts or advice, and checking them is the point of the study. Tell us, and we will review it and reply.</dd>
<dt>Do you need our internal data?</dt><dd>No. Share it only if you want to.</dd>
<dt>How much time does it take?</dt><dd>About 15 minutes a year for the survey, plus an optional interview.</dd>
<dt>Can we leave?</dt><dd>Yes, at any time, without giving a reason.</dd>
</dl>

<h2 id="involved">How to get involved</h2>
<p>Recruitment opens after ethics review, expected in spring 2027. To hear when it opens, or to ask a question, email {E}. Associations and researchers interested in collaborating are welcome to write too.</p>
<div class="ts-contact"><b style="color:var(--ink)">Contact</b><br>Angelo Thalassinidis, Ph.D. · {E} · <a href="index.html">workforce2100.org</a> · ORCID <a href="https://orcid.org/0009-0006-1057-0738">0009-0006-1057-0738</a></div>
<p style="margin-top:22px"><a href="surveys.html">← Back to Surveys</a></p>
</article></div></section>
'''
open(f'{R}/tracking-study.html', 'w').write(head + body + foot)

# card on surveys.html
p = f'{R}/surveys.html'; s = open(p).read()
card = f'''<article class="card" style="margin-top: 28px">
<div class="chips"><span class="chip chip-amber">In development: opens 2027</span><span class="chip chip-gray">For presidents and provosts of US colleges and universities</span></div>
<h2 style="font-size: 27px">Work 2035 Tracking Study</h2>
<p style="margin: 0; font-size: 16px; line-height: 1.6; color: var(--ink-2); max-width: 80ch">A multi-year study comparing the <a href="work-2035.html">Work 2035</a> forecasts with what actually happens in participating institutions' programs and local job markets, with one short leadership survey a year. Recruitment opens after ethics review, expected in spring 2027.</p>
<div class="links" style="margin-top: auto; align-items: center"><a class="btn btn-primary" href="tracking-study.html">Read about the study</a><span style="font-weight: 400; color: var(--ink-2)">Want to hear when it opens? Email {E}</span></div>
</article>
'''
if 'tracking-study.html' not in s:
    s = s.replace('</article>\n</div>\n<p class="muted" style="margin: 28px 0 0', '</article>\n</div>\n' + card + '<p class="muted" style="margin: 28px 0 0', 1)
    s = s.replace('Choose the survey that fits you. Both are voluntary, ask for no name or email, and are reported only in aggregate.',
                  'Choose the survey that fits you. The two open surveys are voluntary, ask for no name or email, and are reported only in aggregate.', 1)
    s = re.sub(r'<p class="muted" style="margin: 28px 0 0; font-size: 14px; max-width: 80ch; line-height: 1.6">.*?</p>',
               '<p class="muted" style="margin: 28px 0 0; font-size: 14px; max-width: 80ch; line-height: 1.6">The Expert Review is approved by the Anne Arundel Community College Institutional Review Board; questions about your rights as a participant: AACC IRB, <a href="mailto:priairb@aacc.edu">priairb@aacc.edu</a>. The Work 2035 Tracking Study will be reviewed by an independent IRB before any data are collected. Questions about any study: ' + E + '.</p>', s, count=1, flags=re.S)
    open(p, 'w').write(s)

sm = f'{R}/sitemap.xml'
s = open(sm).read()
if 'tracking-study.html' not in s:
    open(sm, 'w').write(s.replace('</urlset>', '<url><loc>https://workforce2100.org/tracking-study.html</loc></url>\n</urlset>'))
print('ok')
