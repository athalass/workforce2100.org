"""National task classes (base AI path, national wages), same cost test as the model's occ_freed().
Usage: tasks.py   (paths: tools/w2100_paths.py; writes tasks_nat.pkl and occ_nat.pkl to W2100_BUILD)"""
import sys, os, numpy as np, pandas as pd
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))); import w2100_paths as P
DS=P.p(P.AIFE,'Price_of_Judgment_Dataset_v2.xlsx')
AEI=P.p(P.AIFE,'AEI_2026-01_Task_Success_and_Time_by_Task_and_Occupation.xlsx')
os.makedirs(P.BUILD, exist_ok=True)
sys.argv=['x',DS,AEI,P.BUILD+os.sep]
src=open(P.p(P.MODEL,'occ_model.py')).read().split("def occ_freed")[0]
exec(src)
a=AI_PATH['base']
e=TK.gpt4_exposure.map({'E0':0.0,'E1':1.0,'E2':a['e2']})
p=1-(1-TK.p0)*a['fail']; v=TK.v0; d=0.9
wd,wv=TK.h_pct25,TK.h_pct75; L=5*wd*TK.cons_scale
cost=a['c']+wv*v+(1-p)*(d*wd+(1-d)*L)
pay=(cost<wd)
T=TK[['soc6','task_id','task_type','s']].copy()
T['e']=e.values; T['pay']=pay.values
T['tshare']=T.s/T.groupby('soc6').s.transform('sum')
T['w_ai']=T.tshare*T.e*T.pay          # AI can take on (direct and check)
T['w_assist']=T.tshare*T.e*(~T.pay)    # exposed, person leads with AI as a tool
T['w_core']=T.tshare*(1-T.e)           # human core
T.to_pickle(P.p(P.BUILD,'tasks_nat.pkl'))
occ=T.groupby('soc6')[['w_ai','w_assist','w_core']].sum()
print(len(T),'tasks',T.soc6.nunique(),'occupations'); print(occ.describe().round(3))
N[['soc6','occ_title','emp_2025']].to_pickle(P.p(P.BUILD,'occ_nat.pkl'))
