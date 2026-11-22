"""Skills view for each program family (4-digit CIP x award level), national.

Inputs: tasks_nat.pkl (tasks.py: every O*NET task classed with the model's cost test, base AI path, national wages),
program_destinations.pkl (dests.py: the tiers' destination weights per CIP6 x level), O*NET 31 files
(tasks to DWAs, GWA-IWA-DWA, skills-to-work-activities links, importance ratings, task statements), site profile data (titles).

For a program: occupations weighted by the destination weights (CIP6 weights combined by national completions).
Each task's time (core 2, supplemental 1) is split across the work activities (GWAs) it is linked to through its DWAs.
Work activity AI share = task time AI can take on (exposed and AI pays) / all task time in that activity.
Skill AI share = time-weighted AI share of the work activities O*NET links the skill to.
Importance = destination-weighted O*NET importance (1-5).
"""
import sys, json, glob, collections, os, numpy as np, pandas as pd
B = '/home/claude/build/skills/'; ON = '/mnt/user-data/outputs/onet31/'; UP = '/mnt/user-data/uploads/Occupational analysis/'
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
T = pd.read_pickle(B + 'tasks_nat.pkl'); D = pd.read_pickle(B + 'program_destinations.pkl')
OCC = pd.read_pickle(B + 'occ_nat.pkl').set_index('soc6').occ_title

# task -> GWA (split equally across linked GWAs)
td = pd.read_csv(ON + 'ONET31_tasks_to_dwas.csv', dtype=str)
gd = pd.read_csv(ON + 'ONET31_gwas_to_iwas_to_dwas.csv', dtype=str)
d2g = gd.drop_duplicates('DWA Element ID').set_index('DWA Element ID')['GWA Element Name']
td['gwa'] = td['DWA Element ID'].map(d2g); td['soc6'] = td['O*NET-SOC Code'].str[:7]; td['task_id'] = td['Task ID'].astype(int)
tg = td.dropna(subset=['gwa']).drop_duplicates(['soc6', 'task_id', 'gwa'])[['soc6', 'task_id', 'gwa']]
tg['k'] = 1 / tg.groupby(['soc6', 'task_id']).gwa.transform('size')
T['task_id'] = T.task_id.astype(int)
TG = T.merge(tg, on=['soc6', 'task_id'])
TG['t'] = TG.tshare * TG.k; TG['a'] = TG.w_ai * TG.k
OG = TG.groupby(['soc6', 'gwa'])[['t', 'a']].sum().reset_index()
print('task time linked to work activities:', round(TG.t.sum() / T.tshare.sum(), 3))

# skills -> GWAs
sk = pd.concat([pd.read_csv(ON + 'ONET31_essential_skills_to_work_activities.csv').rename(columns={'Essential Skills Element Name': 'skill'}),
                pd.read_csv(ON + 'ONET31_transferable_skills_to_work_activities.csv').rename(columns={'Transferable Skills Element Name': 'skill'})])
S2G = sk.groupby('skill')['Work Activities Element Name'].apply(set).to_dict()
KIND = {**{s: 'essential' for s in pd.read_csv(ON + 'ONET31_essential_skills_to_work_activities.csv')['Essential Skills Element Name']},
        **{s: 'transferable' for s in pd.read_csv(ON + 'ONET31_transferable_skills_to_work_activities.csv')['Transferable Skills Element Name']}}

# importance ratings by soc6
R = pd.read_csv(UP + 'ONET31_ratings_IM_LV.csv', dtype=str)
R = R[(R.scale == 'IM') & (R.recommend_suppress != 'Y')]
R['soc6'] = R.onet_soc.str[:7]; R['v'] = R.value.astype(float)
IMP = R.groupby(['domain', 'soc6', 'element_name']).v.mean()

# task text
TS = pd.read_csv(ON + 'ONET31_task_statements.csv', dtype=str)
TS['soc6'] = TS['O*NET-SOC Code'].str[:7]; TS['task_id'] = TS['Task ID'].astype(int)
TXT = TS.drop_duplicates(['soc6', 'task_id']).set_index(['soc6', 'task_id']).Task

# titles from the site's profile data
TITLE = {}
for f in glob.glob('/home/claude/workforce2100.org/data/profiles/[A-Z][A-Z].json'):
    for I in json.load(open(f))['insts'].values():
        for p in I['p']: TITLE.setdefault(str(p[7]), p[0])
