import openpyxl, glob, json, re, os, sys
base=sys.argv[1]; out=sys.argv[2]
def num(x):
    try: return float(x)
    except: return None
states={}; insts={}
for path in sorted(glob.glob(base+'/*/*.xlsx')):
    ab=path.split('/')[-2]
    if ab=='MD_compat': continue
    wb=openpyxl.load_workbook(path,read_only=True,data_only=True)
    rows=[r for r in wb['Summary'].iter_rows(values_only=True)][1:]
    S={}
    for lab,val,unit in rows:
        if lab is None: continue
        l=lab.strip()
        def put(k):
            if k not in S: S[k]=val
        if 'jobs covered' in l: put('jobs'); S['name']=l.split(' jobs covered')[0]
        elif l.startswith('Jobs removed by automation'): put('gross')
        elif l.startswith('as a share of 2025 jobs') and 'transition' not in l: put('gross_share')
        elif l.startswith('Jobs added by demand growth'): put('added')
        elif l.startswith('Net change in jobs'): put('net')
        elif l.startswith('Jobs in declining occupations'): put('declining')
        elif 'transition share' in l: put('transition_share')
        elif l.startswith('Annual wages tied'): put('wages_bn')
        elif 'Share of task-hours where AI pays' in l: put('ai_pays')
        elif 'median wage vs national' in l: put('wage_ratio')
        elif 'institutions with completions' in l: put('institutions')
        elif l.startswith('Completions matched'): put('completions')
        elif 'share in Invest' in l: put('invest')
        elif 'share in Reinvent' in l: put('reinvent')
        elif 'share in Review' in l: put('review')
        elif 'share in Consolidate' in l: put('consolidate')
        elif 'falling 20% or more' in l: put('occ_down20')
        elif 'Maryland bridge' in l or ('bridge' in l and 'share of their job losses' in l): put('bridge')
        elif 'pays the same or more' in l: put('same_pay')
    # top exposed occupations
    occ=[]
    ws=wb['Occupations_state']; hdr=None
    for i,r in enumerate(ws.iter_rows(values_only=True)):
        if i==0: hdr={h:j for j,h in enumerate(r)}; continue
        jobs=num(r[hdr['state_jobs_2025']]); gr=num(r[hdr['state_gross_reduction_2035']])
        net=num(r[hdr.get('state_net_change_2035',-1)]) if 'state_net_change_2035' in hdr else None
        if jobs and gr is not None: occ.append((r[hdr['occ_title']],jobs,gr,net,jobs*gr))
    occ.sort(key=lambda x:-x[4])
    S['top_occ']=[[o[0],int(o[1]),round(o[2],3),None if o[3] is None else round(o[3],3)] for o in occ[:5]]
    S['exposed_jobs']=int(sum(o[1] for o in occ if o[2]>=0.2))
    if ab=='MD': print(hdr.keys())
    states[ab]=S
    # institutions
    ws=wb['Programs_by_institution']; I={}
    for i,r in enumerate(ws.iter_rows(values_only=True)):
        if i==0: h={x:j for j,x in enumerate(r)}; continue
        name=r[h['institution']]; sec=r[h['sector']]; lvl=r[h['level']]; c=num(r[h['completions']]) or 0; t=r[h['tier']] or ''
        ai=num(r[h['share_hours_ai_pays']]) if 'share_hours_ai_pays' in h else None
        t='Review' if ('Review' in t or 'Consolidate' in t) else ('Transfer' if 'Transfer' in t else t)
        d=I.setdefault(name,{'sector':sec,'county':r[h['county']],'p':{},'c':{},'lv':{},'hiai':0,'tot':0})
        d['p'][t]=d['p'].get(t,0)+1; d['c'][t]=d['c'].get(t,0)+c
        L=d['lv'].setdefault(lvl,{}); L[t]=L.get(t,0)+c
        d['tot']+=c
        if ai is not None and ai>=0.5: d['hiai']+=c
    insts[ab]=I
    print(ab,S.get('name'),len(I),flush=True)
json.dump({'states':states,'insts':insts},open(out,'w'))
