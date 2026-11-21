"""Build data for the state and county briefs (brief.html).
Usage: build_briefs.py <Independent_version dir> <US_Work_2035_Mobility.xlsx> <QCEW_2025_counties_states.csv.gz> <staffing.json> <BLS_EP_occupation.xlsx or BLS National Employment Matrix xlsx> <out dir> [site data/profiles dir]
Industry view: QCEW 2025 jobs by industry (21 industries, suppressed cells filled from ownership totals),
OEWS May 2025 national staffing patterns raked to each state's occupation totals, then each occupation's
state outlook (work AI takes over, net change, slow recovery). Counties use their state's staffing pattern."""
import csv, gzip, json, sys, glob, os
from collections import defaultdict
import openpyxl

SRC, MOB, QCEW, STAFF, BLS, OUT = sys.argv[1:7]
os.makedirs(OUT, exist_ok=True)
IND = [('HC', 'Health care and social assistance'), ('ED', 'Educational services'),
       ('PR', 'Professional, scientific and technical services'), ('RT', 'Retail trade'),
       ('AF', 'Accommodation and food services'), ('AD', 'Administrative support and waste services'),
       ('CO', 'Construction'), ('SLG', 'State and local government'), ('FED', 'Federal government (civilian)'),
       ('MF', 'Manufacturing'), ('TW', 'Transportation and warehousing'), ('OS', 'Other services'),
       ('WH', 'Wholesale trade'), ('FI', 'Finance and insurance'), ('AR', 'Arts, entertainment and recreation'),
       ('RE', 'Real estate and rental'), ('IN', 'Information'), ('MG', 'Management of companies'),
       ('UT', 'Utilities'), ('AG', 'Agriculture, forestry and fishing'), ('MI', 'Mining, oil and gas')]
KEYS = [k for k, _ in IND]
N2 = {'11': 'AG', '21': 'MI', '22': 'UT', '23': 'CO', '31': 'MF', '32': 'MF', '33': 'MF', '42': 'WH', '44': 'RT', '45': 'RT',
      '48': 'TW', '49': 'TW', '51': 'IN', '52': 'FI', '53': 'RE', '54': 'PR', '55': 'MG', '56': 'AD', '61': 'ED', '62': 'HC',
      '71': 'AR', '72': 'AF', '81': 'OS'}

def ind_of(own, naics):
    p = naics[:2]
    if own == '1': return 'FED'
    if own in ('2', '3'): return p == '61' and 'ED' or p == '62' and 'HC' or 'SLG'
    return N2.get(p)

# ---------- QCEW ----------
disc = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))   # area -> own -> ind -> disclosed jobs
d4 = defaultdict(lambda: defaultdict(float))                          # area -> (own, naics4) -> jobs
supp = defaultdict(lambda: defaultdict(list))                         # area -> own -> suppressed naics4 cells
owntot = defaultdict(dict); alltot = {}
with gzip.open(QCEW, 'rt') as f:
    for r in csv.DictReader(f):
        a, own, lvl = r['area_fips'], r['own_code'], r['agglvl_code']
        v = float(r['annual_avg_emplvl'] or 0)
        if lvl in ('50', '70'): alltot[a] = v
        elif lvl in ('51', '71'): owntot[a][own] = v
        elif lvl in ('56', '76'):
            k = ind_of(own, r['industry_code'])
            if not k: continue
            if r['disclosure_code'] == 'N': supp[a][own].append(r['industry_code'])
            else: disc[a][own][k] += v; d4[a][(own, r['industry_code'])] += v
nat4 = defaultdict(float)
for a in list(d4):
    if a.endswith('000'):
        for kk, v in d4[a].items(): nat4[kk] += v

