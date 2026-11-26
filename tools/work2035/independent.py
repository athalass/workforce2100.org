"""Put the independent model's national rates into data/work2035_data.json (Jobs & programs tab, States wage index tab).

make_data.py builds the file from the national model files (Occupation_Outlook_2035_v2.xlsx, Program_Roadmap_2035_v1.xlsx),
whose 2035 change uses the McKinsey-calibrated adoption speed. Since Nov 15, 2026 the site's headline, states, counties,
briefs and workbooks use the independent version (adoption speed from the Census BTOS, no McKinsey input). This script
replaces the McKinsey-calibrated fields with the independent ones so the whole site shows one model:
  occupations: r (work AI takes over by 2035), n (net change 2025-35), c (outlook from n), lo/hi (10th/90th percentile range)
  programs:    d (demand for graduates 2025-35), k (tier from d; Transfer-oriented kept); programs not in the independent
               workbooks are dropped (61 tiny families, 44 completions in all)
  states:      sd, jd (share and number of jobs in shrinking occupations) from data/impact_data.json
Unchanged: exposure, where AI pays, wages, quadrants, AI value per hour (Price of Judgment), work hours, curriculum level.

Sources: US_Work_2035_Independent_vs_MGI.xlsx (Occupations: net_independent, gross_red_independent, all 830 occupations);
the independent state workbooks (Occupations_state: range offsets p10/p90 around the point, employment-weighted median
over states; Program_families_state: demand_change_us, completions-weighted median over states).
Usage: independent.py <site root> <Independent_version dir> <US_Work_2035_Independent_vs_MGI.xlsx>
Run after make_data.py (and after merge_wi.py has updated impact_data.json)."""
import sys, os, glob, json, collections, numpy as np, openpyxl
R, IV, CMP = sys.argv[1:4]
P = os.path.join(R, 'data', 'work2035_data.json'); D = json.load(open(P))

def rows(ws):
    it = ws.iter_rows(values_only=True); h = next(it); return h, it
wb = openpyxl.load_workbook(CMP, read_only=True); h, it = rows(wb['Occupations']); ix = {k: i for i, k in enumerate(h)}
IND = {r[0]: (r[ix['gross_red_independent']], r[ix['net_independent']]) for r in it}

off = collections.defaultdict(list); prog = collections.defaultdict(list)
for f in sorted(glob.glob(os.path.join(IV, '*', '*.xlsx'))):
    wb = openpyxl.load_workbook(f, read_only=True)
    h, it = rows(wb['Occupations_state']); ix = {k: i for i, k in enumerate(h)}
    for r in it:
        if r[ix['state_net_change_p10']] is None: continue
        n = r[ix['state_net_change_2035']]
        off[r[0]].append((r[ix['state_net_change_p10']] - n, r[ix['state_net_change_p90']] - n, r[ix['state_jobs_2025']] or 0))
    h, it = rows(wb['Program_families_state']); ix = {k: i for i, k in enumerate(h)}
    for r in it:
        prog[(r[ix['cip4']], r[ix['level']])].append((r[ix['demand_change_us']], r[ix['completions']] or 0))

def wmed(vals, w):
    o = np.argsort(vals); v = np.array(vals)[o]; c = np.cumsum(np.array(w, float)[o])
    return float(v[np.searchsorted(c, c[-1] / 2)]) if c[-1] > 0 else float(np.median(vals))
def cat(x):
    return 'Eliminated' if x < -0.5 else 'Substantially reduced' if x <= -0.2 else 'Moderate decline' if x < -0.05 else 'Stable' if x <= 0.05 else 'Growing'
rd = lambda x, n=3: None if x is None else round(float(x), n)

for o in D['occ']:
    red, net = IND[o['s']]
    o['r'], o['n'], o['c'] = rd(red), rd(net), cat(net)
    if o['s'] in off:
        a = off[o['s']]; w = [x[2] for x in a]
        o['lo'], o['hi'] = rd(net + wmed([x[0] for x in a], w)), rd(net + wmed([x[1] for x in a], w))
    else:
        o['lo'] = o['hi'] = None
keep = []
for p in D['prog']:
    k = (p['c'], p['l'])
    if k not in prog: continue
    a = prog[k]; d = wmed([x[0] for x in a], [x[1] + 1e-9 for x in a])
    p['d'] = rd(d)
    if p['k'] != 'Transfer-oriented':
        p['k'] = 'Invest' if d >= 0.10 else ('Reinvent' if d > -0.10 else 'Consolidate or Review')
    keep.append(p)
dropped = len(D['prog']) - len(keep); D['prog'] = keep
imp = {s['ab']: s for s in json.load(open(os.path.join(R, 'data', 'impact_data.json')))['states']}
for s in D['states']:
    x = imp[s['ab']]; s['sd'] = rd(x['ts'], 4); s['jd'] = int(round(x['ts'] * x['jobs']))
json.dump(D, open(P, 'w'), separators=(',', ':'), ensure_ascii=False)
print(len(D['occ']), 'occupations;', len(keep), 'programs (dropped', dropped, ');', len(D['states']), 'states')
