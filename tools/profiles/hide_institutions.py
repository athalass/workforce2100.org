"""Temporarily hide institutions from the published site, without changing the model.

The institution's own profile, its row on the Work 2035 Institutions tab, and its name in other
colleges' Competition sections are removed. Its graduates stay in the commuting-zone and state
totals, so no other number changes.

Run after every rebuild of data/profiles (quarterly refresh) while an institution is hidden:
    python3 tools/profiles/hide_institutions.py .
To bring an institution back: delete it from HIDE, rebuild data/profiles with prep_all.py
(or restore the files from git history), and update the institution count on the pages.
"""
import json, sys, glob, os

HIDE = {
    # name: state
}

R = sys.argv[1] if len(sys.argv) > 1 else '.'
P = os.path.join(R, 'data', 'profiles')

def dump(obj, path):
    with open(path, 'w') as f:
        json.dump(obj, f, separators=(',', ':'), ensure_ascii=False)

removed = 0
for path in glob.glob(os.path.join(P, '*.json')):
    if path.endswith('index.json'):
        continue
    d = json.load(open(path))
    insts = d.get('insts', {})
    hit = [n for n in HIDE if n in insts or any(n in json.dumps(v.get('r', [])) or n in json.dumps(v.get('c', [])) for v in insts.values())]
    if not hit:
        continue
    for n in HIDE:
        if insts.pop(n, None) is not None:
            removed += 1
    for v in insts.values():
        v['r'] = [r for r in v.get('r', []) if r[0] not in HIDE]
        for c in v.get('c', []):
            if isinstance(c[-1], list):
                c[-1] = [x for x in c[-1] if x not in HIDE]
    dump(d, path)

ip = os.path.join(P, 'index.json')
ix = json.load(open(ip))
before = len(ix)
ix = [r for r in ix if not (r[0] in HIDE and r[1] == HIDE[r[0]])]
dump(ix, ip)

dp = os.path.join(R, 'data', 'impact_data.json')
if os.path.exists(dp):
    raw = open(dp).read()
    d = json.loads(raw)
    def strip(o):
        if isinstance(o, list):
            return [strip(x) for x in o if not (isinstance(x, list) and x and x[0] in HIDE)]
        if isinstance(o, dict):
            return {k: strip(v) for k, v in o.items()}
        return o
    d2 = strip(d)
    if d2 != d:
        dump(d2, dp)

print(f'profiles removed: {removed}; search index {before} -> {len(ix)}')