def fill(area, ref4, scale=1.0):
    """Industry jobs for an area. Jobs withheld for confidentiality in each ownership are spread over the
    area's suppressed 4-digit cells in proportion to those industries' jobs in ref4 (the state, or the nation)."""
    out = defaultdict(float)
    for own in ('1', '2', '3', '5'):
        d = disc[area][own]; s_ = sum(d.values()); t = max(owntot[area].get(own, 0), s_)
        for k, v in d.items(): out[k] += v
        gap = t - s_
        if gap <= 0.5: continue
        cells = supp[area][own]
        w = defaultdict(float)
        for n in cells: w[ind_of(own, n)] += ref4.get((own, n), 0) or nat4.get((own, n), 0) * scale or 1.0
        if not w:   # nothing marked suppressed: spread like the reference ownership mix
            for (o, n), v in ref4.items():
                if o == own and ind_of(o, n): w[ind_of(o, n)] += v
        wt = sum(w.values())
        for k, v in w.items(): out[k] += gap * v / wt
    rest = alltot.get(area, 0) - sum(out.values())
    if rest > 0.5 and sum(out.values()):
        tot = sum(out.values())
        for k in list(out): out[k] += rest * out[k] / tot
    return out

staff = json.load(open(STAFF))
pat = {k: {o: v / sum(staff[k].values()) for o, v in staff[k].items()} for k in KEYS}

# ---------- BLS growth without AI (to separate new jobs from AI savings for the slow-recovery case) ----------
bw = openpyxl.load_workbook(BLS, read_only=True, data_only=True)
BG = {}
if 'Table 1.2' in bw.sheetnames:
    for r in bw['Table 1.2'].iter_rows(min_row=3, values_only=True):
        if r[2] == 'Line item' and r[3]: BG[r[1]] = r[4] / r[3] - 1
else:   # National Employment Matrix: total, all industries
    for r in bw['Matrix'].iter_rows(min_row=2, values_only=True):
        if r[0] == 'Line item' and r[4] == 'TE1000' and r[6]: BG[r[2]] = r[9] / r[6] - 1

# ---------- work change: levels and types (Nov 2026) ----------
PROF = sys.argv[7] if len(sys.argv) > 7 else None   # site data/profiles folder, for local graduates
def otype(soc):
    if soc[:2] in ('15', '17') or soc[:4] in ('19-1', '19-2', '19-4'): return 'B'
    if soc[:2] in ('11', '13') or soc[:4] == '19-3': return 'A'
    if soc[:2] in ('29', '21', '23', '25', '33'): return 'H'
    return 'O'
CTYPE = {}
for g_, cs_ in (('B', '11 14 15 27 40 26 04 10 41 47 46 49 29'), ('A', '52 45 09 30 44 03 01 25'), ('H', '51 42 43 13 22 19'), ('O', '50 23 24 54 16 38 05 39 31 12')):
    for c_ in cs_.split(): CTYPE[c_] = g_
def lvl(p): return 0 if p >= 0.5 else 1 if p >= 0.3 else 2
def cnorm(x):
    x = (x or '').lower().replace('st.', 'st').replace('saint', 'st')
    for suf in (' city and borough', ' census area', ' municipality', ' borough', ' parish', ' county'):
        if x.endswith(suf): x = x[:-len(suf)]
    return ' '.join(x.split())
def grads_by_type(insts):
    """Graduates a year in High programs (AI pays >= 50%), by type, with the largest institutions."""
    T = {t: [0, defaultdict(int)] for t in 'BAHO'}
    for nm, I in insts:
        for p in I['p']:
            if p[8] and p[8] >= 0.5:
                t = CTYPE.get(str(p[7])[:2], 'O'); T[t][0] += p[2]; T[t][1][nm] += p[2]
    return {t: [v[0], [[n_, g_] for n_, g_ in sorted(v[1].items(), key=lambda x: -x[1])[:3]]] for t, v in T.items()}
