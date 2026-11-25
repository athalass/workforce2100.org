"""Links between occupations and academic programs for the "Jobs & programs" tab of work-2035.html.
Usage: build_links.py <site root>   (reads data/skills/*.json and data/work2035_data.json; writes data/links.json)
  p: program key "CIP4|Level" -> [[SOC, share of the program's graduates' work in that occupation], ...] (top 5)
  o: SOC -> [[program key, graduates a year going into it (completions x share)], ...] (top 6 by that number)
Run after tools/skills/build_skills.py."""
import json, glob, os, sys
R = sys.argv[1] if len(sys.argv) > 1 else '.'
T = {o['t']: o['s'] for o in json.load(open(os.path.join(R, 'data', 'work2035_data.json')))['occ']}
P, O = {}, {}
for f in sorted(glob.glob(os.path.join(R, 'data', 'skills', '[0-9][0-9].json'))):
    for k, v in json.load(open(f)).items():
        P[k] = [[T[t], round(sh, 3)] for t, sh in v['occ']]
        for t, sh in v['occ']:
            O.setdefault(T[t], []).append([k, round(v['n'] * sh)])
O = {s: sorted(x, key=lambda y: -y[1])[:6] for s, x in O.items()}
O = {s: [y for y in x if y[1] > 0] for s, x in O.items()}
json.dump({'p': P, 'o': {s: x for s, x in O.items() if x}}, open(os.path.join(R, 'data', 'links.json'), 'w'), separators=(',', ':'))
print(len(P), 'programs;', len(O), 'occupations with programs')
