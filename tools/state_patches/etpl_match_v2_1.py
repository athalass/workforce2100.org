"""State workbooks v2.1 (Nov 24, 2026): correct how Eligible Training Provider List (ETPL) programs are matched to
bridge occupations, in place, without re-running the model.

The pipeline (st_pathways.py, v2.0) matched an ETPL program to an occupation if EITHER its CIP code maps to the
occupation in the NCES CIP-SOC crosswalk OR the provider listed the occupation's SOC code. Broad CIP codes then pulled in
unrelated programs (CIP 11.0103 Information Technology -> Data Scientists brought in CCNA and CompTIA A+ courses).
v2.1 rule: a program that lists its own SOC codes matches only those occupations; the crosswalk is used only for
programs that list none. Programs that list the occupation come first.

Everything recomputed here comes from the workbook itself (Pathways and ETPL_programs tabs) plus the crosswalk:
  Pathways: etpl_programs, etpl_providers, etpl_online_only, etpl_median_weeks, etpl_median_tuition, top_etpl, bridge_types
  Summary:  share of job losses whose best pathway has a bridge in the state
  Quality_flags: the same share and its OK / Watch / Caution status
  Bridges_by_county: etpl_programs
  README: one line saying what changed
--check-old recomputes with the v2.0 rule and must reproduce every one of those cells exactly (no writes).

Usage: etpl_match_v2_1.py <workbook dir containing <ST>/*.xlsx> <census.xlsx (CIP-SOC)> [--check-old]
Prints, per state, the old and new share and how many cells changed; writes the workbooks in place (work on a copy).
"""
import sys, glob, os, numpy as np, pandas as pd, openpyxl

ROOT, XW = sys.argv[1], sys.argv[2]; OLD = '--check-old' in sys.argv
CS = pd.read_excel(XW, sheet_name='CIP-SOC', dtype=str); CS.columns = ['cip6', 'cip_title', 'soc6', 'soc_title']
SOC2CIP = CS.groupby('soc6').cip6.apply(set).to_dict()
NOTE = ('Correction 24 Nov 2026 (v2.1)', 'Training-provider (ETPL) programs are now matched to an occupation only if the provider lists that '
        'occupation; the CIP-SOC crosswalk is used only for programs that list none. Before, a broad field-of-study code could match '
        'unrelated programs. Changed: the ETPL columns and bridge_types in Pathways, the bridge share in Summary and Quality_flags, and '
        'etpl_programs in Bridges_by_county. Nothing else changed.')

def table(ws):
    rows = list(ws.iter_rows(values_only=True)); return rows[0], rows[1:]

def socs(r):
    return {str(x)[:7] for x in r if x not in (None, '') and len(str(x)) >= 7}

def same(a, b):
    if a in (None, '') and b in (None, ''): return True
    if isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool):
        return abs(a - b) <= 1e-9 * max(1, abs(a))
    return a == b

def st3(v, watch, caution):   # lower is worse
    return 'Caution' if v <= caution else ('Watch' if v <= watch else 'OK')

