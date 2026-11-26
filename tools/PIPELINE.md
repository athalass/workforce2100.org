# workforce2100.org: data dependencies and update pipeline

Last reviewed: November 22, 2026. Every command below was re-run on that date and rebuilt the published files
byte-for-byte (or value-for-value for JSON) from the inputs listed in `tools/inputs_manifest.csv`.

Three files track the data:
- `tools/sources.csv`: one row per outside source (version in use, cadence, next release, status, action). The same
  list is the "Releases" tab of the "workforce2100.org data release tracker" spreadsheet in Claude.
- `tools/inputs_manifest.csv`: every input file the live site was built from, with its Drive path, size and SHA-256.
- this file: what depends on what, and the steps.

The site has no build step: GitHub Pages serves the repository as it is. Everything on the Work 2035 pages is a JSON
file in `data/`, built offline by the scripts below.

## 0. Setup (once per machine)

Python 3 with pandas, numpy and openpyxl. Set where the inputs are (see `tools/w2100_paths.py`):

| Variable | Points to | Angelo's PC |
|---|---|---|
| `W2100_DATA` | the folder that mirrors Drive "Working papers/Data" | `G:/My Drive/Working papers/Data` |
| `W2100_ONET` | folder with the ONET31_*.csv files (default: W2100_DATA/Occupational analysis) | default |
| `W2100_IPEDS` | unzipped IPEDS_C2024_A/, IPEDS_C2023_A/, IPEDS_HD2024/ (default: W2100_BUILD/dl) | a scratch folder |
| `W2100_MODEL` | the `model/` folder unzipped from Occupation_Outlook_scripts_v2.zip | a scratch folder |
| `W2100_BUILD` | scratch folder for intermediate files | a scratch folder |

Then `python3 tools/check_inputs.py`: every input should read OK. CHANGED means the file in Drive is not the one the
live site was built from; that is expected only for a file you are deliberately updating (log it in sources.csv).
After a rebuild is published, `python3 tools/check_inputs.py --update` records the new files.

## 1. The layers

```
Layer 0  Outside sources (tools/sources.csv: BLS, Census, NCES, O*NET, Anthropic, MGI, ...)
   |
Layer 1  Two offline models (code and outputs in Drive; versions pinned in tools/inputs_manifest.csv)
   |   a. National model   Occupational analysis/Occupation_Outlook_scripts_v2.zip (README.txt gives the order)
   |                        -> Occupation_Outlook_2035_v2.xlsx, Program_Roadmap_2035_v1.xlsx
   |                       AI Fluency Economics/Code/Price_of_Judgment_scripts_v5.zip
   |                        -> Derived/Price_of_Judgment_Results_Tables.xlsx, outputs/governance_quadrants.csv (in the zip)
   |   b. State pipeline   Occupational analysis/State/State_pipeline_scripts_v2.1.zip (README_State_pipeline.md)
   |                        -> State/All_51_state_workbooks_v2.1.zip: Independent_version/<ST>/<State>_Work_2035_Data.xlsx
   |                           (51), McKinsey_version/ (51) and US_Work_2035_Mobility.xlsx
   |                        v2.1 (Nov 24, 2026) = the Nov 15 run with the ETPL matching corrected in place by
   |                        tools/state_patches/etpl_match_v2_1.py (every other cell verified unchanged). The v2.0 zips
   |                        (State_pipeline_scripts.zip, All_51_state_workbooks.zip) and State/Pipeline/ are superseded.
   |
Layer 2  Site builders (tools/ in this repo) -> data/*.json
   |
Layer 3  Pages and scripts (HTML + assets/*.js, with ?v= cache versions)
```

## 2. What each site file depends on

