"""Check that the input files in Drive are the ones the live site was built from (tools/inputs_manifest.csv).
Usage: check_inputs.py [--update]
  Reads W2100_DATA (the folder that mirrors Drive "Working papers/Data"; see tools/w2100_paths.py).
  Without --update: lists every file as OK, CHANGED (size or SHA-256 differs) or MISSING. Run it before a rebuild:
  a CHANGED file you did not mean to change is a warning; one you did mean to change must be logged in tools/sources.csv.
  With --update: after a rebuild is published, rewrite the sizes and hashes from the current files."""
import csv, hashlib, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import w2100_paths as P
M = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inputs_manifest.csv')
rows = list(csv.DictReader(open(M, newline='', encoding='utf-8')))
def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()
bad = 0
for r in rows:
    p = os.path.join(P.DATA, *r['path_under_Working_papers_Data'].split('/'))
    if not os.path.exists(p): st = 'MISSING'
    else:
        size, dig = os.path.getsize(p), sha(p)
        st = 'OK' if (str(size) == r['bytes'] and dig == r['sha256']) else 'CHANGED'
        if '--update' in sys.argv: r['bytes'], r['sha256'] = str(size), dig
    bad += st != 'OK'
    print(f'{st:8} {r["path_under_Working_papers_Data"]}')
if '--update' in sys.argv:
    with open(M, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
    print('manifest updated')
print(f'{len(rows) - bad} of {len(rows)} match' if bad else f'all {len(rows)} match')
sys.exit(1 if bad and '--update' not in sys.argv else 0)
