"""Build per-state profile data for every institution from the state workbooks.
Usage: prep_all.py <Independent_version dir> <out dir>"""
import json, sys, glob, os
from collections import defaultdict
import openpyxl

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)

def r0(x, nd=0):
    if x is None: return None
    return round(float(x), nd) if nd else int(round(float(x)))
def r3(x): return None if x is None else round(float(x), 4)

def tier(d):
    if d is None: return None
    return 'Invest' if d >= 0.10 else ('Reinvent' if d > -0.10 else 'Review')
def band(lv): return 's' if lv in ('Certificate', 'Associate') else 'b'

index = []
NAT = {(x['c'], x['l']): x['h'] for x in json.load(open('/home/claude/workforce2100.org/data/work2035_data.json'))['prog'] if x.get('h') is not None}
for path in sorted(glob.glob(f'{SRC}/*/*_Work_2035_Data.xlsx')):
    st = os.path.basename(os.path.dirname(path))
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    def table(sheet):
        if sheet not in wb.sheetnames: return []
        it = wb[sheet].iter_rows(values_only=True)
        h = next(it)
        return [dict(zip(h, r)) for r in it if any(v is not None for v in r)]
    state_name = None
    for r in table('Labor_market'):
        if r['Level'] == 'State': state_name = r['Place']; break

    zones, counties = {}, {}
    for r in table('Labor_market'):
        if r['Level'] == 'Commuting zone':
            zones[r['Place']] = dict(
                jobs=r0(r['Jobs 2025']), ai=r0(r['Work AI takes over (jobs)']), ais=r3(r['Work AI takes over (% of jobs)']),
                wages=r0(r['Wages of work AI takes over ($ per year, 2025)']), net=r0(r['Net change in jobs']),
                lost=r0(r['Jobs lost in shrinking occupations']), new=r0(r['New jobs in growing occupations']),
                open=r0(r['Openings over 10 years']), local=r0(r['Change occupation in the area']),
                away=r0(r['Move away']), stay=r0(r['Stay without a matching job']), pool=r0(r['Adult retraining pool']),
                slost=r0(r['Jobs lost (slow recovery)']), snet=r0(r['Net change (slow recovery)']),
                edu=[[r0(r[f'Jobs 2025: {k}']), r0(r[f'Work AI takes over: {k}']), r0(r[f'Jobs lost: {k}']), r0(r[f'New jobs: {k}']), r0(r[f'Openings 10 yrs: {k}'])]
                     for k in ('HS or less', 'certificate or associate', "bachelor's or higher")],
                states=r['States'])
        elif r['Level'] == 'County':
            counties[r['Place']] = dict(fips=r['FIPS'], zone=r['Commuting zone'], jobs=r0(r['Jobs 2025']), pool=r0(r['Adult retraining pool']))

    po = table('Program_outlook')
    by_inst = defaultdict(list)
    for r in po: by_inst[r['institution']].append(r)
    comp = defaultdict(lambda: defaultdict(float))
    for r in po: comp[(r['commuting_zone'], r['cip4'], band(r['level']))][r['institution']] += r['completions'] or 0
    sector = {r['institution']: r['sector'] for r in po}

    insts = {}
    for c in table('Colleges_labor_market'):
        name = c['Institution']; rows = by_inst.get(name, [])
        if not rows: continue
        zone = c['Commuting zone']
        progs = []
        for r in sorted(rows, key=lambda r: -(r['completions'] or 0)):
            t = r['tier'] if r['tier'] in ('Invest', 'Reinvent') else ('Review' if r['tier'] else None)
            progs.append([r['program_family'], r['level'], r0(r['completions']), t, r3(r['demand_change_2035']),
                          r3(r['demand_change_if_75pct_replaced']), tier(r['demand_change_if_75pct_replaced']) if t else None,
                          r['cip4'], NAT.get((r['cip4'], r['level']))])
        seen, cr = set(), []
        overlap = defaultdict(float)
        for r in rows:
            key = (zone, r['cip4'], band(r['level']))
            if key in seen: continue
            seen.add(key)
            ins = comp[key]; tot = sum(ins.values()); me = ins.get(name, 0)
            riv = sorted(((k, v) for k, v in ins.items() if k != name), key=lambda x: -x[1])
            for k, v in riv: overlap[k] += v
            cr.append([r['program_family'], band(r['level']), r0(me), r0(tot), len(riv), [k for k, v in riv[:2]]])
        cr.sort(key=lambda x: -x[2])
        rivals = [[k, r0(v), sector.get(k, '')] for k, v in sorted(overlap.items(), key=lambda x: -x[1])[:6]]
        insts[name] = dict(sector=c['Sector'], county=c['County'], zone=zone,
                           grads=r0(c['Completions (tiered programs)']), inv=r3(c['Share of completions: Invest']),
                           rei=r3(c['Share of completions: Reinvent']), rev=r3(c['Share of completions: below -10%']),
                           p=progs, c=cr[:12], r=rivals)
        index.append([name, st, c['Sector'], c['County']])

    # statewide occupation groups (placeholder until the industry view)
    g = defaultdict(lambda: [0.0, 0.0, 0.0])
    for r in table('Occupations_state'):
        j = r['state_jobs_2025'] or 0
        if not j: continue
        x = g[r['group'] or 'Other']; x[0] += j; x[1] += j * (r['state_gross_reduction_2035'] or 0); x[2] += j * (r['state_net_change_2035'] or 0)
    groups = sorted(([k, r0(v[0]), r3(v[1] / v[0]), r3(v[2] / v[0])] for k, v in g.items() if v[0]), key=lambda x: -x[1])[:10]

    json.dump(dict(st=st, name=state_name, zones=zones, counties=counties, insts=insts, groups=groups),
              open(f'{OUT}/{st}.json', 'w'), separators=(',', ':'))
    print(st, len(insts), 'institutions', round(os.path.getsize(f'{OUT}/{st}.json') / 1024), 'KB', flush=True)

index.sort(key=lambda x: x[0])
json.dump(index, open(f'{OUT}/index.json', 'w'), separators=(',', ':'))
print('index', len(index))
