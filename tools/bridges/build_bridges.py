"""Career Bridge Finder data: one JSON per state.

Usage: build_bridges.py <Independent_version dir> <BLS National Employment Matrix xlsx> <site data/briefs dir> <out dir> [ONET ratings csv]
                        [ETPL csv (US_ETPL_programs_TPR.csv) CIP-SOC crosswalk xlsx (census.xlsx)]

For every occupation in the state: jobs, wage, work AI takes over, net change to 2035 (main and slow recovery),
the share of task-hours where AI pays, and outlook. For each shrinking occupation: its three closest bridges from the
model (Pathways tab), with skill coverage, extra training, wage, outlook, college programs, ETPL programs and
apprenticeships. Optionally, from O*NET importance ratings: skills both jobs rely on, and skills to add.
Short-term training (ETPL): with the ETPL file and the crosswalk, the programs are matched again here, because the
workbooks' Pathways tab matched a program to a job if EITHER its CIP code maps to the job in the CIP-SOC crosswalk OR
the provider lists the job's SOC code. Broad CIP codes then pull in unrelated programs (CIP 11.0103 Information
Technology maps to Data Scientists, so CCNA and CompTIA A+ courses showed up as data-science training). Here a program
that lists its own SOC codes (96% do) matches only those jobs; the crosswalk is used only for programs that list none.
Programs that list the job's code come first.
State-wide split of displaced workers (change occupation locally / move away / stay without a matching job) comes
from the state brief data, so it matches the briefs.
"""
import sys, os, glob, json, csv, collections
import openpyxl

SRC, NEM, BRIEFS, OUT = sys.argv[1:5]
MIN_COV = 0.4   # bridges with less than 40% of skills in common are not shown
ONET = sys.argv[5] if len(sys.argv) > 5 else None
ETPL, XWALK = (sys.argv[6], sys.argv[7]) if len(sys.argv) > 7 else (None, None)
os.makedirs(OUT, exist_ok=True)

BG = {}
for r in openpyxl.load_workbook(NEM, read_only=True)['Matrix'].iter_rows(min_row=2, values_only=True):
    if r[0] == 'Line item' and r[4] == 'TE1000' and r[6]: BG[r[2]] = r[9] / r[6] - 1

SK = None
if ONET:   # O*NET importance ratings (scale IM, 1-5) for skills and knowledge: {soc6: {element: importance}}
    acc = collections.defaultdict(lambda: collections.defaultdict(list))
    with open(ONET, newline='', encoding='utf-8-sig') as f:
        for r in csv.DictReader(f):
            if r['scale'] != 'IM' or r.get('recommend_suppress') == 'Y': continue
            if r['domain'] not in ('essential_skills', 'transferable_skills', 'knowledge'): continue
            acc[r['onet_soc'][:7]][r['element_name']].append(float(r['value']))
    SK = {s: {e: sum(v) / len(v) for e, v in d.items()} for s, d in acc.items()}
    MEAN = collections.defaultdict(list)
    for d in SK.values():
        for e, v in d.items(): MEAN[e].append(v)
    MEAN = {e: sum(v) / len(v) for e, v in MEAN.items()}

def skills(a, b):
    """Skills both jobs rely on (beyond what most jobs need), and the largest gaps to close for the destination."""
    A, B = SK.get(a), SK.get(b)
    if not A or not B: return None, None
    have = sorted((e for e in B if B[e] >= 3.25 and A.get(e, 0) >= 3.25), key=lambda e: -(min(A[e], B[e]) - MEAN[e]))[:4]
    add = sorted((e for e in B if B[e] >= 3.0 and B[e] - A.get(e, 0) >= 0.5 and e not in have), key=lambda e: -(B[e] - A.get(e, 0)))[:4]
    return [LABEL.get(e, e) for e in have], [LABEL.get(e, e) for e in add]

