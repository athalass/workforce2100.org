# workforce2100.org: data dependencies and update pipeline

Last reviewed: November 22, 2026. The release tracker is `tools/sources.csv` (one row per outside source, with the
version in use, cadence, next expected release, status and action).

The site has no build step: GitHub Pages serves the repository as it is. Everything on the Work 2035 pages is a JSON
file in `data/`, built offline by the scripts below from four layers of inputs.

## 1. The layers

```
Layer 0  Outside sources (tools/sources.csv: BLS, Census, NCES, O*NET, Anthropic, MGI, ...)
   |
Layer 1  Two offline models (not in this repo)
   |   a. National model   Occupation_Outlook_scripts_v2.zip (occ_model.py ... deploy_check.py)
   |                        -> Occupation_Outlook_2035_v2.xlsx, Program_Roadmap_2035_v1.xlsx
   |                       Price of Judgment scripts v5 -> Price_of_Judgment_Results_Tables.xlsx,
   |                        outputs/governance_quadrants.csv
   |   b. State pipeline   State_pipeline_scripts.zip (st_common ... st_workbook, nat_county, nat_mobility)
   |                        -> 51 workbooks  Independent_version/<ST>/<State>_Work_2035_Data.xlsx
   |                        -> US_Work_2035_Mobility.xlsx
   |
Layer 2  Site builders (tools/ in this repo) -> data/*.json
   |
Layer 3  Pages and scripts (HTML + assets/*.js, with ?v= cache versions)
```

Where the Layer 1 files live (Google Drive, `Working papers/Data`):
- `Occupational analysis/`: Occupation_Outlook_scripts_v2.zip, Program_Roadmap_2035_v1.xlsx, IPEDS zips, crosswalks,
  ACS FOD x SOCP file, O*NET 31 files (ratings, skills, task-to-DWA links), README_Where_Work_Is_Moving.md.
- `Occupational analysis/State/`: State_pipeline_scripts.zip, README_State_pipeline.md, the state workbooks and the
  interest/corrections/contact Sheets.
- `AI Fluency Economics/Derived/`: Price_of_Judgment_Dataset_v2.xlsx, AEI_2026-01_Task_Success_and_Time_by_Task_and_Occupation.xlsx.
- OEWS national industry files (oesm25in4.zip) and the QCEW county file are downloads; keep a copy in Drive with the date.

## 2. What each site file depends on

| Site data | Builder (tools/) | Inputs | Shown on | Version to bump |
|---|---|---|---|---|
| `data/work2035_data.json` | `work2035/make_data.py` | Occupation_Outlook_2035_v2.xlsx, Program_Roadmap_2035_v1.xlsx, Price_of_Judgment_Results_Tables.xlsx, governance_quadrants.csv | work-2035.html: Occupations, Academic programs; States wage index | `work2035.js?v=` |
| `data/impact_data.json` | `profiles/extract_states.py` -> `profiles/to_site.py` -> `profiles/merge_wi.py` | 51 state workbooks; work2035_data.json (wi) | work-2035.html: Institutions, States/Counties, Value of AI | `impact.js?v=` |
| `data/profiles/<ST>.json`, `index.json` | `profiles/prep_all.py` -> `profiles/add_industries.py` -> `profiles/hide_institutions.py` -> `profiles/make_shell.py` | state workbooks; work2035_data.json (program AI shares); QCEW county file; BLS matrix | profile.html (all sections; curriculum change is computed in profile.js) | `profile.js?v=`, `profile.css?v=` |
| `data/briefs/<ST>.json`, `index.json` | `briefs/build_staffing.py` -> `briefs/build_briefs.py` | state workbooks; US_Work_2035_Mobility.xlsx; QCEW county file; OEWS national industry files; BLS EP occupation table or matrix; data/profiles | brief.html | `V` in assets/brief.js and `brief.js?v=` |
| `data/bridges/<ST>.json`, `index.json` | `bridges/build_bridges.py` | state workbooks (Pathways tab); BLS matrix; data/briefs; O*NET ratings (IM) | bridges.html; links from briefs and work-2035 | `bridges.js?v=` |
| `data/skills/<CIP2>.json`, `index.json` | `skills/tasks.py` -> `skills/dests.py` -> `skills/build_skills.py` | Price of Judgment dataset v2; AEI 2026-01 file; O*NET 31 task, DWA and skills files; ACS FOD x SOCP; CIP-SOC crosswalk; IPEDS completions | skills.html; links from profiles and work-2035 | `skills.js?v=` |
| Forms (no data file) | `forms/Code.gs` (Apps Script) | Google Sheets in Drive State folder | tracking-study.html, profiles, contact | `forms.js?v=` |

Pages that carry dates or source versions and must be edited by hand when inputs change:
- work-2035.html: header "Data as of", `#updates` change log, `#sources` list (versions), agentic AI caveat.
- profile.html and assets/profile.js: "Data as of" and the closing note; change log in make_shell.py.
- assets/brief.js: "Data as of".
- index.html FAQ (update schedule), privacy.html (only if forms change), sitemap.xml (new pages).

## 3. Update calendar

| When | Trigger | Run |
|---|---|---|
| Dec 2, 2026; about Mar, Jun, Aug 2027 | New QCEW quarter | QUARTERLY |
| About May 2027 | OEWS May 2026 | Hold for YEARLY (note in tracker) |
| About Jul 2027 | Weldon Cooper vintage 2027 | Hold for YEARLY |
| About Aug 2027 | O*NET 32.0 | Hold for YEARLY |
| Late Aug-Sep 2027 | BLS Employment Projections 2026-36 | YEARLY (start) |
| Fall 2027 | LODES 2025 | YEARLY if it lands in time, else next |
| Any time | AEI report, PSEO partners, ETPL | Log in tracker; adopt at YEARLY |
| Never while the blinding rule stands | ACS 2025 or later | Do not adopt |

