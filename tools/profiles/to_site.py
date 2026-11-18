import json,sys
e=json.load(open(sys.argv[1]))
TI=['Invest','Reinvent','Review','Transfer']
def grp(sec):
    if '<2' in sec: return 'Certificate schools (under 2-year)'
    if '2-year' in sec: return '2-year colleges'
    return '4-year colleges and universities'
states=[]
for ab,s in sorted(e['states'].items()):
    states.append({'ab':ab,'nm':s['name'],'jobs':s['jobs'],'gross':s['gross'],'gs':s['gross_share'],'net':s['net'],'ns':s['net']/s['jobs'],
      'dec':s['declining'],'ts':s['transition_share'],'wbn':s['wages_bn'],'wpw':s['wages_bn']*1e9/s['jobs'],'exp':s['exposed_jobs'],'es':s['exposed_jobs']/s['jobs'],
      'pays':s['ai_pays'],'inv':s['invest'],'rei':s['reinvent'],'rev':s['review']+(s.get('consolidate') or 0),'comp':s['completions'],'ninst':s['institutions'],'bridge':s['bridge'],'top':s['top_occ']})
insts={}
for ab,I in e['insts'].items():
    L=[]
    for nm,d in sorted(I.items()):
        p=[d['p'].get(t,0) for t in TI]; c=[round(d['c'].get(t,0)) for t in TI]
        lv={k:[round(v.get(t,0)) for t in TI[:3]] for k,v in sorted(d['lv'].items())}
        L.append([nm,grp(d['sector']),d['sector'],p,c,round(d['hiai']/d['tot'],3) if d['tot'] else 0,lv])
    insts[ab]=L
json.dump({'states':states,'insts':insts},open(sys.argv[2],'w'),separators=(',',':'))