| Site data | Builder (tools/) | Inputs | Shown on | Version to bump |
|---|---|---|---|---|
| `data/work2035_data.json` | `work2035/make_data.py` | Occupation_Outlook_2035_v2.xlsx, Program_Roadmap_2035_v1.xlsx, Price_of_Judgment_Results_Tables.xlsx, governance_quadrants.csv | work-2035.html: Occupations, Academic programs; States wage index | `work2035.js?v=` |
| `data/impact_data.json` | `profiles/extract_states.py` -> `profiles/to_site.py` -> `profiles/merge_wi.py` | 51 state workbooks; work2035_data.json (wi) | work-2035.html: Institutions, States/Counties, Value of AI | `impact.js?v=` |
| `data/profiles/<ST>.json`, `index.json` | `profiles/prep_all.py` -> `profiles/add_industries.py` -> `profiles/hide_institutions.py` -> `profiles/make_shell.py` | state workbooks; work2035_data.json (program AI shares); QCEW county file; BLS matrix.xlsx | profile.html (curriculum change is computed in profile.js) | `profile.js?v=`, `profile.css?v=` |
| `data/briefs/<ST>.json`, `index.json` | `briefs/build_staffing.py` -> `briefs/build_briefs.py` | state workbooks; US_Work_2035_Mobility.xlsx; QCEW county file; OEWS national industry files (oesm25in4.zip); BLS matrix.xlsx; data/profiles | brief.html | `V` in assets/brief.js and `brief.js?v=` |
| `data/bridges/<ST>.json`, `index.json` | `bridges/build_bridges.py` | state workbooks (Pathways tab); BLS matrix.xlsx; data/briefs; ONET31_ratings_IM_LV.csv; US_ETPL_programs_TPR.csv; census.xlsx (CIP-SOC) | bridges.html; links from briefs and work-2035 | `bridges.js?v=` |
| `data/skills/<CIP2>.json`, `index.json` | `skills/tasks.py` -> `skills/dests.py` -> `skills/build_skills.py` | Price_of_Judgment_Dataset_v2.xlsx; AEI_2026-01 file; occ_model.py; O*NET 31 task, DWA, skills and ratings files; ACS FOD x SOCP; crosswalks; IPEDS completions and HD | skills.html; links from college profiles | `skills.js?v=` |
| `data/links.json` | `work2035/build_links.py` (after build_skills.py) | data/skills, data/work2035_data.json | work-2035.html Jobs & programs (rows that open) | `?v=` in the fetch in work2035.js |
| QCEW county file | `qcew/build_qcew.py` | BLS QCEW single files | (input to the rows above) | none |
| Home page "Find your answer" (no data file) | `assets/finder.js` | data/briefs, profiles, bridges and skills index.json | index.html | `finder.js?v=`, `finder.css?v=` |
| Forms (no data file) | `forms/Code.gs` (Apps Script) | Google Sheets in Drive State folder | tracking-study.html, profiles, contact | `forms.js?v=` |

Text that carries dates or source versions and is edited by hand:
- work-2035.html: header "Data as of", `#updates` change log, `#sources` list, agentic AI caveat.
- assets/profile.js: "Data as of" and closing note; make_shell.py: profile change log (copied to profile.html).
- assets/brief.js: "Data as of" and four "QCEW 2025" labels (`grep -n "QCEW 2025" assets/brief.js`).
- index.html FAQ (update schedule); privacy.html (only if forms change); sitemap.xml (new pages).

## 3. Update calendar

| When | Trigger | Run |
|---|---|---|
| Dec 2, 2026; about Mar, Jun, Aug-Sep 2027 | New QCEW quarter | QUARTERLY |
| About May 2027 | OEWS May 2026 | Hold for YEARLY (log it) |
| About Jul 2027 | Weldon Cooper vintage 2027 | Hold for YEARLY |
| Dec 2026-Feb 2027; about Aug 2027 | O*NET 31.1; O*NET 32.0 | Hold for YEARLY |
| Late Aug-Sep 2027 | BLS Employment Projections 2026-36 | YEARLY (start) |
| Fall 2027 | LODES 2025 | YEARLY if it lands in time, else next |
| Any time | AEI report, PSEO version, ETPL | Log in tracker; adopt at YEARLY |
| Never while the blinding rule stands | ACS 2025 or later | Do not adopt |

Available now and waiting for the next yearly re-run: IPEDS completions 2024-25 (provisional, July 28, 2026) and the
March and June 2026 Anthropic Economic Index releases.

