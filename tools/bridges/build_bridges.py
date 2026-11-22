"""Career Bridge Finder data: one JSON per state.

Usage: build_bridges.py <Independent_version dir> <BLS National Employment Matrix xlsx> <site data/briefs dir> <out dir> [ONET ratings csv]

For every occupation in the state: jobs, wage, work AI takes over, net change to 2035 (main and slow recovery),
the share of task-hours where AI pays, and outlook. For each shrinking occupation: its three closest bridges from the
model (Pathways tab), with skill coverage, extra training, wage, outlook, college programs, ETPL programs and
apprenticeships. Optionally, from O*NET importance ratings: skills both jobs rely on, and skills to add.
State-wide split of displaced workers (change occupation locally / move away / stay without a matching job) comes
from the state brief data, so it matches the briefs.
"""
import sys, os, glob, json, csv, collections
import openpyxl

SRC, NEM, BRIEFS, OUT = sys.argv[1:5]
ONET = sys.argv[5] if len(sys.argv) > 5 else None
os.makedirs(OUT, exist_ok=True)

BG = {}
for r in openpyxl.load_workbook(NEM, read_only=True)['Matrix'].iter_rows(min_row=2, values_only=True):
    if r[0] == 'Line item' and r[4] == 'TE1000' and r[6]: BG[r[2]] = r[9] / r[6] - 1

SK = None
if ONET:   # importance ratings: {soc6: {element: importance 1-5}}
    acc = collections.defaultdict(lambda: collections.defaultdict(list)); kinds = {}
    with open(ONET, newline='', encoding='utf-8-sig') as f:
        rd = csv.DictReader(f)
        cols = rd.fieldnames
        def col(*names):
            for n in names:
                for c in cols:
                    if c.lower().replace(' ', '_') == n: return c
            return None
        c_soc = col('o*net-soc_code', 'onetsoc_code', 'soc', 'soc_code', 'onet_soc_code')
        c_el = col('element_name', 'element')
        c_sc = col('scale_id', 'scale')
        c_v = col('data_value', 'value', 'im')
        c_dom = col('domain', 'source', 'file', 'category')
        for r in rd:
            if c_sc and r[c_sc] not in ('IM',): continue
            try: v = float(r[c_v])
            except (TypeError, ValueError): continue
            soc = r[c_soc][:7]
            acc[soc][r[c_el]].append(v)
            if c_dom: kinds[r[c_el]] = r[c_dom]
    SK = {s: {e: sum(v) / len(v) for e, v in d.items()} for s, d in acc.items()}
    KINDS = kinds

def skills(a, b):
    """Skills both occupations rely on, and the biggest gaps to close for the destination."""
    A, B = SK.get(a), SK.get(b)
    if not A or not B: return None, None
    have = sorted((e for e in B if B[e] >= 3.5 and A.get(e, 0) >= 3.5), key=lambda e: -(B[e] + A.get(e, 0)))[:5]
    add = sorted((e for e in B if B[e] >= 3.25 and B[e] - A.get(e, 0) >= 0.5), key=lambda e: -(B[e] - A.get(e, 0)))[:4]
    return have, add

def r3(x): return None if x is None else round(float(x), 3)
def i0(x): return None if x is None else int(round(float(x)))

idx = []
for st_dir in sorted(glob.glob(f'{SRC}/*/')):
    st = os.path.basename(os.path.dirname(st_dir))
    f = glob.glob(f'{st_dir}*_Work_2035_Data.xlsx')
    bf = f'{BRIEFS}/{st}.json'
    if not f or not os.path.exists(bf): continue
    B = json.load(open(bf))['state']; k = B['k']
    wb = openpyxl.load_workbook(f[0], read_only=True, data_only=True)
    it = wb['Occupations_state'].iter_rows(values_only=True); h = next(it)
    occ = {}
    for row in it:
        r = dict(zip(h, row)); j = r['state_jobs_2025']; n = r['state_net_change_2035']; g = r['state_gross_reduction_2035']
        if not j or n is None or g is None: continue
        gb = r['growth_before_automation'] or 0
        s = 0.0 if r['state_school_age_driver'] is not None else max(0.0, gb - BG.get(r['soc6'], gb))
        w = r['state_median_hourly_wage']
        occ[r['soc6']] = [r['occ_title'], r['group'], i0(j), r3(w * 2080) if w else None, r3(g), r3(n), r3(n - k * s), r3(r['share_hours_ai_pays_state_wages'] or 0), r['state_outlook'], []]
    it = wb['Pathways'].iter_rows(values_only=True); h = next(it)
    for row in it:
        r = dict(zip(h, row)); src = occ.get(r['source_soc6'])
        if not src: continue
        dst = occ.get(r['dest_soc6'])
        have, add = skills(r['source_soc6'], r['dest_soc6']) if SK else (None, None)
        src[9].append(dict(
            soc=r['dest_soc6'], t=r['dest_title'], chg=r3(r['dest_state_change_2035']), add=i0(r['dest_state_jobs_added']),
            jobs=dst[2] if dst else None, slow=dst[6] if dst else None, ai=dst[4] if dst else None,
            wage=r3((r['dest_state_median_wage'] or 0) * 2080) or None, ratio=r3(r['state_wage_ratio']), cov=r3(r['skill_coverage']),
            months=i0(r['extra_training_months']), type=r['pathway_type'], fit=r['fit_levels'], via=r['bridge_types'],
            np=i0(r['state_programs_at_fit_level']), nc=i0(r['state_completions_at_fit_level']), progs=r['top_state_programs'],
            ctys=r['counties_with_program'], ne=i0(r['etpl_programs']), nep=i0(r['etpl_providers']), weeks=r3(r['etpl_median_weeks']),
            tuition=i0(r['etpl_median_tuition']), etpl=r['top_etpl'], appr=r['apprenticeships'], have=have, need=add))
    for v in occ.values(): v[9].sort(key=lambda b: b['soc'] and 0)
    out = dict(st=st, nm=B['nm'], lost=B['lost'], local=B['local'], away=B['away'], stay=B['stay'],
               cols=['title', 'group', 'jobs', 'wage', 'ai', 'chg', 'slow', 'pays', 'outlook', 'bridges'], occ=occ)
    json.dump(out, open(f'{OUT}/{st}.json', 'w'), separators=(',', ':'), ensure_ascii=False)
    nb = sum(1 for v in occ.values() if v[9])
    idx.append([st, B['nm'], len(occ), nb])
    print(st, len(occ), 'occupations', nb, 'with bridges', os.path.getsize(f'{OUT}/{st}.json') // 1024, 'KB')
json.dump(idx, open(f'{OUT}/index.json', 'w'), separators=(',', ':'))