def work_block(occ_e, occ, insts):
    G = {}; L = [0.0, 0.0, 0.0]; T = {t: [0.0, 0.0, 0.0, []] for t in 'BAHO'}
    for o, e in occ_e.items():
        if e < 0.5: continue
        O = occ[o]; ai = e * O['g']; d = e * O['n']; ds = e * O['ns']; lv = lvl(O['p'])
        g = G.setdefault(O['grp'], [0.0, 0.0, 0.0, 0.0, 0.0]); g[0] += e; g[1] += ai; g[2] += e if lv == 0 else 0; g[3] += d; g[4] += ds
        L[lv] += e
        if lv == 0:
            t = T[otype(o)]; t[0] += e; t[1] += d; t[2] += ds; t[3].append((O['t'], e, d))
    grp = sorted(([k_, num(v[0]), sh(v[1] / v[0]), sh(v[2] / v[0]), num(v[3]), num(v[4])] for k_, v in G.items()), key=lambda r: -r[1])
    typ = {k_: [num(v[0]), num(v[1]), num(v[2]), [[t_, num(e_), num(d_)] for t_, e_, d_ in sorted(v[3], key=lambda x: -x[1])[:4]]] for k_, v in T.items()}
    return dict(grp=grp, lvl=[num(x) for x in L], typ=typ, grads=grads_by_type(insts) if insts is not None else None)

# ---------- national file ----------
def table(wb, sheet):
    it = wb[sheet].iter_rows(values_only=True); h = next(it)
    return [dict(zip(h, r)) for r in it if any(v is not None for v in r)]
mw = openpyxl.load_workbook(MOB, read_only=True, data_only=True)
LMS = {r['States']: r for r in table(mw, 'Labor_market_states')}
LMZ = {r['Place']: r for r in table(mw, 'Labor_market_zones')}
LMC = defaultdict(list)
for r in table(mw, 'Labor_market_counties'): LMC[r['States'].split(',')[0].strip() if r['States'] else ''].append(r)
LMC_by_fips = {}
for rows in LMC.values():
    for r in rows: LMC_by_fips[str(r['FIPS']).zfill(5)] = r
CRES = {str(r['fips']).zfill(5): r for r in table(mw, 'Counties')}

def num(x, nd=0):
    if x is None: return None
    x = float(x); return round(x, nd) if nd else int(round(x))
def sh(x): return None if x is None else round(float(x), 4)

def lm(r):
    j = r['Jobs 2025']
    return dict(jobs=num(j), ai=num(r['Work AI takes over (jobs)']), ais=sh(r['Work AI takes over (% of jobs)']),
                wages=num(r['Wages of work AI takes over ($ per year, 2025)'] / 1e6), growth=num(r['Growth without AI (BLS)']),
                savings=num(r['New jobs from AI savings']), net=num(r['Net change in jobs']), lost=num(r['Jobs lost in shrinking occupations']),
                lostS=sh(r['Jobs lost (% of jobs)']), new=num(r['New jobs in growing occupations']), newS=sh(r['New jobs (% of jobs)']),
                open=num(r['Openings over 10 years']), local=num(r['Change occupation in the area']), away=num(r['Move away']),
                awayLo=num(r['Move away (low)']), awayHi=num(r['Move away (high)']), stay=num(r['Stay without a matching job']),
                arrive=num(r['Movers arriving']), pool=num(r['Adult retraining pool']),
                snet=num(r['Net change (slow recovery)']), slost=num(r['Jobs lost (slow recovery)']), snew=num(r['New jobs (slow recovery)']),
                rjobs=num(r['Resident jobs 2025']), rlost=num(r['Residents in shrinking occupations']),
                edu=[[num(r[f'Jobs 2025: {k}']), num(r[f'Work AI takes over: {k}']), num(r[f'Jobs lost: {k}']), num(r[f'New jobs: {k}']), num(r[f'Openings 10 yrs: {k}'])]
                     for k in ('HS or less', 'certificate or associate', "bachelor's or higher")])

us = lm(LMS['US'])
states_nat = []
for ab, r in LMS.items():
    if ab == 'US': continue
    x = lm(r); states_nat.append([ab, r['Place'], x['jobs'], x['ais'], x['lostS'], round(x['away'] / x['lost'], 4) if x['lost'] else 0,
                                  round(x['net'] / x['jobs'], 4), round(x['snet'] / x['jobs'], 4)])
states_nat.sort(key=lambda s: s[1])