A scheduled task ("Workforce 2100 quarterly data release check", 2:13 pm Eastern on the 10th of March, June,
September and December) reads this file and tools/sources.csv, checks every source and says which run is due.

## 4. QUARTERLY run (new QCEW quarter)

0. `git pull`; `python3 tools/check_inputs.py`.
1. Download from BLS (https://www.bls.gov/cew/downloadable-data-files.htm) the quarterly single files
   (`<year>_qtrly_singlefile.zip`) for the current and the previous year; save them in Drive with the date. Build the
   county file as a four-quarter average (no seasonal swings):
   `python3 tools/qcew/build_qcew.py rolling QCEW_<last quarter>_counties_states.csv.gz 2026Q2 2025_qtrly_singlefile.zip 2026_qtrly_singlefile.zip`
   (For a full year use `build_qcew.py annual <out> <year>_annual_singlefile.zip`; that mode rebuilds the published
   QCEW_2025 file exactly.)
2. Profiles: copy `data/profiles/*.json` to a work dir, then
   `python3 tools/profiles/add_industries.py <qcew.csv.gz> <State/matrix.xlsx> <any state workbook> <work dir>`
3. `python3 tools/profiles/hide_institutions.py <site root>` (only matters while HIDE lists anyone; currently none).
4. `python3 tools/profiles/make_shell.py <site root> <work dir>`.
5. Briefs: `python3 tools/briefs/build_briefs.py <Independent_version> US_Work_2035_Mobility.xlsx <qcew.csv.gz> staffing.json <State/matrix.xlsx> data/briefs data/profiles`
   (staffing.json comes from `build_staffing.py`, yearly; rebuild it with step 7 of the yearly run if missing.)
6. Bridges (they read data/briefs): `python3 tools/bridges/build_bridges.py <Independent_version> <State/matrix.xlsx> data/briefs data/bridges <ONET31_ratings_IM_LV.csv> <State/US_ETPL_programs_TPR.csv> <census.xlsx>`
   (the last two re-match short-term training by the providers' own occupation codes; see the script's header)
7. Labels and log: "Data as of" (work-2035.html, assets/profile.js, assets/brief.js); the QCEW labels in assets/brief.js
   and work-2035.html#sources (e.g. "QCEW 2025Q3-2026Q2"); one dated line in work-2035.html#updates and in make_shell.py.
8. Bump `?v=` on every changed script on every page that loads it, and `V` in assets/brief.js.
9. CHECKS (section 6), commit, push.
10. tools/sources.csv (S01) and the tracker; `python3 tools/check_inputs.py --update` after adding the new QCEW file
    to tools/inputs_manifest.csv in place of the old one.

## 5. YEARLY run (new projections, wages, O*NET, IPEDS)

1. Put the new inputs in Drive; record each new version in tools/sources.csv and the tracker.
2. National model: unzip Occupation_Outlook_scripts_v2.zip and run model/ in README.txt order (occ_model.py ...
   deploy_check.py); then the Price of Judgment scripts. Save the outputs in Drive under new version numbers.
3. `python3 tools/work2035/make_data.py <Occupation_Outlook.xlsx> <Program_Roadmap.xlsx> <Price_of_Judgment_Results_Tables.xlsx> <governance_quadrants.csv> data/work2035_data.json`
4. State pipeline (README_State_pipeline.md): `python3 pipeline/nat_county.py`, then `run_all.sh` for the 51 states
   (ND=200), `nat_mobility.py`, `nat_ranking.py`; check the quality flags. Maryland: `ST=MD COMPAT=1` must still
   reproduce the Maryland report when its own inputs are unchanged. Zip the outputs as a new State workbooks zip.
5. State and institution views: `python3 tools/profiles/extract_states.py <Independent_version> state_extract.json`,
   `python3 tools/profiles/to_site.py state_extract.json data/impact_data.json`, `python3 tools/profiles/merge_wi.py .`
6. Profiles: `python3 tools/profiles/prep_all.py <Independent_version> <work dir>` (reads data/work2035_data.json from
   this repo), then QUARTERLY steps 2-4.
7. Briefs: `python3 tools/briefs/build_staffing.py <unzipped oesm in4 dir> staffing.json`, then QUARTERLY step 5.
8. Bridges: QUARTERLY step 6.
9. Skills: `python3 tools/skills/tasks.py`, `python3 tools/skills/dests.py <Price_of_Judgment_Dataset_v2.xlsx>`,
   `python3 tools/skills/build_skills.py data/skills` (file names inside the scripts carry the data versions, e.g.
   ONET31_*, IPEDS_C2024_A, AEI_2026-01: change them with the new files). See tools/skills/README.md.
   Then `python3 tools/work2035/build_links.py .` (links between occupations and programs).
10. Text: every version in work-2035.html#sources and the page notes (O*NET, OEWS, EP decade, IPEDS year, AEI
    release), "Data as of", a version line in both change logs, OSF upload of the new workbooks and code.
