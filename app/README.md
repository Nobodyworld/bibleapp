# Bible App

Static local Bible reader prepared for private GitHub publishing.

## What Is Included

- Browser-only reader UI: `index.html`, `app.js`, `styles.css`, and `src/`.
- Local user-data tools for tags, assertions, drafts, jobs, package state, export, and import.
- Retained Bible text shards under `data/verses/` for public-domain or no-license editions only.
- Minimal package metadata in `data/package-manifest.json`.

## What Was Removed

- Backup archives and historical extraction folders are outside this app and ignored from publishing.
- Aggregated study datasets with uncertain or mixed provenance were removed: cross references, footnotes, Strong's overlays, interlinear data, lexicon chunks, commentaries, outlines, generated search shards, generated analysis graphs, performance reports, recovery reports, and source-provenance dumps.
- Stale local QA reports, generated caches, bytecode, runtime logs, and old extraction docs were removed or ignored.

## Data Licensing

The current retained editions are listed in `data/manifest.json`, summarized in `LICENSES.md`, and tracked in machine-readable form in `data/license-matrix.json`.

Licensed datasets may be restored for private use, public distribution, or commercial sale only when their source-specific restrictions are recorded in the license matrix. If a dataset is private-only, non-commercial-only, not-for-resale, or unclear, keep the repository and app artifacts private or remove that dataset before publishing/selling.

## Study Restoration Planning

The current publish package is license-scoped, not a text-only product direction. Reader-adjacent study tools should remain part of the product model and can be restored as source-specific licensing is cleared.

- `docs/STUDY_FEATURE_RESTORE_PLAN.md`: reader-first study feature flows.
- `docs/STUDY_FEATURE_UI_AUDIT.md`: current missing-data UI findings.
- `docs/MISSING_STUDY_DATA_COPY_TABLE.md`: prioritized user-facing copy for missing study-data states.
- `docs/STUDY_DATA_LICENSE_CANDIDATES.md`: candidate study-data source questions.
- `docs/TEST_MODE_SPLIT_RECOMMENDATION.md`: publish-package vs full-study validation split.
- `docs/CURRENT_WORK.md`: current publish/readiness status and remaining work.

## Run Locally

From this folder:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:8765/
```

Routes are hash-based:

```text
http://127.0.0.1:8765/#/read/bsb/psalms/23
```

## Publish Audit

From the repository root:

```powershell
node .\app\tools\publish-audit.mjs
```

This verifies the retained translation directories, package metadata, license matrix rows, absence of removed study-data directories, and absence of legacy source naming in publishable app files.
