# Bible App

Static local Bible reader with license/provenance records kept in-repo.

## What Is Included

- Browser-only reader UI: `index.html`, `app.js`, `styles.css`, and `src/`.
- Local user-data tools for tags, assertions, drafts, jobs, package state, export, and import.
- Retained Bible text shards under `data/verses/`.
- Restored study datasets for cross references, commentary, outlines, interlinear views, and generated search indexes.
- Minimal package metadata in `data/package-manifest.json`.

## What Was Removed

- Backup archives and historical extraction folders are outside this app and ignored from publishing.
- Some generated and auxiliary datasets remain excluded: analysis graphs, performance reports, recovery reports, and source-provenance dumps.
- Stale local QA reports, generated caches, bytecode, runtime logs, and old extraction docs were removed or ignored.

## Data Licensing

The current retained editions are listed in `data/manifest.json`, summarized in `LICENSES.md`, and tracked in machine-readable form in `data/license-matrix.json`.

Licensing and provenance details are documented in the license matrix as written record metadata and are not enforced by runtime or audit gating.

## Study Restoration Planning

Reader-adjacent study tools remain part of the product model, with restoration tracked in the planning docs below.

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

## Generate Analysis Packs

From the repository root:

```powershell
node .\app\tools\generate-analysis-packs.mjs --chunk-size 22 --chunk-index 0
node .\app\tools\generate-analysis-packs.mjs --chunk-size 22 --chunk-index 1
node .\app\tools\generate-analysis-packs.mjs --chunk-size 22 --chunk-index 2
```

This generates reproducible chunked outputs under `app/data/analysis/word-map/bsb` and `app/data/analysis/graph`.