11. Bump every `?v=`; CHECKS; commit; push; add the new inputs to tools/inputs_manifest.csv and run
    `check_inputs.py --update`.

## 6. CHECKS before every push

- JSON: every file in data/ parses; profiles, briefs and bridges index.json list every state file; every program in
  data/skills/index.json has an entry in its CIP2 file.
- Unchanged inputs give unchanged outputs: rebuild into a scratch folder and `diff -r` against data/ before swapping.
- Maryland on brief.html?st=MD (current inputs, checked Nov 25, 2026): about 164,000 in shrinking occupations (6.3%),
  net +63,900 (+2.4%), slow recovery -38,100; 447,000 jobs' worth of work AI takes over (17.0%). Update after a yearly run.
- Institution count (5,668 now) agrees on profile.html and work-2035.html; program count (1,432) on index.html.
- Pages: work-2035 (every tab), profile (one college; search), brief (a state and a county), bridges (search; Work 2035
  tab), skills (one program); phone width; no console errors; print preview of a brief.
- Links: Institutions -> profiles; States -> briefs; brief occupations -> bridges; Largest programs -> skills.
- Each changed asset has a new `?v=` on every page that loads it.

## 7. Known gaps

1. The code of the two offline models lives only in Drive zips. Their exact versions are pinned by SHA-256 in
   tools/inputs_manifest.csv, so a changed or replaced zip is caught by check_inputs.py, but there is no line-by-line
   history. Open decision: put them in a private repository, or in this public one (the national model code is
   already public on OSF).
2. `State/US_Work_2035_50_State_Ranking_own.xlsx` (independent version, Nov 14) predates the Nov 15 workbooks: its numbers
   do not match them (e.g. Maryland transition share 4.6% vs 6.3%). It is not in the published zip. Rebuild it with
   nat_ranking.py (ANCHOR=OWN) at the next yearly run. The McKinsey-version ranking matches its workbooks (v2.1 file).
3. The briefs' county headline net (county model, from the state workbooks) and the industry-table total (QCEW) differ
   by design; documented on the page. After a quarterly run the gap can grow a little, because only the industry
   tables move.
4. Drive housekeeping (not done, for Angelo): `State/Pipeline/State_pipeline_scripts.zip` is superseded;
   `Derived/Price_of_Judgment_Dataset_v2 (duplicate copy - safe to delete).xlsx`; five .tmp files in Downloads.

Closed on Nov 22, 2026:
- `data/work2035_data.json` builder in the repo (`tools/work2035/make_data.py`; reproduces the published file).
- Wage-index merge as a script (`tools/profiles/merge_wi.py`).
- No machine paths in the scripts (`tools/w2100_paths.py`); profiles, briefs, bridges, staffing, impact and skills
  rebuilt identically after the change.
- QCEW county file builder (`tools/qcew/build_qcew.py`).
- Input versions pinned (`tools/inputs_manifest.csv`, `tools/check_inputs.py`).
- State workbooks v2.1 (Nov 24, 2026): ETPL programs matched by the providers' own SOC codes in the workbooks and in
  st_pathways.py, as in the Bridge Finder.
- PSEO (V4.14.1, 2026Q2, downloaded Nov 11, 2026: the current release) and ETPL (downloaded Nov 11, 2026) dates recorded.
- Corrections now described as coming through the form (tools/profiles/README.md).
- The quarterly scheduled task now runs a full release check against this file.