tot = {}
for f in sorted(glob.glob(os.path.join(ROOT, '*', '*.xlsx'))):
    st = os.path.basename(os.path.dirname(f))
    wb = openpyxl.load_workbook(f)
    # ETPL programs of the state, as the workbook lists them
    h, R = table(wb['ETPL_programs']); ix = {k: i for i, k in enumerate(h)}
    E = pd.DataFrame(R, columns=h)
    E['soc_list'] = [socs((r[ix['program_soc_occ_1']], r[ix['program_soc_occ_2']], r[ix['program_soc_occ_3']])) for r in R]
    E['cip6'] = E.cip6.fillna('').astype(str)
    E['label'] = E.program_name.fillna('').astype(str).str.slice(0, 50) + ' (' + E.etp.fillna('').astype(str).str.slice(0, 40) + ')'
    E['county'] = E.county.fillna('')

    def match(dsoc):
        cips = SOC2CIP.get(dsoc, set())
        if OLD: return E[E.cip6.isin(cips) | E.soc_list.map(lambda s: dsoc in s)]
        own = E[E.soc_list.map(lambda s: dsoc in s)]
        return pd.concat([own, E[E.soc_list.map(len).eq(0) & E.cip6.isin(cips)]])

    # ---- Pathways ----
    ws = wb['Pathways']; h, R = table(ws); ix = {k: i for i, k in enumerate(h)}; col = {k: i + 1 for i, k in enumerate(h)}
    cache, changed, best = {}, 0, []
    for n, r in enumerate(R, start=2):
        d = r[ix['dest_soc6']]
        if d not in cache:
            e = match(d)
            med = lambda c: pd.to_numeric(e[c], errors='coerce').where(lambda x: x > 0).median()
            wk, tu = med('program_length_weeks'), med('non_wioa_tuition_cost')
            cache[d] = dict(etpl_programs=len(e), etpl_providers=e.etp.nunique(), etpl_online_only=int(e.online_only.fillna(False).astype(bool).sum()),
                            etpl_median_weeks=None if pd.isna(wk) else float(wk), etpl_median_tuition=None if pd.isna(tu) else float(tu),
                            top_etpl='; '.join(e.label.head(3)) or None)
        v = dict(cache[d])
        appr = (r[ix['apprenticeships']] or '') != ''
        college = (r[ix['state_programs_at_fit_level']] or 0) > 0
        v['bridge_types'] = '; '.join(x for x, on in (('College program', college), ('ETPL', v['etpl_programs'] > 0), ('Apprenticeship', appr)) if on) or None
        for k, val in v.items():
            if not same(r[ix[k]], val):
                if OLD: raise SystemExit(f'{st} Pathways row {n} {k}: workbook {r[ix[k]]!r} vs old rule {val!r}')
                ws.cell(n, col[k]).value = val; changed += 1
        if r[ix['rank']] == 1:
            lost = -(r[ix['source_state_change_2035']] or 0) * (r[ix['source_state_jobs_2025']] or 0)
            best.append((lost, college or v['etpl_programs'] > 0 or appr))
    share = sum(l for l, b in best if b) / sum(l for l, b in best)

    # ---- Summary ----
    ws = wb['Summary']; done = 0
    for row in ws.iter_rows():
        if row[0].value and 'share of their job losses whose best pathway has a' in str(row[0].value):
            if not same(row[1].value, share):
                if OLD: raise SystemExit(f'{st} Summary share {row[1].value} vs {share}')
                old_share = row[1].value; row[1].value = share; changed += 1
            else: old_share = row[1].value
            done += 1
    assert done == 1, (st, 'summary line', done)

    # ---- Quality_flags ----
    ws = wb['Quality_flags']; h = [c.value for c in ws[1]]; ix = {k: i for i, k in enumerate(h)}; done = 0
    for row in ws.iter_rows(min_row=2):
        if row[ix['check']].value == 'Share of losses whose best pathway has a bridge in the state':
            nv, ns = round(share, 3), st3(share, .6, .4)
            for k, val in (('value', nv), ('status', ns)):
                if not same(row[ix[k]].value, val):
                    if OLD: raise SystemExit(f'{st} flag {k} {row[ix[k]].value} vs {val}')
                    row[ix[k]].value = val; changed += 1
            done += 1
    assert done == 1, (st, 'flag', done)

    # ---- Bridges_by_county ----
    ws = wb['Bridges_by_county']; h, R = table(ws); ix = {k: i for i, k in enumerate(h)}
    P = pd.DataFrame(table(wb['Pathways'])[1], columns=table(wb['Pathways'])[0])
    dests = set(P.dest_soc6); cipset = set().union(*[SOC2CIP.get(d, set()) for d in dests])
    if OLD:   # v2.0 counted the crosswalk CIPs or the provider's FIRST listed SOC only
        first = [str(x)[:7] if x else '' for x in E.program_soc_occ_1]
        m = E.cip6.isin(cipset) | pd.Series(first, index=E.index).isin(dests)
    else:
        m = E.soc_list.map(lambda s: bool(s & dests)) | (E.soc_list.map(len).eq(0) & E.cip6.isin(cipset))
    ec = E[m & E.county.ne('')].groupby('county').size()
    for n, r in enumerate(R, start=2):
        val = int(ec.get(r[ix['county']], 0))
        if not same(r[ix['etpl_programs']], val):
            if OLD: raise SystemExit(f'{st} county {r[ix["county"]]} etpl {r[ix["etpl_programs"]]} vs {val}')
            ws.cell(n, ix['etpl_programs'] + 1).value = val; changed += 1

    if not OLD:
        ws = wb['README']
        if not any(c.value == NOTE[0] for c in ws['A']):
            ws.append(list(NOTE)); changed += 1
        wb.save(f)
    tot[st] = (old_share, share, changed)
    print(f'{st}: bridge share {old_share:.4f} -> {share:.4f}; {changed} cells changed' if not OLD else f'{st}: old rule reproduces the workbook')