Available now and waiting for the next yearly re-run: IPEDS completions 2024-25 (provisional, July 28, 2026) and the
March and June 2026 Anthropic Economic Index releases.

## 4. QUARTERLY run (new QCEW quarter)

0. `git pull`. Download the QCEW county file and save it to Drive with the date.
1. Rebuild the QCEW county x state csv.gz in the same layout as `QCEW_2025_counties_states.csv.gz`.
2. Profiles: copy `data/profiles/*.json` to a work dir, then
   `python3 tools/profiles/add_industries.py <qcew.csv.gz> <matrix.xlsx> <any state workbook> <work dir>`
3. Hidden institutions: `python3 tools/profiles/hide_institutions.py .` (only matters while HIDE lists anyone).
4. `python3 tools/profiles/make_shell.py . <work dir>`.
5. Briefs: `python3 tools/briefs/build_briefs.py <Independent_version> US_Work_2035_Mobility.xlsx <qcew.csv.gz> staffing.json <BLS matrix or EP table> data/briefs data/profiles`
6. Bridges read data/briefs: `python3 tools/bridges/build_bridges.py <Independent_version> <BLS matrix> data/briefs data/bridges <ONET31_ratings_IM_LV.csv>`
7. Stamps and log: "Data as of" (work-2035.html, profile.js, brief.js); one dated line in the change log
   (work-2035.html#updates and make_shell.py); QCEW quarter in work-2035.html#sources.
8. Bump `?v=` on every changed script (profile, brief, bridges) and `V` in brief.js.
9. CHECKS (section 6), commit, push.
10. Update tools/sources.csv (S01 version in use, latest, next).

## 5. YEARLY run (new projections, wages, O*NET, IPEDS)

1. Update the inputs in Drive and record each new version in tools/sources.csv.
2. National model: run Occupation_Outlook_scripts in README.txt order (occ_model.py ... deploy_check.py), then the
   Price of Judgment scripts. Outputs: Occupation_Outlook_2035, Program_Roadmap_2035, Results_Tables, governance_quadrants.
3. `python3 tools/work2035/make_data.py <Occupation_Outlook.xlsx> <Program_Roadmap.xlsx> <PoJ_Results_Tables.xlsx> <governance_quadrants.csv> data/work2035_data.json`
4. State pipeline: `python3 pipeline/nat_county.py`, then `run_all.sh` for 51 states (ND=200), `nat_mobility.py`,
   `nat_ranking.py`. Check the flags summary. Maryland check: `ST=MD COMPAT=1` must still reproduce the Maryland report
   when its own inputs are unchanged.
5. State and institution views: `extract_states.py <Independent_version> state_extract.json`,
   `to_site.py state_extract.json data/impact_data.json`, `merge_wi.py .`
6. Profiles: `prep_all.py <Independent_version> <work dir>` (prep_all.py reads data/work2035_data.json; its path is
   hard-coded to /home/claude/workforce2100.org), then QUARTERLY steps 2-4.
7. Briefs: `build_staffing.py <oesm in4 dir> staffing.json` (new OEWS), then QUARTERLY step 5.
8. Bridges: QUARTERLY step 6.
9. Skills: `tasks.py`, `dests.py`, `build_skills.py data/skills` (paths are hard-coded at the top of each file; point
   them at the new O*NET, AEI, ACS and IPEDS files). See tools/skills/README.md.
10. Text: every source version in work-2035.html#sources and in the page notes (O*NET version, OEWS year, EP decade,
    IPEDS year, AEI release), "Data as of", a version line in both change logs, OSF upload of the new workbooks and code.
11. Bump every `?v=`; CHECKS; commit; push.

## 6. CHECKS before every push

- JSON: every file in data/ parses; index.json counts match the files.
- Totals: national net change and the Maryland figures on brief.html?st=MD (+62,675 net, -39,882 slow,
  172,980 jobs lost under the current inputs; update these numbers in this file after a yearly run).
- Counts: institution count on profile.html, work-2035.html and index.html agree.
- Pages: open work-2035 (every tab), profile (one college; search), brief (state and a county), bridges (search and
  Work 2035 tab), skills (one program); phone width; no console errors; print preview of a brief.
- Links: Institutions -> profiles; States -> briefs; brief occupations -> bridges; Largest programs -> skills.
- Versions: each changed asset has a new `?v=` on every page that loads it.

## 7. Known gaps (as of Nov 22, 2026)

1. The national model and the state pipeline are zips in Drive, not under version control. Consider a private repo.
2. Hard-coded paths: prep_all.py (site path), tools/skills/*.py (/mnt/user-data/... and /home/claude/build/...).
3. tools/profiles/README.md still describes corrections by email link; corrections now come through the form
   (forms.js -> Corrections Sheet). The log in make_shell.py is still updated by hand.
4. PSEO and ETPL pull dates are not recorded; record them at the next yearly run.
5. The scheduled quarterly reminder should point to this file.
6. Briefs: the county headline net (county model) and the industry-table total differ by design; documented on the page.

Fixed on Nov 22, 2026: the builder for data/work2035_data.json is now in the repo (tools/work2035/make_data.py,
reproduces the published file exactly), and the wage-index merge is a script (tools/profiles/merge_wi.py).
