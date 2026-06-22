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

## Retained Text Editions

The current retained editions are listed in `data/manifest.json` and summarized in `LICENSES.md`.

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
