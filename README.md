# Workforce 2100 website

Static website for workforce2100.org. No build step: GitHub Pages serves these files as they are.

## Files

- `index.html`: home page
- `research.html`: papers and per-paper citations
- `work-2035.html` and `assets/work2035.js`: searchable occupations, programs, state map and value model
- `assets/site.css`: shared styles
- `data/work2035_data.json`: data for the Work to 2035 page (own-model results)
- `CNAME`: tells GitHub Pages the site's domain (workforce2100.org)
- `.nojekyll`: tells GitHub Pages to serve the files without processing

## Publish on GitHub Pages

1. Sign in at github.com (create a free account if needed).
2. Create a new **public** repository, for example `workforce2100`.
3. On the repository page, choose **Add file > Upload files**. Drag in everything from this folder, including the `assets` and `data` folders and the `CNAME` file. Click **Commit changes**.
   - The `.nojekyll` file starts with a dot and may be hidden on your computer. If it does not upload, create it on GitHub: **Add file > Create new file**, name it `.nojekyll`, leave it empty, and commit.
4. Go to **Settings > Pages**. Under **Build and deployment**, set **Source** to *Deploy from a branch*, branch **main**, folder **/ (root)**. Save.
5. In the same page, under **Custom domain**, enter `workforce2100.org` and save.

## Point workforce2100.org at GitHub (in Squarespace)

1. In Squarespace, open **Domains**, select **workforce2100.org**, then **DNS** (DNS settings).
2. Delete the existing Squarespace **A** records for `@` and the **CNAME** record for `www`, if present.
3. Add these records:

| Type  | Host | Value                     |
|-------|------|---------------------------|
| A     | @    | 185.199.108.153           |
| A     | @    | 185.199.109.153           |
| A     | @    | 185.199.110.153           |
| A     | @    | 185.199.111.153           |
| CNAME | www  | YOUR-GITHUB-USERNAME.github.io |

4. Wait. DNS changes can take from a few minutes to 48 hours.
5. Back in GitHub **Settings > Pages**, once the domain check passes, tick **Enforce HTTPS**.

## Updating the site

Edit a file on GitHub (pencil icon) or upload a new version with **Add file > Upload files**. The site updates within a minute or two.
