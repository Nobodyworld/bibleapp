# Bible App

Static local Bible reader with license/provenance records kept in-repo.

## What Is Included

- Browser-only reader UI: `index.html`, `app.js`, `styles.css`, and `src/`.
- Local user-data tools for tags, assertions, drafts, jobs, package state, export, and import.
- Retained Bible text shards under `data/verses/`.
- Restored study datasets for cross references, commentary, footnotes, outlines, interlinear views, Strong's/lexicons, search, word maps, and graph analysis.
- Minimal package metadata in `data/package-manifest.json`.

## What Was Removed

- Backup archives and historical extraction folders are outside this app and ignored from publishing.
- Stale local QA reports, generated caches, bytecode, runtime logs, and old extraction docs were removed or ignored.

## Data Licensing

The current retained editions are listed in `data/manifest.json`, summarized in `LICENSES.md`, and tracked in machine-readable form in `data/license-matrix.json`.

Licensing and provenance details are documented in the license matrix as written record metadata and are not enforced by runtime or audit gating.

## Engineering Documentation

Start with the root `../MASTER_STATUS_TRACKER.md` for the consolidated task and plan status. Detailed status and design contracts are:

- `docs/CURRENT_WORK.md`: verified status, blockers, and next work boundary.
- `docs/UI_FUNCTIONALITY_SCHEMA.md`: UI availability, panel, reference, and interlinear contracts.
- `docs/TAG_FAVORITES_ANALYSIS_ROADMAP.md`: target-aware tags, favorites, inquiry jobs, and graph phases.
- `docs/VISUAL_REVIEW_SUMMARY.md`: current manual and automated browser-QA baseline.

## Run Locally

From the repository root:

```powershell
npm run serve
```

Open:

```text
http://127.0.0.1:8000/
```

Routes are hash-based:

```text
http://127.0.0.1:8000/#/read/bsb/psalms/23
```

## Verification

From the repository root:

```powershell
npm run verify
```

This runs static integrity, accessibility, documentation, desktop browser, mobile browser, and structural package checks. See `docs/CURRENT_WORK.md` for the latest verified result and any environment-specific browser-runner blocker.

## Generate Analysis Packs

From the repository root:

```powershell
node .\app\tools\generate-analysis-packs.mjs --chunk-size 22 --chunk-index 0
node .\app\tools\generate-analysis-packs.mjs --chunk-size 22 --chunk-index 1
node .\app\tools\generate-analysis-packs.mjs --chunk-size 22 --chunk-index 2
```

This generates reproducible chunked outputs under `app/data/analysis/word-map/bsb` and `app/data/analysis/graph`.
