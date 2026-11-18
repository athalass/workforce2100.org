# Rebuilding the college profiles and state data

Quarterly (new QCEW county file):
1. `python3 add_industries.py <QCEW_counties_states.csv.gz> <matrix.xlsx> <any state workbook> <profile data dir>`
   where the profile data dir holds the per-state JSON built by `prep_all.py` (copy `data/profiles/*.json` from the site).
2. `python3 make_shell.py <site root> <profile data dir>` copies the data and page assets into the site.
3. Update the "Data as of" stamp (work-2035.html header, profile.js closing note) and add a dated line to the Change log in work-2035.html#updates. Bump the `?v=` version on profile.js.

Yearly (new state workbooks, Independent_version):
1. `python3 prep_all.py <Independent_version dir> <profile data dir>` (reads data/work2035_data.json for program AI shares).
2. Run step 1 and 2 above.
3. State impact data: `python3 extract_states.py <Independent_version dir> state_extract.json`, then `python3 to_site.py state_extract.json data/impact_data.json`, then re-add the `wi` wage index from data/work2035_data.json (see the merge step in the Nov 18, 2026 commit). Copy data/impact_data.json to the .ai site too.

Corrections log:
Each profile has a "Report an error or request a correction" email link. Log every request in the Corrections log table in make_shell.py (section id="corrections"): date received, institution, what was reported, the response, and the version that fixed it. No sender names. Then rerun make_shell.py.

## Hidden institutions

`hide_institutions.py` removes listed institutions from the published profiles, the search index, the Work 2035 Institutions tab and other colleges' Competition sections, without changing any totals. While an institution is listed in `HIDE`, run it after every rebuild (for example after the quarterly QCEW refresh), then check the institution count on profile.html, work-2035.html and index.html. Currently hidden: Anne Arundel Community College (since November 18, 2026, pending approval).