CT = {}
for g, cs in (('B', '11 14 15 27 40 26 04 10 41 47 46 49 29'), ('A', '52 45 09 30 44 03 01 25'), ('H', '51 42 43 13 22 19'), ('O', '50 23 24 54 16 38 05 39 31 12')):
    for c in cs.split(): CT[c] = g

fam = collections.defaultdict(lambda: [None, 0])
for (c6, lv), (w, n) in D.items():
    f = fam[(c6[:5], lv)]; v = w * max(n, 1); f[0] = v if f[0] is None else f[0].add(v, fill_value=0); f[1] += n
occ_ai = T.groupby('soc6').w_ai.sum()

def r2(x): return round(float(x), 3)
files = collections.defaultdict(dict); idx = []; lvlavg = collections.defaultdict(lambda: [0.0, 0.0])
res = {}
for (c4, lv), (w, n) in fam.items():
    w = w / w.sum(); w = w[w > 0.002]; w = w / w.sum()
    o = occ_ai.reindex(w.index); m = o.notna()
    if not m.any(): continue
    ai = float((o[m] * w[m]).sum() / w[m].sum())
    lvlavg[lv][0] += ai * n; lvlavg[lv][1] += n
    og = OG[OG.soc6.isin(w.index)].copy(); og['ow'] = og.soc6.map(w)
    G = og.assign(t=og.t * og.ow, a=og.a * og.ow).groupby('gwa')[['t', 'a']].sum()
    G['ai'] = G.a / G.t; G['tshare'] = G.t / G.t.sum()
    def imp(domain, el):
        vals = [(IMP.get((domain, s, el)), wt) for s, wt in w.items()]
        vals = [(v, wt) for v, wt in vals if v is not None and not np.isnan(v)]
        return sum(v * wt for v, wt in vals) / sum(wt for _, wt in vals) if vals else None
    acts = []
    for g, r in G.sort_values('t', ascending=False).iterrows():
        im = imp('work_activities', g)
        acts.append([g, r2(im) if im else None, r2(r.ai), r2(r.tshare)])
    skills = []
    for s, gs in S2G.items():
        gg = G[G.index.isin(gs)]
        if gg.t.sum() <= 0: continue
        im = imp(KIND[s] + '_skills', s)
        if im is None: continue
        skills.append([s, r2(im), r2(gg.a.sum() / gg.t.sum()), KIND[s][0]])
    skills.sort(key=lambda x: -x[1])
    tt = T[T.soc6.isin(w.index)].copy(); tt['ow'] = tt.soc6.map(w)
    tt['g_ai'] = tt.w_ai * tt.ow; tt['g_core'] = tt.w_core * tt.ow
    def tops(col):
        x = tt[tt[col] > 0].sort_values(col, ascending=False).head(6)
        return [[TXT.get((r.soc6, r.task_id), ''), OCC.get(r.soc6, r.soc6)] for r in x.itertuples()]
    key = c4 + '|' + lv
    res[key] = dict(t=TITLE.get(c4, c4), lv=lv, n=int(n), ai=r2(ai), type=CT.get(c4[:2], 'O') if ai >= .5 else None,
        occ=[[OCC.get(s, s), r2(v)] for s, v in w.sort_values(ascending=False).head(5).items()],
        skills=skills, acts=acts[:18], tai=tops('g_ai'), tcore=tops('g_core'))
LA = {lv: v[0] / v[1] for lv, v in lvlavg.items()}
for key, r in res.items():
    r['lvavg'] = r2(LA[r['lv']])
    files[key[:2]][key] = r
    idx.append([key, r['t'], r['lv'], r['n'], r['ai']])
for c2, d in files.items():
    json.dump(d, open(f'{OUT}/{c2}.json', 'w'), separators=(',', ':'), ensure_ascii=False)
idx.sort(key=lambda x: -x[3])
json.dump(dict(levels={k: r2(v) for k, v in LA.items()}, index=idx), open(f'{OUT}/index.json', 'w'), separators=(',', ':'), ensure_ascii=False)
print('programs', len(res), 'files', len(files), 'level averages', {k: round(v, 3) for k, v in LA.items()})
