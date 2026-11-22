# Program skills view

Builds `data/skills/` for skills.html. Run in order:

1. `tasks.py` (no arguments): classes every O*NET task with the model's cost test (base AI path, national wages), from the Price of Judgment dataset v2 and the AEI January 2026 task file. Check: reproduces the Maryland workbook's `share_hours_ai_pays_us_wages` exactly.
2. `dests.py <Price_of_Judgment_Dataset_v2.xlsx>`: the program tiers' destination weights per CIP6 x award level (from the model's program_model.py).
3. `build_skills.py <out dir>`: per program family (CIP4 x level), work activities and skills with importance and the share AI can take on, top tasks, national level averages.

Inputs: Drive "Occupational analysis" (O*NET 31 ratings, tasks_to_dwas, gwas_to_iwas_to_dwas, skills-to-work-activities, task_statements, ACS FOD x SOCP, crosswalks, IPEDS) and "AI Fluency Economics/Derived". Paths come from tools/w2100_paths.py (environment variables W2100_DATA, W2100_ONET, W2100_IPEDS, W2100_MODEL, W2100_BUILD); see tools/PIPELINE.md section 0.