# plainer names for some O*NET elements
LABEL = {'Administrative': 'Office procedures', 'English Language': 'Written English', 'Customer and Personal Service': 'Customer service',
         'Computers and Electronics': 'Computers', 'Economics and Accounting': 'Accounting', 'Medicine and Dentistry': 'Medical knowledge',
         'Law and Government': 'Laws and regulations', 'Public Safety and Security': 'Safety and security', 'Sales and Marketing': 'Sales',
         'Production and Processing': 'Production processes', 'Management of Personnel Resources': 'Managing people',
         'Management of Financial Resources': 'Managing budgets', 'Management of Material Resources': 'Managing materials',
         'Education and Training': 'Teaching and training', 'Communications and Media': 'Communications', 'Therapy and Counseling': 'Therapy and counseling',
         'Sociology and Anthropology': 'Social science', 'Engineering and Technology': 'Engineering', 'Building and Construction': 'Construction',
         'Food Production': 'Food production', 'Transportation': 'Transportation', 'Personnel and Human Resources': 'Human resources'}

ETP = None
if ETPL:
    import pandas as pd, numpy as np
    CS = pd.read_excel(XWALK, sheet_name='CIP-SOC', dtype=str); CS.columns = ['cip6', 'cip_title', 'soc6', 'soc_title']
    SOC2CIP = CS.groupby('soc6').cip6.apply(set).to_dict()
    ETP = pd.read_csv(ETPL, dtype=str)
    ETP['socs'] = ETP[['field_program_soc_occ_1', 'field_program_soc_occ_2', 'field_program_soc_occ_3']].apply(
        lambda r: {x[:7] for x in r if isinstance(x, str) and len(x) >= 7}, axis=1)
    ETP['cip6'] = ETP.field_cip_code.map(lambda c: f'{float(c):07.4f}' if isinstance(c, str) and c.replace('.', '').isdigit() else '')
    ETP['label'] = ETP.field_program_name.str.slice(0, 50) + ' (' + ETP.field_etp.str.slice(0, 40) + ')'

def etpl_for(E, dsoc):
    own = E[E.socs.map(lambda s: dsoc in s)]
    cip = E[E.socs.map(len).eq(0) & E.cip6.isin(SOC2CIP.get(dsoc, set()))]
    e = pd.concat([own, cip])
    med = lambda col: pd.to_numeric(e[col], errors='coerce').where(lambda x: x > 0).median()
    return dict(ne=len(e), nep=e.field_etp.nunique(), weeks=None if pd.isna(med('field_program_length_weeks')) else round(float(med('field_program_length_weeks')), 3),
                tuition=None if pd.isna(med('field_non_wioa_tuition_cost')) else int(round(float(med('field_non_wioa_tuition_cost')))),
                etpl='; '.join(e.label.head(3)) or None)

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
    E_st = ETP[ETP.field_state.eq(st)] if ETP is not None else None; ecache = {}
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
        if E_st is not None:
            b = src[9][-1]
            if r['dest_soc6'] not in ecache: ecache[r['dest_soc6']] = etpl_for(E_st, r['dest_soc6'])
            b.update(ecache[r['dest_soc6']])
            via = [v.strip() for v in (b['via'] or '').split(';') if v.strip() and v.strip() != 'ETPL']
            if b['ne']: via.insert(1 if via and via[0] == 'College program' else 0, 'ETPL')
            b['via'] = '; '.join(via) or None
    for v in occ.values():   # hide weak bridges: fewer than MIN_COV of skills in common
        had = len(v[9]); v[9] = [b for b in v[9] if (b['cov'] or 0) >= MIN_COV]
        v.append(had - len(v[9]))
    out = dict(st=st, nm=B['nm'], lost=B['lost'], local=B['local'], away=B['away'], stay=B['stay'],
               cols=['title', 'group', 'jobs', 'wage', 'ai', 'chg', 'slow', 'pays', 'outlook', 'bridges', 'weak_hidden'], occ=occ)
    json.dump(out, open(f'{OUT}/{st}.json', 'w'), separators=(',', ':'), ensure_ascii=False)
    nb = sum(1 for v in occ.values() if v[9])
    idx.append([st, B['nm'], len(occ), nb])
    print(st, len(occ), 'occupations', nb, 'with bridges', os.path.getsize(f'{OUT}/{st}.json') // 1024, 'KB')
json.dump(idx, open(f'{OUT}/index.json', 'w'), separators=(',', ':'))
