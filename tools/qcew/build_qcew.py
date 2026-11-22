"""Build the county-by-industry QCEW file that the site builders and the state pipeline read
(same layout as QCEW_2025_counties_states.csv.gz: area_fips, own_code, industry_code, agglvl_code, disclosure_code,
annual_avg_emplvl; states and counties, total and by ownership, NAICS 4-digit by ownership).

Input: BLS QCEW "single files" (CSV, all areas), from https://www.bls.gov/cew/downloadable-data-files.htm
  annual:    <year>_annual_singlefile.zip      (or the .csv inside it)
  quarterly: <year>_qtrly_singlefile.zip       (or the .csv inside it)

Usage:
  build_qcew.py annual <out.csv.gz> <YEAR_annual_singlefile.zip>
      Annual averages for one year (what the Nov 2026 release used, with 2025).
  build_qcew.py rolling <out.csv.gz> <last quarter, e.g. 2026Q2> <qtrly singlefile> [<qtrly singlefile> ...]
      Average of the 12 months in the four quarters ending with that quarter (e.g. 2025Q3-2026Q2), written in the
      annual_avg_emplvl column so the builders read it unchanged. Give the quarterly files of both years.
      A row is marked N (not disclosed) if any of its four quarters is N; a row missing in a quarter counts as 0 there.
      This is the default for the quarterly refresh: a single quarter would carry seasonal swings.
"""
import csv, gzip, io, sys, zipfile
from collections import defaultdict

AGG = {'50', '51', '56', '70', '71', '76'}   # state total, state by ownership, state NAICS4 by ownership; same for counties
OWN = {'0', '1', '2', '3', '5'}
COLS = ['area_fips', 'own_code', 'industry_code', 'agglvl_code', 'disclosure_code', 'annual_avg_emplvl']

def rows(path):
    if path.endswith('.zip'):
        z = zipfile.ZipFile(path); name = [n for n in z.namelist() if n.endswith('.csv')][0]
        f = io.TextIOWrapper(z.open(name), encoding='utf-8-sig', newline='')
    else:
        f = open(path, encoding='utf-8-sig', newline='')
    for r in csv.DictReader(f):
        if r['agglvl_code'] in AGG and r['own_code'] in OWN and r['area_fips'][:2] not in ('US', 'C1', 'CS'):
            yield r

def write(out, data):
    with gzip.open(out, 'wt', newline='') as f:
        w = csv.writer(f); w.writerow(COLS); w.writerows(data)
    print(out, len(data), 'rows')

mode, out = sys.argv[1], sys.argv[2]
if mode == 'annual':
    data = [[r['area_fips'], r['own_code'], r['industry_code'], r['agglvl_code'], r['disclosure_code'].strip(),
             r['annual_avg_emplvl']] for r in rows(sys.argv[3]) if r.get('size_code', '0') == '0']
    write(out, data)
elif mode == 'rolling':
    y, q = int(sys.argv[3][:4]), int(sys.argv[3][-1])
    want = []
    for _ in range(4):
        want.append((str(y), str(q))); q -= 1
        if q == 0: y, q = y - 1, 4
    tot, N, order, seen = defaultdict(float), set(), [], set()
    for p in sys.argv[4:]:
        for r in rows(p):
            if (r['year'], r['qtr']) not in want or r.get('size_code', '0') != '0': continue
            k = (r['area_fips'], r['own_code'], r['industry_code'], r['agglvl_code'])
            if k not in seen: seen.add(k); order.append(k)
            tot[k] += sum(float(r[m] or 0) for m in ('month1_emplvl', 'month2_emplvl', 'month3_emplvl'))
            if r['disclosure_code'].strip() == 'N': N.add(k)
    print('quarters averaged:', ', '.join(f'{a}Q{b}' for a, b in sorted(want)))
    write(out, [[*k, 'N' if k in N else '', '0' if k in N else str(round(tot[k] / 12))] for k in order])
else:
    sys.exit(__doc__)