def rank(vals, v):  # 1 = highest
    return 1 + sum(1 for x in vals if x > v + 1e-12)

# ---------- per state ----------
index = []
for path in sorted(glob.glob(f'{SRC}/*/*_Work_2035_Data.xlsx')):
    st = os.path.basename(os.path.dirname(path))
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    occ = {}
    for r in table(wb, 'Occupations_state'):
        j = r['state_jobs_2025']; n = r['state_net_change_2035']; g = r['state_gross_reduction_2035']
        if not j or n is None or g is None: continue
        gb = r['growth_before_automation'] or 0
        # growth_before_automation already includes new jobs from AI savings; take out BLS growth to isolate them
        sav = 0.0 if r['state_school_age_driver'] is not None else max(0.0, gb - BG.get(r['soc6'], gb))
        gj = r['state_gross_jobs_reduced'] or 0
        wage = (r['state_annual_wages_at_stake'] / gj) if gj else (r['state_median_hourly_wage'] or 0) * 2080
        occ[r['soc6']] = dict(t=r['occ_title'], j=float(j), g=float(g), n=float(n), s=sav, w=wage, grp=r['group'], p=r['share_hours_ai_pays_state_wages'] or 0)
    S = lm(LMS[st])
    # slow recovery: scale each occupation's new jobs from AI savings so the state total matches the workbook
    tot = sum(o['j'] for o in occ.values())
    target = S['snet'] / S['jobs'] * tot
    k = (sum(o['j'] * o['n'] for o in occ.values()) - target) / sum(o['j'] * o['s'] for o in occ.values())
    for o in occ.values(): o['ns'] = o['n'] - k * o['s']

    sfips = next(str(r['FIPS']).zfill(5)[:2] for r in LMC[st] if r['FIPS']) + '000'
    sind = fill(sfips, nat4)
    nscale = alltot[sfips] / sum(v for a, v in alltot.items() if a.endswith('000'))
    ref_cty = d4[sfips]   # county cells weighted by the state's jobs in that industry (national if the state cell is suppressed too)
    # rake staffing to state occupation totals
    socs = list(occ)
    M = {}
    for kk in KEYS:
        p = pat[kk]; row = {o: p.get(o, 0) for o in socs}; t = sum(row.values())
        M[kk] = {o: v / t * sind.get(kk, 0) for o, v in row.items() if v > 0} if t else {}
    ctarget = {o: occ[o]['j'] for o in socs}
    ct = sum(ctarget.values()); itot = sum(sind.values())
    ctarget = {o: v * itot / ct for o, v in ctarget.items()}
    for it in range(40):
        cs = defaultdict(float)
        for kk in KEYS:
            for o, v in M[kk].items(): cs[o] += v
        for kk in KEYS:
            for o in M[kk]: M[kk][o] *= ctarget[o] / cs[o] if cs[o] else 1
        for kk in KEYS:
            rs = sum(M[kk].values())
            if rs: f = sind.get(kk, 0) / rs; M[kk] = {o: v * f for o, v in M[kk].items()}
    share = {kk: ({o: v / sum(M[kk].values()) for o, v in M[kk].items()} if sum(M[kk].values()) > 0 else {}) for kk in KEYS}

    def industries(jobs_by_ind, top=True):
        rows = []; occ_tot = defaultdict(lambda: [0.0, 0.0])
        for kk, nm in IND:
            J = jobs_by_ind.get(kk, 0)
            if J < 0.5: continue
            a = dict(ai=0, wg=0, net=0, lost=0, new=0, snet=0, slost=0, snew=0); per = []
            for o, s_ in share[kk].items():
                e = J * s_; O = occ[o]; d = e * O['n']; ds = e * O['ns']
                a['ai'] += e * O['g']; a['wg'] += e * O['g'] * O['w']; a['net'] += d; a['snet'] += ds
                if d < 0: a['lost'] -= d
                else: a['new'] += d
                if ds < 0: a['slost'] -= ds
                else: a['snew'] += ds
                per.append((O['t'], d)); occ_tot[o][0] += e; occ_tot[o][1] += d
            row = [kk, nm, num(J), sh(a['ai'] / J), num(a['net']), num(a['lost']), num(a['new']), num(a['snet']), num(a['slost']), num(a['snew']), num(a['wg'] / 1e6)]
            if top:
                per.sort(key=lambda x: x[1])
                row += [[[t, num(d)] for t, d in per[:3] if d < 0], [[t, num(d)] for t, d in per[::-1][:3] if d > 0]]
            rows.append(row)
        rows.sort(key=lambda r: -r[2])
        ot = sorted(((occ[o]['t'], v[0], v[1]) for o, v in occ_tot.items()), key=lambda x: x[2])
        tops = [[[t, num(j), num(d)] for t, j, d in ot[:5]], [[t, num(j), num(d)] for t, j, d in ot[::-1][:5]]]
        return rows, tops, {o: v[0] for o, v in occ_tot.items()}

    srows, stops, socc = industries(sind)
    PI = json.load(open(f'{PROF}/{st}.json'))['insts'] if PROF and os.path.exists(f'{PROF}/{st}.json') else {}
    byc = defaultdict(list)
    for nm_, I_ in PI.items(): byc[cnorm(I_.get('county'))].append((nm_, I_))
    counties = {}
    for r in LMC[st]:
        fp = str(r['FIPS']).zfill(5)
        cind = fill(fp, ref_cty, nscale)
        crows, ctops, cocc = industries(cind, top=False)
        x = lm(r); res = CRES.get(fp, {})
        x.update(nm=r['Place'], fips=fp, zone=r['Commuting zone'],
                 res=dict(jobs=num(res.get('jobs_res')), disp=num(res.get('displaced_res')), local=num(res.get('displaced_change_occupation_locally')),
                          away=num(res.get('movers_out')), stay=num(res.get('stay_without_local_job')), arrive=num(res.get('movers_in')),
                          pool=num(res.get('adult_retraining_pool'))) if res else None,
                 ind=crows, top=ctops, work=work_block(cocc, occ, byc.get(cnorm(r['Place']), []) if PROF else None))
        x.pop('edu', None)
        counties[r['Place']] = x
    if PROF:   # counties that do not line up with IPEDS counties (Connecticut planning regions): leave graduates out
        gs = sum(v[0] for v in grads_by_type(list(PI.items())).values())
        gc = sum(sum(v[0] for v in c['work']['grads'].values()) for c in counties.values())
        if gs and gc / gs < 0.5:
            for c in counties.values(): c['work']['grads'] = None
    zones = {}
    for c in counties.values():
        z = c['zone']
        if z in LMZ and z not in zones:
            zz = lm(LMZ[z]); zz.pop('edu', None); zz['states'] = LMZ[z]['States']; zones[z] = zz
    nat = [s for s in states_nat]
    lostS = [s[4] for s in nat]; awayS = [s[5] for s in nat]; aiS = [s[3] for s in nat]
    me = next(s for s in nat if s[0] == st)
    S.update(ab=st, nm=LMS[st]['Place'], rank=dict(ai=rank(aiS, me[3]), lost=rank(lostS, me[4]), away=rank(awayS, me[5]), n=len(nat)),
             k=round(k, 3), ind=srows, top=stops, ninds=len(srows), work=work_block(socc, occ, list(PI.items()) if PROF else None))
    data = dict(state=S, counties=counties, zones=zones)
    json.dump(data, open(f'{OUT}/{st}.json', 'w'), separators=(',', ':'))
    index.append([st, S['nm'], sorted(counties)])
    print(st, S['nm'], 'k=%.3f' % k, 'QCEW %.0f vs LM %d' % (sum(sind.values()), S['jobs']), len(counties), 'counties',
          round(os.path.getsize(f'{OUT}/{st}.json') / 1024), 'KB', flush=True)

json.dump(dict(us=us, states=states_nat, index=index), open(f'{OUT}/index.json', 'w'), separators=(',', ':'))
