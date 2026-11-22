"""Copy the Price of Judgment wage index (wi) from data/work2035_data.json into data/impact_data.json.
Run after to_site.py rebuilds impact_data.json (to_site.py does not carry wi). Usage: merge_wi.py <site root>"""
import json, sys
R = sys.argv[1] if len(sys.argv) > 1 else '.'
nat = {x['ab']: x for x in json.load(open(f'{R}/data/work2035_data.json'))['states']}
p = f'{R}/data/impact_data.json'; d = json.load(open(p)); n = 0
for s in d['states']:
    if s['ab'] in nat: s['wi'] = nat[s['ab']]['wi']; n += 1
json.dump(d, open(p, 'w'), separators=(',', ':'))
print('wi set for', n, 'states')
