"""Build national industry staffing patterns (21 industries) from OEWS May 2025 national files.
Usage: build_staffing.py <oesm25in4 dir> <out.json>"""
import openpyxl, json, sys
D, OUT = sys.argv[1], sys.argv[2]
SECT = {'11':'AG','21':'MI','22':'UT','23':'CO','31-33':'MF','42':'WH','44-45':'RT','48-49':'TW','51':'IN','52':'FI',
        '53':'RE','54':'PR','55':'MG','56':'AD','61':'ED','62':'HC','71':'AR','72':'AF','81':'OS','99':'GOV'}
def load(f, keep):
    wb = openpyxl.load_workbook(f'{D}/{f}', read_only=True)
    it = wb[wb.sheetnames[0]].iter_rows(values_only=True); h = next(it)
    ix = {k: h.index(k) for k in ('NAICS', 'O_GROUP', 'OCC_CODE', 'TOT_EMP')}
    out = {}
    for r in it:
        n = str(r[ix['NAICS']])
        if n not in keep or r[ix['O_GROUP']] != 'detailed': continue
        try: v = float(r[ix['TOT_EMP']])
        except (TypeError, ValueError): continue
        out.setdefault(keep[n], {})[r[ix['OCC_CODE']]] = v
    return out
P = load('natsector_M2025_dl.xlsx', SECT)
F = load('national_owner_M2025_dl.xlsx', {'999101': 'FED'})['FED']
P['FED'] = F
P['SLG'] = {o: max(0.0, v - F.get(o, 0)) for o, v in P.pop('GOV').items()}
P['SLG'] = {o: v for o, v in P['SLG'].items() if v > 0}
for k, v in P.items(): print(k, len(v), round(sum(v.values())))
json.dump(P, open(OUT, 'w'))
