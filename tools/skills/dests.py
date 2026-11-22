"""Step 2: from occupations to academic programs (CIP 2020) by award level, with Invest / Reinvent / Consolidate / Review tiers.

Destinations of each program's graduates (weights over SOC occupations):
  Bachelor's and graduate programs: ACS 2024 PUMS, employed people aged 20-34 by field of degree (FOD1P) and occupation,
     for the matching education level; field of degree linked to CIP with the Census FOD-CIP crosswalk (2009; via IPUMS).
  Certificates and associate degrees (ACS has no field of degree below the bachelor's): NCES CIP 2020-SOC 2018 crosswalk,
     each linked occupation weighted by its employment x the share of its workers with some college or an associate degree.
Program measures (weighted over destinations): demand change 2025-35 (primary MGI-anchored, own model, scenario range),
  share of work hours adopted or augmented by AI (curriculum change), entry-level share, uncertainty share.
"""
import sys, re, numpy as np, pandas as pd
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))); import w2100_paths as P
DL = P.IPEDS + _os.sep; OUT = P.BUILD + _os.sep; UP = P.OA + _os.sep
DS = sys.argv[1]
O = pd.read_pickle(OUT + 'occ_nat.pkl').set_index('soc6')
EMP = O.emp_2025

# ---------------- ACS SOCP -> OEWS soc6 shares ----------------
CW = pd.read_excel(DS, sheet_name='Crosswalk_PUMS', dtype=str)
CW['socp'] = CW.socp_fmt.str.replace('-', '')
A = pd.read_csv(UP + 'ACS2024_FOD_x_SOCP_national.csv', dtype=str, keep_default_na=False)
A['w'] = A.emp_weighted.astype(float); A['n'] = A.n_records.astype(int)
A = A[~A.socp.str.startswith('55')]                                         # military
socp_all = sorted(A.socp.unique())
pairs = [(r.socp, r.soc6) for r in CW.itertuples() if r.soc6 in EMP.index]
mapped = {p for p, _ in pairs}
orphan_soc = set(EMP.index) - {s for _, s in pairs}
for sp in socp_all:                                                          # ACS codes no OEWS code points to: prefix match
    if sp in mapped: continue
    pref = sp.rstrip('XY')
    while pref and not [s for s in EMP.index if s.replace('-', '').startswith(pref)]:
        pref = pref[:-1]
    while len(pref) > 3 and pref.endswith('0') and len([s for s in EMP.index if s.replace('-', '').startswith(pref)]) == 0:
        pref = pref[:-1]
    cand = [s for s in EMP.index if s.replace('-', '').startswith(pref)]
    pc = [s for s in cand if s in orphan_soc] or cand
    pairs += [(sp, s) for s in pc]
PM = pd.DataFrame(pairs, columns=['socp', 'soc6']).drop_duplicates()
PM['e'] = PM.soc6.map(EMP); PM['share'] = PM.e / PM.groupby('socp').e.transform('sum')
lost = A[~A.socp.isin(PM.socp)].w.sum() / A.w.sum()

def fod_occ(levels, ages=('20_34',)):
    a = A[A.schl_group.isin(levels) & A.age_group.isin(ages)]
    m = a.merge(PM[['socp', 'soc6', 'share']], on='socp')
    m['w2'] = m.w * m.share; m['n2'] = m.n * m.share
    return m.groupby(['fod1p', 'soc6'])[['w2', 'n2']].sum().reset_index()
FB = fod_occ(['Bachelor']); FG = fod_occ(['Master', 'Professional', 'Doctorate'])
FB_all = fod_occ(['Bachelor'], ('20_34', '35_54', '55p', 'u20')); FG_all = fod_occ(['Master', 'Professional', 'Doctorate'], ('20_34', '35_54', '55p', 'u20'))

# education mix by occupation (for sub-baccalaureate weights)
ed = A.merge(PM[['socp', 'soc6', 'share']], on='socp'); ed['w2'] = ed.w * ed.share
edm = ed.pivot_table(index='soc6', columns='schl_group', values='w2', aggfunc='sum').fillna(0)
SUBBA = (edm.get('Some_college', 0) + edm.get('Associate', 0)) / edm.sum(axis=1)

# ---------------- CIP <-> FOD (Census handout) ----------------
H = pd.read_excel(UP + 'Census_FOD_CIP_crosswalk_handout.xlsx', sheet_name='CIP code by HHES code', header=1)
H.columns = ['fod', 'cip', 'auto', 'look', 'cip_title', 'title']
H['fod'] = H.fod.ffill()
H = H[pd.to_numeric(H.cip, errors='coerce').notna() & pd.to_numeric(H.fod, errors='coerce').notna()].copy()
H['fod'] = H.fod.astype(float).astype(int).astype(str)
H['cip6'] = H.cip.astype(float).map(lambda x: f'{x:07.4f}'); H['cip4'] = H.cip6.str[:5]; H['cip2'] = H.cip6.str[:2]
FODS_ACS = set(A.fod1p) - {'NA'}

