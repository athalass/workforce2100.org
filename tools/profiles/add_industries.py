"""Add local industries to each commuting zone in the profile data.
Usage: add_industries.py <qcew.csv.gz> <matrix.xlsx> <a state workbook (for national occupation rates)> <profile out dir>"""
import csv, gzip, json, sys, glob, os
from collections import defaultdict
import openpyxl

QCEW, MATRIX, WB, OUT = sys.argv[1:5]

SECTORS = [  # (key, name, NAICS 2-digit prefixes, matrix code)
    ('11', 'Agriculture, forestry and fishing', ['11'], '110000'),
    ('21', 'Mining, oil and gas', ['21'], '210000'),
    ('22', 'Utilities', ['22'], '220000'),
    ('23', 'Construction', ['23'], '230000'),
    ('31', 'Manufacturing', ['31', '32', '33'], '31-330'),
    ('42', 'Wholesale trade', ['42'], '420000'),
    ('44', 'Retail trade', ['44', '45'], '44-450'),
    ('48', 'Transportation and warehousing', ['48', '49'], '48-490'),
    ('51', 'Information', ['51'], '510000'),
    ('52', 'Finance and insurance', ['52'], '520000'),
    ('53', 'Real estate and rental', ['53'], '530000'),
    ('54', 'Professional, scientific and technical services', ['54'], '540000'),
    ('55', 'Management of companies', ['55'], '550000'),
    ('56', 'Administrative and support services', ['56'], '560000'),
    ('61', 'Education (public and private)', ['61'], '610000'),
    ('62', 'Health care and social assistance', ['62'], '620000'),
    ('71', 'Arts, entertainment and recreation', ['71'], '710000'),
    ('72', 'Accommodation and food services', ['72'], '720000'),
    ('81', 'Other services', ['81'], '810000'),
    ('92', 'Government administration', ['92'], '900000'),
]
pref = {p: s[0] for s in SECTORS for p in s[2]}

# national occupation rates of work AI takes over
wb = openpyxl.load_workbook(WB, read_only=True, data_only=True)
it = wb['Occupations_state'].iter_rows(values_only=True); h = next(it)
ix = h.index('soc6'), h.index('us_gross_reduction_2035')
rate = {r[ix[0]]: r[ix[1]] for r in it if r[ix[0]] and r[ix[1]] is not None}

# industry AI share and BLS growth from the National Employment Matrix
codes = {s[3]: s[0] for s in SECTORS}
acc = defaultdict(lambda: [0.0, 0.0]); tot = {}
mw = openpyxl.load_workbook(MATRIX, read_only=True)
for r in mw['Matrix'].iter_rows(min_row=2, values_only=True):
    otype, itype, occ, _, icode, _, e25, _, _, e35 = r[:10]
    if icode not in codes: continue
    key = codes[icode]
    if occ == '00-0000': tot[key] = (e25, e35); continue
    if otype == 'Line item' and occ in rate and e25:
        acc[key][0] += e25; acc[key][1] += e25 * rate[occ]
ind = {}
for k, name, _, _ in SECTORS:
    e25, e35 = tot[k]
    ind[k] = dict(name=name, ai=acc[k][1] / acc[k][0] if acc[k][0] else None, growth=e35 / e25 - 1,
                  covered=acc[k][0] / e25 if e25 else 0)
for k, v in ind.items():
    print(f"{v['name'][:40]:42} AI {v['ai']*100:5.1f}%  BLS {v['growth']*100:+5.1f}%  matched {v['covered']*100:4.0f}%")

# county jobs by sector, all ownerships (4-digit NAICS cells)
county = defaultdict(lambda: defaultdict(float))
with gzip.open(QCEW, 'rt') as f:
    for r in csv.DictReader(f):
        if r['agglvl_code'] != '76' or not r['annual_avg_emplvl']: continue
        s = pref.get(r['industry_code'][:2])
        if s: county[r['area_fips']][s] += float(r['annual_avg_emplvl'])

for path in sorted(glob.glob(f'{OUT}/[A-Z][A-Z].json')):
    d = json.load(open(path))
    zfips = defaultdict(list)
    for c in d['counties'].values():
        if c.get('fips'): zfips[c['zone']].append(str(c['fips']).zfill(5))
    for zname, z in d['zones'].items():
        sums = defaultdict(float)
        for fp in zfips.get(zname, []):
            for s, v in county.get(fp, {}).items(): sums[s] += v
        total = sum(sums.values())
        rows = sorted(sums.items(), key=lambda x: -x[1])[:10]
        z['ind'] = [[ind[s]['name'], int(round(v)), round(v / total, 4) if total else None,
                     round(ind[s]['ai'], 4), round(ind[s]['growth'], 4)] for s, v in rows]
        z['indc'] = len(zfips.get(zname, []))
    json.dump(d, open(path, 'w'), separators=(',', ':'))
md = json.load(open(f'{OUT}/MD.json'))
print('Baltimore zone:', md['zones']['Baltimore, MD']['ind'][:5], md['zones']['Baltimore, MD']['indc'], 'counties')
