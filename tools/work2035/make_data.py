"""Build data/work2035_data.json (the Occupations and Academic programs tabs of work-2035.html, and the national
program AI shares that tools/profiles/prep_all.py reads).
Usage: make_data.py <Occupation_Outlook_2035_v2.xlsx> <Program_Roadmap_2035_v1.xlsx> <Price_of_Judgment_Results_Tables.xlsx>
                    <governance_quadrants.csv> <out json>
Inputs come from the national model (Occupation_Outlook_scripts_v2.zip: occ_model.py ... build_programs.py) and the
Price of Judgment results. Copied into the repo Nov 22, 2026 from the build used for the Nov 2026 release; only the
input paths changed (they were hard-coded)."""
import pandas as pd, json, math, sys
OO, PR, PJ, GQ, OUT = sys.argv[1:6]
o=pd.read_excel(OO,sheet_name='All_occupations')
ed=pd.concat([pd.read_excel(OO,sheet_name=s)[['soc6','required_education_onet']] for s in ['Shrinking','Growing']]).drop_duplicates('soc6').set_index('soc6')['required_education_onet']
g=pd.read_csv(GQ).set_index('soc6')
def cat(x):
    if x<-0.5: return 'Eliminated'
    if x<=-0.2: return 'Substantially reduced'
    if x<-0.05: return 'Moderate decline'
    if x<=0.05: return 'Stable'
    return 'Growing'
def r(x,n=3):
    return None if x is None or (isinstance(x,float) and math.isnan(x)) else round(float(x),n)
occ=[]
for _,x in o.iterrows():
    s=x.soc6
    occ.append({'s':s,'t':x.occ_title,'g':x.group,'e':int(x.emp_2025),'w':r(x.h_median,2),'q':x.quadrant,
      'x':r(x.exp_gpt4_beta),'a':r(x.adoption_2035),'n':r(x.own_net_pct),'r':r(x.own_gross_red_pct),'lo':r(x.own_lo),'hi':r(x.own_hi),
      'c':cat(x.own_net_pct),'y':r(x.acs_share_20_34),
      'v':r(g.net_value_per_exposed_hr_realizable.get(s),2) if s in g.index else None,
      'ps':r(g.p_success_used.get(s)) if s in g.index else None})
p=pd.read_excel(PR,sheet_name='All_programs')
def tier(row):
    if str(row.tier).startswith('Transfer'): return 'Transfer-oriented'
    d=row.demand_change_own
    if d>=0.10: return 'Invest'
    if d>-0.10: return 'Reinvent'
    return 'Consolidate or Review'
prog=[]
for _,x in p.iterrows():
    prog.append({'c':'%05.2f'%x.cip4,'f':x.program_family,'l':x.level,'d':r(x.demand_change_own),'k':tier(x),'h':r(x.ai_hours_share),'cc':x.curriculum_change,'n':int(x.completions),'i':int(x.institutions)})
st=pd.read_excel(OO,sheet_name='States').set_index('state_abbr')
t6=pd.read_excel(PJ,sheet_name='T6_state_shift_share').set_index('state_abbr')
states=[]
for ab in st.index:
    states.append({'ab':ab,'nm':t6.state.get(ab),'e':int(st.emp[ab]),'sd':r(st.share_in_declining_occ_own[ab],4),
      'jd':int(round(st.jobs_in_declining_occ_own[ab])),'ws':r(t6.stake.get(ab),2),'wi':r(t6['index'].get(ab),1)})
json.dump({'occ':occ,'prog':prog,'states':states},open(OUT,'w'),separators=(',',':'),ensure_ascii=False)
df=pd.DataFrame(occ); print(df.c.value_counts()); print('val null',df.v.isna().sum())
pf=pd.DataFrame(prog); print(pf.k.value_counts())