def fods_for(cip6):
    for key, col in [(cip6, 'cip6'), (cip6[:5], 'cip4'), (cip6[:2], 'cip2')]:
        f = set(H[H[col] == key].fod) & FODS_ACS
        if f: return sorted(f), col
    return [], None

# ---------------- CIP <-> SOC (NCES 2020) ----------------
CS = pd.read_excel(UP + 'census.xlsx', sheet_name='CIP-SOC', dtype=str)
CS.columns = ['cip6', 'cip_title', 'soc6', 'soc_title']
CS = CS[(CS.soc6 != '99-9999') & ~CS.soc6.str.startswith('25-1') & CS.soc6.isin(EMP.index)]   # drop 'no match' and postsecondary-teacher links

# ---------------- IPEDS completions ----------------
C = pd.read_csv(DL + 'IPEDS_C2024_A/C2024_a.csv', dtype={'CIPCODE': str}, encoding='utf-8-sig')
C = C[(C.CIPCODE != '99') & (C.MAJORNUM == 1)]
LEVEL = {20: 'Certificate', 21: 'Certificate', 1: 'Certificate', 2: 'Certificate', 4: 'Certificate', 3: 'Associate', 5: 'Bachelor',
         6: 'Graduate', 7: 'Graduate', 8: 'Graduate', 17: 'Graduate', 18: 'Graduate', 19: 'Graduate'}
C['level'] = C.AWLEVEL.map(LEVEL)
C = C.dropna(subset=['level'])
HD = pd.read_csv(DL + 'IPEDS_HD2024/HD2024.csv', encoding='utf-8-sig', encoding_errors='replace', usecols=['UNITID', 'INSTNM', 'STABBR', 'SECTOR', 'ICLEVEL', 'CONTROL'])
C = C.merge(HD, on='UNITID', how='left')
CC = C.groupby(['CIPCODE', 'level']).agg(completions=('CTOTALT', 'sum'), institutions=('UNITID', 'nunique')).reset_index()
C23 = pd.read_csv(DL + 'IPEDS_C2023_A/C2023_a.csv', dtype={'CIPCODE': str}, encoding='utf-8-sig')
C23 = C23[(C23.CIPCODE != '99') & (C23.MAJORNUM == 1)]; C23['level'] = C23.AWLEVEL.map(LEVEL)
CC = CC.merge(C23.groupby(['CIPCODE', 'level']).CTOTALT.sum().rename('completions_2023').reset_index(), on=['CIPCODE', 'level'], how='left')
CIPT = CS.drop_duplicates('cip6').set_index('cip6').cip_title.str.rstrip('.')

# ---------------- destination weights per CIP6 x level ----------------
def dest_ba_grad(cip6, level):
    fods, how = fods_for(cip6)
    if not fods: return None, 'none'
    F, Fall = (FB, FB_all) if level == 'Bachelor' else (FG, FG_all)
    f = F[F.fod1p.isin(fods)]
    src = 'ACS field of degree, ages 20-34'
    if f.n2.sum() < 200:
        f = Fall[Fall.fod1p.isin(fods)]; src = 'ACS field of degree, all ages'
    if f.empty: return None, 'none'
    w = f.groupby('soc6').w2.sum(); return w / w.sum(), f'{src} (CIP match at {how})'

def dest_subba(cip6):
    for key, n in [(cip6, 7), (cip6[:5], 5), (cip6[:2], 2)]:
        s = CS[CS.cip6.str[:n] == key].soc6.unique()
        if len(s):
            w = pd.Series({x: EMP[x] * max(SUBBA.get(x, 0), .05) for x in s}); return w / w.sum(), f'NCES CIP-SOC crosswalk (match at {n}-digit)'
    return None, 'none'

DEST = {}
for r in CC.itertuples():
    if r.level in ('Bachelor', 'Graduate'):
        w, src = dest_ba_grad(r.CIPCODE, r.level)
        if w is None: w, src = dest_subba(r.CIPCODE)
    else:
        w, src = dest_subba(r.CIPCODE)
    if w is None: continue
    DEST[(r.CIPCODE, r.level)] = (w, r.completions)
pd.to_pickle(DEST, OUT + 'program_destinations.pkl')
print('programs', len(DEST), 'completions covered', sum(v[1] for v in DEST.values()), 'of', CC.completions.sum())
